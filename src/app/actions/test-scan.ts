"use server";

/**
 * Server Actions cho màn hình "Quét thử" (cộng tác viên).
 *  - Dùng API key Apify CÁ NHÂN của người dùng, chỉ dùng trong lúc gọi:
 *    KHÔNG lưu, KHÔNG ghi log key.
 *  - KHÔNG ghi nội dung bài vào cơ sở dữ liệu.
 *  - CÓ ghi nhật ký hoạt động gọn vào `test_scan_logs` (ai, khi nào, từ khóa, số bài, chi phí…)
 *    bằng service role phía server -> cộng tác viên không tự sửa số liệu được.
 *    Ghi nhật ký lỗi thì KHÔNG làm hỏng việc quét.
 *  - Phải đăng nhập mới gọi được (tránh biến server thành proxy mở).
 */

import { createHash } from "node:crypto";
import { getServiceClient, requireUser } from "@/lib/auth/guards";
import { getScanActor, TERMINAL_STATUSES, type ScanOptions } from "@/lib/scrapers/catalog";
import { detectLanguage } from "@/lib/scrapers/languageFilter";

const APIFY = "https://api.apify.com/v2";
const MAX_KEYWORDS = 20;
const MAX_ROWS_TOTAL = 5000;
const MAX_TEXT = 1500;

export type ScanRun = {
  keyword: string;
  runId: string;
  datasetId: string | null;
  status: string;
  itemCount: number | null;
  usageUsd: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  error?: string | null;
};

export type ScanRow = {
  keywords: string[];
  platform: string;
  native_post_id: string;
  post_url: string;
  author_hash: string | null;
  published_at: string | null;
  text: string;
  lang: string;
  hashtags: string[];
  like_count: number | null;
  comment_count: number | null;
  share_count: number | null;
  view_count: number | null;
  save_count: number | null;
  is_ad: boolean;
};

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

// ---------------- Nhật ký quét thử (test_scan_logs) ----------------
async function createLog(userId: string, actorId: string, platform: string, keywords: string[], perKeyword: number | null, runIds: string[]) {
  try {
    const { data, error } = await getServiceClient()
      .from("test_scan_logs")
      .insert({ user_id: userId, actor_id: actorId, platform, keywords, per_keyword: perKeyword, apify_run_ids: runIds })
      .select("log_id")
      .single();
    if (error) throw error;
    return Number(data.log_id);
  } catch (e) {
    console.error("[quet-thu] không ghi được nhật ký:", errMsg(e));
    return null;
  }
}

/** Chỉ cho sửa nhật ký của chính mình */
async function ownLog(logId: unknown, userId: string) {
  const id = Number(logId);
  if (!Number.isFinite(id) || id <= 0) return null;
  const { data } = await getServiceClient()
    .from("test_scan_logs")
    .select("log_id, user_id, apify_run_ids, keywords, export_count")
    .eq("log_id", id)
    .maybeSingle();
  return data && data.user_id === userId ? data : null;
}

function cleanToken(t: unknown): string {
  const s = String(t ?? "").trim();
  if (s.length < 10) throw new Error("API key Apify trống hoặc quá ngắn (dạng apify_api_...).");
  return s;
}

function actorPath(actorId: string) {
  // API Apify dùng dạng username~actor-name
  return encodeURIComponent(actorId.replace("/", "~"));
}

type ApifyRunObj = {
  id?: string;
  defaultDatasetId?: string;
  status?: string;
  statusMessage?: string;
  usageTotalUsd?: number;
  startedAt?: string;
  finishedAt?: string;
};

async function apify<T>(token: string, method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const res = await fetch(APIFY + path, {
    method,
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  const obj = json && typeof json === "object" && !Array.isArray(json) ? (json as Record<string, unknown>) : null;
  if (!res.ok) {
    const errObj = obj?.error as { message?: string } | undefined;
    const msg: string = errObj?.message || text.slice(0, 200) || res.statusText;
    if (res.status === 401) throw new Error("API key Apify không đúng hoặc đã bị thu hồi.");
    if (res.status === 402 || res.status === 403)
      throw new Error("Tài khoản Apify không đủ quyền hoặc hết hạn mức: " + msg);
    throw new Error(`Apify báo lỗi (${res.status}): ${msg}`);
  }
  return (obj && "data" in obj ? obj.data : json) as T;
}

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

function runFromApify(keyword: string, r: ApifyRunObj | null): ScanRun {
  return {
    keyword,
    runId: String(r?.id ?? ""),
    datasetId: r?.defaultDatasetId ? String(r.defaultDatasetId) : null,
    status: String(r?.status ?? "UNKNOWN"),
    itemCount: null,
    usageUsd: typeof r?.usageTotalUsd === "number" ? r.usageTotalUsd : null,
    startedAt: r?.startedAt ?? null,
    finishedAt: r?.finishedAt ?? null,
  };
}

// ------------------------------------------------------------------
// 1. Bắt đầu quét: mỗi từ khóa = 1 lần chạy Apify. Trả về ngay, không chờ.
// ------------------------------------------------------------------
export async function startScan(args: {
  token: string;
  actorId: string;
  keywords: string[];
  perKeyword: number;
  options: ScanOptions;
}): Promise<Result<{ runs: ScanRun[]; logId: number | null }>> {
  try {
    const user = await requireUser();
    const token = cleanToken(args.token);
    const actor = getScanActor(args.actorId);
    if (!actor) throw new Error("Công cụ quét không hợp lệ.");
    const keywords = Array.from(
      new Set((args.keywords || []).map((k) => actor.normalizeKeyword(String(k))).filter(Boolean)),
    );
    if (keywords.length === 0) throw new Error("Chưa nhập từ khóa nào.");
    if (keywords.length > MAX_KEYWORDS) throw new Error(`Tối đa ${MAX_KEYWORDS} từ khóa mỗi lần quét.`);
    const max = Math.min(Math.max(Math.floor(Number(args.perKeyword) || 1), 1), actor.maxPerKeyword);

    const runs = await Promise.all(
      keywords.map(async (kw): Promise<ScanRun> => {
        try {
          const r = await apify<ApifyRunObj>(token, "POST", `/acts/${actorPath(actor.id)}/runs`, actor.buildInput(kw, max, args.options || {}));
          return runFromApify(kw, r);
        } catch (e) {
          return {
            keyword: kw, runId: "", datasetId: null, status: "FAILED", itemCount: null,
            usageUsd: null, startedAt: null, finishedAt: null, error: errMsg(e),
          };
        }
      }),
    );
    // Nếu lỗi key thì mọi run đều lỗi giống nhau -> báo thẳng
    if (runs.every((r) => !r.runId)) throw new Error(runs[0]?.error || "Không khởi chạy được.");
    const logId = await createLog(
      user.id, actor.id, actor.platform, keywords, max, runs.filter((r) => r.runId).map((r) => r.runId),
    );
    return { ok: true, data: { runs, logId } };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

// ------------------------------------------------------------------
// 2. Hỏi tiến độ các lần chạy (trình duyệt gọi định kỳ)
// ------------------------------------------------------------------
export async function getScanStatus(args: { token: string; runs: ScanRun[] }): Promise<Result<ScanRun[]>> {
  try {
    await requireUser();
    const token = cleanToken(args.token);
    const out = await Promise.all(
      (args.runs || []).map(async (run): Promise<ScanRun> => {
        if (!run.runId) return run;
        try {
          const r = await apify<ApifyRunObj>(token, "GET", `/actor-runs/${encodeURIComponent(run.runId)}`);
          const next = { ...runFromApify(run.keyword, r), error: null as string | null };
          if (next.datasetId) {
            try {
              const ds = await apify<{ itemCount?: number }>(token, "GET", `/datasets/${encodeURIComponent(next.datasetId)}`);
              next.itemCount = typeof ds?.itemCount === "number" ? ds.itemCount : null;
            } catch {
              /* chưa có dataset */
            }
          }
          if (next.status === "FAILED" || next.status === "TIMED-OUT") next.error = r?.statusMessage || null;
          return next;
        } catch (e) {
          return { ...run, error: errMsg(e) };
        }
      }),
    );
    return { ok: true, data: out };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

// ------------------------------------------------------------------
// 3. Dừng các lần chạy chưa xong (tiết kiệm tiền)
// ------------------------------------------------------------------
export async function abortScan(args: { token: string; runs: ScanRun[] }): Promise<Result<number>> {
  try {
    await requireUser();
    const token = cleanToken(args.token);
    let n = 0;
    await Promise.all(
      (args.runs || [])
        .filter((r) => r.runId && !TERMINAL_STATUSES.includes(r.status))
        .map(async (r) => {
          try {
            await apify(token, "POST", `/actor-runs/${encodeURIComponent(r.runId)}/abort`);
            n++;
          } catch {
            /* bỏ qua */
          }
        }),
    );
    return { ok: true, data: n };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

// ------------------------------------------------------------------
// 4. Thêm một lần chạy đã chạy sẵn trên Apify Console (dán mã hoặc link)
// ------------------------------------------------------------------
export async function lookupRun(args: {
  token: string;
  runIdOrUrl: string;
  keyword: string;
  actorId: string;
  logId?: number | null;
}): Promise<Result<{ run: ScanRun; logId: number | null }>> {
  try {
    const user = await requireUser();
    const token = cleanToken(args.token);
    const s = String(args.runIdOrUrl || "").trim();
    const m = s.match(/runs\/([A-Za-z0-9]+)/);
    const runId = m ? m[1] : s;
    if (!/^[A-Za-z0-9]{8,}$/.test(runId)) throw new Error("Mã lần quét không hợp lệ.");
    const r = await apify<ApifyRunObj>(token, "GET", `/actor-runs/${encodeURIComponent(runId)}`);
    const run = runFromApify(args.keyword?.trim() || "(chạy trên Apify)", r);
    // Ghi vào nhật ký: thêm vào lần quét đang mở, hoặc tạo nhật ký mới
    let logId: number | null = null;
    const own = await ownLog(args.logId, user.id);
    if (own) {
      logId = Number(own.log_id);
      await getServiceClient()
        .from("test_scan_logs")
        .update({
          apify_run_ids: Array.from(new Set([...(own.apify_run_ids || []), run.runId])),
          keywords: Array.from(new Set([...(own.keywords || []), run.keyword])),
        })
        .eq("log_id", logId);
    } else {
      const actor = getScanActor(args.actorId);
      logId = await createLog(user.id, args.actorId, actor?.platform ?? "", [run.keyword], null, [run.runId]);
    }
    return { ok: true, data: { run, logId } };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

// ------------------------------------------------------------------
// 5. Tải kết quả, đọc bằng adapter, ẩn danh tác giả. Không ghi DB.
// ------------------------------------------------------------------
export async function fetchScanResults(args: {
  token: string;
  actorId: string;
  runs: ScanRun[];
  logId?: number | null;
}): Promise<Result<{ rows: ScanRow[]; rawCount: number; skipped: number; truncated: boolean }>> {
  try {
    const user = await requireUser();
    const token = cleanToken(args.token);
    const actor = getScanActor(args.actorId);
    if (!actor) throw new Error("Công cụ quét không hợp lệ.");

    const rows: ScanRow[] = [];
    let rawCount = 0;
    let skipped = 0;
    let truncated = false;

    for (const run of args.runs || []) {
      if (!run.datasetId) continue;
      let offset = 0;
      while (rows.length < MAX_ROWS_TOTAL) {
        const items = await apify<unknown[]>(
          token,
          "GET",
          `/datasets/${encodeURIComponent(run.datasetId)}/items?clean=true&offset=${offset}&limit=1000`,
        );
        if (!Array.isArray(items) || items.length === 0) break;
        for (const raw of items) {
          rawCount++;
          const p = actor.parseItem(raw);
          if (!p) {
            skipped++;
            continue;
          }
          if (rows.length >= MAX_ROWS_TOTAL) {
            truncated = true;
            break;
          }
          const lang = p.lang_hint || detectLanguage(p.text).lang;
          rows.push({
            keywords: [run.keyword],
            platform: p.platform,
            native_post_id: p.native_post_id,
            post_url: p.post_url,
            // Cùng cách băm với DB: sha256("PLATFORM:id")
            author_hash: p.author_native_id
              ? createHash("sha256").update(`${p.platform}:${p.author_native_id}`, "utf8").digest("hex")
              : null,
            published_at: p.published_at,
            text: p.text.length > MAX_TEXT ? p.text.slice(0, MAX_TEXT) + "…" : p.text,
            lang,
            hashtags: p.hashtags,
            like_count: p.like_count,
            comment_count: p.comment_count,
            share_count: p.share_count,
            view_count: p.view_count,
            save_count: p.save_count,
            is_ad: p.is_ad,
          });
        }
        if (items.length < 1000 || truncated) break;
        offset += 1000;
      }
      if (rows.length >= MAX_ROWS_TOTAL) {
        truncated = true;
        break;
      }
    }

    // Gộp bài trùng (cùng một bài tìm thấy qua nhiều từ khóa)
    const byKey = new Map<string, ScanRow>();
    for (const r of rows) {
      const k = r.platform + "::" + r.native_post_id;
      const prev = byKey.get(k);
      if (!prev) byKey.set(k, r);
      else prev.keywords = Array.from(new Set([...prev.keywords, ...r.keywords]));
    }

    const finalRows = Array.from(byKey.values());
    await updateLogStats(user.id, args.logId, token, args.runs || [], finalRows, actor.normalizeKeyword);
    return { ok: true, data: { rows: finalRows, rawCount, skipped, truncated } };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

// ------------------------------------------------------------------
// Ghi số liệu tổng vào nhật ký (do server tính, không tin số từ trình duyệt)
// ------------------------------------------------------------------
async function updateLogStats(
  userId: string,
  logId: number | null | undefined,
  token: string,
  runs: ScanRun[],
  rows: ScanRow[],
  normalize: (k: string) => string,
) {
  try {
    const own = await ownLog(logId, userId);
    if (!own) return;
    const svc = getServiceClient();
    // Chi phí thật lấy lại từ Apify
    let cost = 0;
    for (const r of runs) {
      if (!r.runId) continue;
      try {
        const run = await apify<ApifyRunObj>(token, "GET", `/actor-runs/${encodeURIComponent(r.runId)}`);
        cost += typeof run?.usageTotalUsd === "number" ? run.usageTotalUsd : 0;
      } catch {
        /* bỏ qua */
      }
    }
    // Hashtag mới = chưa có trong danh mục và không phải từ khóa đang quét
    const { data: tags } = await svc.from("hashtags").select("hashtag_text");
    const known = new Set((tags || []).map((x: { hashtag_text: string | null }) => String(x.hashtag_text || "").replace(/^#+/, "").toLowerCase()));
    const scanned = new Set((own.keywords || []).map((k: string) => normalize(k).replace(/^#+/, "").replace(/\s+/g, "").toLowerCase()));
    const count = new Map<string, number>();
    for (const row of rows) for (const h of row.hashtags) if (!known.has(h) && !scanned.has(h)) count.set(h, (count.get(h) ?? 0) + 1);
    const newTags = Array.from(count.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 200)
      .map(([h]) => h);
    await svc
      .from("test_scan_logs")
      .update({
        results_loaded_at: new Date().toISOString(),
        posts_total: rows.length,
        posts_vi: rows.filter((r) => r.lang === "vi").length,
        new_hashtags: newTags,
        cost_usd: Math.round(cost * 10000) / 10000,
      })
      .eq("log_id", Number(own.log_id));
  } catch (e) {
    console.error("[quet-thu] không cập nhật được nhật ký:", errMsg(e));
  }
}

/** Đếm số lần xuất Excel */
export async function logExport(args: { logId: number | null }): Promise<Result<true>> {
  try {
    const user = await requireUser();
    const own = await ownLog(args.logId, user.id);
    if (own) {
      await getServiceClient()
        .from("test_scan_logs")
        .update({ export_count: Number(own.export_count || 0) + 1 })
        .eq("log_id", Number(own.log_id));
    }
    return { ok: true, data: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}
