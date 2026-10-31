#!/usr/bin/env node
// ==========================================================
// CHẠY THỬ SOCIAL FETCH (31/10/2026) — gói gọn trong 100 lượt miễn phí
//   1) Đo lại theo link: ~30 video TikTok + ~30 bài Facebook lấy từ docs/Actor/*/result.json
//      (+ link bài đã xóa trong docs/Actor/socialfetch/deleted-urls.txt nếu có, mỗi dòng 1 link)
//   2) Xu hướng từ khóa (TikTok): tìm theo từ khóa, khu vực VN, đăng trong tuần, mới nhất trước
// Kết quả lưu vào docs/Actor/socialfetch/: result-tiktok.json, result-facebook.json, result-trend.json, summary.txt
//
// Chạy trong thư mục web:
//   PowerShell:  $env:SOCIALFETCH_API_KEY="sfk_..."; node scripts/socialfetch-test.mjs
//   (hoặc thêm dòng SOCIALFETCH_API_KEY=sfk_... vào .env.local)
// Tùy chọn: SF_TIKTOK=30 SF_FACEBOOK=30 SF_TREND="vape,pod" (từ khóa thử xu hướng, mặc định "vape")
// KHÔNG dán API key vào file trong docs/.
// ==========================================================
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = process.cwd();
const ACTOR = join(ROOT, "docs", "Actor");
const OUT = join(ACTOR, "socialfetch");
const API = "https://api.socialfetch.dev";

function loadEnv() {
  const p = resolve(ROOT, ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv();
const KEY = process.env.SOCIALFETCH_API_KEY;
if (!KEY) { console.error("Thiếu SOCIALFETCH_API_KEY (xem hướng dẫn đầu file)."); process.exit(1); }
const N_TT = Number(process.env.SF_TIKTOK || 30);
const N_FB = Number(process.env.SF_FACEBOOK || 30);
const TREND = (process.env.SF_TREND || "vape").split(",").map((s) => s.trim()).filter(Boolean);

const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : []);
const num = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

// ---------- Lấy link + số liệu gốc từ mẫu actor ----------
function tiktokSamples() {
  const out = new Map();
  for (const [folder, src] of [["TikTok Hashtag Scraper", "clockworks-hashtag"], ["clockworkstiktok-scraper", "clockworks"]]) for (const it of readJson(join(ACTOR, folder, "result.json"))) {
    if (it.webVideoUrl) out.set(it.webVideoUrl, { src, likes: num(it.diggCount), comments: num(it.commentCount), shares: num(it.shareCount), views: num(it.playCount), saves: num(it.collectCount) });
  }
  for (const it of readJson(join(ACTOR, "api-ninjatiktok-hashtag-scraper", "result.json"))) {
    const h = it.author?.unique_id, id = it.video_id;
    if (h && id) out.set(`https://www.tiktok.com/@${h}/video/${id}`, { src: "api-ninja", likes: num(it.digg_count), comments: num(it.comment_count), shares: num(it.share_count), views: num(it.play_count), saves: num(it.collect_count) });
  }
  return roundRobin([...out.entries()]);
}
// Lấy xen kẽ giữa các nguồn để mẫu đa dạng
function roundRobin(entries) {
  const by = new Map();
  for (const e of entries) { const k = e[1].src; if (!by.has(k)) by.set(k, []); by.get(k).push(e); }
  const lists = [...by.values()], out = [];
  for (let i = 0; lists.some((l) => i < l.length); i++) for (const l of lists) if (i < l.length) out.push(l[i]);
  return out;
}
function facebookSamples() {
  const out = new Map();
  for (const it of readJson(join(ACTOR, "Facebook Posts Search", "result.json")))
    if (it.url) out.set(it.url, { src: "scraper_one", likes: num(it.reactionsCount), comments: num(it.commentsCount), shares: num(it.sharesCount), views: null });
  for (const it of readJson(join(ACTOR, "scrapeforgefacebook-search-posts", "result.json")))
    if (it.url) out.set(it.url, { src: "scrapeforge", likes: num(it.reactions_count), comments: num(it.comments_count), shares: num(it.reshare_count), views: num(it.video_view_count) });
  for (const it of readJson(join(ACTOR, "clappi-facebook-posts-reels-scraper", "result.json")))
    if (it.url) out.set(it.url, { src: "clappi", likes: num(it.likes), comments: num(it.comments), shares: num(it.shares), views: num(it.views) });
  return [...out.entries()];
}
const deleted = existsSync(join(OUT, "deleted-urls.txt"))
  ? readFileSync(join(OUT, "deleted-urls.txt"), "utf8").split(/\r?\n/).map((s) => s.trim()).filter((s) => s.startsWith("http"))
  : [];

// ---------- Gọi API ----------
let credits = 0;
async function get(path, params) {
  const url = API + path + "?" + new URLSearchParams(params).toString();
  const t0 = Date.now();
  try {
    const res = await fetch(url, { headers: { "x-api-key": KEY } });
    const text = await res.text();
    let body; try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 500) }; }
    const c = num(body?.meta?.creditsCharged);
    if (c) credits += c;
    return { http: res.status, ms: Date.now() - t0, body };
  } catch (e) {
    return { http: 0, ms: Date.now() - t0, body: { error: String(e) } };
  }
}
// Tìm số liệu trong phản hồi mà không giả định cứng tên trường (lần đầu chưa biết chính xác)
function pickStats(body) {
  const d = body?.data ?? body;
  const s = d?.stats ?? d?.metrics ?? d?.post?.stats ?? d?.video?.stats ?? d ?? {};
  const g = (...k) => { for (const x of k) if (num(s?.[x]) !== null) return num(s[x]); return null; };
  return { likes: g("likes", "reactions", "reactionCount", "likeCount"), comments: g("comments", "commentCount"), shares: g("shares", "shareCount"), views: g("views", "plays", "playCount", "viewCount"), saves: g("saves", "saveCount", "collects") };
}
const pct = (a, b) => (a === null || b === null || b === 0 ? "" : (((a - b) / b) * 100).toFixed(1) + "%");

async function measure(kind, path, items, extraUrls) {
  const rows = [];
  const list = [...items.map(([u, o]) => ({ url: u, orig: o })), ...extraUrls.map((u) => ({ url: u, orig: null, deletedTest: true }))];
  for (const [i, it] of list.entries()) {
    const r = await get(path, { url: it.url });
    const st = r.http === 200 ? pickStats(r.body) : null;
    rows.push({ url: it.url, deletedTest: !!it.deletedTest, http: r.http, ms: r.ms, stats: st, orig: it.orig, response: r.body });
    process.stdout.write(`\r  ${kind}: ${i + 1}/${list.length} (lượt đã dùng: ${credits})`);
  }
  process.stdout.write("\n");
  return rows;
}

const tt = tiktokSamples().slice(0, N_TT);
const fb = facebookSamples().slice(0, N_FB);
const delTT = deleted.filter((u) => u.includes("tiktok.com"));
const delFB = deleted.filter((u) => u.includes("facebook.com") || u.includes("fb.watch"));
console.log(`TikTok: ${tt.length} link (+${delTT.length} bài đã xóa); Facebook: ${fb.length} link (+${delFB.length} bài đã xóa); xu hướng: ${TREND.join(", ")}`);
if (tt.length + fb.length + deleted.length + TREND.length * 2 > 100) console.log("Lưu ý: có thể vượt 100 lượt miễn phí — giảm SF_TIKTOK / SF_FACEBOOK.");

const rTT = await measure("TikTok", "/v1/tiktok/videos", tt, delTT);
writeFileSync(join(OUT, "result-tiktok.json"), JSON.stringify(rTT, null, 2));
const rFB = await measure("Facebook", "/v1/facebook/posts", fb, delFB);
writeFileSync(join(OUT, "result-facebook.json"), JSON.stringify(rFB, null, 2));

// Xu hướng: 2 trang mỗi từ khóa
const trend = [];
for (const q of TREND) {
  let cursor = null;
  for (let page = 1; page <= 2; page++) {
    const params = { query: q, region: "VN", datePosted: "this-week", sortBy: "date-posted" };
    if (cursor) params.cursor = cursor;
    const r = await get("/v1/tiktok/search", params);
    const vids = r.body?.data?.videos ?? [];
    trend.push({ query: q, page, http: r.http, count: vids.length, hasMore: r.body?.data?.page?.hasMore ?? null, response: r.body });
    cursor = r.body?.data?.page?.nextCursor;
    if (!cursor) break;
  }
}
writeFileSync(join(OUT, "result-trend.json"), JSON.stringify(trend, null, 2));

// ---------- Tóm tắt ----------
const lines = [];
const sum = (label, rows) => {
  const ok = rows.filter((r) => r.http === 200 && !r.deletedTest);
  lines.push(`== ${label}: ${rows.length} lần gọi; thành công ${ok.length}; thời gian TB ${(rows.reduce((a, r) => a + r.ms, 0) / Math.max(1, rows.length) / 1000).toFixed(1)} giây`);
  const codes = {}; for (const r of rows) codes[r.http] = (codes[r.http] || 0) + 1;
  lines.push(`   Mã HTTP: ${JSON.stringify(codes)}`);
  for (const k of ["likes", "comments", "shares", "views", "saves"]) {
    const have = ok.filter((r) => r.stats?.[k] !== null && r.stats?.[k] !== undefined).length;
    lines.push(`   ${k.padEnd(8)} có số: ${have}/${ok.length}`);
  }
  lines.push("   So với số của actor lúc quét (lệch dương = tăng thêm sau vài ngày, bình thường):");
  for (const r of ok.slice(0, 15)) lines.push(`   like ${String(r.stats.likes).padStart(8)} vs ${String(r.orig?.likes).padStart(8)} (${pct(r.stats.likes, r.orig?.likes).padStart(7)})  bình luận ${String(r.stats.comments).padStart(6)} vs ${String(r.orig?.comments).padStart(6)}  [${r.orig?.src}] ${r.url.slice(0, 70)}`);
  for (const r of rows.filter((x) => x.deletedTest)) lines.push(`   BÀI ĐÃ XÓA: HTTP ${r.http} → ${JSON.stringify(r.response).slice(0, 200)}`);
};
sum("TikTok", rTT);
sum("Facebook", rFB);
lines.push(`== Xu hướng (TikTok, VN, trong tuần, mới nhất): ` + trend.map((t) => `${t.query} trang ${t.page}: ${t.count} video, HTTP ${t.http}, còn nữa: ${t.hasMore}`).join(" | "));
lines.push(`== Tổng lượt đã dùng (theo meta.creditsCharged): ${credits}`);
writeFileSync(join(OUT, "summary.txt"), lines.join("\n"));
console.log(lines.join("\n"));
console.log(`\nĐã lưu vào ${OUT}`);
