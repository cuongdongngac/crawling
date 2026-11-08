"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Play, Square, RefreshCw } from "lucide-react";
import { measureNow, previewDue } from "@/app/actions/measure";
import { useT, useLocale } from "@/lib/i18n/client";

export type RunRow = {
  run_id: number;
  platform: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  items_count: number | null;
  cost_usd: number | null;
  error_message: string | null;
  query_parameters: { trigger?: string; planned?: number; not_found?: number; failed?: number; reasons?: Record<string, number> } | null;
};

type Due = { total: number; byReason: Record<string, number>; byPlatform: Record<string, number> };

const REASON: Record<string, string> = {
  CONFIRM_UNAVAILABLE: "Kiểm lại bài lần trước không thấy",
  MILESTONE_3: "Mốc 3 ngày",
  MILESTONE_7: "Mốc 7 ngày",
  MILESTONE_14: "Mốc 14 ngày",
  MILESTONE_30: "Mốc 30 ngày",
  INVENTORY_HOT: "Bài còn nóng (sau 30 ngày)",
  INVENTORY_FULL: "Kiểm kê toàn bộ",
};
const TRIGGER: Record<string, string> = { CRON: "Tự động", MANUAL: "Bấm tay", SCRIPT: "Script" };
const STATUS: Record<string, string> = { SUCCESS: "Xong", PARTIAL_SUCCESS: "Xong một phần", FAILED: "Lỗi", RUNNING: "Đang chạy" };

export default function MeasurePanel(props: { hasKey: boolean; budget: number; usdPerCredit: number; spend: number; due: Due; runs: RunRow[] }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [mode, setMode] = useState<"due" | "inventory">("due");
  const [due, setDue] = useState<Due>(props.due);
  const [target, setTarget] = useState(100);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<{ text: string; tone?: "ok" | "warn" | "err" }[]>([]);
  const [tot, setTot] = useState({ found: 0, notFound: 0, gone: 0, failed: 0, cost: 0 });
  const stop = useRef(false);
  const add = (text: string, tone?: "ok" | "warn" | "err") => setLog((l) => [{ text: `${new Date().toLocaleTimeString(locale)} ${t(text)}`, tone }, ...l].slice(0, 40));

  async function changeMode(m: "due" | "inventory") {
    setMode(m);
    const r = await previewDue(m);
    if (r.ok) setDue(r.data);
    else add(r.error, "err");
  }

  async function run() {
    stop.current = false;
    setRunning(true);
    let done = 0;
    const acc = { found: 0, notFound: 0, gone: 0, failed: 0, cost: 0 };
    try {
      while (!stop.current && done < target) {
        const r = await measureNow({ limit: Math.min(25, target - done), mode });
        if (!r.ok) {
          add(r.error, "err");
          break;
        }
        const s = r.data;
        if (s.status === "SKIPPED" || s.status === "BUDGET_STOPPED") {
          add(s.message ?? t("Không còn bài cần đo."), s.status === "SKIPPED" ? "warn" : "err");
          break;
        }
        done += Math.max(1, s.done);
        acc.found += s.found;
        acc.notFound += s.notFound;
        acc.gone += s.confirmedGone;
        acc.failed += s.failed;
        acc.cost += s.costUsd;
        setTot({ ...acc });
        add(
          t("Lô: {found} đo được, {notFound} không thấy", { found: s.found, notFound: s.notFound }) +
            (s.confirmedGone ? t(" ({confirmedGone} xác nhận biến mất)", { confirmedGone: s.confirmedGone }) : "") +
            (s.failed ? t(", {failed} lỗi", { failed: s.failed }) : "") +
            t(" · {credits} lượt", { credits: s.credits }),
          s.failed ? "warn" : "ok",
        );
        if (s.status === "FAILED") {
          add(s.message ?? t("Dừng vì lỗi."), "err");
          break;
        }
        if (s.done === 0 || s.dueTotal <= s.done) break;
      }
    } finally {
      setRunning(false);
      const p = await previewDue(mode);
      if (p.ok) setDue(p.data);
      startTransition(() => router.refresh());
    }
  }

  const chip = (on: boolean) => `px-3 py-1.5 rounded-lg border text-sm ${on ? "bg-stone-900 border-stone-900 text-white" : "bg-white border-stone-300"}`;
  const pct = props.budget > 0 ? Math.min(100, Math.round((100 * props.spend) / props.budget)) : 0;

  return (
    <div className="space-y-4">
      {!props.hasKey && (
        <div className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {t("Chưa khai báo khóa Social Fetch ở trang Cấu hình — chưa đo được.")}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label={t("Bài đến hạn đo")} value={due.total.toLocaleString(locale)} note={`TikTok ${due.byPlatform.tiktok ?? 0} · Facebook ${due.byPlatform.facebook ?? 0}`} />
        <Stat label={t("Chi phí đo tháng này")} value={`$${props.spend.toFixed(2)}`} note={t("trần ${budget} ({pct}%)", { budget: props.budget, pct })} />
        <Stat label={t("Ước tính lô đến hạn")} value={`$${(due.total * props.usdPerCredit).toFixed(2)}`} note={t("{usdPerCredit} USD/lượt", { usdPerCredit: props.usdPerCredit })} />
        <Stat label={t("Lần đo gần nhất")} value={props.runs[0] ? new Date(props.runs[0].started_at).toLocaleDateString(locale) : "—"} note={props.runs[0] ? t(TRIGGER[props.runs[0].query_parameters?.trigger ?? ""] ?? "") : t("chưa đo lần nào")} />
      </div>

      <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          <button className={chip(mode === "due")} onClick={() => changeMode("due")} disabled={running}>{t("Đến hạn theo lịch")}</button>
          <button className={chip(mode === "inventory")} onClick={() => changeMode("inventory")} disabled={running}>{t("Kiểm kê toàn bộ")}</button>
        </div>
        <p className="text-sm text-stone-500">
          {mode === "due"
            ? t("Bài tới mốc 3/7/14/30 ngày, bài còn nóng sau 30 ngày, và bài lần trước không thấy (kiểm lại sau 24 giờ). Bài không liên quan và bài giả không bao giờ được gửi đi đo.")
            : t("Mọi bài liên quan còn tồn tại chưa đo trong 7 ngày — dùng trước mỗi đợt phân tích hoặc sau một mốc chính sách. Tốn nhiều lượt.")}
        </p>
        {Object.keys(due.byReason).length > 0 && (
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {Object.entries(due.byReason).map(([k, n]) => (
              <li key={k} className="flex justify-between">
                <span className="text-stone-600">{t(REASON[k] ?? k)}</span>
                <span className="tabular-nums font-medium">{n.toLocaleString(locale)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <select className="rounded-lg border border-stone-300 px-3 py-2 text-sm bg-white" value={target} onChange={(e) => setTarget(Number(e.target.value))} disabled={running}>
            {[10, 100, 500, 2000].map((n) => (
              <option key={n} value={n}>{t("Tối đa {v0} bài", { v0: n.toLocaleString(locale) })}</option>
            ))}
          </select>
          {!running ? (
            <button onClick={() => void run()} disabled={!props.hasKey || due.total === 0} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-700 text-white text-sm font-medium disabled:opacity-50">
              <Play className="w-4 h-4" /> {t("Đo ngay {v0} bài", { v0: Math.min(target, due.total).toLocaleString(locale) })}
            </button>
          ) : (
            <button onClick={() => (stop.current = true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-medium">
              <Square className="w-4 h-4" /> {t("Dừng sau lô này")}
            </button>
          )}
          {running && (
            <span className="inline-flex items-center gap-2 text-sm text-stone-600">
              <Loader2 className="w-4 h-4 animate-spin" /> {t("{found} đo được · {notFound} không thấy · ${v2}", { found: tot.found, notFound: tot.notFound, v2: tot.cost.toFixed(3) })}
            </span>
          )}
        </div>
        {log.length > 0 && (
          <ul className="text-sm font-mono space-y-0.5">
            {log.map((l, i) => (
              <li key={i} className={l.tone === "err" ? "text-red-700" : l.tone === "warn" ? "text-amber-700" : "text-stone-700"}>{l.text}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 md:p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-stone-900">{t("Các lần đo gần đây")}</h2>
          <button className="inline-flex items-center gap-1 text-sm text-stone-500" onClick={() => startTransition(() => router.refresh())}>
            <RefreshCw className="w-4 h-4" /> {t("Làm mới")}
          </button>
        </div>
        {props.runs.length === 0 ? (
          <p className="text-sm text-stone-500 py-6 text-center">{t("Chưa có lần đo nào (dữ liệu giả không hiện ở đây).")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="text-sm w-full min-w-[640px]">
              <thead>
                <tr className="text-xs text-stone-500 text-left">
                  <th className="p-1.5 font-medium">{t("Bắt đầu")}</th>
                  <th className="p-1.5 font-medium">{t("Nền tảng")}</th>
                  <th className="p-1.5 font-medium">{t("Cách chạy")}</th>
                  <th className="p-1.5 font-medium text-right">{t("Đo được / dự kiến")}</th>
                  <th className="p-1.5 font-medium text-right">{t("Không thấy")}</th>
                  <th className="p-1.5 font-medium text-right">{t("Chi phí")}</th>
                  <th className="p-1.5 font-medium">{t("Trạng thái")}</th>
                </tr>
              </thead>
              <tbody>
                {props.runs.map((r) => (
                  <tr key={r.run_id} className="border-t border-stone-100 align-top">
                    <td className="p-1.5 whitespace-nowrap">{new Date(r.started_at).toLocaleString(locale)}</td>
                    <td className="p-1.5">{r.platform}</td>
                    <td className="p-1.5">{t(TRIGGER[r.query_parameters?.trigger ?? ""] ?? "—")}</td>
                    <td className="p-1.5 text-right tabular-nums">{r.items_count ?? 0} / {r.query_parameters?.planned ?? "—"}</td>
                    <td className="p-1.5 text-right tabular-nums">{r.query_parameters?.not_found ?? 0}</td>
                    <td className="p-1.5 text-right tabular-nums">{r.cost_usd === null ? "—" : `$${Number(r.cost_usd).toFixed(3)}`}</td>
                    <td className="p-1.5">
                      {t(STATUS[r.status] ?? r.status)}
                      {r.error_message && <span className="block text-xs text-amber-700">{r.error_message}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4">
      <p className="text-xs font-semibold text-stone-500">{label}</p>
      <p className="text-2xl font-bold text-stone-900 tabular-nums mt-1">{value}</p>
      <p className="text-xs text-stone-500 mt-0.5 truncate">{note}</p>
    </div>
  );
}
