// ==========================================================
// Xác minh nhãn AI của nghiên cứu viên + số liệu "AI so với người". Chỉ gọi phía server, sau khi kiểm quyền.
//
// Hàng đợi (thiết kế help/thiet-ke/sang-loc-ai.md):
//   UNCLEAR  bài AI xếp "chưa rõ"                          -> hiện gợi ý AI (người chỉ cần chốt)
//   SAMPLE   mẫu ~10% bài AI đã kết luận (cả GIỮ lẫn LOẠI, trộn lẫn) -> CHẤM MÙ: ẩn gợi ý và kết luận của AI tới khi lưu.
//            Trộn hai loại trong một hàng để người chấm không đoán được AI đã kết luận gì từ tên hàng.
//            Đo được cả độ nhạy (AI loại nhầm bài thật) và độ đặc hiệu (AI giữ nhầm bài không liên quan).
//   ALL      mọi bài AI đã gắn, lọc theo mục đích          -> hiện gợi ý AI
// Mẫu ~10% chọn cố định theo mã bài (post_id là sha256 hex: 2 ký tự đầu < "1a" ≈ 26/256 ≈ 10%)
// -> ai mở cũng ra cùng mẫu, không chọn lọc được.
// Chấm mù để đo AI không bị "người nhìn gợi ý rồi gật theo" (thiên lệch neo); human_labels.shown_ai_label_id ghi lại điều này.
// ==========================================================
import { getServiceClient } from "@/lib/auth/guards";
import { CURRENT_CODEBOOK, relevanceFromHuman, validateHumanLabels, type LabelValues } from "@/lib/ai/codebook";
import { POST_LABEL_PROMPT_VERSION } from "@/lib/ai/tasks/post-label";
import { computePairStats, type PairStats } from "@/lib/ai/metrics";

export type QueueBucket = "UNCLEAR" | "SAMPLE" | "ALL";
export const SAMPLE_PREFIX_LT = "1a";
export const BLIND_BUCKETS: QueueBucket[] = ["SAMPLE"];

export type AiSuggestion = {
  labelId: number;
  model: string;
  confidence: number | null;
  output: LabelValues & { reason?: string };
  createdAt: string;
};

export type QueueItem = {
  postId: string;
  platform: string;
  url: string;
  isMock: boolean;
  text: string;
  scanHashtag: string | null;
  publishedAt: string | null;
  foundAt: string;
  relevance: string | null; // null khi chấm mù (không lộ kết luận của AI)
  blind: boolean;
  ai: AiSuggestion | null; // null khi chấm mù
};

type SB = ReturnType<typeof getServiceClient>;

type Row = {
  label_id: number;
  post_id: string;
  model: string;
  confidence: number | null;
  output: LabelValues & { reason?: string };
  created_at: string;
  posts: {
    post_id: string; platform: string; post_url: string; raw_text: string | null; raw_payload: Record<string, unknown> | null;
    published_at: string | null; created_at: string; relevance: string; relevance_source: string | null;
  };
};

const QUEUE_COLS =
  "label_id, post_id, model, confidence, output, created_at, posts!inner(post_id, platform, post_url, raw_text, raw_payload, published_at, created_at, relevance, relevance_source)";

function baseQuery(db: SB, bucket: QueueBucket, purpose?: string | null, countOnly = false) {
  let q = db
    .from("ai_labels")
    .select(countOnly ? "label_id, posts!inner(post_id)" : QUEUE_COLS, countOnly ? { count: "exact", head: true } : undefined)
    .not("post_id", "is", null)
    .is("error", null)
    .eq("task", "POST_LABEL")
    .eq("codebook_version", CURRENT_CODEBOOK.version)
    .eq("prompt_version", POST_LABEL_PROMPT_VERSION)
    .eq("posts.relevance_source", "AI");
  if (bucket === "UNCLEAR") q = q.eq("posts.relevance", "UNCLEAR");
  if (bucket === "SAMPLE") q = q.in("posts.relevance", ["RELATED", "UNRELATED"]).lt("post_id", SAMPLE_PREFIX_LT);
  if (bucket === "ALL" && purpose) q = q.eq("output->>purpose", purpose);
  return q;
}

export async function getQueue(bucket: QueueBucket, limit = 20, purpose?: string | null): Promise<{ items: QueueItem[]; scanned: number }> {
  const db = getServiceClient();
  const out: QueueItem[] = [];
  const seen = new Set<string>();
  const blind = BLIND_BUCKETS.includes(bucket);
  let scanned = 0;
  const PAGE = 200;
  for (let from = 0; from < 4000 && out.length < limit; from += PAGE) {
    const { data, error } = await baseQuery(db, bucket, purpose).order("created_at", { ascending: false }).order("label_id").range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as Row[];
    scanned += rows.length;
    if (!rows.length) break;
    const ids = Array.from(new Set(rows.map((r) => r.post_id)));
    const { data: reviewed, error: e2 } = await db.from("human_labels").select("post_id").in("post_id", ids).eq("source", "REVIEW");
    if (e2) throw new Error(e2.message);
    const done = new Set((reviewed ?? []).map((r) => r.post_id as string));
    for (const r of rows) {
      if (out.length >= limit) break;
      if (seen.has(r.post_id) || done.has(r.post_id)) continue; // nhiều model: lấy nhãn mới nhất
      seen.add(r.post_id);
      const p = r.posts;
      out.push({
        postId: r.post_id,
        platform: p.platform,
        url: p.post_url,
        isMock: p.raw_payload?.mock === true,
        text: p.raw_text ?? "",
        scanHashtag: typeof p.raw_payload?.scan_hashtag === "string" ? (p.raw_payload.scan_hashtag as string) : null,
        publishedAt: p.published_at,
        foundAt: p.created_at,
        relevance: blind ? null : p.relevance,
        blind,
        ai: blind ? null : { labelId: r.label_id, model: r.model, confidence: r.confidence === null ? null : Number(r.confidence), output: r.output, createdAt: r.created_at },
      });
    }
    if (rows.length < PAGE) break;
  }
  return { items: out, scanned };
}

/** Số bài còn chờ trong từng hàng (bài đã được người kết luận tự rời hàng vì relevance_source thành HUMAN).
 *  Ước lượng: nếu một bài có nhãn của nhiều model thì bị đếm nhiều lần. */
export async function getQueueCounts(): Promise<Record<QueueBucket, number>> {
  const db = getServiceClient();
  const buckets: QueueBucket[] = ["UNCLEAR", "SAMPLE", "ALL"];
  const res = await Promise.all(
    buckets.map(async (b) => {
      const { count, error } = await baseQuery(db, b, null, true);
      if (error) throw new Error(error.message);
      return [b, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(res) as Record<QueueBucket, number>;
}

async function latestAiLabel(db: SB, postId: string): Promise<AiSuggestion | null> {
  const { data } = await db
    .from("ai_labels")
    .select("label_id, model, confidence, output, created_at")
    .eq("post_id", postId)
    .eq("task", "POST_LABEL")
    .eq("codebook_version", CURRENT_CODEBOOK.version)
    .is("error", null)
    .order("created_at", { ascending: false })
    .limit(1);
  const r = data?.[0];
  return r
    ? { labelId: r.label_id as number, model: r.model as string, confidence: r.confidence === null ? null : Number(r.confidence), output: r.output, createdAt: r.created_at as string }
    : null;
}

/**
 * Lưu nhãn người (source REVIEW) và cập nhật kết luận sàng lọc của bài (người thắng AI).
 * Lưu lại thì ghi đè nhãn cũ của chính người đó cho bài đó (sửa nhầm).
 * Trả về gợi ý AI để hiện so sánh sau khi chấm mù.
 */
export async function saveReview(opts: {
  labelerId: string;
  postId: string;
  labels: unknown;
  unsure: boolean;
  shownAiLabelId: number | null;
  note?: string | null;
}): Promise<{ relevance: string; ai: AiSuggestion | null }> {
  const db = getServiceClient();
  const { labels, errors } = validateHumanLabels(CURRENT_CODEBOOK, opts.labels);
  if (errors.length) throw new Error(errors.join(" "));
  const stored = { ...labels, ...(opts.unsure ? { unsure: true } : {}) };
  const now = new Date().toISOString();
  const row = {
    post_id: opts.postId,
    labeler_id: opts.labelerId,
    source: "REVIEW",
    codebook_version: CURRENT_CODEBOOK.version,
    labels: stored,
    shown_ai_label_id: opts.shownAiLabelId,
    note: opts.note?.slice(0, 500) || null,
    updated_at: now,
  };
  const { data: existing } = await db
    .from("human_labels")
    .select("label_id")
    .eq("post_id", opts.postId)
    .eq("labeler_id", opts.labelerId)
    .eq("source", "REVIEW")
    .eq("codebook_version", CURRENT_CODEBOOK.version)
    .maybeSingle();
  const w = existing
    ? await db.from("human_labels").update(row).eq("label_id", existing.label_id)
    : await db.from("human_labels").insert(row);
  if (w.error) throw new Error(w.error.message);

  const relevance = relevanceFromHuman(labels, opts.unsure);
  const u = await db.from("posts").update({ relevance, relevance_source: "HUMAN", relevance_at: now }).eq("post_id", opts.postId);
  if (u.error) throw new Error(u.error.message);
  return { relevance, ai: await latestAiLabel(db, opts.postId) };
}

// ---------------- Số liệu độ tin cậy ----------------

export type StatsGroup = {
  key: string;
  title: string;
  model: string;
  source: "REVIEW_BLIND" | "REVIEW_SEEN" | "GOLD" | "EVAL";
  stats: PairStats;
};

export type Disagreement = { postId: string; text: string; human: string; ai: string; model: string; reason: string | null; at: string };

type PairRow = {
  human_label_id: number;
  ai_label_id: number;
  post_id: string | null;
  source: string;
  human_saw_ai: boolean;
  model: string;
  prompt_version: string;
  human: LabelValues;
  ai: LabelValues & { reason?: string };
  human_at: string;
};

export async function loadReliability(): Promise<{ groups: StatsGroup[]; disagreements: Disagreement[]; reviewedCount: number; error: string | null }> {
  const db = getServiceClient();
  const pairs: PairRow[] = [];
  for (let from = 0; from < 50000; from += 1000) {
    const { data, error } = await db
      .from("v_ai_human_pairs")
      .select("human_label_id, ai_label_id, post_id, source, human_saw_ai, model, prompt_version, human, ai, human_at")
      .eq("codebook_version", CURRENT_CODEBOOK.version)
      .eq("prompt_version", POST_LABEL_PROMPT_VERSION)
      .not("post_id", "is", null)
      .range(from, from + 999);
    if (error) return { groups: [], disagreements: [], reviewedCount: 0, error: error.message };
    pairs.push(...((data ?? []) as PairRow[]));
    if (!data || data.length < 1000) break;
  }
  // Người đánh dấu "chưa chắc" thì không dùng làm chuẩn
  const usable = pairs.filter((p) => !(p.human as Record<string, unknown>)?.unsure);

  const buckets = new Map<string, { title: string; model: string; source: StatsGroup["source"]; rows: PairRow[] }>();
  for (const p of usable) {
    const source: StatsGroup["source"] = p.source === "GOLD" ? "GOLD" : p.source === "REVIEW" ? (p.human_saw_ai ? "REVIEW_SEEN" : "REVIEW_BLIND") : "REVIEW_SEEN";
    if (p.source === "CALIBRATION") continue;
    const key = `${source}|${p.model}`;
    const title =
      source === "REVIEW_BLIND" ? "Người chấm mù (không thấy gợi ý AI)" : source === "REVIEW_SEEN" ? "Người xác minh khi thấy gợi ý AI" : "Đáp án dữ liệu giả (GOLD)";
    if (!buckets.has(key)) buckets.set(key, { title, model: p.model, source, rows: [] });
    buckets.get(key)!.rows.push(p);
  }

  // Tập chuẩn (bộ bài mô phỏng): AI so với đáp án expected
  const { data: evalRows } = await db
    .from("ai_labels")
    .select("model, output, eval_items!inner(eval_set, expected)")
    .not("eval_item_id", "is", null)
    .is("error", null)
    .eq("codebook_version", CURRENT_CODEBOOK.version)
    .eq("prompt_version", POST_LABEL_PROMPT_VERSION);
  const evalBuckets = new Map<string, { model: string; set: string; pairs: { ai: LabelValues; ref: LabelValues }[] }>();
  for (const r of (evalRows ?? []) as unknown as { model: string; output: LabelValues; eval_items: { eval_set: string; expected: LabelValues } }[]) {
    const k = `${r.eval_items.eval_set}|${r.model}`;
    if (!evalBuckets.has(k)) evalBuckets.set(k, { model: r.model, set: r.eval_items.eval_set, pairs: [] });
    evalBuckets.get(k)!.pairs.push({ ai: r.output, ref: r.eval_items.expected });
  }

  const order: Record<StatsGroup["source"], number> = { REVIEW_BLIND: 0, REVIEW_SEEN: 1, GOLD: 2, EVAL: 3 };
  const groups: StatsGroup[] = [
    ...[...buckets.entries()].map(([key, b]) => ({ key, title: b.title, model: b.model, source: b.source, stats: computePairStats(CURRENT_CODEBOOK, b.rows.map((r) => ({ ai: r.ai, ref: r.human }))) })),
    ...[...evalBuckets.entries()].map(([key, b]) => ({ key: "EVAL|" + key, title: `Bộ bài mô phỏng ${b.set}`, model: b.model, source: "EVAL" as const, stats: computePairStats(CURRENT_CODEBOOK, b.pairs) })),
  ].sort((a, b) => order[a.source] - order[b.source] || b.stats.relevance.n - a.stats.relevance.n);

  // Ca AI và người khác nhau về mục đích (người thật, mới nhất) — để xem AI sai kiểu gì
  const diff = usable
    .filter((p) => p.source === "REVIEW" && p.human?.purpose && p.ai?.purpose && p.human.purpose !== p.ai.purpose)
    .sort((a, b) => (a.human_at < b.human_at ? 1 : -1))
    .slice(0, 25);
  const texts = new Map<string, string>();
  if (diff.length) {
    const { data } = await db.from("posts").select("post_id, raw_text").in("post_id", diff.map((d) => d.post_id!));
    (data ?? []).forEach((p) => texts.set(p.post_id as string, (p.raw_text as string) ?? ""));
  }
  const disagreements = diff.map((d) => ({
    postId: d.post_id!,
    text: (texts.get(d.post_id!) ?? "").slice(0, 280),
    human: String(d.human.purpose),
    ai: String(d.ai.purpose),
    model: d.model,
    reason: typeof d.ai.reason === "string" ? d.ai.reason : null,
    at: d.human_at,
  }));
  const reviewedCount = new Set(pairs.filter((p) => p.source === "REVIEW").map((p) => p.human_label_id)).size;
  return { groups, disagreements, reviewedCount, error: null };
}
