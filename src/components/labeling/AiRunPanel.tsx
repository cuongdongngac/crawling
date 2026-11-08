"use client";

import { useRef, useState } from "react";
import { Loader2, Play, Square, FlaskConical, AlertTriangle } from "lucide-react";
import { getLabelingProgress, runEvalSet, runLabelBatch } from "@/app/actions/labeling";
import { useT, useLocale } from "@/lib/i18n/client";

type Progress = { total: number; labeled: number; remaining: number };
type LogLine = { at: string; text: string; tone?: "ok" | "warn" | "err" };

const BATCH = 20;

export default function AiRunPanel({
  model: defaultModel,
  hasKey,
  budget,
  monthSpend: initialSpend,
  progress: initialProgress,
  evalCount,
  hasMock,
  onDone,
}: {
  model: string;
  hasKey: boolean;
  budget: number;
  monthSpend: number | null;
  progress: Progress;
  evalCount: number;
  hasMock: boolean;
  onDone?: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const [model, setModel] = useState(defaultModel);
  const [since, setSince] = useState("");
  const [data, setData] = useState<"all" | "mock" | "real">("all");
  const [target, setTarget] = useState(100);
  const [progress, setProgress] = useState<Progress>(initialProgress);
  const [spend, setSpend] = useState<number | null>(initialSpend);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<LogLine[]>([]);
  const [session, setSession] = useState({ ok: 0, failed: 0, cost: 0 });
  const stopRef = useRef(false);

  const add = (text: string, tone?: LogLine["tone"]) =>
    setLog((l) => [{ at: new Date().toLocaleTimeString(locale), text: t(text), tone }, ...l].slice(0, 60));

  const scope = { since: since || null, data };

  async function refresh(nextModel = model, nextScope = scope) {
    const r = await getLabelingProgress({ model: nextModel, scope: nextScope });
    if (r.ok) setProgress(r.data);
  }

  async function run() {
    if (running) return;
    stopRef.current = false;
    setRunning(true);
    let done = 0, ok = 0, failed = 0, cost = 0;
    try {
      while (!stopRef.current && done < target) {
        const res = await runLabelBatch({ limit: Math.min(BATCH, target - done), scope, model });
        if (!res.ok) {
          add(res.error, "err");
          break;
        }
        const s = res.data.summary;
        setProgress(res.data.progress);
        setSpend(res.data.monthSpend);
        if (s.status === "SKIPPED") {
          add(s.message ?? t("Không còn bài cần gắn nhãn."), "warn");
          break;
        }
        done += s.total;
        ok += s.ok;
        failed += s.failed;
        cost += s.costUsd;
        setSession({ ok, failed, cost });
        add(
          t("Lô {runId}: {ok}/{total} bài thành công", { runId: s.runId ?? "", ok: s.ok, total: s.total }) +
            (s.failed ? t(", {failed} lỗi", { failed: s.failed }) : "") +
            ` · $${s.costUsd.toFixed(4)}`,
          s.failed ? "warn" : "ok",
        );
        if (s.status === "BUDGET_STOPPED") {
          add(s.message ?? t("Dừng vì chạm trần chi phí AI tháng này."), "err");
          break;
        }
        if (s.status === "FAILED") {
          add(s.message ?? t("Lô bị lỗi."), "err");
          break;
        }
        if (res.data.progress.remaining === 0) {
          add(t("Đã gắn nhãn hết bài trong phạm vi đã chọn."), "ok");
          break;
        }
        if (s.total > 0 && s.failed === s.total) {
          add(t("Cả lô đều lỗi — dừng để kiểm tra model/khóa."), "err");
          break;
        }
      }
    } finally {
      setRunning(false);
      if (stopRef.current) add(t("Đã dừng theo yêu cầu."), "warn");
      onDone?.();
    }
  }

  async function runEval() {
    setRunning(true);
    const r = await runEvalSet({ model });
    setRunning(false);
    if (!r.ok) add(r.error, "err");
    else add(r.data.message ?? t("Bộ 50 bài mô phỏng: {ok}/{total} bài · ${v2}", { ok: r.data.ok, total: r.data.total, v2: r.data.costUsd.toFixed(4) }), r.data.status === "DONE" ? "ok" : "warn");
    onDone?.();
  }

  const pct = progress.total ? Math.round((100 * progress.labeled) / progress.total) : 0;
  const perPost = session.ok ? session.cost / session.ok : null;
  const field = "rounded-lg border border-stone-300 px-3 py-2 text-sm bg-white";

  return (
    <div className="space-y-4">
      {!hasKey && (
        <div className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {t("Chưa khai báo OpenRouter key ở trang Cấu hình — AI chưa chạy được.")}
        </div>
      )}

      <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 md:p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-stone-900">{t("Gắn nhãn bài bằng AI")}</h2>
          <p className="text-sm text-stone-500">
            {t("Mỗi bài chỉ gắn một lần cho mỗi bộ (bảng mã + câu lệnh + model). Chạy lại không tốn tiền cho bài đã có nhãn. Kết luận sàng lọc của bài được cập nhật theo AI, trừ bài người đã kết luận.")}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="text-sm space-y-1">
            <span className="text-stone-600">Model</span>
            <input className={`${field} w-full font-mono text-xs`} value={model} onChange={(e) => setModel(e.target.value)} onBlur={() => void refresh()} disabled={running} />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-stone-600">{t("Bài phát hiện từ ngày")}</span>
            <input
              type="date"
              className={`${field} w-full`}
              value={since}
              onChange={(e) => {
                setSince(e.target.value);
                void refresh(model, { since: e.target.value || null, data });
              }}
              disabled={running}
            />
          </label>
          {hasMock && (
            <label className="text-sm space-y-1">
              <span className="text-stone-600">{t("Dữ liệu")}</span>
              <select
                className={`${field} w-full`}
                value={data}
                onChange={(e) => {
                  const v = e.target.value as typeof data;
                  setData(v);
                  void refresh(model, { since: since || null, data: v });
                }}
                disabled={running}
              >
                <option value="all">{t("Tất cả")}</option>
                <option value="mock">{t("Chỉ bài giả")}</option>
                <option value="real">{t("Chỉ bài thật")}</option>
              </select>
            </label>
          )}
          <label className="text-sm space-y-1">
            <span className="text-stone-600">{t("Số bài lần này")}</span>
            <select className={`${field} w-full`} value={target} onChange={(e) => setTarget(Number(e.target.value))} disabled={running}>
              {[20, 100, 300, 1000, 3000].map((n) => (
                <option key={n} value={n}>
                  {n.toLocaleString(locale)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <div className="flex justify-between text-sm text-stone-600 mb-1">
            <span>
              {t("Đã có nhãn AI:")} <b className="text-stone-900 tabular-nums">{progress.labeled.toLocaleString(locale)}</b> {t("/ {v0} bài", { v0: progress.total.toLocaleString(locale) })}
            </span>
            <span className="tabular-nums">{pct}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-stone-100 overflow-hidden">
            <div className="h-full bg-violet-600 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {t("Chi phí AI tháng này: ${v0} / trần ${budget}", { v0: (spend ?? 0).toFixed(3), budget })}
            {perPost !== null && <> {t("· lần chạy này ~${v0}/bài → còn {v1} bài ≈ ${v2}", { v0: perPost.toFixed(5), v1: progress.remaining.toLocaleString(locale), v2: (perPost * progress.remaining).toFixed(2) })}</>}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!running ? (
            <button onClick={() => void run()} disabled={!hasKey || progress.remaining === 0} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-700 text-white text-sm font-medium disabled:opacity-50">
              <Play className="w-4 h-4" /> {t("Gắn nhãn {v0} bài", { v0: Math.min(target, progress.remaining).toLocaleString(locale) })}
            </button>
          ) : (
            <button onClick={() => (stopRef.current = true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-medium">
              <Square className="w-4 h-4" /> {t("Dừng sau lô này")}
            </button>
          )}
          {running && (
            <span className="inline-flex items-center gap-2 text-sm text-stone-600">
              <Loader2 className="w-4 h-4 animate-spin" /> {t("Đang chạy (mỗi lô {BATCH} bài)… · {ok} thành công, {failed} lỗi", { BATCH, ok: session.ok, failed: session.failed })}
            </span>
          )}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 md:p-6 space-y-2">
        <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-violet-700" /> {t("Bộ 50 bài mô phỏng có đáp án")}
        </h2>
        <p className="text-sm text-stone-500">
          {t("Chạy AI trên cùng 50 bài mỗi khi đổi model hoặc câu lệnh, để so sánh công bằng trước khi dùng cho dữ liệu thật. Kết quả xem ở tab \"Độ tin cậy AI\".")}
        </p>
        {evalCount > 0 ? (
          <button onClick={() => void runEval()} disabled={running || !hasKey} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-violet-300 text-violet-800 text-sm font-medium disabled:opacity-50">
            <Play className="w-4 h-4" /> {t("Chạy {evalCount} bài với model {model}", { evalCount, model })}
          </button>
        ) : (
          <p className="text-sm text-amber-800 bg-amber-50 rounded-lg p-2">
            {t("Chưa nạp bộ bài. Chạy trong thư mục web:")} <code>npx tsx scripts/mock/seed-ai-demo.ts --eval</code>
          </p>
        )}
      </section>

      {log.length > 0 && (
        <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4">
          <p className="text-sm font-semibold text-stone-800 mb-2">{t("Nhật ký")}</p>
          <ul className="space-y-1 text-sm font-mono">
            {log.map((l, i) => (
              <li key={i} className={l.tone === "err" ? "text-red-700" : l.tone === "warn" ? "text-amber-700" : "text-stone-700"}>
                <span className="text-stone-400">{l.at}</span> {l.text}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
