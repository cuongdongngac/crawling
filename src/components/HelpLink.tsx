import { CircleHelp } from "lucide-react";

/**
 * Liên kết tới bài trợ giúp (VitePress, phục vụ tại /help).
 * slug: đường dẫn bài, ví dụ "cong-tac-vien/quet-thu" -> /help/cong-tac-vien/quet-thu.html
 * Mở tab mới để không mất dữ liệu đang nhập trên màn hình.
 */
export default function HelpLink({
  slug,
  label = "Hướng dẫn",
  className = "",
}: {
  slug?: string;
  label?: string;
  className?: string;
}) {
  const href = slug ? `/help/${slug.replace(/^\/+|\.html$/g, "")}.html` : "/help/";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className={`inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-900 hover:underline ${className}`}
    >
      <CircleHelp className="w-4 h-4" />
      {label}
    </a>
  );
}
