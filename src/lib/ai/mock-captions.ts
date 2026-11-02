// ==========================================================
// CAPTION GIẢ CÓ ĐÁP ÁN — chỉ dùng cho dữ liệu giả và bộ bài mô phỏng (02/11/2026).
// Mục đích: thử và trình diễn gắn nhãn AI + xác minh của người trên chữ đủ đa dạng
// (teencode, bỏ dấu, emoji, giá, kênh liên hệ, ngụy trang, ca mập mờ, ca "trùng từ" không liên quan).
// Không có số điện thoại/tài khoản thật: SĐT dạng 09xx.xxx.xxx, link dạng t.me/mock_...
// Đáp án (truth) chỉ ghi những trường biết chắc từ cách sinh câu; trường khác để null (chưa chấm).
// ==========================================================

export type Rand = () => number;

export type CaptionKind =
  | "SELL"
  | "SELL_EVASIVE"
  | "LIFESTYLE"
  | "BUY"
  | "WARNING"
  | "AMBIGUOUS"
  | "UNRELATED";

export type CaptionTruth = {
  kind: CaptionKind;
  purpose: "DIRECT_MARKETING" | "LIFESTYLE" | "BUY_INQUIRY" | "WARNING" | "UNRELATED";
  related: boolean;
  /** Ca khó: ít chữ, mập mờ — người cũng có thể chấm khác. */
  hard: boolean;
  has_price: boolean | null;
  has_delivery: boolean | null;
  contact_channels: string[] | null;
  evasion_tactics: string[] | null;
};

/** RNG có hạt giống từ một chuỗi (ví dụ post_id) -> cùng bài luôn ra cùng caption. */
export function seededRand(seed: string): Rand {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  let s = h || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(r: Rand, a: readonly T[]): T => a[Math.floor(r() * a.length)];
const chance = (r: Rand, p: number) => r() < p;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------- từ vựng ----------
const PRODUCT = ["pod", "pod mini", "vape", "tinh dầu", "đầu pod", "pod dùng 1 lần", "pod 6000 hơi", "thuốc lá điện tử"];
const PRODUCT_RENAMED = ["bút thơm", "kẹo khói", "p0d", "v@pe", "pót", "đồ chơi khói", "bút điện tử", "phụ kiện thơm", "em nhỏ thơm thơm", "tinh dầu thơm phòng"];
const FLAVOR = ["xoài lạnh", "nho đá", "dưa hấu", "việt quất", "bạc hà", "đào", "trà sữa", "ổi hồng", "kẹo cao su", "dâu tây"];
const EMOJI_SMOKE = ["💨", "☁️", "🌫️", "🔥", "😮‍💨"];
const EMOJI_FUN = ["😍", "😆", "🥰", "✨", "👌", "💯", "🤤"];
const PRICE = ["chỉ 150k", "199k", "giá 2xx", "1tr2 nguyên bộ", "đồng giá 99k", "từ 120k", "giá sinh viên 89k", "250k/hộp", "sale còn 179k"];
const SHIP = ["ship toàn quốc", "freeship nội thành", "giao hỏa tốc 2h", "COD nhận hàng mới trả tiền", "ship tận nơi", "có ship kín đáo"];
const CONTACT: [string[], string][] = [
  [["ZALO", "PHONE"], "zalo 09xx.xxx.xxx"],
  [["ZALO"], "kết bạn zalo nhé"],
  [["TELEGRAM"], "kênh tele t.me/mock_shop"],
  [["PHONE"], "gọi 09xx xxx xxx"],
  [["INBOX"], "ib mình tư vấn"],
  [["INBOX"], "inbox để xem mẫu"],
  [["INBOX"], "nhắn riêng nha"],
  [["LINK"], "đặt tại link ở bio"],
];
const YOUTH = ["giá học sinh sinh viên", "hợp tụi teen", "đi học mang theo tiện", "gen Z mê lắm"];

const LIFESTYLE_LINES = [
  "chill tối thứ 7 cùng hội bạn",
  "review vị {flavor}, mùi thơm cực",
  "góc nhỏ thư giãn sau giờ học",
  "đi cafe mà thiếu em này là thấy thiếu thiếu",
  "thổi vòng khói tròn xoe, ai làm được chưa",
  "outfit hôm nay + em {product} màu hồng",
  "1 ngày của mình: cafe, nhạc, và {product}",
  "vị {flavor} là chân ái luôn mọi người ạ",
  "mới tập thổi cloud, xem có ổn không",
];
const BUY_LINES = [
  "ai biết chỗ nào bán {product} ở Hưng Yên không ạ",
  "cần mua {product} vị {flavor}, ai có ib em",
  "dạo này mua {product} ở đâu uy tín vậy mn",
  "xin chỗ bán {product} gần Cao Lãnh với ạ",
  "có ai pass lại {product} không, em cần gấp",
  "shop nào còn bán {product} không ạ, tìm mãi không thấy",
];
const WARNING_LINES = [
  "thuốc lá điện tử không vô hại như bạn nghĩ",
  "từ 2025 Việt Nam đã cấm thuốc lá điện tử và thuốc lá nung nóng",
  "hành trình cai vape của mình sau {n} tháng",
  "phụ huynh cần biết các dấu hiệu con dùng thuốc lá điện tử",
  "bác sĩ nói gì về tác hại của vape với phổi",
  "công an thu giữ hàng nghìn sản phẩm thuốc lá điện tử",
  "học sinh nhập viện vì dùng pod có chất lạ",
  "nói không với thuốc lá điện tử, bảo vệ bản thân và gia đình",
];
const UNRELATED_LINES = [
  "tập podcast mới tuần này, mời mọi người nghe",
  "review tai nghe AirPods Pro, bass ổn áp",
  "quán cà phê mới mở, không gian chill lắm",
  "máy pha cà phê dùng viên nén pod, tiện cực",
  "bút bi thơm cho bé đi học, mùi dâu dễ thương",
  "kẹo dẻo vị {flavor} mới về, bé nhà mình mê",
  "pass lại váy mặc 1 lần, size M",
  "tin thể thao: đội tuyển thắng 2-0 tối qua",
  "nến thơm vị {flavor} cho phòng ngủ",
  "tinh dầu xông phòng sả chanh, đuổi muỗi hiệu quả",
  "video nhảy theo trend mới nè",
  "khói bếp chiều quê, nhớ nhà quá",
  "máy tạo khói sân khấu cho thuê, đám cưới sự kiện",
];
const AMBIGUOUS_LINES = ["vị này ngon nha {smoke}", "ai hiểu không 😂", "{smoke}{smoke}{smoke}", "em này xinh không mn", "tối nay ai đi không", "mê vị này quá {smoke}"];

function fill(r: Rand, s: string): string {
  return s
    .replace("{flavor}", pick(r, FLAVOR))
    .replace("{product}", pick(r, PRODUCT))
    .replace(/\{smoke\}/g, () => pick(r, EMOJI_SMOKE))
    .replace("{n}", String(1 + Math.floor(r() * 11)));
}

// teencode / bỏ dấu: biến dạng chữ như bài thật
const TEEN: [RegExp, string][] = [
  [/\bkhông\b/g, "ko"], [/\bđược\b/g, "dc"], [/\bmọi người\b/g, "mn"], [/\bnhé\b/g, "nhoa"],
  [/\bvậy\b/g, "z"], [/\bbiết\b/g, "bít"], [/\bquá\b/g, "wá"], [/\bgì\b/g, "j"],
];
function stripDiacritics(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
}
function distort(r: Rand, s: string): string {
  let out = s;
  if (chance(r, 0.35)) for (const [re, rep] of TEEN) out = out.replace(re, rep);
  if (chance(r, 0.15)) out = stripDiacritics(out);
  return out;
}

const empty = (kind: CaptionKind, purpose: CaptionTruth["purpose"], related: boolean): CaptionTruth => ({
  kind, purpose, related, hard: false, has_price: null, has_delivery: null, contact_channels: null, evasion_tactics: null,
});

export function makeCaption(kind: CaptionKind, r: Rand): { text: string; truth: CaptionTruth } {
  switch (kind) {
    case "SELL":
    case "SELL_EVASIVE": {
      const evasive = kind === "SELL_EVASIVE";
      const tactics: string[] = [];
      const product = evasive ? pick(r, PRODUCT_RENAMED) : pick(r, PRODUCT);
      if (evasive) tactics.push(/[0@]|pót/.test(product) ? "ABBREVIATION" : "PRODUCT_RENAME");
      const parts: string[] = [];
      if (evasive && chance(r, 0.5)) {
        parts.push(pick(r, ["thanh lý", "pass lại", "dư dùng không hết nên để lại", "dọn nhà để lại"]) + ` ${product}`);
        tactics.push("DISGUISED_PURPOSE");
      } else parts.push(pick(r, ["hàng mới về", "về thêm", "lên kệ", "sẵn hàng"]) + ` ${product} vị ${pick(r, FLAVOR)}`);
      const hasPrice = chance(r, evasive ? 0.4 : 0.7);
      if (hasPrice) parts.push(pick(r, PRICE));
      const hasShip = chance(r, 0.55);
      if (hasShip) parts.push(pick(r, SHIP));
      const contacts: string[] = [];
      const nC = chance(r, 0.8) ? (chance(r, 0.3) ? 2 : 1) : 0;
      for (let i = 0; i < nC; i++) {
        const [chs, txt] = pick(r, CONTACT);
        if (!chs.some((c) => contacts.includes(c))) {
          contacts.push(...chs);
          parts.push(txt);
        }
      }
      if (evasive && (contacts.includes("ZALO") || contacts.includes("TELEGRAM")) && chance(r, 0.6)) {
        parts.push(pick(r, ["không bán công khai", "nói chuyện qua zalo cho tiện", "vào nhóm kín để xem giá"]));
        tactics.push("PLATFORM_SHIFT");
      }
      if (chance(r, 0.2)) parts.push(pick(r, YOUTH));
      let text = parts.map((p, i) => (i === 0 ? cap(p) : p)).join(chance(r, 0.5) ? ", " : " | ");
      if (chance(r, 0.6)) {
        text += " " + pick(r, EMOJI_SMOKE) + pick(r, EMOJI_FUN);
        if (evasive && chance(r, 0.4)) tactics.push("EMOJI_CODE");
      }
      return {
        text: distort(r, text),
        truth: {
          ...empty(kind, "DIRECT_MARKETING", true),
          has_price: hasPrice,
          has_delivery: hasShip,
          contact_channels: contacts,
          evasion_tactics: evasive ? Array.from(new Set(tactics)) : [],
        },
      };
    }
    case "LIFESTYLE": {
      let text = cap(fill(r, pick(r, LIFESTYLE_LINES)));
      if (chance(r, 0.7)) text += " " + pick(r, EMOJI_SMOKE) + (chance(r, 0.5) ? pick(r, EMOJI_FUN) : "");
      return { text: distort(r, text), truth: { ...empty(kind, "LIFESTYLE", true), has_price: false } };
    }
    case "BUY": {
      const text = cap(fill(r, pick(r, BUY_LINES))) + (chance(r, 0.4) ? " 🙏" : "");
      return { text: distort(r, text), truth: { ...empty(kind, "BUY_INQUIRY", true), has_price: false } };
    }
    case "WARNING": {
      const text = cap(fill(r, pick(r, WARNING_LINES))) + (chance(r, 0.3) ? " ⚠️" : "");
      return { text, truth: { ...empty(kind, "WARNING", true), has_price: false, has_delivery: false, contact_channels: [], evasion_tactics: [] } };
    }
    case "AMBIGUOUS": {
      // Ca khó: chữ quá ít; đáp án là "lối sống" (bài nằm trong luồng hashtag sản phẩm) nhưng đánh dấu hard
      const text = fill(r, pick(r, AMBIGUOUS_LINES));
      return { text, truth: { ...empty(kind, "LIFESTYLE", true), hard: true } };
    }
    case "UNRELATED":
    default: {
      const text = cap(fill(r, pick(r, UNRELATED_LINES))) + (chance(r, 0.4) ? " " + pick(r, EMOJI_FUN) : "");
      return {
        text: distort(r, text),
        truth: { ...empty("UNRELATED", "UNRELATED", false), has_price: false, contact_channels: [], evasion_tactics: [] },
      };
    }
  }
}

/** Chọn loại caption theo nhóm hashtag của bài giả (raw_payload.group) và việc bài có thật sự liên quan không. */
export function kindForGroup(group: string, related: boolean, r: Rand): CaptionKind {
  if (!related) return "UNRELATED";
  const table: Record<string, [CaptionKind, number][]> = {
    COMMERCIAL: [["SELL", 0.6], ["SELL_EVASIVE", 0.15], ["BUY", 0.15], ["AMBIGUOUS", 0.1]],
    LIFESTYLE: [["LIFESTYLE", 0.8], ["SELL", 0.1], ["AMBIGUOUS", 0.1]],
    EVASION: [["SELL_EVASIVE", 0.75], ["BUY", 0.1], ["LIFESTYLE", 0.15]],
    WARNING: [["WARNING", 1]],
  };
  const rows = table[group] ?? table.LIFESTYLE;
  let x = r();
  for (const [k, w] of rows) {
    x -= w;
    if (x <= 0) return k;
  }
  return rows[rows.length - 1][0];
}

/** Đáp án -> bộ nhãn theo bảng mã (để ghi nhãn GOLD / expected của bộ mô phỏng). Trường không biết chắc = null. */
export function truthToLabels(t: CaptionTruth): Record<string, string | string[] | boolean | null> {
  const unrelated = t.purpose === "UNRELATED";
  return {
    purpose: t.purpose,
    actor_type: null,
    crit_image: null,
    crit_text: unrelated ? false : null,
    crit_transaction: unrelated ? false : t.kind === "SELL" || t.kind === "SELL_EVASIVE" ? !!(t.has_price || t.has_delivery || (t.contact_channels?.length ?? 0) > 0) : null,
    has_price: t.has_price,
    contact_channels: t.contact_channels,
    has_delivery: t.has_delivery,
    targets_youth: null,
    evasion_tactics: t.evasion_tactics,
    sentiment: null,
    slang_terms: null,
  };
}

/** Bộ 50 bài mô phỏng có đáp án (cố định theo hạt giống) — để đo AI khi đổi model/prompt và làm bài kiểm tra. */
export function buildEvalSet50(): { item_code: string; platform: string; text: string; truth: CaptionTruth }[] {
  const plan: [CaptionKind, number][] = [
    ["SELL", 12], ["SELL_EVASIVE", 10], ["LIFESTYLE", 7], ["BUY", 5], ["WARNING", 6], ["UNRELATED", 8], ["AMBIGUOUS", 2],
  ];
  const r = seededRand("MO_PHONG_50@v1");
  const items: { item_code: string; platform: string; text: string; truth: CaptionTruth }[] = [];
  for (const [k, n] of plan) for (let i = 0; i < n; i++) items.push({ item_code: "", platform: r() < 0.6 ? "TIKTOK" : "FACEBOOK", ...makeCaption(k, r) });
  // trộn thứ tự cố định
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items.map((x, i) => ({ ...x, item_code: `B${String(i + 1).padStart(2, "0")}` }));
}
