"use server";

// Trang Đo tương tác: xem bài đến hạn, bấm "Đo ngay". Việc vận hành -> chỉ quản trị viên.
import { requireAdmin } from "@/lib/auth/guards";
import { listDue, runMeasureBatch, type MeasureSummary } from "@/lib/measure/runner";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export async function previewDue(mode: "due" | "inventory" = "due"): Promise<Result<{ total: number; byReason: Record<string, number>; byPlatform: Record<string, number> }>> {
  try {
    await requireAdmin();
    const r = await listDue({ mode });
    const byPlatform: Record<string, number> = {};
    for (const d of r.due) byPlatform[d.sf] = (byPlatform[d.sf] ?? 0) + 1;
    return { ok: true, data: { total: r.due.length, byReason: r.byReason, byPlatform } };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/** Một lô nhỏ (trình duyệt gọi lặp để có tiến độ và không quá giới hạn thời gian). */
export async function measureNow(opts: { limit?: number; mode?: "due" | "inventory" }): Promise<Result<MeasureSummary>> {
  try {
    const u = await requireAdmin();
    const limit = Math.max(1, Math.min(opts.limit ?? 25, 50));
    return { ok: true, data: await runMeasureBatch({ limit, mode: opts.mode ?? "due", trigger: "MANUAL", triggeredBy: u.id, timeBudgetMs: 50_000 }) };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}
