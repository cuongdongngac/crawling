"use client";

import { setupFirstAdmin, checkHasUsers } from "@/app/actions/auth";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function SetupPage() {
  const [loading, setLoading] = useState(true);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkHasUsers().then((hasUsers) => {
      if (hasUsers) {
        // Hệ thống đã có user, khóa trang này
        router.replace("/login");
      } else {
        setHasAccess(true);
      }
      setLoading(false);
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSettingUp(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await setupFirstAdmin(formData);

    if (result.error) {
      setError(result.error);
      setIsSettingUp(false);
    } else {
      // Thành công, tự động chuyển sang trang đăng nhập
      router.push("/login?setup=success");
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50">Đang kiểm tra trạng thái hệ thống...</div>;
  }

  if (!hasAccess) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
        <div className="p-8 text-center bg-amber-50 border-b border-stone-200">
          <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
            <ShieldAlert className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900">Thiết lập Quản trị viên</h2>
          <p className="mt-2 text-sm text-stone-600">
            Hệ thống phát hiện chưa có người dùng nào. Hãy tạo tài khoản Quản trị viên (Admin) đầu tiên.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1">Email Admin</label>
              <input
                type="email"
                name="email"
                required
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                placeholder="admin@vpha.org"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1">Mật khẩu</label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                placeholder="Tối thiểu 6 ký tự"
              />
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={isSettingUp}
            className="w-full bg-stone-900 hover:bg-stone-800 text-white font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {isSettingUp ? "Đang khởi tạo..." : (
              <>
                <ShieldCheck className="w-5 h-5" /> Khởi tạo Hệ thống
              </>
            )}
          </Button>

          <p className="text-xs text-stone-500 text-center mt-4">
            Lưu ý: Nút Đăng ký này sẽ biến mất vĩnh viễn sau khi tài khoản đầu tiên được tạo.
          </p>
        </form>
      </div>
    </div>
  );
}
