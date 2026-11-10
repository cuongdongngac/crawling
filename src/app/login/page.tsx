"use client";

import { createClient } from "@/utils/supabase/client";
import { Shield } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";
import LanguageSwitch from "@/components/LanguageSwitch";

function GoogleLogo() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

function LoginForm() {
  const t = useT();
  const [loading, setLoading] = useState(false);

  const searchParams = useSearchParams();
  const setupSuccess = searchParams.get("setup") === "success";
  const err = searchParams.get("error");

  const supabase = createClient();

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) setLoading(false);
  };

  return (
    <div className="space-y-5">
      {setupSuccess && (
        <div className="bg-emerald-50 text-emerald-800 text-sm p-4 rounded-lg border border-emerald-200 font-medium text-center">
          {t("Khởi tạo Admin thành công! Vui lòng đăng nhập.")}
        </div>
      )}

      {err === "not_invited" && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-100 text-center">
          {t("Tài khoản Google này chưa được cấp quyền truy cập. Vui lòng liên hệ quản trị viên.")}
        </div>
      )}

      {err === "oauth" && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-100 text-center">
          {t("Đăng nhập bằng Google thất bại. Vui lòng thử lại.")}
        </div>
      )}

      <Button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-6 rounded-xl transition-all shadow-md hover:shadow-lg gap-2.5"
      >
        <GoogleLogo />
        {loading ? t("Đang chuyển hướng tới Google...") : t("Đăng nhập bằng Google")}
      </Button>

      <p className="text-xs text-stone-500 text-center leading-relaxed">
        {t("Dùng tài khoản Google đã được quản trị viên cấp quyền. Hệ thống không cho tự đăng ký.")}
      </p>
    </div>
  );
}

export default function LoginPage() {
  const t = useT();
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <LanguageSwitch className="absolute top-4 right-4" />
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-stone-200 relative overflow-hidden">
        <div className="text-center mb-8 relative z-10">
          <div className="mx-auto w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-3xl font-bold text-stone-900 tracking-tight">{t("Đăng nhập")}</h2>
          <p className="mt-2 text-sm text-stone-500">
            {t("Hệ thống Giám sát M&E Thuốc lá điện tử")}
          </p>
        </div>

        <Suspense fallback={<div>{t("Đang tải form...")}</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
