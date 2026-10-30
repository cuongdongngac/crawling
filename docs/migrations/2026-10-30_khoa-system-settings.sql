-- ==========================================================
-- 30/10/2026 — Khoá bảng system_settings (chứa Apify token + OpenRouter key của quét chính thức).
-- Chạy một lần trong Supabase → SQL Editor. Chạy lại nhiều lần cũng không sao.
--
-- Sau khi chạy: trình duyệt (anon / người dùng đăng nhập) KHÔNG đọc/ghi được bảng này nữa.
-- Chỉ máy chủ dùng service role mới đọc/ghi: server action trang Cấu hình (đã kiểm tra admin),
-- worker / cron quét chính thức. Service role bỏ qua RLS nên không cần policy nào.
-- ==========================================================

alter table public.system_settings enable row level security;
alter table public.system_settings force row level security;

-- Xoá mọi policy cũ (nếu có ai từng tạo policy mở).
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'system_settings' loop
    execute format('drop policy %I on public.system_settings', p.policyname);
  end loop;
end $$;

-- Thu hồi quyền trực tiếp của vai trò công khai (thêm một lớp ngoài RLS).
revoke all on table public.system_settings from anon, authenticated;

-- Kiểm tra: phải ra rowsecurity = true, forcerowsecurity = true và 0 policy.
select c.relname, c.relrowsecurity as rowsecurity, c.relforcerowsecurity as forcerowsecurity,
       (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = 'system_settings') as policies
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'system_settings';
