#!/usr/bin/env node
// ==========================================================
// SINH DỮ LIỆU GIẢ 18 THÁNG để dựng dashboard (31/10/2026)
// Mô phỏng đúng thiết kế đo lường (claude/thiet-ke-do-luong-2026-10-31.md):
//   - Luồng Phát hiện: quét hashtag hằng ngày -> bài mới (snapshot ngày 0), gặp lại bài cũ.
//   - Luồng Đo tương tác: mốc 3/7/14/30 ngày từ lúc phát hiện (bài > 60 ngày tuổi: chỉ mốc 30),
//     kiểm kê hằng tháng bài còn nóng, kiểm kê toàn bộ trước 4 đợt phân tích và sau mốc chính sách,
//     bài biến mất: đo không thấy -> kiểm lại sau 1 ngày -> ghi posts.unavailable_at.
//   - Số bài mới mỗi tuần theo 4 nhóm hashtag cố định, có thay đổi mức/độ dốc tại mốc chính sách;
//     hashtag lách luật mới xuất hiện dần sau mốc.
//
// DỮ LIỆU GIẢ CÓ NHÃN, XÓA SẠCH ĐƯỢC:
//   - posts.raw_payload.mock = true; link bài có tài khoản "mock_..."
//   - collection_runs / post_discoveries / hashtag_scan_events: researcher_code = 'MOCK'
//   - hashtag do script tạo mới được ghi trong system_settings 'MOCK_SEED_INFO'
//   KHÔNG đưa số liệu giả vào báo cáo như số thật.
//
// Cách dùng (chạy trong thư mục web, cần .env.local có NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY):
//   node scripts/mock/seed-mock.mjs --dry        # chỉ tính và in thống kê, không ghi gì
//   node scripts/mock/seed-mock.mjs              # ghi vào Supabase (cần chạy migration 2026-10-31 trước)
//   node scripts/mock/seed-mock.mjs --clean      # xóa toàn bộ dữ liệu giả
// Biến tùy chọn: MOCK_START=2025-05-01  MOCK_MONTHS=18  MOCK_INTERVENTION=2025-11-01  MOCK_SEED=173
//   (không đặt MOCK_INTERVENTION thì lấy project_config.intervention_date; không có thì START + 6 tháng)
// ==========================================================
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry");
const CLEAN = args.has("--clean");
const DAY = 86400000;
const MOCK = "MOCK";
const SETTING_KEY = "MOCK_SEED_INFO";

// ---------------- RNG có hạt giống (chạy lại ra cùng dữ liệu) ----------------
let rngState = Number(process.env.MOCK_SEED || 173) >>> 0;
function rand() {
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const uni = (a, b) => a + (b - a) * rand();
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;
function normal() {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}
const lognormal = (median, sigma) => median * Math.exp(sigma * normal());
function poisson(lam) {
  if (lam <= 0) return 0;
  if (lam > 30) return Math.max(0, Math.round(lam + Math.sqrt(lam) * normal()));
  const L = Math.exp(-lam);
  let k = 0, p = 1;
  do { k++; p *= rand(); } while (p > L);
  return k - 1;
}
function weighted(items, w) {
  const tot = w.reduce((a, b) => a + b, 0);
  let r = rand() * tot;
  for (let i = 0; i < items.length; i++) { r -= w[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}
const sha = (s) => createHash("sha256").update(s, "utf8").digest("hex");
const digits = (n) => Array.from({ length: n }, (_, i) => (i === 0 ? 1 + Math.floor(rand() * 9) : Math.floor(rand() * 10))).join("");

// ---------------- Thời gian ----------------
function addMonths(d, m) { const x = new Date(d); x.setUTCMonth(x.getUTCMonth() + m); return x; }
const START = new Date((process.env.MOCK_START || "2025-05-01") + "T00:00:00Z");
const MONTHS = Number(process.env.MOCK_MONTHS || 18);
const END = addMonths(START, MONTHS);
const atHour = (t, h) => { const d = new Date(t); d.setUTCHours(h, Math.floor(rand() * 60), 0, 0); return d.getTime(); };
const dayKey = (t) => new Date(t).toISOString().slice(0, 10);

// ---------------- Danh mục: 4 nhóm cố định (DEC-005) + hashtag ----------------
const GROUPS = [
  { group_id: "COMMERCIAL", group_name: "Tiếp thị trực tiếp", description: "Bài chào bán, giá, liên hệ, giao hàng" },
  { group_id: "LIFESTYLE", group_name: "Lối sống", description: "Gắn sản phẩm với phong cách sống, giải trí" },
  { group_id: "EVASION", group_name: "Từ lóng lách luật", description: "Đổi tên, viết tắt, ngụy trang mục đích, lách nền tảng" },
  { group_id: "WARNING", group_name: "Cai thuốc và cảnh báo", description: "Thông điệp phòng ngừa, cai thuốc, chính sách" },
];
// appear: số tuần sau mốc chính sách hashtag bắt đầu xuất hiện (null = có từ đầu, FIXED)
// fade: sau mốc, tỷ trọng giảm còn bao nhiêu (1 = không đổi)
const TAGS = [
  { t: "podgiare", g: "COMMERCIAL", fade: 0.35 }, { t: "vapegiare", g: "COMMERCIAL", fade: 0.3 },
  { t: "tinhdaupod", g: "COMMERCIAL", fade: 0.5 }, { t: "shopvape", g: "COMMERCIAL", fade: 0.25 },
  { t: "podmini", g: "COMMERCIAL", fade: 0.6 },
  { t: "vapelife", g: "LIFESTYLE" }, { t: "chillcungpod", g: "LIFESTYLE" }, { t: "khoitrang", g: "LIFESTYLE", fade: 0.7 },
  { t: "podxinh", g: "LIFESTYLE" }, { t: "cloudchasing", g: "LIFESTYLE", fade: 0.8 },
  { t: "butthom", g: "EVASION" }, { t: "thanhlypod", g: "EVASION" }, { t: "keothom", g: "EVASION" },
  { t: "passdocu", g: "EVASION" }, { t: "sacthom", g: "EVASION" },
  { t: "nghiquyet173", g: "WARNING" }, { t: "khongthuocladientu", g: "WARNING" }, { t: "caithuocla", g: "WARNING" },
  { t: "tachaivape", g: "WARNING" }, { t: "noikhongvoivape", g: "WARNING" },
  // Danh mục thích ứng: xuất hiện sau mốc (từ lóng thay thế)
  { t: "bútđiệntử", g: "EVASION", appear: 3, adaptive: true }, { t: "kẹokhói", g: "EVASION", appear: 6, adaptive: true },
  { t: "tinhdauthom", g: "EVASION", appear: 10, adaptive: true }, { t: "hangxachtay", g: "COMMERCIAL", appear: 8, adaptive: true },
  { t: "ibtuvan", g: "COMMERCIAL", appear: 14, adaptive: true }, { t: "podsale", g: "COMMERCIAL", appear: 22, adaptive: true },
  { t: "phukienthom", g: "EVASION", appear: 30, adaptive: true }, { t: "hanhtrinhcaithuoc", g: "WARNING", appear: 4, adaptive: true },
];
// Hashtag phổ biến đi kèm, không thuộc danh mục (để tab "Hashtag đi kèm"/mạng lưới có dữ liệu)
const GENERIC = ["xuhuong", "fyp", "viral", "reviewpod", "giare", "freeship", "hanoi", "saigon", "genz", "trend"];
const TEXTS = {
  COMMERCIAL: ["Hàng mới về, giá tốt cho anh em", "Pod mini đủ màu, giao toàn quốc", "Nhắn tin để được tư vấn mẫu mới nhất",
    "Giảm giá cuối tuần, số lượng có hạn", "Tinh dầu nhiều vị, mua 2 tặng 1"],
  LIFESTYLE: ["Chill cuối tuần cùng hội bạn", "Một ngày bình thường của mình", "Mùi này thơm quá mọi người ơi",
    "Đi cà phê không thể thiếu em này", "Góc nhỏ thư giãn sau giờ học"],
  EVASION: ["Thanh lý đồ cũ, ai cần nhắn mình", "Pass lại bút thơm, còn mới 95%", "Kẹo thơm vị mới, hỏi thì nhắn riêng nha",
    "Hàng xách tay, không bán công khai, ai cần thì liên hệ", "Phụ kiện thơm cho phòng, vị trái cây"],
  WARNING: ["Thuốc lá điện tử không vô hại như bạn nghĩ", "Nghị quyết 173 cấm thuốc lá điện tử, cùng nói không",
    "Hành trình cai thuốc của mình sau 3 tháng", "Phụ huynh cần biết các dấu hiệu con dùng thuốc lá điện tử",
    "Bác sĩ nói gì về tác hại của vape"],
};
// Mức nền (bài mới/tuần) và tác động tại mốc chính sách (k = số tuần kể từ mốc)
const RATE = {
  COMMERCIAL: (w, k) => 78 * (1 + 0.002 * w) * (k < 0 ? 1 : Math.min(0.92, 0.55 + 0.012 * k)),
  LIFESTYLE: (w, k) => 48 * (1 + 0.001 * w) * (k < 0 ? 1 : 0.85),
  EVASION: (w, k) => (k < 0 ? 14 : Math.min(62, 14 + 2.2 * k)),
  WARNING: (w, k) => 24 + (k < 0 ? 0 : 55 * Math.exp(-k / 4)),
};
const TIKTOK_SHARE = 0.6;

// ---------------- Mô phỏng ----------------
function simulate(intervention) {
  const runs = new Map(); // mock_key -> run
  const posts = [], snaps = [], facts = [], scanEvents = [], discoveries = [];
  const INTERV = intervention.getTime();
  const analysisInv = [6, 10, 14, 18].filter((m) => m <= MONTHS).map((m) => addMonths(START, m).getTime() - 7 * DAY);
  const policyInv = INTERV + 3 * DAY;
  const monthlyInv = [];
  for (let m = 1; m <= MONTHS; m++) monthlyInv.push(addMonths(START, m).getTime() + 5 * 3600000);
  const sellers = { TIKTOK: Array.from({ length: 450 }, (_, i) => `s${i}`), FACEBOOK: Array.from({ length: 300 }, (_, i) => `p${i}`) };
  const sellerW = sellers.TIKTOK.map((_, i) => 1 / Math.pow(i + 1, 0.9));
  const reasonCount = {};
  const clusters = Array.from({ length: 40 }, () => crypto.randomUUID());

  function run(kind, platform, t, hashtag) {
    const day = dayKey(t);
    const key = `${kind}|${platform}|${day}|${hashtag || ""}`;
    let r = runs.get(key);
    if (!r) {
      const startHour = kind === "DISCOVERY" ? 1 : 4;
      const st = new Date(day + "T00:00:00Z").getTime() + startHour * 3600000 + Math.floor(rand() * 1800000);
      const actor = kind === "DISCOVERY"
        ? (platform === "TIKTOK" ? "clockworks/tiktok-hashtag-scraper" : "scraper_one/facebook-posts-search")
        : (platform === "TIKTOK" ? "clockworks/tiktok-scraper" : "clappi/facebook-posts-reels-scraper");
      r = {
        mock_key: key, researcher_code: MOCK, platform, actor_id: actor,
        query_parameters: kind === "DISCOVERY"
          ? { mock: true, mock_key: key, mode: "DISCOVERY", hashtag: "#" + hashtag }
          : { mock: true, mock_key: key, mode: "REMEASURE", reasons: [] },
        started_at: new Date(st).toISOString(), completed_at: new Date(st + uni(4, 25) * 60000).toISOString(),
        items_count: 0, status: "SUCCESS", priority: 1,
      };
      runs.set(key, r);
    }
    return r;
  }

  const weeks = Math.ceil((END - START) / (7 * DAY));
  for (let w = 0; w < weeks; w++) {
    const wStart = START.getTime() + w * 7 * DAY;
    const k = Math.floor((wStart - INTERV) / (7 * DAY));
    for (const g of GROUPS.map((x) => x.group_id)) {
      const n = poisson(RATE[g](w, k));
      const active = TAGS.filter((x) => x.g === g && (x.appear == null || k >= x.appear));
      const weights = active.map((x) => (x.appear != null ? 1.4 : k >= 0 && x.fade ? x.fade : 1));
      for (let i = 0; i < n; i++) {
        const D = atHour(wStart + Math.floor(rand() * 7) * DAY, 1);
        if (D >= END.getTime()) continue;
        const tag = weighted(active, weights);
        const platform = chance(TIKTOK_SHARE) ? "TIKTOK" : "FACEBOOK";
        const old = chance(0.12);
        const lagDays = old ? uni(60, 400) : -Math.log(1 - rand()) * 6 + uni(0, 0.5);
        const published = D - lagDays * DAY;
        // Tác giả: người bán lặp lại nhiều (Zipf), còn lại là tài khoản lẻ
        const isSellerGroup = g === "COMMERCIAL" || g === "EVASION";
        const author = isSellerGroup && chance(0.7)
          ? weighted(sellers[platform], sellerW.slice(0, sellers[platform].length))
          : `u${Math.floor(rand() * 1e9)}`;
        const isReel = platform === "FACEBOOK" && chance(0.25);
        const vid = digits(19);
        const url = platform === "TIKTOK"
          ? `https://www.tiktok.com/@mock_${author}/video/${vid}`
          : isReel ? `https://www.facebook.com/reel/${digits(16)}/` : `https://www.facebook.com/mock.${author}/posts/${digits(16)}`;
        const post_id = sha(url);
        // Nội dung + hashtag đi kèm
        const others = active.filter((x) => x !== tag && chance(0.35)).slice(0, 2).map((x) => x.t);
        const cross = chance(0.15) ? [pick(TAGS.filter((x) => x.g !== g && (x.appear == null || k >= x.appear))).t] : [];
        const gen = GENERIC.filter(() => chance(platform === "TIKTOK" ? 0.18 : 0.08)).slice(0, 3);
        const tagsInText = [tag.t, ...others, ...cross, ...gen];
        const text = pick(TEXTS[g]) + " " + tagsInText.map((h) => "#" + h).join(" ");
        // Tương tác tiềm năng + đường cong tăng
        const views = platform === "TIKTOK" ? lognormal(2500, 1.6) : isReel ? lognormal(1800, 1.5) : null;
        const likes = platform === "TIKTOK" ? views * uni(0.02, 0.09) : isReel ? views * uni(0.02, 0.07) : lognormal(35, 1.4);
        const eng = { v: views, l: likes, c: likes * uni(0.01, 0.09), s: likes * (g === "WARNING" ? uni(0.05, 0.25) : uni(0.005, 0.08)) };
        const tau = uni(1, 6);
        const surge = chance(0.04) ? { at: uni(10, 60), mult: uni(1, 4), tau: uni(2, 5) } : null;
        const frac = (tAbs) => {
          const a = Math.max(0, (tAbs - published) / DAY);
          let f = 1 - Math.exp(-a / tau);
          if (surge && a > surge.at) f += surge.mult * (1 - Math.exp(-(a - surge.at) / surge.tau));
          return f;
        };
        const measure = (tAbs) => {
          const f = frac(tAbs);
          return {
            view_count: eng.v == null ? null : Math.round(eng.v * f),
            like_count: Math.round(eng.l * f), comment_count: Math.round(eng.c * f), share_count: Math.round(eng.s * f),
          };
        };
        // Biến mất: nguy cơ theo ngày, tăng gấp 2,5 trong 90 ngày sau mốc
        const hz = { COMMERCIAL: 0.0016, EVASION: 0.0025, LIFESTYLE: 0.0005, WARNING: 0.0002 }[g];
        let gone = null;
        for (let t = D + DAY; t < END.getTime(); t += DAY) {
          const h = hz * (t >= INTERV && t < INTERV + 90 * DAY ? 2.5 : 1);
          if (rand() < h) { gone = t + Math.floor(rand() * DAY); break; }
        }

        posts.push({
          post_id, platform, post_url: url, author_hash: sha(`${platform}:mock_${author}`),
          published_at: new Date(published).toISOString(), raw_text: text,
          raw_payload: { mock: true, group: g, scan_hashtag: "#" + tag.t, is_reel: isReel, author_kind: author.startsWith("u") ? "user" : "seller" },
          content_cluster_id: isSellerGroup && chance(0.06) ? pick(clusters) : null,
          is_flagged: false, flag_reason: null, created_at: new Date(D).toISOString(), unavailable_at: null,
        });
        const tagSet = new Set(tagsInText.filter((h) => TAGS.some((x) => x.t === h)));
        for (const h of tagSet) facts.push({ post_id, tag: h, match_type: "CAPTION", first_seen_run_key: null, first_seen_at: new Date(D).toISOString() });

        // Ngày 0: chính lần quét hashtag
        const r0 = run("DISCOVERY", platform, D, tag.t);
        r0.items_count++;
        snaps.push({ post_id, run_key: r0.mock_key, observed_at: new Date(D).toISOString(), ...measure(D) });
        facts.push({ post_id, tag: tag.t, match_type: "SEARCH_HIT", first_seen_run_key: r0.mock_key, first_seen_at: new Date(D).toISOString() });
        scanEvents.push({ run_key: r0.mock_key, post_id, tag: tag.t, match_type: "SEARCH_HIT", discovery_order: r0.items_count, recorded_at: new Date(D).toISOString() });
        discoveries.push({ post_id, run_key: r0.mock_key, discovered_at: new Date(D).toISOString() });

        // Lịch đo
        const events = [];
        for (const d of old ? [30] : [3, 7, 14, 30]) events.push({ t: atHour(D + d * DAY, 4), reason: "MILESTONE" });
        if (!old && chance(0.15)) events.push({ t: atHour(D + uni(1, 14) * DAY, 1), reason: "REDISCOVERY" });
        for (const t of [...analysisInv, policyInv]) if (t > D + 30 * DAY) events.push({ t, reason: "INVENTORY_FULL" });
        events.sort((a, b) => a.t - b.t);
        const hist = [measure(D)];
        const total = (m) => m.like_count + m.comment_count + m.share_count;
        const isHot = () => hist.length < 2 || total(hist[hist.length - 1]) >= 1.05 * Math.max(1, total(hist[hist.length - 2]));
        let mi = monthlyInv.findIndex((t) => t > D + 30 * DAY);
        const queue = [...events];
        while (true) {
          // chèn kiểm kê tháng kế tiếp nếu bài còn nóng
          if (mi >= 0 && mi < monthlyInv.length && isHot() && hist.length >= 5 && !queue.some((e) => e.t === monthlyInv[mi])) {
            const nextT = monthlyInv[mi];
            if (!queue.length || nextT < queue[0].t || queue.every((e) => e.reason !== "MILESTONE")) queue.push({ t: nextT, reason: "INVENTORY_HOT" });
            queue.sort((a, b) => a.t - b.t);
          }
          const e = queue.shift();
          if (!e) break;
          if (e.t >= END.getTime()) break;
          if (e.reason === "INVENTORY_HOT") mi++;
          else while (mi >= 0 && mi < monthlyInv.length && monthlyInv[mi] <= e.t) mi++;
          if (e.reason === "REDISCOVERY") {
            if (gone && e.t >= gone) continue;
            const r = run("DISCOVERY", platform, e.t, tag.t);
            r.items_count++;
            const m = measure(e.t); hist.push(m);
            snaps.push({ post_id, run_key: r.mock_key, observed_at: new Date(e.t).toISOString(), ...m });
            scanEvents.push({ run_key: r.mock_key, post_id, tag: tag.t, match_type: "SEARCH_HIT", discovery_order: r.items_count, recorded_at: new Date(e.t).toISOString() });
            discoveries.push({ post_id, run_key: r.mock_key, discovered_at: new Date(e.t).toISOString() });
            continue;
          }
          const r = run("REMEASURE", platform, e.t);
          r.items_count++;
          reasonCount[e.reason] = (reasonCount[e.reason] || 0) + 1;
          if (!r.query_parameters.reasons.includes(e.reason)) r.query_parameters.reasons.push(e.reason);
          if (gone && e.t >= gone) {
            // Không thấy bài -> kiểm lại sau 1 ngày -> xác nhận biến mất
            const tc = e.t + DAY;
            if (tc < END.getTime()) {
              const rc = run("REMEASURE", platform, tc);
              rc.items_count++;
              reasonCount.CONFIRM_UNAVAILABLE = (reasonCount.CONFIRM_UNAVAILABLE || 0) + 1;
              if (!rc.query_parameters.reasons.includes("CONFIRM_UNAVAILABLE")) rc.query_parameters.reasons.push("CONFIRM_UNAVAILABLE");
              posts[posts.length - 1].unavailable_at = new Date(tc).toISOString();
            }
            break;
          }
          const m = measure(e.t); hist.push(m);
          snaps.push({ post_id, run_key: r.mock_key, observed_at: new Date(e.t).toISOString(), ...m });
        }
      }
    }
  }
  return { runs: [...runs.values()], posts, snaps, facts, scanEvents, discoveries, analysisInv, policyInv, reasonCount };
}

// ---------------- Thống kê (in ra cho --dry và sau khi ghi) ----------------
function report(sim, intervention) {
  const { runs, posts, snaps } = sim;
  const byMonth = new Map();
  for (const p of posts) { const m = p.created_at.slice(0, 7); byMonth.set(m, (byMonth.get(m) || 0) + 1); }
  const wk = (iso) => Math.floor((Date.parse(iso) - intervention.getTime()) / (7 * DAY));
  const win = (g, a, b) => {
    const n = posts.filter((p) => p.raw_payload.group === g && wk(p.created_at) >= a && wk(p.created_at) < b).length;
    return (n / (b - a)).toFixed(1);
  };
  const remeasure = runs.filter((r) => r.query_parameters.mode === "REMEASURE").reduce((a, r) => a + r.items_count, 0);
  console.log(`Khoảng thời gian: ${START.toISOString().slice(0, 10)} → ${END.toISOString().slice(0, 10)}; mốc chính sách: ${intervention.toISOString().slice(0, 10)}`);
  console.log(`Bài: ${posts.length} (TikTok ${posts.filter((p) => p.platform === "TIKTOK").length}, Facebook ${posts.filter((p) => p.platform === "FACEBOOK").length}); trung bình ${(posts.length / MONTHS).toFixed(0)}/tháng`);
  console.log("Bài mới theo tháng:", [...byMonth.entries()].sort().map(([m, n]) => `${m}:${n}`).join(" "));
  console.log("Bài mới/tuần theo nhóm — 8 tuần trước mốc | 8 tuần sau | tuần 30–40 sau:");
  for (const g of GROUPS) console.log(`  ${g.group_id.padEnd(11)} ${win(g.group_id, -8, 0).padStart(6)} | ${win(g.group_id, 0, 8).padStart(6)} | ${win(g.group_id, 30, 40).padStart(6)}`);
  console.log(`Snapshot: ${snaps.length} (TB ${(snaps.length / posts.length).toFixed(1)}/bài); lần quét: ${runs.length} (phát hiện ${runs.filter((r) => r.query_parameters.mode === "DISCOVERY").length}, đo lại ${runs.filter((r) => r.query_parameters.mode === "REMEASURE").length})`);
  console.log(`Lượt đo lại (gửi link cho actor): ${remeasure} → ước tính ${(remeasure * 0.004).toFixed(0)} USD cả kỳ, ${(remeasure * 0.004 / MONTHS).toFixed(1)} USD/tháng`);
  const gone = posts.filter((p) => p.unavailable_at);
  console.log(`Bài biến mất: ${gone.length} (${((100 * gone.length) / posts.length).toFixed(1)}%)`);
  console.log("Lượt đo theo lý do:", JSON.stringify(sim.reasonCount));
  // Tự kiểm tra tính nhất quán
  const runKeys = new Set(runs.map((r) => r.mock_key));
  const postById = new Map(posts.map((p) => [p.post_id, p]));
  const errs = [];
  if (postById.size !== posts.length) errs.push("trùng post_id");
  const last = new Map();
  for (const s of snaps) {
    const p = postById.get(s.post_id);
    if (!runKeys.has(s.run_key)) { errs.push("snapshot thiếu run"); break; }
    if (s.observed_at < p.created_at) { errs.push("đo trước khi phát hiện"); break; }
    if (p.unavailable_at && s.observed_at > p.unavailable_at) { errs.push("đo sau khi biến mất"); break; }
    if (s.observed_at >= END.toISOString()) { errs.push("đo sau ngày kết thúc"); break; }
    const prev = last.get(s.post_id);
    if (prev && (s.observed_at < prev.observed_at || s.like_count < prev.like_count)) { errs.push("số liệu không tăng dần theo thời gian"); break; }
    last.set(s.post_id, s);
  }
  if (sim.facts.some((f) => !TAGS.some((t) => t.t === f.tag))) errs.push("fact trỏ tới hashtag ngoài danh mục");
  console.log(errs.length ? "KIỂM TRA: LỖI — " + errs.join("; ") : "KIỂM TRA: dữ liệu nhất quán (run, thứ tự thời gian, tăng dần, biến mất)");
  console.log(`Hashtag trong danh mục: ${TAGS.length} (${TAGS.filter((t) => t.adaptive).length} thích ứng xuất hiện sau mốc)`);
}

// ---------------- Supabase ----------------
function loadEnv() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
async function db() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local");
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false } });
}
const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
function must(res, what) { if (res.error) throw new Error(`${what}: ${res.error.message}`); return res.data; }
async function bulk(sb, table, rows, size, opts) {
  let n = 0;
  for (const c of chunks(rows, size)) {
    const q = opts?.upsert ? sb.from(table).upsert(c, opts.upsert) : sb.from(table).insert(c);
    must(await q, `Ghi ${table}`);
    n += c.length;
    process.stdout.write(`\r  ${table}: ${n}/${rows.length}`);
  }
  if (rows.length) process.stdout.write("\n");
}

async function seed() {
  const sb = await db();
  const existing = must(await sb.from("system_settings").select("setting_value").eq("setting_key", SETTING_KEY).maybeSingle(), "Đọc system_settings");
  if (existing) throw new Error("Đã có dữ liệu giả (MOCK_SEED_INFO). Chạy --clean trước nếu muốn sinh lại.");
  const col = await sb.from("posts").select("unavailable_at").limit(1);
  if (col.error) throw new Error("Bảng posts chưa có cột unavailable_at — chạy docs/migrations/2026-10-31_do-lai-theo-link.sql trước.");

  let intervention = process.env.MOCK_INTERVENTION ? new Date(process.env.MOCK_INTERVENTION + "T00:00:00Z") : null;
  if (!intervention) {
    const cfg = await sb.from("project_config").select("intervention_date").eq("config_id", "MAIN_STUDY").maybeSingle();
    if (cfg.data?.intervention_date) intervention = new Date(cfg.data.intervention_date + "T00:00:00Z");
  }
  if (!intervention || intervention <= START || intervention >= END) {
    console.log("Mốc chính sách trong project_config nằm ngoài khoảng dữ liệu giả → dùng START + 6 tháng (đặt MOCK_INTERVENTION để đổi).");
    intervention = addMonths(START, 6);
  }
  const sim = simulate(intervention);
  report(sim, intervention);

  console.log("Ghi danh mục…");
  must(await sb.from("hashtag_groups").upsert(GROUPS, { onConflict: "group_id", ignoreDuplicates: true }), "hashtag_groups");
  const ACTORS = [
    { actor_id: "clockworks/tiktok-hashtag-scraper", actor_name: "TikTok – quét theo hashtag", platform: "TIKTOK" },
    { actor_id: "scraper_one/facebook-posts-search", actor_name: "Facebook – tìm bài theo từ khóa/hashtag", platform: "FACEBOOK" },
    { actor_id: "clockworks/tiktok-scraper", actor_name: "TikTok – đo lại theo link", platform: "TIKTOK" },
    { actor_id: "clappi/facebook-posts-reels-scraper", actor_name: "Facebook – đo lại theo link", platform: "FACEBOOK" },
  ];
  must(await sb.from("apify_actors").upsert(ACTORS, { onConflict: "actor_id", ignoreDuplicates: true }), "apify_actors");
  const texts = TAGS.map((x) => "#" + x.t);
  const have = must(await sb.from("hashtags").select("hashtag_id, hashtag_text").in("hashtag_text", texts), "Đọc hashtags");
  const haveSet = new Set(have.map((h) => h.hashtag_text));
  const interv = intervention.getTime();
  const toAdd = TAGS.filter((x) => !haveSet.has("#" + x.t)).map((x) => ({
    hashtag_text: "#" + x.t, keyword_track: x.adaptive ? "ADAPTIVE" : "FIXED", is_active: true,
    created_at: new Date(x.appear != null ? interv + x.appear * 7 * DAY - 3 * DAY : START.getTime() - DAY).toISOString(),
  }));
  const added = toAdd.length ? must(await sb.from("hashtags").insert(toAdd).select("hashtag_id, hashtag_text"), "Ghi hashtags") : [];
  // Ghi ngay thông tin để --clean xóa được kể cả khi ghi dở
  must(await sb.from("system_settings").insert({ setting_key: SETTING_KEY, setting_value: JSON.stringify({
    created_at: new Date().toISOString(), start: START.toISOString(), months: MONTHS, intervention: intervention.toISOString(),
    hashtag_ids: added.map((h) => h.hashtag_id),
  }) }), "Ghi MOCK_SEED_INFO");
  const tagId = new Map([...have, ...added].map((h) => [h.hashtag_text.replace(/^#/, ""), h.hashtag_id]));
  must(await sb.from("hashtag_group_mapping").upsert(TAGS.map((x) => ({ hashtag_id: tagId.get(x.t), group_id: x.g })),
    { onConflict: "hashtag_id,group_id", ignoreDuplicates: true }), "hashtag_group_mapping");

  console.log("Ghi lần quét…");
  const runId = new Map();
  for (const c of chunks(sim.runs, 500)) {
    const rows = c.map(({ mock_key, ...r }) => r);
    const out = must(await sb.from("collection_runs").insert(rows).select("run_id, query_parameters"), "Ghi collection_runs");
    for (const r of out) runId.set(r.query_parameters.mock_key, r.run_id);
    process.stdout.write(`\r  collection_runs: ${runId.size}/${sim.runs.length}`);
  }
  process.stdout.write("\n");
  console.log("Ghi bài và số liệu…");
  await bulk(sb, "posts", sim.posts, 500);
  await bulk(sb, "post_snapshots", sim.snaps.map(({ run_key, ...s }) => ({ ...s, run_id: runId.get(run_key) })), 1000);
  const factRows = new Map();
  for (const f of sim.facts) {
    const k = `${f.post_id}|${f.tag}|${f.match_type}`;
    if (!factRows.has(k)) factRows.set(k, { post_id: f.post_id, hashtag_id: tagId.get(f.tag), match_type: f.match_type,
      first_seen_run_id: f.first_seen_run_key ? runId.get(f.first_seen_run_key) : null, first_seen_at: f.first_seen_at });
  }
  await bulk(sb, "post_hashtag_facts", [...factRows.values()], 1000, { upsert: { onConflict: "post_id,hashtag_id,match_type", ignoreDuplicates: true } });
  await bulk(sb, "hashtag_scan_events", sim.scanEvents.map((e) => ({ run_id: runId.get(e.run_key), post_id: e.post_id,
    hashtag_id: tagId.get(e.tag), match_type: e.match_type, discovery_order: e.discovery_order, researcher_code: MOCK, recorded_at: e.recorded_at })),
    1000, { upsert: { onConflict: "run_id,post_id,hashtag_id,match_type", ignoreDuplicates: true } });
  await bulk(sb, "post_discoveries", sim.discoveries.map((d) => ({ post_id: d.post_id, run_id: runId.get(d.run_key), researcher_code: MOCK, discovered_at: d.discovered_at })), 1000);
  console.log("Xong. Xóa bằng: node scripts/mock/seed-mock.mjs --clean");
}

async function clean() {
  const sb = await db();
  const info = must(await sb.from("system_settings").select("setting_value").eq("setting_key", SETTING_KEY).maybeSingle(), "Đọc system_settings");
  const ids = [];
  for (let from = 0; ; from += 1000) {
    const page = must(await sb.from("posts").select("post_id").eq("raw_payload->>mock", "true").range(from, from + 999), "Đọc bài giả");
    ids.push(...page.map((p) => p.post_id));
    if (page.length < 1000) break;
  }
  console.log(`Bài giả: ${ids.length}`);
  for (const table of ["post_snapshots", "post_hashtag_facts", "hashtag_scan_events", "post_discoveries", "post_hashtag_matches", "ai_labels", "human_labels"]) {
    let n = 0;
    for (const c of chunks(ids, 100)) {
      const res = await sb.from(table).delete().in("post_id", c);
      if (res.error) { console.log(`  ${table}: bỏ qua (${res.error.message})`); break; }
      n += c.length;
    }
    console.log(`  ${table}: đã xóa theo ${n} bài`);
  }
  for (const c of chunks(ids, 100)) must(await sb.from("posts").delete().in("post_id", c), "Xóa posts");
  for (const table of ["post_snapshots", "hashtag_scan_events", "post_discoveries"]) await sb.from(table).delete().eq("researcher_code", MOCK).then(() => {}, () => {});
  must(await sb.from("collection_runs").delete().eq("researcher_code", MOCK), "Xóa collection_runs");
  const hids = info ? JSON.parse(info.setting_value).hashtag_ids || [] : [];
  if (hids.length) {
    await sb.from("hashtag_group_mapping").delete().in("hashtag_id", hids);
    const res = await sb.from("hashtags").delete().in("hashtag_id", hids);
    console.log(res.error ? `  hashtags: giữ lại (${res.error.message})` : `  hashtags do script tạo: đã xóa ${hids.length}`);
  }
  await sb.from("system_settings").delete().eq("setting_key", SETTING_KEY);
  console.log("Đã xóa dữ liệu giả. Nhóm hashtag (4 nhóm cố định) và actor được giữ lại.");
}

try {
  if (CLEAN) await clean();
  else if (DRY) {
    const intervention = process.env.MOCK_INTERVENTION ? new Date(process.env.MOCK_INTERVENTION + "T00:00:00Z") : addMonths(START, 6);
    report(simulate(intervention), intervention);
    console.log("(--dry: không ghi gì)");
  } else await seed();
} catch (e) {
  console.error("Lỗi:", e.message);
  process.exit(1);
}
