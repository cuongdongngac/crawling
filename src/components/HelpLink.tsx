"use client";

import { CircleHelp } from "lucide-react";
import { useLang, useT } from "@/lib/i18n/client";

/**
 * Liên kết tới bài trợ giúp (Astro Starlight, phục vụ tại /help).
 * slug: đường dẫn bài, ví dụ "cong-tac-vien/quet-thu" -> /help/cong-tac-vien/quet-thu.html
 * Giao diện đang ở tiếng Anh thì trỏ sang bản tiếng Anh: /help/en/cong-tac-vien/quet-thu.html
 * (bài chưa dịch thì Starlight tự hiện bản tiếng Việt kèm thông báo).
 * label: chữ tiếng Việt, tự dịch theo ngôn ngữ giao diện.
 * Mở tab mới để không mất dữ liệu đang nhập trên màn hình.
 */
export default function HelpLink({
  slug,
  label,
  className = "",
}: {
  slug?: string;
  label?: string;
  className?: string;
}) {
  const t = useT();
  const lang = useLang();
  const clean = slug?.replace(/^\/+|\.html$/g, "");
  const base = lang === "en" ? "/help/en" : "/help";
  const href = clean ? `${base}/${clean}.html` : lang === "en" ? "/help/en" : "/help/";
  const text = label === undefined ? t("Hướng dẫn") : t(label);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className={`inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-900 hover:underline ${className}`}
    >
      <CircleHelp className="w-4 h-4" />
      {text}
    </a>
  );
}
