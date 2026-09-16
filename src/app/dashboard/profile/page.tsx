import { UserCircle } from "lucide-react";
import ProfileForm from "@/components/ProfileForm";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="p-8 bg-stone-50 min-h-full">
      <div className="mb-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-xl shadow-sm">
            <UserCircle className="w-6 h-6 text-indigo-700" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-stone-900 tracking-tight">
              Tài khoản cá nhân
            </h1>
            <p className="text-stone-500 mt-1">
              Quản lý thông tin tài khoản và cập nhật mật khẩu.
            </p>
          </div>
        </div>

        <ProfileForm userEmail={user.email || ""} />
      </div>
    </div>
  );
}
