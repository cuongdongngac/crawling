"use client";

import { createClient } from "@/utils/supabase/client";
import { useState } from "react";
import { KeyRound } from "lucide-react";

export default function ProfileForm({ userEmail }: { userEmail: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const supabase = createClient();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return alert("Mật khẩu phải từ 6 ký tự trở lên.");
    if (password !== confirmPassword) return alert("Mật khẩu xác nhận không khớp.");

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      alert("Lỗi khi cập nhật mật khẩu: " + error.message);
    } else {
      alert("Cập nhật mật khẩu thành công!");
      setPassword("");
      setConfirmPassword("");
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden p-6 space-y-6">
      
      <div>
        <label className="block text-sm font-semibold text-stone-700 mb-1">Email đăng nhập</label>
        <input 
          type="text" 
          value={userEmail}
          disabled
          className="w-full px-4 py-2 text-sm border border-stone-200 rounded-lg bg-stone-50 text-stone-500 cursor-not-allowed"
        />
      </div>

      <div className="pt-4 border-t border-stone-100">
        <h2 className="text-sm font-bold text-stone-900 mb-4 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-stone-500" /> Đổi mật khẩu
        </h2>
        
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Mật khẩu mới</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              className="w-full px-4 py-2 text-sm border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Xác nhận mật khẩu</label>
            <input 
              type="password" 
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              className="w-full px-4 py-2 text-sm border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button 
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="px-6 py-2.5 bg-stone-900 text-white text-sm font-medium rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-50"
          >
            {loading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
          </button>
        </form>
      </div>
      
    </div>
  );
}
