// ==========================================================
// CHUẨN BỊ DỮ LIỆU GIẢ CHO GẮN NHÃN AI (02/11/2026)
//
//   npx tsx scripts/mock/seed-ai-demo.ts --dry          # xem 20 caption mẫu, không ghi gì
//   npx tsx scripts/mock/seed-ai-demo.ts --texts        # thay caption bài giả bằng câu đa dạng + ghi đáp án (raw_payload.mock_truth)
//   npx tsx scripts/mock/seed-ai-demo.ts --eval         # nạp bộ 50 bài mô phỏng có đáp án (eval_items, bộ MO_PHONG_50)
//   npx tsx scripts/mock/seed-ai-demo.ts --gold=200     # ghi đáp án làm nhãn GOLD cho 200 bài giả ĐÃ có nhãn AI
//   npx tsx scripts/mock/seed-ai-demo.ts --clean-gold   # xóa các nhãn GOLD do script ghi
//
// Chạy trong thư mục web; đọc .env.local (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).
// --texts: chỉ đổi raw_text và thêm raw_payload.mock_truth; GIỮ nguyên nhóm, số liệu tương tác, kết luận sàng lọc
//          (bài liên quan vẫn liên quan) -> dashboard Tổng quan không đổi. Chạy lại ra đúng caption cũ.
// --gold:  nhãn GOLD là ĐÁP ÁN của dữ liệu giả (không phải người thật chấm), ghi tên quản trị viên đầu tiên
//          (hoặc MOCK_LABELER_EMAIL), note = 'MOCK_TRUTH'. Trang Gắn nhãn hiện riêng "AI so với đáp án".
// Xóa toàn bộ dữ liệu giả (kể cả nhãn AI/người trên bài giả): node scripts/mock/seed-mock.mjs --clean
// ==========================================================
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { CODEBOOK_V1 } from "../../src/lib/ai/codebook";
import { buildEvalSet50, kindForGroup, makeCaption, seededRand, truthToLabels, type CaptionTruth } from "../../src/lib/ai/mock-captions";

const argv = process.argv.slice(2);
const has = (f: string) => argv.includes(f);
const val = (f: string) => argv.find((a) => a.startsWith(f + "="))?.split("=")[1];

// Câu mẫu "không liên quan" của seed-mock.mjs (để biết bài nào vốn không liên quan)
const OLD_UNRELATED = ["Tập podcast mới tuần này, mời mọi người nghe", "Quán cà phê mới mở, không gian chill lắm",
  "Review tai nghe pod mới mua", "Tin thể thao nước ngoài hôm nay", "Bán quần áo cũ, ai cần nhắn mình", "Video nhảy theo trend mới"];

function loadEnv() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
function db() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local");
  return createClient(url, key, { auth: { persistSession: false } });
}
type SB = ReturnType<typeof db>;

function newCaption(post: { post_id: string; raw_text: string; raw_payload: Record<string, unknown> }) {
  const raw = String(post.raw_text ?? "");
  const idx = raw.indexOf(" #");
  const tagPart = idx >= 0 ? raw.slice(idx + 1) : "";
  const prev = post.raw_payload?.mock_truth as CaptionTruth | undefined;
  const related = prev ? prev.related : !OLD_UNRELATED.some((t) => raw.startsWith(t));
  const r = seededRand(post.post_id);
  const kind = kindForGroup(String(post.raw_payload?.group ?? "LIFESTYLE"), related, r);
  const c = makeCaption(kind, r);
  return { text: tagPart ? `${c.text} ${tagPart}` : c.text, truth: c.truth };
}

async function ensureCodebook(sb: SB) {
  const { error } = await sb
    .from("label_codebooks")
    .upsert({ version: CODEBOOK_V1.version, title: CODEBOOK_V1.title, definition: CODEBOOK_V1 }, { onConflict: "version", ignoreDuplicates: true });
  if (error) throw new Error("label_codebooks: " + error.message + " (đã chạy docs/migrations/2026-10-30_ai-gan-nhan.sql chưa?)");
}

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]); }));
}

async function texts(sb: SB) {
  const info = await sb.from("system_settings").select("setting_key").eq("setting_key", "MOCK_SEED_INFO").maybeSingle();
  if (!info.data) throw new Error("Chưa có dữ liệu giả (MOCK_SEED_INFO). Chạy node scripts/mock/seed-mock.mjs trước.");
  let done = 0, total = 0;
  const stat: Record<string, number> = {};
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from("posts").select("post_id, raw_text, raw_payload").eq("raw_payload->>mock", "true").order("post_id").range(from, from + 999);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as { post_id: string; raw_text: string; raw_payload: Record<string, unknown> }[];
    total += page.length;
    await pool(page, 12, async (p) => {
      const c = newCaption(p);
      stat[c.truth.kind] = (stat[c.truth.kind] ?? 0) + 1;
      const { error: e } = await sb.from("posts").update({ raw_text: c.text, raw_payload: { ...p.raw_payload, mock_truth: c.truth } }).eq("post_id", p.post_id);
      if (e) throw new Error(e.message);
      done++;
      if (done % 200 === 0) process.stdout.write(`\r  đã đổi caption: ${done}`);
    });
    if (page.length < 1000) break;
  }
  console.log(`\r  đã đổi caption: ${done}/${total} bài giả`);
  console.log("  theo loại:", JSON.stringify(stat));
}

async function evalSet(sb: SB) {
  await ensureCodebook(sb);
  const items = buildEvalSet50().map((x) => ({
    eval_set: "MO_PHONG_50",
    item_code: x.item_code,
    platform: x.platform,
    text: x.text,
    expected: truthToLabels(x.truth),
    codebook_version: CODEBOOK_V1.version,
    note: `mô phỏng; loại ${x.truth.kind}${x.truth.hard ? "; ca khó" : ""}`,
  }));
  const { error } = await sb.from("eval_items").upsert(items, { onConflict: "eval_set,item_code" });
  if (error) throw new Error("eval_items: " + error.message);
  console.log(`  đã nạp ${items.length} bài vào bộ MO_PHONG_50`);
}

async function gold(sb: SB, n: number) {
  await ensureCodebook(sb);
  const email = process.env.MOCK_LABELER_EMAIL;
  let q = sb.from("profiles").select("id, email").eq("is_admin", true).order("created_at").limit(1);
  if (email) q = sb.from("profiles").select("id, email").eq("email", email).limit(1);
  const { data: prof } = await q;
  if (!prof?.length) throw new Error("Không tìm thấy tài khoản quản trị để ghi tên người gán (đặt MOCK_LABELER_EMAIL).");
  const labeler = prof[0];
  // Bài giả đã có nhãn AI (mọi model), lấy theo thứ tự cố định
  const ids: string[] = [];
  for (let from = 0; ids.length < n * 3 && from < 50000; from += 1000) {
    const { data, error } = await sb.from("ai_labels").select("post_id, posts!inner(raw_payload)").not("post_id", "is", null).is("error", null)
      .eq("posts.raw_payload->>mock", "true").order("post_id").range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const r of data ?? []) if (!ids.includes(r.post_id as string)) ids.push(r.post_id as string);
    if ((data ?? []).length < 1000) break;
  }
  if (!ids.length) throw new Error("Chưa có bài giả nào có nhãn AI — vào trang Gắn nhãn, chạy AI trước.");
  // Lấy mẫu đều: trộn theo hạt giống rồi lấy n bài
  const r = seededRand("GOLD@" + ids.length);
  const sample = [...ids];
  for (let i = sample.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [sample[i], sample[j]] = [sample[j], sample[i]];
  }
  sample.length = Math.min(sample.length, n);
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < sample.length; i += 200) {
    const { data } = await sb.from("posts").select("post_id, raw_payload").in("post_id", sample.slice(i, i + 200));
    for (const p of data ?? []) {
      const t = (p.raw_payload as Record<string, unknown>)?.mock_truth as CaptionTruth | undefined;
      if (!t) continue;
      rows.push({ post_id: p.post_id, labeler_id: labeler.id, source: "GOLD", codebook_version: CODEBOOK_V1.version, labels: truthToLabels(t), note: "MOCK_TRUTH" });
    }
  }
  if (!rows.length) throw new Error("Bài giả chưa có đáp án — chạy --texts trước.");
  // Chỉ mục duy nhất của human_labels là partial index -> không upsert theo onConflict được; ghi từng dòng, bỏ qua trùng
  let ok = 0, dup = 0;
  await pool(rows, 8, async (row) => {
    const res = await sb.from("human_labels").insert(row);
    if (!res.error) ok++;
    else if (res.error.code === "23505") dup++;
    else throw new Error(res.error.message);
  });
  console.log(`  đã ghi ${ok} nhãn GOLD (đáp án dữ liệu giả) dưới tên ${labeler.email}${dup ? `; ${dup} bài đã có từ trước` : ""}`);
}

async function main() {
  if (has("--dry") || argv.length === 0) {
    const r = seededRand("xem-thu");
    for (const g of ["COMMERCIAL", "LIFESTYLE", "EVASION", "WARNING"])
      for (let i = 0; i < 4; i++) {
        const k = kindForGroup(g, r() > 0.25, r);
        const c = makeCaption(k, r);
        console.log(`[${g}/${k}] ${c.text}`);
      }
    console.log("\nBộ 50 bài mô phỏng (5 bài đầu):");
    for (const x of buildEvalSet50().slice(0, 5)) console.log(` ${x.item_code} [${x.truth.kind}] ${x.text}`);
    console.log("\n(--dry: không ghi gì. Dùng --texts, --eval, --gold=N)");
    return;
  }
  const sb = db();
  if (has("--texts")) await texts(sb);
  if (has("--eval")) await evalSet(sb);
  const g = val("--gold");
  if (g) await gold(sb, Math.max(1, Math.min(2000, Number(g) || 200)));
  if (has("--clean-gold")) {
    const { error, count } = await sb.from("human_labels").delete({ count: "exact" }).eq("source", "GOLD").eq("note", "MOCK_TRUTH");
    if (error) throw new Error(error.message);
    console.log(`  đã xóa ${count ?? 0} nhãn GOLD do script ghi`);
  }
  console.log("Xong.");
}

main().catch((e) => {
  console.error("Lỗi:", e instanceof Error ? e.message : e);
  process.exit(1);
});
