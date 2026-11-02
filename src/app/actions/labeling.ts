"use server";

// Trang Gắn nhãn: chạy AI theo lô, hàng đợi xác minh, lưu nhãn người.
// Mọi thao tác ở đây dành cho NGHIÊN CỨU VIÊN (profiles.is_researcher). Quản trị viên không có vai này thì không vào được.
// Cộng tác viên không xác minh bài hệ thống (help/thiet-ke/sang-loc-ai).
import { requireResearcher } from "@/lib/auth/guards";
import { getLabelProgress, labelEvalSet, labelPendingPosts, type LabelScope } from "@/lib/ai/jobs";
import { getAiConfig } from "@/lib/ai/openrouter";
import { getAiPolicy, getMonthSpendUsd, type AiRunSummary } from "@/lib/ai/runner";
import { getQueue, getQueueCounts, saveReview, type AiSuggestion, type QueueBucket, type QueueItem } from "@/lib/ai/review";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

function cleanScope(s: LabelScope | undefined): LabelScope {
  const since = s?.since && /^\d{4}-\d{2}-\d{2}/.test(s.since) ? s.since : null;
  const data = s?.data === "mock" || s?.data === "real" ? s.data : "all";
  return { since, data };
}

export type LabelBatchResult = {
  summary: AiRunSummary;
  progress: { total: number; labeled: number; remaining: number };
  monthSpend: number | null;
  budget: number;
};

/** Gắn nhãn một lô (trình duyệt gọi lặp lại từng lô để có tiến độ và không quá giới hạn thời gian). */
export async function runLabelBatch(opts: { limit?: number; scope?: LabelScope; model?: string }): Promise<Result<LabelBatchResult>> {
  try {
    const u = await requireResearcher();
    const scope = cleanScope(opts.scope);
    const model = opts.model?.trim() || (await getAiConfig()).model;
    const limit = Math.max(1, Math.min(opts.limit ?? 20, 40));
    const summary = await labelPendingPosts({ limit, trigger: "MANUAL", triggeredBy: u.id, model, scope });
    const [progress, monthSpend, policy] = await Promise.all([getLabelProgress(model, scope), getMonthSpendUsd(), getAiPolicy()]);
    return { ok: true, data: { summary, progress, monthSpend, budget: policy.monthlyBudgetUsd } };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLabelingProgress(opts: { scope?: LabelScope; model?: string }): Promise<Result<{ total: number; labeled: number; remaining: number; model: string }>> {
  try {
    await requireResearcher();
    const model = opts.model?.trim() || (await getAiConfig()).model;
    return { ok: true, data: { ...(await getLabelProgress(model, cleanScope(opts.scope))), model } };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function runEvalSet(opts: { evalSet?: string; model?: string }): Promise<Result<AiRunSummary>> {
  try {
    const u = await requireResearcher();
    return { ok: true, data: await labelEvalSet({ evalSet: opts.evalSet || "MO_PHONG_50", triggeredBy: u.id, model: opts.model?.trim() || undefined }) };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function loadQueue(opts: { bucket: QueueBucket; purpose?: string | null; limit?: number }): Promise<Result<{ items: QueueItem[]; counts: Record<QueueBucket, number> }>> {
  try {
    await requireResearcher();
    const [q, counts] = await Promise.all([getQueue(opts.bucket, Math.max(1, Math.min(opts.limit ?? 20, 50)), opts.purpose ?? null), getQueueCounts()]);
    return { ok: true, data: { items: q.items, counts } };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function submitReview(opts: {
  postId: string;
  labels: Record<string, unknown>;
  unsure: boolean;
  shownAiLabelId: number | null;
  note?: string | null;
}): Promise<Result<{ relevance: string; ai: AiSuggestion | null }>> {
  try {
    const u = await requireResearcher();
    if (!/^[0-9a-f]{64}$/.test(opts.postId)) throw new Error("Mã bài không hợp lệ.");
    return { ok: true, data: await saveReview({ labelerId: u.id, ...opts }) };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}
