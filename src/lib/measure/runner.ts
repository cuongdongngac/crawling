// ==========================================================
// BỘ CHẠY ĐO TƯƠNG TÁC — một đợt: chọn bài đến hạn -> gọi Social Fetch -> ghi số liệu.
// Gọi được từ 3 nơi, cùng một hàm: Vercel Cron (/api/cron/daily), nút "Đo ngay" (trang Đo tương tác),
// script chạy ở máy bất kỳ (scripts/measure-run.mts). Chỉ dùng phía server (service role).
//
// Mỗi nền tảng một dòng collection_runs (run_type MEASURE, actor socialfetch/...), mỗi bài một dòng post_snapshots.
// Có trần chi phí tháng; có giới hạn thời gian để vừa giới hạn của hàm Vercel.
// BÀI GIẢ (raw_payload.mock = true) KHÔNG BAO GIỜ được gửi đi đo — link giả sẽ bị báo "không thấy" và tốn lượt.
// ==========================================================
import { getServiceClient } from "@/lib/auth/guards";
import { dueReason, sfPlatform, type Candidate, type Due, type MeasureReason } from "@/lib/measure/schedule";
import { fetchPostMetrics, type SfMetrics, type SfPlatform } from "@/lib/measure/socialfetch";
import { CONFIRM_AFTER_HOURS } from "@/lib/measure/schedule";

export const SF_SETTING_KEY = "SOCIALFETCH_API_KEY";
export const SF_SETTING_BUDGET = "MEASURE_MONTHLY_BUDGET_USD";
export const SF_SETTING_PRICE = "SOCIALFETCH_USD_PER_CREDIT";
export const DEFAULT_MEASURE_BUDGET_USD = 40;
/** Giá mặc định theo gói Starter (14 USD / 1.000 lượt) — cao nhất, để trần chi phí không bị vượt; đổi theo gói thật ở trang Cấu hình. */
export const DEFAULT_USD_PER_CREDIT = 0.014;

const ACTOR: Record<SfPlatform, string> = { tiktok: "socialfetch/tiktok-videos", facebook: "socialfetch/facebook-posts" };
const RUN_PLATFORM: Record<SfPlatform, string> = { tiktok: "TIKTOK", facebook: "FACEBOOK" };

type SB = ReturnType<typeof getServiceClient>;

export async function getMeasureConfig() {
  const { data } = await getServiceClient()
    .from("system_settings")
    .select("setting_key, setting_value")
    .in("setting_key", [SF_SETTING_KEY, SF_SETTING_BUDGET, SF_SETTING_PRICE]);
  const m = new Map((data ?? []).map((r) => [r.setting_key as string, r.setting_value as string]));
  const budget = Number(m.get(SF_SETTING_BUDGET));
  const price = Number(m.get(SF_SETTING_PRICE));
  return {
    apiKey: m.get(SF_SETTING_KEY) || process.env.SOCIALFETCH_API_KEY || null,
    keyFromEnv: !m.get(SF_SETTING_KEY) && !!process.env.SOCIALFETCH_API_KEY,
    monthlyBudgetUsd: Number.isFinite(budget) && budget >= 0 ? budget : DEFAULT_MEASURE_BUDGET_USD,
    usdPerCredit: Number.isFinite(price) && price > 0 ? price : DEFAULT_USD_PER_CREDIT,
  };
}

/** Chi phí đo từ đầu tháng (giờ UTC), cộng từ collection_runs loại MEASURE. */
export async function getMeasureSpendUsd(db: SB = getServiceClient()): Promise<number> {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const { data, error } = await db.from("collection_runs").select("cost_usd").eq("run_type", "MEASURE").gte("started_at", start.toISOString());
  if (error) throw new Error(error.message);
  return (data ?? []).reduce((s, r) => s + Number(r.cost_usd || 0), 0);
}

export type DueItem = Candidate & Due & { sf: SfPlatform };

/** Danh sách bài đến hạn đo (đã sắp theo ưu tiên). */
export async function listDue(opts: { mode?: "due" | "inventory"; now?: number; includeMock?: boolean } = {}): Promise<{ due: DueItem[]; scanned: number; byReason: Record<string, number> }> {
  const db = getServiceClient();
  const now = opts.now ?? Date.now();
  const due: DueItem[] = [];
  let scanned = 0;
  for (let from = 0; from < 200_000; from += 1000) {
    let q = db
      .from("v_measure_candidates")
      .select("post_id, platform, post_url, created_at, published_at, missing_since, last_at, last_eng, prev_at, prev_eng, is_mock")
      .order("post_id")
      .range(from, from + 999);
    if (!opts.includeMock) q = q.eq("is_mock", false);
    const { data, error } = await q;
    if (error) throw new Error(`v_measure_candidates: ${error.message} (đã chạy docs/migrations/2026-11-04_do-tuong-tac.sql chưa?)`);
    const rows = (data ?? []) as (Candidate & { is_mock: boolean })[];
    scanned += rows.length;
    for (const r of rows) {
      const sf = sfPlatform(r.platform);
      if (!sf) continue;
      const c: Candidate = { ...r, last_eng: r.last_eng === null ? null : Number(r.last_eng), prev_eng: r.prev_eng === null ? null : Number(r.prev_eng) };
      const d = dueReason(c, now, opts.mode ?? "due");
      if (d) due.push({ ...c, ...d, sf });
    }
    if (rows.length < 1000) break;
  }
  due.sort((a, b) => a.priority - b.priority || a.dueAt - b.dueAt);
  const byReason: Record<string, number> = {};
  for (const d of due) byReason[d.reason] = (byReason[d.reason] ?? 0) + 1;
  return { due, scanned, byReason };
}

export type MeasureSummary = {
  status: "DONE" | "PARTIAL" | "SKIPPED" | "BUDGET_STOPPED" | "FAILED";
  message?: string;
  dueTotal: number;
  planned: number;
  done: number;
  found: number;
  notFound: number;
  confirmedGone: number;
  failed: number;
  credits: number;
  costUsd: number;
  runIds: number[];
  byReason: Record<string, number>;
};

export async function runMeasureBatch(opts: {
  limit?: number;
  mode?: "due" | "inventory";
  trigger: "CRON" | "MANUAL" | "SCRIPT";
  triggeredBy?: string | null;
  /** Ngừng nhận bài mới sau khoảng thời gian này (ms) — để vừa giới hạn thời gian của hàm Vercel. */
  timeBudgetMs?: number;
  concurrency?: number;
  includeMock?: boolean;
}): Promise<MeasureSummary> {
  const db = getServiceClient();
  const t0 = Date.now();
  const empty: MeasureSummary = { status: "SKIPPED", dueTotal: 0, planned: 0, done: 0, found: 0, notFound: 0, confirmedGone: 0, failed: 0, credits: 0, costUsd: 0, runIds: [], byReason: {} };

  const cfg = await getMeasureConfig();
  if (!cfg.apiKey) return { ...empty, message: "Chưa khai báo khóa Social Fetch (trang Cấu hình)." };

  const { due, byReason } = await listDue({ mode: opts.mode, includeMock: opts.includeMock });
  if (!due.length) return { ...empty, byReason, message: "Không có bài nào đến hạn đo." };

  const spent = await getMeasureSpendUsd(db);
  const left = cfg.monthlyBudgetUsd - spent;
  const maxByBudget = Math.max(0, Math.floor(left / cfg.usdPerCredit));
  if (maxByBudget === 0)
    return { ...empty, status: "BUDGET_STOPPED", dueTotal: due.length, byReason, message: `Đã chạm trần chi phí đo tháng này ($${spent.toFixed(2)} / $${cfg.monthlyBudgetUsd}).` };
  const limit = Math.max(1, Math.min(opts.limit ?? 500, 5000));
  const items = due.slice(0, Math.min(limit, maxByBudget));

  // Mỗi nền tảng một dòng collection_runs
  const runId = new Map<SfPlatform, number>();
  for (const sf of Array.from(new Set(items.map((i) => i.sf)))) {
    const reasons: Record<string, number> = {};
    for (const i of items) if (i.sf === sf) reasons[i.reason] = (reasons[i.reason] ?? 0) + 1;
    const { data, error } = await db
      .from("collection_runs")
      .insert({
        researcher_code: "SYSTEM",
        platform: RUN_PLATFORM[sf],
        actor_id: ACTOR[sf],
        run_type: "MEASURE",
        status: "RUNNING",
        priority: 1,
        query_parameters: { mode: opts.mode ?? "due", trigger: opts.trigger, triggered_by: opts.triggeredBy ?? null, planned: items.filter((i) => i.sf === sf).length, reasons },
      })
      .select("run_id")
      .single();
    if (error || !data) throw new Error(`Không tạo được lần đo (${error?.message}). Kiểm tra bảng apify_actors có ${ACTOR[sf]} (migration 2026-10-31_bo-sung-sang-loc-do-luong.sql).`);
    runId.set(sf, data.run_id as number);
  }

  type Out = { item: DueItem; kind: "found" | "not_found" | "failed"; metrics?: SfMetrics; credits: number; error?: string; at: string };
  const outs: Out[] = [];
  const queue = [...items];
  let fatal: string | null = null;
  const deadline = t0 + (opts.timeBudgetMs ?? 240_000);

  async function worker() {
    while (queue.length && !fatal && Date.now() < deadline) {
      const item = queue.shift()!;
      const r = await fetchPostMetrics(item.sf, item.post_url, cfg.apiKey!);
      const at = new Date().toISOString();
      if (r.kind === "found") outs.push({ item, kind: "found", metrics: r.metrics, credits: r.credits, at });
      else if (r.kind === "not_found") outs.push({ item, kind: "not_found", credits: r.credits, at });
      else {
        outs.push({ item, kind: "failed", credits: r.credits, error: r.error, at });
        if (r.fatal) fatal = r.error;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(opts.concurrency ?? 6, 20)) }, worker));

  // Ghi số liệu: mỗi bài một dòng post_snapshots
  const snaps = outs
    .filter((o) => o.kind === "found")
    .map((o) => ({ post_id: o.item.post_id, run_id: runId.get(o.item.sf)!, observed_at: o.at, ...o.metrics! }));
  for (let i = 0; i < snaps.length; i += 500) {
    const { error } = await db.from("post_snapshots").insert(snaps.slice(i, i + 500));
    if (error) throw new Error(`Ghi post_snapshots: ${error.message}`);
  }

  // Còn/mất: thấy lại -> xóa missing_since; không thấy lần đầu -> ghi missing_since; không thấy lần 2 (>= 24h) -> unavailable_at
  const nowIso = new Date().toISOString();
  const seenAgain = outs.filter((o) => o.kind === "found" && o.item.missing_since).map((o) => o.item.post_id);
  const firstMiss = outs.filter((o) => o.kind === "not_found" && !o.item.missing_since).map((o) => o.item.post_id);
  const gone = outs
    .filter((o) => o.kind === "not_found" && o.item.missing_since && Date.now() - Date.parse(o.item.missing_since) >= CONFIRM_AFTER_HOURS * 3_600_000)
    .map((o) => o.item.post_id);
  const chunked = async (ids: string[], patch: Record<string, string | null>) => {
    for (let i = 0; i < ids.length; i += 200) {
      const { error } = await db.from("posts").update(patch).in("post_id", ids.slice(i, i + 200));
      if (error) throw new Error(`Cập nhật posts: ${error.message}`);
    }
  };
  await chunked(seenAgain, { missing_since: null });
  await chunked(firstMiss, { missing_since: nowIso });
  await chunked(gone, { unavailable_at: nowIso });

  // Đóng từng lần đo
  let credits = 0;
  for (const [sf, id] of runId) {
    const mine = outs.filter((o) => o.item.sf === sf);
    const c = mine.reduce((s, o) => s + o.credits, 0);
    credits += c;
    const nFail = mine.filter((o) => o.kind === "failed").length;
    const errs = Array.from(new Set(mine.filter((o) => o.error).map((o) => o.error!))).slice(0, 3);
    const status = mine.length === 0 ? "FAILED" : nFail === 0 ? "SUCCESS" : nFail === mine.length ? "FAILED" : "PARTIAL_SUCCESS";
    const skipped = items.filter((i) => i.sf === sf).length - mine.length;
    await db
      .from("collection_runs")
      .update({
        status,
        completed_at: new Date().toISOString(),
        items_count: mine.filter((o) => o.kind === "found").length,
        cost_usd: Number((c * cfg.usdPerCredit).toFixed(4)),
        error_message: [...errs, skipped > 0 ? `${skipped} bài chưa kịp đo (hết thời gian hoặc dừng)` : ""].filter(Boolean).join(" | ") || null,
        query_parameters: {
          mode: opts.mode ?? "due",
          trigger: opts.trigger,
          triggered_by: opts.triggeredBy ?? null,
          planned: items.filter((i) => i.sf === sf).length,
          reasons: Object.fromEntries(Object.entries(byReasonOf(items.filter((i) => i.sf === sf)))),
          found: mine.filter((o) => o.kind === "found").length,
          not_found: mine.filter((o) => o.kind === "not_found").length,
          failed: nFail,
          credits: c,
        },
      })
      .eq("run_id", id);
  }

  const failed = outs.filter((o) => o.kind === "failed").length;
  return {
    status: fatal ? "FAILED" : failed ? "PARTIAL" : "DONE",
    message: fatal ?? (items.length < due.length ? `Còn ${due.length - items.length} bài đến hạn chưa đo (giới hạn số bài hoặc trần chi phí).` : undefined),
    dueTotal: due.length,
    planned: items.length,
    done: outs.length,
    found: outs.filter((o) => o.kind === "found").length,
    notFound: outs.filter((o) => o.kind === "not_found").length,
    confirmedGone: gone.length,
    failed,
    credits,
    costUsd: credits * cfg.usdPerCredit,
    runIds: Array.from(runId.values()),
    byReason,
  };
}

function byReasonOf(items: { reason: MeasureReason }[]) {
  const m: Record<string, number> = {};
  for (const i of items) m[i.reason] = (m[i.reason] ?? 0) + 1;
  return m;
}
