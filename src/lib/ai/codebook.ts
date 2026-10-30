// ==========================================================
// Bảng mã hoá (codebook) cho gắn nhãn bài — DÙNG CHUNG cho người và AI.
// Nguồn gốc: proposal/application (P2M, "ba tiêu chí", 4 dạng biến tướng ngôn ngữ).
// Đổi định nghĩa => tạo phiên bản mới (v2…), KHÔNG sửa v1, để nhãn cũ vẫn so sánh được.
// Code là nơi định nghĩa; lần chạy đầu sẽ chép vào bảng label_codebooks để truy vết.
// ==========================================================

export type EnumField = {
  key: string;
  label: string;
  kind: "enum";
  values: { code: string; label: string; hint?: string }[];
  multi?: boolean;
  humanOnly?: boolean;
};
export type BoolField = { key: string; label: string; kind: "bool"; hint?: string; humanOnly?: boolean };
export type TextListField = { key: string; label: string; kind: "text_list"; hint?: string; humanOnly?: boolean };
export type CodebookField = EnumField | BoolField | TextListField;

export type Codebook = { version: string; title: string; fields: CodebookField[] };

export const CODEBOOK_V1: Codebook = {
  version: "v1",
  title: "Gắn nhãn bài – P2M + ba tiêu chí (v1, 10/2026)",
  fields: [
    {
      key: "purpose",
      label: "Mục đích nội dung",
      kind: "enum",
      values: [
        { code: "DIRECT_MARKETING", label: "Tiếp thị trực tiếp", hint: "rao bán, giới thiệu sản phẩm, giá, khuyến mãi" },
        { code: "LIFESTYLE", label: "Tiếp thị lối sống trá hình", hint: "khoe, review, trào lưu, không rao bán trực tiếp" },
        { code: "BUY_INQUIRY", label: "Hỏi mua", hint: "người dùng hỏi mua, xin chỗ bán" },
        { code: "WARNING", label: "Cảnh báo – phòng chống", hint: "tác hại, cai, tin tức thực thi" },
        { code: "UNRELATED", label: "Không liên quan", hint: "không nói về thuốc lá điện tử/thuốc lá nung nóng" },
      ],
    },
    {
      key: "actor_type",
      label: "Loại chủ thể đăng",
      kind: "enum",
      values: [
        { code: "SELLER", label: "Người bán" },
        { code: "INFLUENCER", label: "Người tạo xu hướng" },
        { code: "USER", label: "Người dùng" },
        { code: "ORGANIZATION", label: "Tổ chức / báo chí / cơ quan" },
        { code: "UNKNOWN", label: "Không xác định" },
      ],
    },
    { key: "crit_image", label: "Tiêu chí hình (sản phẩm, thiết bị, khói)", kind: "bool", humanOnly: true },
    { key: "crit_text", label: "Tiêu chí chữ (từ lách, từ lóng gắn với sản phẩm)", kind: "bool" },
    { key: "crit_transaction", label: "Tiêu chí giao dịch (giá, cách liên hệ, giao hàng)", kind: "bool" },
    { key: "has_price", label: "Có nêu giá", kind: "bool" },
    {
      key: "contact_channels",
      label: "Kênh liên hệ được nhắc",
      kind: "enum",
      multi: true,
      values: [
        { code: "ZALO", label: "Zalo" },
        { code: "TELEGRAM", label: "Telegram" },
        { code: "PHONE", label: "Số điện thoại" },
        { code: "INBOX", label: "Nhắn tin / inbox" },
        { code: "LINK", label: "Đường dẫn ngoài / shop" },
        { code: "OTHER", label: "Khác" },
      ],
    },
    { key: "has_delivery", label: "Có nhắc giao hàng / ship", kind: "bool" },
    { key: "targets_youth", label: "Nhắm tới học sinh, sinh viên, giới trẻ", kind: "bool" },
    {
      key: "evasion_tactics",
      label: "Chiến thuật lách",
      kind: "enum",
      multi: true,
      values: [
        { code: "PRODUCT_RENAME", label: "Đổi tên sản phẩm" },
        { code: "ABBREVIATION", label: "Viết tắt, teencode, biến dạng chính tả" },
        { code: "EMOJI_CODE", label: "Ký hiệu emoji" },
        { code: "DISGUISED_PURPOSE", label: "Ngụy trang mục đích (thanh lý, pass đồ…)" },
        { code: "PLATFORM_SHIFT", label: "Kéo sang nền tảng khác (Zalo, Telegram…)" },
      ],
    },
    {
      key: "sentiment",
      label: "Sắc thái với sản phẩm",
      kind: "enum",
      values: [
        { code: "POSITIVE", label: "Tích cực / cổ vũ" },
        { code: "NEUTRAL", label: "Trung tính" },
        { code: "NEGATIVE", label: "Tiêu cực / phản đối" },
      ],
    },
    {
      key: "slang_terms",
      label: "Từ lóng / biến thể xuất hiện",
      kind: "text_list",
      hint: "giữ nguyên cách viết trong bài, không quá 10 từ",
    },
  ],
};

export const CODEBOOKS: Record<string, Codebook> = { v1: CODEBOOK_V1 };
export const CURRENT_CODEBOOK = CODEBOOK_V1;

export type LabelValues = Record<string, string | string[] | boolean | null>;

/**
 * Kiểm tra + chuẩn hoá một bộ nhãn theo codebook. Trả về nhãn sạch và danh sách lỗi.
 * forAi = true: bỏ qua trường humanOnly (để null).
 */
export function validateLabels(cb: Codebook, input: unknown, forAi = false): { labels: LabelValues; errors: string[] } {
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const labels: LabelValues = {};
  const errors: string[] = [];
  for (const f of cb.fields) {
    const v = src[f.key];
    if (forAi && f.humanOnly) {
      labels[f.key] = null;
      continue;
    }
    if (f.kind === "bool") {
      if (typeof v === "boolean") labels[f.key] = v;
      else if (v === "true" || v === "false") labels[f.key] = v === "true";
      else {
        labels[f.key] = null;
        errors.push(`${f.key}: cần true/false`);
      }
    } else if (f.kind === "enum") {
      const allowed = new Set(f.values.map((x) => x.code));
      if (f.multi) {
        const arr = Array.isArray(v) ? v.map(String).map((s) => s.toUpperCase()) : [];
        const bad = arr.filter((s) => !allowed.has(s));
        if (!Array.isArray(v)) errors.push(`${f.key}: cần mảng`);
        if (bad.length) errors.push(`${f.key}: giá trị lạ ${bad.join(",")}`);
        labels[f.key] = Array.from(new Set(arr.filter((s) => allowed.has(s))));
      } else {
        const s = typeof v === "string" ? v.toUpperCase() : "";
        if (allowed.has(s)) labels[f.key] = s;
        else {
          labels[f.key] = null;
          errors.push(`${f.key}: giá trị lạ ${String(v)}`);
        }
      }
    } else {
      const arr = Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [];
      labels[f.key] = Array.from(new Set(arr)).slice(0, 10);
    }
  }
  return { labels, errors };
}

/** "Ca nghi ngờ" theo quy tắc ba tiêu chí: từ 2/3 điểm trở lên (tiêu chí chưa chấm tính là 0). */
export function isSuspected(l: LabelValues): boolean {
  const n = [l.crit_image, l.crit_text, l.crit_transaction].filter((x) => x === true).length;
  return n >= 2;
}
