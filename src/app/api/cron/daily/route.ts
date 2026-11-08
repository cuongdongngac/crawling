// ==========================================================
// VIỆC HẰNG NGÀY — gọi bởi Vercel Cron (vercel.json), hoặc bởi bất kỳ máy nào có lịch (NAS, máy chủ):
//   curl -H "Authorization: Bearer $CRON_SECRET" https://<tên miền>/api/cron/daily
// Thứ tự: (1) AI sàng lọc bài mới (nếu bật ở trang Cấu hình) -> (2) đo tương tác các bài đến hạn bằng Social Fetch.
// Vercel chỉ điều phối; việc lấy dữ liệu do Apify / Social Fetch làm.
// Cần biến môi trường CRON_SECRET (Vercel tự gửi kèm khi gọi cron).
// ==========================================================
import { NextResponse, type NextRequest } from "next/server";
import { getAiPolicy } from "@/lib/ai/runner";
import { labelPendingPosts } from "@/lib/ai/jobs";
import { runMeasureBatch } from "@/lib/measure/runner";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // giây (Vercel Pro cho phép)

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "Chưa đặt CRON_SECRET trên máy chủ." }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false, error: "Không có quyền." }, { status: 401 });

  const t0 = Date.now();
  const out: Record<string, unknown> = { startedAt: new Date(t0).toISOString() };

  // 1. Sàng lọc trước khi đo: bài AI loại sẽ không tốn lượt đo
  try {
    const p = await getAiPolicy();
    out.ai = p.autoEnabled ? await labelPendingPosts({ limit: 100, trigger: "CRON" }) : { status: "SKIPPED", message: "Tự gắn nhãn đang tắt." };
  } catch (e) {
    out.ai = { status: "FAILED", message: e instanceof Error ? e.message : String(e) };
  }

  // 2. Đo các bài đến hạn, dừng nhận bài mới trước giới hạn thời gian của hàm
  try {
    const left = 300_000 - (Date.now() - t0) - 40_000;
    out.measure = await runMeasureBatch({ trigger: "CRON", limit: Number(process.env.MEASURE_DAILY_LIMIT) || 800, timeBudgetMs: Math.max(30_000, left) });
  } catch (e) {
    out.measure = { status: "FAILED", message: e instanceof Error ? e.message : String(e) };
  }

  out.seconds = Math.round((Date.now() - t0) / 1000);
  return NextResponse.json({ ok: true, ...out });
}
