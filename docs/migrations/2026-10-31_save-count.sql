-- ==========================================================
-- 31/10/2026 — Thêm lượt lưu (TikTok collectCount) vào số liệu mỗi lần đo.
-- CuongPV: "thừa còn hơn thiếu". Để trống được: nền tảng/công cụ không trả thì NULL.
-- Lượt lưu là tín hiệu tốt cho bài bán hàng (người xem lưu lại để mua sau).
-- Chạy lại nhiều lần không lỗi.
-- ==========================================================
alter table public.post_snapshots
  add column if not exists save_count bigint;

comment on column public.post_snapshots.save_count is
  'Lượt lưu tích lũy tại thời điểm đo (TikTok collectCount). NULL nếu nền tảng/công cụ không cung cấp.';
