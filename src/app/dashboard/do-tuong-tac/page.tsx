import { redirect } from "next/navigation";
import { Activity } from "lucide-react";
import HelpLink from "@/components/HelpLink";
import { getCurrentUser, getServiceClient } from "@/lib/auth/guards";
import { getMeasureConfig, getMeasureSpendUsd, listDue } from "@/lib/measure/runner";
import MeasurePanel, { type RunRow } from "@/components/measure/MeasurePanel";
import { getT } from "@/lib/i18n/server";

export const maxDuration = 120;

export default async function DoTuongTacPage() {
  const t = await getT();
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!me.isAdmin) redirect("/dashboard");

  const cfg = await getMeasureConfig();
  let loadError: string | null = null;
  let spend = 0;
  let due = { total: 0, byReason: {} as Record<string, number>, byPlatform: {} as Record<string, number> };
  let runs: RunRow[] = [];
  try {
    const [s, d, r] = await Promise.all([
      getMeasureSpendUsd(),
      listDue(),
      getServiceClient()
        .from("collection_runs")
        .select("run_id, platform, status, started_at, completed_at, items_count, cost_usd, error_message, query_parameters")
        .eq("run_type", "MEASURE")
        .neq("researcher_code", "MOCK")
        .order("started_at", { ascending: false })
        .limit(15),
    ]);
    spend = s;
    const byPlatform: Record<string, number> = {};
    for (const x of d.due) byPlatform[x.sf] = (byPlatform[x.sf] ?? 0) + 1;
    due = { total: d.due.length, byReason: d.byReason, byPlatform };
    if (r.error) throw new Error(r.error.message);
    runs = (r.data ?? []) as RunRow[];
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="p-4 md:p-8 bg-stone-50 min-h-full">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start gap-3 mb-6">
          <div className="shrink-0 inline-flex items-center justify-center w-11 h-11 bg-indigo-700 rounded-xl text-white shadow-sm">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight">{t("Đo tương tác")}</h1>
            <p className="text-sm text-stone-500 mt-1">
              {t("Apify tìm link bài; bài không liên quan bị loại; Social Fetch đo lại like, bình luận, chia sẻ, lượt xem theo mốc 3, 7, 14, 30 ngày. Chạy tự động mỗi ngày lúc 3 giờ sáng; nút dưới đây để đo ngay.")}
            </p>
            <HelpLink slug="quan-tri/do-tuong-tac" label={t("Cách dùng trang này")} className="mt-1" />
          </div>
        </div>
        {loadError && (
          <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
            <p className="font-semibold">{t("Chưa đọc được dữ liệu đo.")}</p>
            <p className="mt-1">{t("Kiểm tra đã chạy")} <code>docs/migrations/2026-11-04_do-tuong-tac.sql</code> {t("trên Supabase chưa.")}</p>
            <p className="mt-2 text-xs">{t("Chi tiết: {loadError}", { loadError })}</p>
          </div>
        )}
        <MeasurePanel hasKey={!!cfg.apiKey} budget={cfg.monthlyBudgetUsd} usdPerCredit={cfg.usdPerCredit} spend={spend} due={due} runs={runs} />
      </div>
    </div>
  );
}
