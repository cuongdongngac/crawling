// ==========================================================
// Các việc AI — gọi từ cron quét chính thức hoặc nút trên trang Gắn nhãn.
//   labelPendingPosts: gắn nhãn bài chưa có nhãn cho bộ phiên bản hiện hành (bảng mã + prompt + model),
//                      rồi cập nhật kết luận sàng lọc posts.relevance (trừ bài người đã kết luận).
//   labelEvalSet:      chạy AI trên tập chuẩn (đo độ chính xác khi đổi model/prompt).
//   getLabelProgress:  đếm bài đã/chưa có nhãn AI (cho thanh tiến độ).
// Cách nối vào cron sau này (sau khi ghi bài xong):
//   const p = await getAiPolicy(); if (p.autoEnabled) await labelPendingPosts({ limit: 50, trigger: "CRON" });
// ==========================================================
import { getServiceClient } from "@/lib/auth/guards";
import { getAiConfig } from "@/lib/ai/openrouter";
import { runAiTask, type AiRunSummary } from "@/lib/ai/runner";
import { buildPostLabelTask, POST_LABEL_PROMPT_VERSION, type PostLabelInput } from "@/lib/ai/tasks/post-label";
import { CURRENT_CODEBOOK, relevanceFromAi } from "@/lib/ai/codebook";

export function hashtagsOf(payload: unknown): string[] {
  const p = (payload ?? {}) as Record<string, unknown>;
  const h = p.hashtags;
  if (!Array.isArray(h)) return [];
  return h
    .map((x) => (typeof x === "string" ? x : (x as { name?: string })?.name))
    .filter((x): x is string => !!x)
    .map((x) => (x.startsWith("#") ? x : `#${x}`));
}

export type LabelScope = {
  /** Chỉ bài hệ thống phát hiện từ ngày này (ISO). Bỏ trống = mọi bài. */
  since?: string | null;
  /** "mock" = chỉ bài giả, "real" = chỉ bài thật, mặc định cả hai. */
  data?: "all" | "mock" | "real";
};

type SB = ReturnType<typeof getServiceClient>;

function postsQuery(db: SB, scope: LabelScope, columns: string, count = false) {
  let q = db.from("posts").select(columns, count ? { count: "exact", head: true } : undefined).not("raw_text", "is", null);
  if (scope.since) q = q.gte("created_at", scope.since);
  if (scope.data === "mock") q = q.eq("raw_payload->>mock", "true");
  if (scope.data === "real") q = q.or("raw_payload->>mock.is.null,raw_payload->>mock.neq.true");
  return q;
}

function aiLabelsQuery(db: SB, model: string, columns: string, count = false) {
  return db
    .from("ai_labels")
    .select(columns, count ? { count: "exact", head: true } : undefined)
    .not("post_id", "is", null)
    .eq("task", "POST_LABEL")
    .eq("codebook_version", CURRENT_CODEBOOK.version)
    .eq("prompt_version", POST_LABEL_PROMPT_VERSION)
    .eq("model", model)
    .is("error", null);
}

/**
 * Chọn bài chưa có nhãn: duyệt bài theo trang (mới nhất trước), bỏ bài đã có nhãn cho bộ phiên bản hiện hành.
 * Duyệt tối đa ~20.000 bài mỗi lần gọi để không quá giới hạn thời gian hàm.
 */
async function pickUnlabeled(db: SB, model: string, scope: LabelScope, limit: number) {
  const out: { post_id: string; platform: string; raw_text: string; raw_payload: unknown; relevance_source: string | null }[] = [];
  const PAGE = 1000;
  for (let from = 0; from < 20000 && out.length < limit; from += PAGE) {
    const { data, error } = await postsQuery(db, scope, "post_id, platform, raw_text, raw_payload, relevance_source")
      .order("created_at", { ascending: false })
      .order("post_id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as unknown as typeof out;
    if (!page.length) break;
    const done = new Set<string>();
    for (let i = 0; i < page.length; i += 200) {
      const ids = page.slice(i, i + 200).map((p) => p.post_id);
      const { data: labeled, error: e2 } = await aiLabelsQuery(db, model, "post_id").in("post_id", ids);
      if (e2) throw new Error(e2.message);
      ((labeled ?? []) as unknown as { post_id: string }[]).forEach((r) => done.add(r.post_id));
      // Bài đã lỗi 2 lần với bộ phiên bản này thì thôi thử lại (tránh lô nào cũng tốn tiền cho cùng một bài hỏng)
      const { data: failed } = await db
        .from("ai_labels")
        .select("post_id")
        .in("post_id", ids)
        .eq("task", "POST_LABEL")
        .eq("codebook_version", CURRENT_CODEBOOK.version)
        .eq("prompt_version", POST_LABEL_PROMPT_VERSION)
        .eq("model", model)
        .not("error", "is", null);
      const fails = new Map<string, number>();
      for (const r of (failed ?? []) as { post_id: string }[]) fails.set(r.post_id, (fails.get(r.post_id) ?? 0) + 1);
      fails.forEach((n, id) => n >= 2 && done.add(id));
    }
    for (const p of page) {
      if (out.length >= limit) break;
      if (!done.has(p.post_id) && String(p.raw_text).trim().length >= 5) out.push(p);
    }
    if (page.length < PAGE) break;
  }
  return out;
}

export async function labelPendingPosts(opts: {
  limit?: number;
  trigger: "CRON" | "MANUAL";
  triggeredBy?: string | null;
  model?: string;
  scope?: LabelScope;
}): Promise<AiRunSummary> {
  const db = getServiceClient();
  const limit = Math.max(1, Math.min(opts.limit ?? 50, 200)); // lô nhỏ cho vừa giới hạn thời gian hàm Vercel
  const model = opts.model || (await getAiConfig()).model;
  const cands = await pickUnlabeled(db, model, opts.scope ?? {}, limit);
  const humanDecided = new Set(cands.filter((p) => p.relevance_source === "HUMAN").map((p) => p.post_id));

  const targets = cands.map((p) => ({
    postId: p.post_id,
    input: { text: p.raw_text, platform: p.platform, hashtags: hashtagsOf(p.raw_payload) } satisfies PostLabelInput,
  }));

  return runAiTask({
    task: buildPostLabelTask(),
    targets,
    model,
    trigger: opts.trigger,
    triggeredBy: opts.triggeredBy,
    // Người thắng AI: bài người đã kết luận thì AI chỉ ghi nhãn (để đo), không đổi kết luận.
    afterSave: async (t, output, confidence) => {
      if (!t.postId || humanDecided.has(t.postId)) return;
      await db
        .from("posts")
        .update({ relevance: relevanceFromAi(output, confidence), relevance_source: "AI", relevance_at: new Date().toISOString() })
        .eq("post_id", t.postId)
        .or("relevance_source.is.null,relevance_source.neq.HUMAN");
    },
  });
}

export async function getLabelProgress(model: string, scope: LabelScope = {}) {
  const db = getServiceClient();
  const [all, labeled] = await Promise.all([
    postsQuery(db, scope, "post_id", true),
    // Số nhãn AI (một bài chỉ có một nhãn thành công cho mỗi bộ phiên bản); khi có lọc phạm vi thì đếm qua bài.
    scope.since || (scope.data && scope.data !== "all")
      ? (() => {
          let q = aiLabelsQuery(db, model, "post_id, posts!inner(post_id)", true);
          if (scope.since) q = q.gte("posts.created_at", scope.since);
          if (scope.data === "mock") q = q.eq("posts.raw_payload->>mock", "true");
          if (scope.data === "real") q = q.or("raw_payload->>mock.is.null,raw_payload->>mock.neq.true", { referencedTable: "posts" });
          return q;
        })()
      : aiLabelsQuery(db, model, "post_id", true),
  ]);
  if (all.error) throw new Error(all.error.message);
  if (labeled.error) throw new Error(labeled.error.message);
  const total = all.count ?? 0;
  const done = Math.min(total, labeled.count ?? 0);
  return { total, labeled: done, remaining: Math.max(0, total - done) };
}

export async function labelEvalSet(opts: { evalSet: string; triggeredBy?: string | null; model?: string }): Promise<AiRunSummary> {
  const db = getServiceClient();
  const model = opts.model || (await getAiConfig()).model;
  const { data, error } = await db.from("eval_items").select("item_id, platform, text").eq("eval_set", opts.evalSet).order("item_code");
  if (error) throw new Error(error.message);
  const ids = (data ?? []).map((r) => r.item_id as number);
  const done = new Set<number>();
  if (ids.length) {
    const { data: lab } = await db
      .from("ai_labels")
      .select("eval_item_id")
      .in("eval_item_id", ids)
      .eq("task", "POST_LABEL")
      .eq("codebook_version", CURRENT_CODEBOOK.version)
      .eq("prompt_version", POST_LABEL_PROMPT_VERSION)
      .eq("model", model)
      .is("error", null);
    (lab ?? []).forEach((r) => done.add(r.eval_item_id as number));
  }
  const targets = (data ?? [])
    .filter((r) => !done.has(r.item_id as number)) // đã chấm với model này rồi thì không trả tiền chấm lại
    .map((r) => ({
      evalItemId: r.item_id as number,
      input: { text: r.text as string, platform: r.platform as string } satisfies PostLabelInput,
    }));
  if (!targets.length && ids.length)
    return { runId: null, status: "SKIPPED", total: 0, ok: 0, failed: 0, costUsd: 0, message: `Model này đã chấm đủ ${ids.length} bài của bộ ${opts.evalSet}.` };
  return runAiTask({ task: buildPostLabelTask(), targets, model, trigger: "EVAL", triggeredBy: opts.triggeredBy });
}
