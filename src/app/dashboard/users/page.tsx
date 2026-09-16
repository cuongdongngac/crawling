import { fetchUsers } from "@/app/actions/user";
import AdminUserList from "@/components/AdminUserList";
import { Users } from "lucide-react";

export default async function UsersPage() {
  const users = await fetchUsers();

  return (
    <div className="p-8 bg-stone-50 min-h-full">
      <div className="mb-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 rounded-xl shadow-sm">
            <Users className="w-6 h-6 text-amber-700" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-stone-900 tracking-tight">
              Quản lý Người dùng
            </h1>
            <p className="text-stone-500 mt-1">
              Thêm tài khoản mới, phân quyền Admin và reset mật khẩu.
            </p>
          </div>
        </div>

        <AdminUserList initialUsers={users} />
      </div>
    </div>
  );
}
