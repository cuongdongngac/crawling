"use client";

import { createClient } from "@/utils/supabase/client";
import { ArrowLeft, KeyRound, Mail, Shield } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const searchParams = useSearchParams();
  const setupSuccess = searchParams.get("setup") === "success";

  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Sai email hoặc mật khẩu.");
      setLoading(false);
    } else {
      window.location.href = "/dashboard";
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {setupSuccess && (
        <div className="bg-emerald-50 text-emerald-800 text-sm p-4 rounded-lg border border-emerald-200 font-medium text-center">
          Khởi tạo Admin thành công! Vui lòng đăng nhập.
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-100 text-center">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1.5 ml-1">Email</label>
          <div className="relative flex items-center">
            <Mail className="absolute left-3.5 w-5 h-5 text-stone-400" />
            <input
              type="email"
              required
              className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1.5 ml-1">Mật khẩu</label>
          <div className="relative flex items-center">
            <KeyRound className="absolute left-3.5 w-5 h-5 text-stone-400" />
            <input
              type="password"
              required
              className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="pt-2">
        <Button 
          type="submit" 
          disabled={loading}
          className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-6 rounded-xl transition-all shadow-md hover:shadow-lg"
        >
          {loading ? "Đang xử lý..." : "Đăng nhập"}
        </Button>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-stone-200 relative overflow-hidden">
        <div className="text-center mb-8 relative z-10">
          <div className="mx-auto w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-3xl font-bold text-stone-900 tracking-tight">Đăng nhập</h2>
          <p className="mt-2 text-sm text-stone-500">
            Hệ thống Giám sát M&E Thuốc lá điện tử
          </p>
        </div>

        <Suspense fallback={<div>Đang tải form...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
