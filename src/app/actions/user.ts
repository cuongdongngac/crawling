"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

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
  const password = formData.get("password")?.toString();
  const isAdminStr = formData.get("is_admin")?.toString();
  const isAdmin = isAdminStr === "true";

  if (!email || !password) return { error: "Email và mật khẩu là bắt buộc." };

  try {
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

export async function deleteUser(userId: string) {
  try {
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
