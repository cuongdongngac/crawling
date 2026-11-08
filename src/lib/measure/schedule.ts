// ==========================================================
// LỊCH ĐO CỦA MỖI BÀI — thuần tính toán, không gọi DB (dễ kiểm thử, dễ đổi lịch).
// Thiết kế: claude/thiet-ke-do-luong-2026-10-31.md mục 3.
//   - Mốc tính từ lúc hệ thống PHÁT HIỆN bài (posts.created_at): ngày 3, 7, 14, 30.
//     Lần đo ngày 0 chính là số liệu lúc Apify tìm thấy bài.
//   - Bài phát hiện khi đã > 60 ngày tuổi (bài cũ): chỉ đo mốc 30.
//   - Sau 30 ngày: chỉ đo lại bài "còn nóng" (tổng like+bình luận+chia sẻ tăng >= 5% giữa hai lần đo gần nhất),
//     mỗi ~30 ngày một lần.
//   - Lần trước không thấy bài: đo lại sau >= 24 giờ để xác nhận biến mất.
//   - Kiểm kê toàn bộ (trước mỗi đợt phân tích, sau mốc chính sách): bấm tay, mọi bài chưa đo trong 7 ngày.
// ==========================================================

export const DAY = 86_400_000;
export const MILESTONES = [3, 7, 14, 30] as const;
export const OLD_POST_DAYS = 60;
export const HOT_GROWTH = 0.05;
export const HOT_INTERVAL_DAYS = 30;
export const CONFIRM_AFTER_HOURS = 24;
export const INVENTORY_MIN_GAP_DAYS = 7;
/** Đo sớm hơn mốc tối đa nửa ngày vẫn tính là đã đo mốc đó (lịch chạy mỗi ngày một lần, giờ không cố định tuyệt đối). */
const TOLERANCE = DAY / 2;

export type MeasureReason = "CONFIRM_UNAVAILABLE" | `MILESTONE_${(typeof MILESTONES)[number]}` | "INVENTORY_HOT" | "INVENTORY_FULL";

export type Candidate = {
  post_id: string;
  platform: string;
  post_url: string;
  created_at: string; // lúc phát hiện
  published_at: string | null;
  missing_since: string | null;
  last_at: string | null;
  last_eng: number | null;
  prev_at: string | null;
  prev_eng: number | null;
};

export type Due = { reason: MeasureReason; priority: number; dueAt: number };

const t = (s: string | null) => (s ? Date.parse(s) : NaN);

/** Mốc đo áp cho bài này (bài cũ chỉ đo mốc 30). */
export function milestonesFor(c: Pick<Candidate, "created_at" | "published_at">): number[] {
  const found = t(c.created_at);
  const pub = t(c.published_at);
  const old = Number.isFinite(pub) && found - pub > OLD_POST_DAYS * DAY;
  return old ? [30] : [...MILESTONES];
}

/** Bài có đến hạn đo không, vì sao. null = chưa đến hạn. mode "inventory" = kiểm kê toàn bộ (bấm tay). */
export function dueReason(c: Candidate, now: number, mode: "due" | "inventory" = "due"): Due | null {
  const found = t(c.created_at);
  const last = t(c.last_at);
  const hasLast = Number.isFinite(last);

  // 1. Xác nhận biến mất: lần trước không thấy, đã qua >= 24 giờ
  if (c.missing_since) {
    const miss = t(c.missing_since);
    const at = miss + CONFIRM_AFTER_HOURS * 3_600_000;
    return now >= at ? { reason: "CONFIRM_UNAVAILABLE", priority: 0, dueAt: at } : null;
  }

  // 2. Mốc 3/7/14/30: lấy mốc lớn nhất đã tới; chưa có lần đo nào sau (mốc − nửa ngày) thì đến hạn
  const ms = milestonesFor(c).filter((m) => now >= found + m * DAY);
  if (ms.length) {
    const m = ms[ms.length - 1];
    const at = found + m * DAY;
    if (!hasLast || last < at - TOLERANCE) return { reason: `MILESTONE_${m}` as MeasureReason, priority: 1, dueAt: at };
  }

  // 3. Sau mốc 30: bài còn nóng thì đo lại mỗi ~30 ngày
  if (now >= found + 30 * DAY && hasLast && now - last >= (HOT_INTERVAL_DAYS - 0.5) * DAY) {
    const hot = c.prev_eng === null || c.last_eng === null ? false : c.last_eng >= (1 + HOT_GROWTH) * Math.max(1, c.prev_eng);
    if (hot) return { reason: "INVENTORY_HOT", priority: 2, dueAt: last + HOT_INTERVAL_DAYS * DAY };
  }

  // 4. Kiểm kê toàn bộ (chỉ khi bấm tay)
  if (mode === "inventory" && (!hasLast || now - last >= INVENTORY_MIN_GAP_DAYS * DAY)) {
    return { reason: "INVENTORY_FULL", priority: 3, dueAt: hasLast ? last : found };
  }
  return null;
}

/** Nền tảng Social Fetch tương ứng; null = chưa hỗ trợ đo (bỏ qua). */
export function sfPlatform(platform: string): "tiktok" | "facebook" | null {
  const p = platform.toUpperCase();
  if (p.startsWith("TIKTOK")) return "tiktok";
  if (p.startsWith("FACEBOOK")) return "facebook";
  return null;
}
