// ==========================================================
// Các việc AI "chờ sẵn" — gọi từ cron quét chính thức hoặc nút của admin.
//   labelPendingPosts: gắn nhãn bài mới (chưa có nhãn cho bộ phiên bản hiện hành).
//   labelEvalSet:      chạy AI trên tập chuẩn (đo độ chính xác khi đổi model/prompt).
// Cách nối vào cron sau này (sau khi ghi bài xong):
//   const p = await getAiPolicy(); if (p.autoEnabled) await labelPendingPosts({ limit: 50, trigger: "CRON" });
// ==========================================================
import { getServiceClient } from "@/lib/auth/guards";
import { getAiConfig } from "@/lib/ai/openrouter";
import { runAiTask, type AiRunSummary } from "@/lib/ai/runner";
import { buildPostLabelTask, POST_LABEL_PROMPT_VERSION, type PostLabelInput } from "@/lib/ai/tasks/post-label";
import { CURRENT_CODEBOOK } from "@/lib/ai/codebook";

function hashtagsOf(payload: unknown): string[] {
  const p = (payload ?? {}) as Record<string, unknown>;
  const h = p.hashtags;
  if (!Array.isArray(h)) return [];
  return h
    .map((x) => (typeof x === "string" ? x : (x as { name?: string })?.name))
    .filter((x): x is string => !!x)
    .map((x) => (x.startsWith("#") ? x : `#${x}`));
}

export async function labelPendingPosts(opts: {
  limit?: number;
  trigger: "CRON" | "MANUAL";
  triggeredBy?: string | null;
  model?: string;
}): Promise<AiRunSummary> {
  const db = getServiceClient();
  const limit = Math.max(1, Math.min(opts.limit ?? 50, 200)); // giữ lô nhỏ cho vừa giới hạn thời gian hàm Vercel
  const model = opts.model || (await getAiConfig()).model;

  const { data: cands, error } = await db
    .from("posts")
    .select("post_id, platform, raw_text, raw_payload")
    .not("raw_text", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit * 4);
  if (error) throw new Error(error.message);

  const ids = (cands ?? []).map((p) => p.post_id as string);
  const done = new Set<string>();
  if (ids.length) {
    const { data: labeled } = await db
      .from("ai_labels")
      .select("post_id")
      .in("post_id", ids)
      .eq("task", "POST_LABEL")
      .eq("codebook_version", CURRENT_CODEBOOK.version)
      .eq("prompt_version", POST_LABEL_PROMPT_VERSION)
      .eq("model", model)
      .is("error", null);
    (labeled ?? []).forEach((r) => done.add(r.post_id as string));
  }

  const targets = (cands ?? [])
    .filter((p) => !done.has(p.post_id as string) && String(p.raw_text).trim().length >= 5)
    .slice(0, limit)
    .map((p) => ({
      postId: p.post_id as string,
      input: { text: p.raw_text as string, platform: p.platform as string, hashtags: hashtagsOf(p.raw_payload) } satisfies PostLabelInput,
    }));

  return runAiTask({ task: buildPostLabelTask(), targets, model, trigger: opts.trigger, triggeredBy: opts.triggeredBy });
}

export async function labelEvalSet(opts: { evalSet: string; triggeredBy?: string | null; model?: string }): Promise<AiRunSummary> {
  const { data, error } = await getServiceClient()
    .from("eval_items")
    .select("item_id, platform, text")
    .eq("eval_set", opts.evalSet)
    .order("item_code");
  if (error) throw new Error(error.message);
  const targets = (data ?? []).map((r) => ({
    evalItemId: r.item_id as number,
    input: { text: r.text as string, platform: r.platform as string } satisfies PostLabelInput,
  }));
  return runAiTask({ task: buildPostLabelTask(), targets, model: opts.model, trigger: "EVAL", triggeredBy: opts.triggeredBy });
}
