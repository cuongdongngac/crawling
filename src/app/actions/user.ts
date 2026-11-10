"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { requireAdmin, PROVINCES } from "@/lib/auth/guards";
import { randomPassword } from "@/lib/auth/password";

async function getAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error("Missing Service Role Key");

  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function adminCreateUser(formData: FormData) {
  const email = formData.get("email")?.toString();
  // Đăng nhập bằng Google: mật khẩu chỉ là chỗ dữ liệu bắt buộc, không ai dùng.
  const password = formData.get("password")?.toString() || randomPassword();
  const isAdminStr = formData.get("is_admin")?.toString();
  const isAdmin = isAdminStr === "true";
  const isResearcher = formData.get("is_researcher")?.toString() === "true";

  if (!email) return { error: "Email là bắt buộc." };

  try {
    await requireAdmin(); // chỉ quản trị viên
    const adminClient = await getAdminClient();
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) return { error: authError.message };

    const { error: profileError } = await adminClient
      .from("profiles")
      .insert({
        id: authData.user.id,
        email: email,
        is_admin: isAdmin,
        // chỉ gửi khi bật, để vẫn tạo được tài khoản nếu chưa chạy migration 2026-11-02
        ...(isResearcher ? { is_researcher: true } : {}),
      });

    if (profileError) {
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return { error: profileError.message };
    }

    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/researchers");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function changeUserRole(userId: string, isAdmin: boolean) {
  try {
    await requireAdmin(); // chỉ quản trị viên
    const adminClient = await getAdminClient();
    const { error } = await adminClient
      .from("profiles")
      .update({ is_admin: isAdmin })
      .eq("id", userId);

    if (error) return { error: error.message };

    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/researchers");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

/** Bật/tắt vai nghiên cứu viên (chỉ quản trị viên cấp). Cần migration 2026-11-02_vai-nghien-cuu-vien.sql. */
export async function changeUserResearcher(userId: string, isResearcher: boolean) {
  try {
    await requireAdmin();
    const adminClient = await getAdminClient();
    const { error } = await adminClient.from("profiles").update({ is_researcher: isResearcher }).eq("id", userId);
    if (error) return { error: error.message.includes("is_researcher") ? "Chưa chạy migration 2026-11-02_vai-nghien-cuu-vien.sql." : error.message };
    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export async function deleteUser(userId: string) {
  try {
    await requireAdmin(); // chỉ quản trị viên
    const adminClient = await getAdminClient();
    const { error } = await adminClient.auth.admin.deleteUser(userId);

    if (error) return { error: error.message };

    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/researchers");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function resetUserPassword(userId: string, newPassword: string) {
  try {
    await requireAdmin(); // chỉ quản trị viên
    const adminClient = await getAdminClient();
    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (error) return { error: error.message };
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function fetchUsers() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) return [];

    const adminClient = await getAdminClient();
    const { data, error } = await adminClient
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function updateAssignedScope(userId: string, assignedScope: any) {
  try {
    await requireAdmin(); // chỉ quản trị viên
    const adminClient = await getAdminClient();
    const { error } = await adminClient
      .from("profiles")
      .update({ assigned_scope: assignedScope })
      .eq("id", userId);

    if (error) return { error: error.message };

    revalidatePath(`/dashboard/researchers/${userId}`);
    revalidatePath("/dashboard/researchers");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateProfileInfo(userId: string, fullName: string, province: string) {
  try {
    await requireAdmin();
    const p = province && PROVINCES[province] ? province : null;
    const adminClient = await getAdminClient();
    const { error } = await adminClient
      .from("profiles")
      .update({ full_name: fullName.trim() || null, province: p })
      .eq("id", userId);
    if (error) return { error: error.message };
    revalidatePath(`/dashboard/researchers/${userId}`);
    revalidatePath("/dashboard/hoat-dong");
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
