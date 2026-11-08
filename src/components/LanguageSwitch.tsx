"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Languages } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/client";
import { setLang } from "@/app/actions/lang";

/** Nút chuyển Việt / English. Lưu vào cookie 1 năm (server action) rồi vẽ lại trang; không mất phiên đăng nhập hay dữ liệu đang nhập ở màn hình khác. */
export default function LanguageSwitch({ className = "" }: { className?: string }) {
  const lang = useLang();
  const router = useRouter();
  const [pending, start] = useTransition();

  const choose = (next: Lang) => {
    if (next === lang) return;
    start(async () => {
      await setLang(next);
      router.refresh();
    });
  };

  const btn = (v: Lang, label: string) => (
    <button
      type="button"
      onClick={() => choose(v)}
      aria-pressed={lang === v}
      className={`px-2 py-0.5 rounded-md transition-colors ${
        lang === v ? "bg-stone-900 text-white" : "text-stone-500 hover:text-stone-900"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white p-0.5 text-xs font-semibold ${
        pending ? "opacity-60" : ""
      } ${className}`}
      title={lang === "en" ? "Language" : "Ngôn ngữ"}
    >
      <Languages className="w-3.5 h-3.5 text-stone-400 ml-1" aria-hidden />
      {btn("vi", "VI")}
      {btn("en", "EN")}
    </div>
  );
}
