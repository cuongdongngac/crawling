"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function checkHasUsers() {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });
    
  if (error) {
    console.error("Error checking users:", error);
    return false; // Default to false if error
  }
  
  return (count || 0) > 0;
}

export async function setupFirstAdmin(formData: FormData) {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return { error: "Email và mật khẩu là bắt buộc." };
  }

  // 1. Kiểm tra lại lần cuối xem bảng có trống không
  const hasUsers = await checkHasUsers();
  if (hasUsers) {
    return { error: "Hệ thống đã được thiết lập. Không thể tạo thêm Admin từ trang này." };
  }

  // 2. Sử dụng Service Role Key để tạo Admin
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return { error: "Lỗi cấu hình hệ thống (Thiếu Service Role Key)." };
  }

  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  // 3. Tạo tài khoản trong auth.users
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true // Bỏ qua email verification cho Admin nội bộ
  });

  if (authError) {
    return { error: authError.message };
  }

  const userId = authData.user.id;

  // 4. Chèn thông tin vào bảng profiles
  const { error: profileError } = await adminClient
    .from("profiles")
    .insert({
      id: userId,
      email: email,
      is_admin: true,
      assigned_scope: { allowed_actors: [], allowed_hashtag_groups: [] }
    });

  if (profileError) {
    // Rollback auth user if profile creation fails
    await adminClient.auth.admin.deleteUser(userId);
    return { error: "Lỗi tạo hồ sơ Admin: " + profileError.message };
  }

  revalidatePath("/");
  return { success: true };
}
