import { redirect } from "next/navigation";
import { Tags } from "lucide-react";
import HelpLink from "@/components/HelpLink";
import { getCurrentUser, getServiceClient } from "@/lib/auth/guards";
import { getAiConfig } from "@/lib/ai/openrouter";
import { getAiPolicy, getMonthSpendUsd } from "@/lib/ai/runner";
import { getLabelProgress } from "@/lib/ai/jobs";
import { getQueueCounts, loadReliability, type QueueBucket } from "@/lib/ai/review";
import LabelingWorkbench from "@/components/labeling/LabelingWorkbench";
import { getT } from "@/lib/i18n/server";

// Mỗi lô AI ~20 bài, song song 4 -> thường 15–30 giây; để dư cho model chậm.
export const maxDuration = 120;

export default async function GanNhanPage() {
  const t = await getT();
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!me.isResearcher) redirect("/dashboard");

  const sb = getServiceClient();
  let loadError: string | null = null;
  let progress = { total: 0, labeled: 0, remaining: 0 };
  let counts: Record<QueueBucket, number> = { UNCLEAR: 0, SAMPLE: 0, ALL: 0 };
  let reliability: Awaited<ReturnType<typeof loadReliability>> = { groups: [], disagreements: [], reviewedCount: 0, error: null };
  let evalCount = 0;
  let hasMock = false;
  const cfg = await getAiConfig();
  const [policy, monthSpend] = await Promise.all([getAiPolicy(), getMonthSpendUsd()]);

  try {
    const [p, c, r, ev, mock] = await Promise.all([
      getLabelProgress(cfg.model),
      getQueueCounts(),
      loadReliability(),
      sb.from("eval_items").select("item_id", { count: "exact", head: true }).eq("eval_set", "MO_PHONG_50"),
      sb.from("system_settings").select("setting_key").eq("setting_key", "MOCK_SEED_INFO").maybeSingle(),
    ]);
    progress = p;
    counts = c;
    reliability = r;
    evalCount = ev.count ?? 0;
    hasMock = !!mock.data;
    if (r.error) loadError = r.error;
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="p-4 md:p-8 bg-stone-50 min-h-full">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start gap-3 mb-6">
          <div className="shrink-0 inline-flex items-center justify-center w-11 h-11 bg-violet-700 rounded-xl text-white shadow-sm">
            <Tags className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight">{t("Gắn nhãn bài (AI hỗ trợ)")}</h1>
            <p className="text-sm text-stone-500 mt-1">
              {t("AI đọc chữ của bài (đã che số điện thoại, link, tài khoản) và gợi ý nhãn; nghiên cứu viên xác minh. AI gợi ý, người quyết định — độ tin cậy của AI được đo, không tin suông.")}
            </p>
            <div className="flex flex-wrap gap-x-4">
              <HelpLink slug="nghien-cuu/gan-nhan" label={t("Cách dùng trang này")} className="mt-1" />
              <HelpLink slug="thiet-ke/sang-loc-ai" label={t("Vì sao làm thế")} className="mt-1" />
            </div>
          </div>
        </div>
        {loadError && (
          <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
            <p className="font-semibold">{t("Chưa đọc được dữ liệu gắn nhãn.")}</p>
            <p className="mt-1">
              {t("Kiểm tra đã chạy")} <code>docs/migrations/2026-10-30_ai-gan-nhan.sql</code> {t("và")} <code>2026-10-31_bo-sung-sang-loc-do-luong.sql</code> {t("trên Supabase chưa.")}
            </p>
            <p className="mt-2 text-xs text-amber-800">{t("Chi tiết: {loadError}", { loadError })}</p>
          </div>
        )}
        <LabelingWorkbench
          model={cfg.model}
          hasKey={!!cfg.apiKey}
          budget={policy.monthlyBudgetUsd}
          monthSpend={monthSpend}
          progress={progress}
          counts={counts}
          reliability={reliability}
          evalCount={evalCount}
          hasMock={hasMock}
        />
      </div>
    </div>
  );
}
