// Che thông tin liên hệ / định danh trong caption TRƯỚC khi gửi cho AI hoặc lưu làm dữ liệu huấn luyện.
// Giữ dấu hiệu "có liên hệ" (thay bằng nhãn) để AI vẫn chấm được tiêu chí giao dịch.

const RULES: [RegExp, string][] = [
  [/https?:\/\/\S+|www\.\S+/gi, "[LINK]"],
  [/\b(?:t\.me|zalo\.me|m\.me|wa\.me)\/\S+/gi, "[LINK]"],
  [/[\w.+-]+@[\w-]+\.[\w.]+/g, "[EMAIL]"],
  // số điện thoại VN: 0xxx / +84 / 84, cho phép dấu chấm, cách, gạch
  [/(?:\+?84|0)(?:[\s.-]?\d){8,10}\b/g, "[SĐT]"],
  [/(?<![\w])@[\w.]{2,}/g, "[TÀI_KHOẢN]"],
];

export function redactText(text: string, maxLen = 3000): string {
  let s = String(text ?? "");
  for (const [re, rep] of RULES) s = s.replace(re, rep);
  s = s.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return s.length > maxLen ? s.slice(0, maxLen) + "…" : s;
}
