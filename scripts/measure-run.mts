// ==========================================================
// ĐO TƯƠNG TÁC từ máy bất kỳ (NAS, máy chủ, máy cá nhân) — cùng hàm với Vercel Cron và nút "Đo ngay".
//   npx tsx scripts/measure-run.mts --dry            # chỉ xem bao nhiêu bài đến hạn, không gọi Social Fetch
//   npx tsx scripts/measure-run.mts                  # đo các bài đến hạn (tối đa 800)
//   npx tsx scripts/measure-run.mts --limit=50       # đo tối đa 50 bài
//   npx tsx scripts/measure-run.mts --inventory      # kiểm kê toàn bộ (tốn nhiều lượt)
// Đọc .env.local (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY; khóa Social Fetch lấy ở trang Cấu hình
// hoặc biến SOCIALFETCH_API_KEY). Đặt lịch: Task Scheduler / cron gọi lệnh này mỗi ngày,
// hoặc gọi URL /api/cron/daily kèm CRON_SECRET (xem help: Đo tương tác).
// ==========================================================
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const p = resolve(process.cwd(), ".env.local");
if (existsSync(p))
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }

const argv = process.argv.slice(2);
const mode = argv.includes("--inventory") ? "inventory" : "due";
const limit = Number(argv.find((a) => a.startsWith("--limit="))?.split("=")[1]) || 800;
const { listDue, runMeasureBatch } = await import("../src/lib/measure/runner");

if (argv.includes("--dry")) {
  const r = await listDue({ mode });
  console.log(`Bài xét: ${r.scanned}; đến hạn: ${r.due.length}`, r.byReason);
} else {
  const s = await runMeasureBatch({ trigger: "SCRIPT", mode, limit, timeBudgetMs: 3_600_000 });
  console.log(JSON.stringify(s, null, 2));
}
