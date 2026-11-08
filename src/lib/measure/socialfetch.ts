// ==========================================================
// ADAPTER SOCIAL FETCH — đo một bài theo link (04/11/2026).
//   TikTok:   GET /v1/tiktok/videos?url=<link video>
//   Facebook: GET /v1/facebook/posts?url=<link bài hoặc reel>
//   Số dư:    GET /v1/balance (miễn phí)
// Mẫu phản hồi thật: web/docs/Actor/socialfetch/ (GHI-CHU.txt).
//
// CHỈ LẤY những gì cần lưu: còn/mất + like, bình luận, chia sẻ, lượt xem, lượt lưu.
// Bỏ toàn bộ phần còn lại (tên/ảnh tài khoản, link tải video, nhạc, khối dữ liệu thô ~41 KB...).
//
// lookupStatus: found = có bài; not_found = không thấy (CÓ tính lượt); lookup_failed = lỗi phía họ (không tính lượt).
// HTTP 402 = hết lượt -> dừng cả đợt. 429/503 = quá tải tạm thời -> chờ Retry-After rồi thử lại 1 lần.
// ==========================================================

export const SF_BASE = process.env.SOCIALFETCH_BASE_URL || "https://api.socialfetch.dev";

export type SfPlatform = "tiktok" | "facebook";

export type SfMetrics = {
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  share_count: number | null;
  save_count: number | null;
};

export type SfResult =
  | { kind: "found"; metrics: SfMetrics; credits: number }
  | { kind: "not_found"; credits: number }
  | { kind: "failed"; credits: number; error: string; fatal?: boolean };

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : null);

/** Chuyển phản hồi thành số liệu cần lưu. Tách riêng để kiểm thử trên mẫu thật trong docs/Actor/socialfetch. */
export function parseSfResponse(platform: SfPlatform, body: unknown): { status: string; metrics: SfMetrics | null; credits: number } {
  const b = (body ?? {}) as { data?: Record<string, unknown>; meta?: { creditsCharged?: number } };
  const d = b.data ?? {};
  const status = String(d.lookupStatus ?? "");
  const m = (d.metrics ?? {}) as Record<string, unknown>;
  const credits = Number(b.meta?.creditsCharged ?? (status === "lookup_failed" ? 0 : 1)) || 0;
  if (status !== "found") return { status, metrics: null, credits };
  return {
    status,
    credits,
    metrics: {
      view_count: num(m.views),
      // Facebook: "likes" = số lượt Thích theo Social Fetch. Nếu sau này cần tổng mọi cảm xúc, đổi ở đây (cộng m.reactions).
      like_count: num(m.likes),
      comment_count: num(m.comments),
      share_count: num(m.shares),
      save_count: platform === "tiktok" ? num(m.saves) : null,
    },
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchPostMetrics(platform: SfPlatform, url: string, apiKey: string, timeoutMs = 45_000): Promise<SfResult> {
  const path = platform === "tiktok" ? "/v1/tiktok/videos" : "/v1/facebook/posts";
  const endpoint = `${SF_BASE}${path}?url=${encodeURIComponent(url)}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    let res: Response;
    try {
      res = await fetch(endpoint, { headers: { "x-api-key": apiKey }, cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
    } catch (e) {
      if (attempt === 0) continue;
      return { kind: "failed", credits: 0, error: `Không gọi được Social Fetch: ${e instanceof Error ? e.message : String(e)}` };
    }
    if (res.status === 402) return { kind: "failed", credits: 0, error: "Social Fetch báo hết lượt (402).", fatal: true };
    if (res.status === 401 || res.status === 403) return { kind: "failed", credits: 0, error: "Khóa Social Fetch không hợp lệ.", fatal: true };
    if ((res.status === 429 || res.status === 503) && attempt === 0) {
      const wait = Math.min(15, Number(res.headers.get("retry-after")) || 3);
      await sleep(wait * 1000);
      continue;
    }
    const text = await res.text();
    let body: unknown = null;
    try {
      body = JSON.parse(text);
    } catch {
      /* để body = null */
    }
    if (!res.ok) return { kind: "failed", credits: 0, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    const p = parseSfResponse(platform, body);
    if (p.status === "found" && p.metrics) return { kind: "found", metrics: p.metrics, credits: p.credits };
    if (p.status === "not_found") return { kind: "not_found", credits: p.credits };
    if (p.status === "lookup_failed" && attempt === 0) continue; // lỗi phía họ, không tính lượt -> thử lại 1 lần
    return { kind: "failed", credits: p.credits, error: `lookupStatus = ${p.status || "(trống)"}` };
  }
  return { kind: "failed", credits: 0, error: "Thử lại không thành công." };
}

/** Số dư lượt (miễn phí, không tính lượt). */
export async function fetchSfBalance(apiKey: string): Promise<{ balance: number | null; raw: unknown }> {
  const res = await fetch(`${SF_BASE}/v1/balance`, { headers: { "x-api-key": apiKey }, cache: "no-store" });
  if (res.status === 401 || res.status === 403) throw new Error("Khóa Social Fetch không hợp lệ.");
  if (!res.ok) throw new Error(`Social Fetch trả lỗi HTTP ${res.status}.`);
  const j = (await res.json()) as { data?: { balance?: number } };
  return { balance: typeof j?.data?.balance === "number" ? j.data.balance : null, raw: j?.data ?? null };
}
