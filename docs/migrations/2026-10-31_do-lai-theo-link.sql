-- ==========================================================
-- 31/10/2026 — Đo lại theo link bài (thiết kế: claude/thiet-ke-do-luong-2026-10-31.md, mục 3 và 5)
-- Thêm một cột: ngày hệ thống XÁC NHẬN bài không còn (actor đo lại báo không còn 2 lần liền,
-- cách nhau >= 24 giờ). Dùng cho đường "tỷ lệ bài còn tồn tại" (Q4). Bài còn tồn tại = NULL.
-- Chạy lại nhiều lần không lỗi.
-- ==========================================================
alter table public.posts
  add column if not exists unavailable_at timestamptz;

comment on column public.posts.unavailable_at is
  'Ngày xác nhận bài không còn truy cập được (2 lần đo liền, cách >= 24h). NULL = còn tồn tại. Chỉ mô tả "biến mất", không phân biệt tự xóa hay bị gỡ.';

create index if not exists posts_unavailable_at_idx on public.posts (unavailable_at) where unavailable_at is not null;
create index if not exists posts_created_at_idx on public.posts (created_at);
