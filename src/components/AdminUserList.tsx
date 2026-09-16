"use client";

import { adminCreateUser, changeUserRole, deleteUser, resetUserPassword } from "@/app/actions/user";
import { useState } from "react";
import { ShieldCheck, ShieldAlert, KeyRound, Trash, Plus, Search, UserCircle, X } from "lucide-react";

export default function AdminUserList({ initialUsers }: { initialUsers: any[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetId, setResetId] = useState<string | null>(null);

  const filteredUsers = users.filter((u) => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const res = await adminCreateUser(formData);
    if (res.error) alert(res.error);
    else window.location.reload(); // Quick refresh for now
    setLoading(false);
  };

  const handleToggleRole = async (userId: string, currentAdmin: boolean) => {
    if (!confirm(`Bạn muốn ${currentAdmin ? "hủy" : "cấp"} quyền Admin cho user này?`)) return;
    const res = await changeUserRole(userId, !currentAdmin);
    if (res.error) alert(res.error);
    else setUsers(users.map(u => u.id === userId ? { ...u, is_admin: !currentAdmin } : u));
  };

  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`Cảnh báo: Bạn sắp xóa vĩnh viễn user ${email} khỏi hệ thống. Đồng ý?`)) return;
    const res = await deleteUser(userId);
    if (res.error) alert(res.error);
    else setUsers(users.filter(u => u.id !== userId));
  };

  const handleResetPassword = async (userId: string) => {
    if (!newPassword || newPassword.length < 6) return alert("Mật khẩu mới phải từ 6 ký tự.");
    const res = await resetUserPassword(userId, newPassword);
    if (res.error) alert(res.error);
    else {
      alert("Đổi mật khẩu thành công!");
      setResetId(null);
      setNewPassword("");
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
      <div className="p-4 border-b border-stone-200 bg-stone-50 flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input 
            type="text" 
            placeholder="Tìm kiếm Email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>
        <button 
          onClick={() => setIsAddingNew(!isAddingNew)}
          className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Thêm Tài Khoản
        </button>
      </div>

      {isAddingNew && (
        <form onSubmit={handleAddUser} className="p-5 bg-amber-50 border-b border-amber-100 flex flex-wrap items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-stone-700 mb-1">Email</label>
            <input type="email" name="email" required className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg" placeholder="Email người dùng" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-stone-700 mb-1">Mật khẩu tạm</label>
            <input type="password" name="password" minLength={6} required className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg" placeholder="Tối thiểu 6 ký tự" />
          </div>
          <div className="pb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="is_admin" value="true" className="w-4 h-4 text-amber-600 rounded" />
              <span className="text-sm font-medium text-stone-700">Là Quản trị viên (Admin)</span>
            </label>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button disabled={loading} type="submit" className="flex-1 md:flex-none px-6 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700">Lưu</button>
            <button type="button" onClick={() => setIsAddingNew(false)} className="flex-1 md:flex-none px-4 py-2 bg-stone-200 text-stone-700 text-sm font-medium rounded-lg hover:bg-stone-300">Hủy</button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-medium">
            <tr>
              <th className="px-6 py-4">Tài Khoản</th>
              <th className="px-6 py-4">Vai Trò</th>
              <th className="px-6 py-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-stone-50 transition-colors">
                <td className="px-6 py-4 flex items-center gap-3">
                  <div className="size-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-bold uppercase">
                    {user.email.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-stone-900">{user.email}</div>
                    <div className="text-xs text-stone-500">ID: {user.id.slice(0,8)}...</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {user.is_admin ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" /> Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-medium">
                      <UserCircle className="w-3.5 h-3.5" /> User
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  {resetId === user.id ? (
                    <div className="inline-flex items-center gap-2">
                      <input 
                        type="password" 
                        placeholder="Mật khẩu mới..." 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-32 px-2 py-1 text-xs border border-stone-300 rounded"
                      />
                      <button onClick={() => handleResetPassword(user.id)} className="px-2 py-1 bg-green-600 text-white rounded text-xs">Lưu</button>
                      <button onClick={() => {setResetId(null); setNewPassword("");}} className="px-2 py-1 bg-stone-200 text-stone-700 rounded text-xs">Hủy</button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleToggleRole(user.id, user.is_admin)} className="p-2 text-stone-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors" title="Đổi quyền">
                        {user.is_admin ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                      </button>
                      <button onClick={() => setResetId(user.id)} className="p-2 text-stone-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors" title="Đổi mật khẩu">
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(user.id, user.email)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Xóa tài khoản">
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
