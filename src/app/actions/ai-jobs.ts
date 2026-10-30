"use server";

/** Nút chạy AI thủ công cho admin (chờ sẵn; giao diện gắn sau khi chốt cách dùng). */
import { requireAdmin } from "@/lib/auth/guards";
import { labelEvalSet, labelPendingPosts } from "@/lib/ai/jobs";
import type { AiRunSummary } from "@/lib/ai/runner";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export async function runPostLabelingNow(limit = 20, model?: string): Promise<Result<AiRunSummary>> {
  try {
    const u = await requireAdmin();
    return { ok: true, data: await labelPendingPosts({ limit, trigger: "MANUAL", triggeredBy: u.id, model }) };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function runEvalSetNow(evalSet: string, model?: string): Promise<Result<AiRunSummary>> {
  try {
    const u = await requireAdmin();
    return { ok: true, data: await labelEvalSet({ evalSet, triggeredBy: u.id, model }) };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}
