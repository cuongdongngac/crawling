// ==========================================================
// Kiểm tra quyền phía server + client quyền cao (service role).
// CHỈ import từ Server Actions / Server Components / Route Handlers.
// ==========================================================
import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

/** Client service role: bỏ qua RLS. Chỉ dùng SAU khi đã kiểm tra quyền. */
export function getServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Thiếu cấu hình NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  return createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type CurrentUser = {
  id: string;
  email: string;
  isAdmin: boolean;
  province: string | null;
  fullName: string | null;
};

/** Người dùng đang đăng nhập (null nếu chưa đăng nhập). */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await getServiceClient()
    .from("profiles")
    .select("is_admin, email, province, full_name")
    .eq("id", user.id)
    .maybeSingle();
  return {
    id: user.id,
    email: profile?.email ?? user.email ?? "",
    isAdmin: profile?.is_admin === true,
    province: profile?.province ?? null,
    fullName: profile?.full_name ?? null,
  };
}

export async function requireUser(): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) throw new Error("Bạn cần đăng nhập để dùng chức năng này.");
  return u;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const u = await requireUser();
  if (!u.isAdmin) throw new Error("Chỉ quản trị viên được dùng chức năng này.");
  return u;
}

export const PROVINCES: Record<string, string> = {
  CENTRAL: "Trung ương (VPHA)",
  HUNG_YEN: "Hưng Yên",
  DONG_THAP: "Đồng Tháp",
};
