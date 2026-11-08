"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Bot, Gauge, RefreshCw } from "lucide-react";
import type { Disagreement, QueueBucket, StatsGroup } from "@/lib/ai/review";
import ReviewQueue from "@/components/labeling/ReviewQueue";
import AiRunPanel from "@/components/labeling/AiRunPanel";
import ReliabilityPanel from "@/components/labeling/ReliabilityPanel";
import { useT, useLocale } from "@/lib/i18n/client";

type Tab = "review" | "run" | "reliability";

export default function LabelingWorkbench(props: {
  model: string;
  hasKey: boolean;
  budget: number;
  monthSpend: number | null;
  progress: { total: number; labeled: number; remaining: number };
  counts: Record<QueueBucket, number>;
  reliability: { groups: StatsGroup[]; disagreements: Disagreement[]; reviewedCount: number };
  evalCount: number;
  hasMock: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(props.progress.labeled === 0 ? "run" : "review");
  const [pending, startTransition] = useTransition();
  const refresh = () => startTransition(() => router.refresh());

  const waiting = props.counts.UNCLEAR + props.counts.SAMPLE;
  const tabs: { id: Tab; label: string; icon: typeof Bot; badge?: string }[] = [
    { id: "review", label: t("Xác minh"), icon: ClipboardCheck, badge: waiting ? waiting.toLocaleString(locale) : undefined },
    { id: "run", label: t("Chạy AI"), icon: Bot },
    { id: "reliability", label: t("Độ tin cậy AI"), icon: Gauge },
  ];

  return (
    <div className="space-y-4">
      {props.hasMock && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          <b>{t("Đang có DỮ LIỆU GIẢ.")}</b> {t("Bài giả được đánh dấu \"BÀI GIẢ\"; số đo độ tin cậy trên bài giả chỉ để thử hệ thống, không đưa vào báo cáo.")}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label={t("Bài có nhãn AI")} value={props.progress.labeled} note={t("/{v0} bài có chữ · {model}", { v0: props.progress.total.toLocaleString(locale), model: props.model })} />
        <Stat label={t("AI chưa rõ, chờ người")} value={props.counts.UNCLEAR} note={t("hàng ưu tiên")} />
        <Stat label={t("Mẫu chấm mù còn lại")} value={props.counts.SAMPLE} note={t("~10% bài AI đã kết luận, chọn cố định")} />
        <Stat label={t("Nhãn người đã có")} value={props.reliability.reviewedCount} note={t("chi phí AI tháng này ${v0} / ${budget}", { v0: (props.monthSpend ?? 0).toFixed(2), budget: props.budget })} />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-stone-200">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`inline-flex items-center gap-2 px-3 py-2 -mb-px border-b-2 text-sm font-medium ${
              tab === tb.id ? "border-violet-700 text-violet-800" : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <tb.icon className="w-4 h-4" /> {tb.label}
            {tb.badge && <span className="text-[11px] rounded-full bg-violet-100 text-violet-800 px-1.5 tabular-nums">{tb.badge}</span>}
          </button>
        ))}
        <button onClick={refresh} className="ml-auto inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800 pb-1" title={t("Tải lại số liệu")}>
          <RefreshCw className={`w-4 h-4 ${pending ? "animate-spin" : ""}`} /> {t("Làm mới")}
        </button>
      </div>

      {/* Giữ cả ba tab trong cây để không mất bài đang chấm khi chuyển tab */}
      <div className={tab === "review" ? "" : "hidden"}>
        <ReviewQueue initialCounts={props.counts} />
      </div>
      <div className={tab === "run" ? "" : "hidden"}>
        <AiRunPanel
          model={props.model}
          hasKey={props.hasKey}
          budget={props.budget}
          monthSpend={props.monthSpend}
          progress={props.progress}
          evalCount={props.evalCount}
          hasMock={props.hasMock}
          onDone={refresh}
        />
      </div>
      <div className={tab === "reliability" ? "" : "hidden"}>
        <ReliabilityPanel {...props.reliability} />
      </div>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: number; note: string }) {
  const locale = useLocale();
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4">
      <p className="text-xs font-semibold text-stone-500">{label}</p>
      <p className="text-2xl font-bold text-stone-900 tabular-nums mt-1">{value.toLocaleString(locale)}</p>
      <p className="text-xs text-stone-500 mt-0.5 truncate" title={note}>{note}</p>
    </div>
  );
}
