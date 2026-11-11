"use strict";
/*
 * Chuẩn hóa ngày đăng bài (published_at) cho worker ingest.
 *  - Hợp lệ: giữ nguyên chuỗi gốc, valid=true.
 *  - Thiếu/không parse được: dùng thời điểm hiện tại để thỏa NOT NULL,
 *    valid=false để worker gắn cờ is_flagged cho người kiểm chứng —
 *    thay vì âm thầm coi bài cũ thành bài mới (lệch trục ITS).
 */
function resolvePublishedAt(raw) {
  if (raw !== null && raw !== undefined && String(raw).trim() !== "") {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      return { iso: typeof raw === "string" ? raw : d.toISOString(), valid: true };
    }
  }
  return { iso: new Date().toISOString(), valid: false };
}

module.exports = { resolvePublishedAt };
