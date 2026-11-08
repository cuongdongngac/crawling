"use client";

import { useState } from "react";
import { ShieldCheck, ShieldAlert, ShieldQuestion, ChevronDown } from "lucide-react";
import type { Disagreement, StatsGroup } from "@/lib/ai/review";
import { thresholdVerdict } from "@/lib/ai/metrics";
import { PURPOSE_FIELD, labelOf } from "@/components/labeling/LabelForm";
import { useT, useLocale } from "@/lib/i18n/client";

const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`);
const num = (x: number | null, d = 2) => (x === null ? "—" : x.toFixed(d).replace(".", ","));

function kappaWord(k: number | null) {
  if (k === null) return "";
  if (k >= 0.8) return "rất tốt";
  if (k >= 0.6) return "khá";
  if (k >= 0.4) return "trung bình";
  return "yếu";
}

const SOURCE_NOTE: Record<StatsGroup["source"], string> = {
  REVIEW_BLIND: "Thước đo chính: người chấm khi không thấy gợi ý AI.",
  REVIEW_SEEN: "Người thấy gợi ý AI rồi mới chấm — dễ \"gật theo\" AI, nên số này thường cao hơn thực tế.",
  GOLD: "Đáp án của dữ liệu giả (máy sinh), không phải người chấm. Chỉ để thử hệ thống.",
  EVAL: "Bộ bài cố định có đáp án — dùng so các model/câu lệnh với nhau.",
};

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-stone-200 p-3">
      <p className="text-xs font-semibold text-stone-500">{label}</p>
      <p className="text-2xl font-bold text-stone-900 tabular-nums">{value}</p>
      <p className="text-[11px] text-stone-500 leading-snug">{note}</p>
    </div>
  );
}

function GroupCard({ g }: { g: StatsGroup }) {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const r = g.stats.relevance;
  const v = thresholdVerdict(r, 0.85, g.source === "EVAL" ? 30 : 50);
  const Icon = v.level === "PASS" ? ShieldCheck : v.level === "FAIL" ? ShieldAlert : ShieldQuestion;
  const tone =
    v.level === "PASS" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : v.level === "FAIL" ? "border-red-300 bg-red-50 text-red-900" : "border-amber-300 bg-amber-50 text-amber-900";
  const codes = PURPOSE_FIELD.values.map((x) => x.code);

  return (
    <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-stone-900">{t(g.title)}</h3>
          <p className="text-xs text-stone-500">
            <span className="font-mono">{g.model}</span> {t("· {v0} bài · {v1}", { v0: r.n.toLocaleString(locale), v1: t(SOURCE_NOTE[g.source]) })}
          </p>
        </div>
      </div>

      <div className={`flex gap-2 rounded-xl border p-3 text-sm ${tone}`}>
        <Icon className="w-5 h-5 shrink-0" />
        <div>
          <p className="font-semibold">{t("Liên quan / không liên quan: {v0} đúng", { v0: pct(r.accuracy) })}</p>
          <p>{t(v.text)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Metric label={t("Độ chính xác")} value={pct(r.accuracy)} note={t("Cận dưới (95%): {v0}", { v0: pct(r.accuracyLow) })} />
        <Metric label={t("Độ nhạy")} value={pct(r.sensitivity)} note={t("AI giữ được bài thật sự liên quan. Bỏ sót: {fn} bài", { fn: r.fn })} />
        <Metric label={t("Độ đặc hiệu")} value={pct(r.specificity)} note={t("AI loại đúng bài không liên quan. Giữ nhầm: {fp} bài", { fp: r.fp })} />
        <Metric label="Kappa" value={num(r.kappa)} note={t("Đồng thuận đã trừ phần trùng do may rủi — {v0}", { v0: t(kappaWord(r.kappa)) })} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="overflow-x-auto">
          <table className="text-sm w-full">
            <thead>
              <tr className="text-xs text-stone-500">
                <th className="text-left font-medium p-1.5"></th>
                <th className="text-right font-medium p-1.5">{t("AI: liên quan")}</th>
                <th className="text-right font-medium p-1.5">{t("AI: không liên quan")}</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              <tr className="border-t border-stone-100">
                <td className="p-1.5 text-stone-600">{t("Chuẩn: liên quan")}</td>
                <td className="p-1.5 text-right font-semibold text-emerald-700">{r.tp}</td>
                <td className="p-1.5 text-right font-semibold text-red-700">{r.fn}</td>
              </tr>
              <tr className="border-t border-stone-100">
                <td className="p-1.5 text-stone-600">{t("Chuẩn: không liên quan")}</td>
                <td className="p-1.5 text-right font-semibold text-amber-700">{r.fp}</td>
                <td className="p-1.5 text-right font-semibold text-emerald-700">{r.tn}</td>
              </tr>
            </tbody>
          </table>
          <p className="text-[11px] text-stone-500 mt-1">{t("Ô đỏ đáng lo nhất: bài thật bị AI loại thì không được đo lại và không vào phân tích.")}</p>
        </div>
        <div>
          <p className="text-sm text-stone-700">
            {t("Mục đích (5 loại):")} <b>{pct(g.stats.purpose.accuracy)}</b> {t("trùng · kappa {v0}", { v0: num(g.stats.purpose.kappa) })}
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {g.stats.fields
              .filter((f) => f.n > 0)
              .map((f) => (
                <li key={f.key} className="flex justify-between gap-2">
                  <span className="text-stone-600">{t(f.label)}</span>
                  <span className="tabular-nums text-stone-900">
                    {pct(f.rate)} <span className="text-stone-400 text-xs">/{f.n}</span>
                  </span>
                </li>
              ))}
          </ul>
        </div>
      </div>

      <button className="inline-flex items-center gap-1 text-sm text-violet-700 font-medium" onClick={() => setOpen((x) => !x)}>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} /> {t("Bảng nhầm lẫn theo mục đích")}
      </button>
      {open && (
        <div className="overflow-x-auto">
          <table className="text-xs min-w-[560px]">
            <thead>
              <tr>
                <th className="p-1.5 text-left text-stone-500 font-medium">{t("Chuẩn ↓ / AI →")}</th>
                {codes.map((c) => (
                  <th key={c} className="p-1.5 text-right text-stone-500 font-medium">
                    {t(labelOf("purpose", c))}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {codes.map((rc) => (
                <tr key={rc} className="border-t border-stone-100">
                  <td className="p-1.5 text-stone-600">{t(labelOf("purpose", rc))}</td>
                  {codes.map((ac) => {
                    const n = g.stats.purpose.confusion[rc]?.[ac] ?? 0;
                    return (
                      <td key={ac} className={`p-1.5 text-right ${rc === ac ? "font-bold text-emerald-700" : n ? "text-amber-700" : "text-stone-300"}`}>
                        {n}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function ReliabilityPanel({ groups, disagreements, reviewedCount }: { groups: StatsGroup[]; disagreements: Disagreement[]; reviewedCount: number }) {
  const t = useT();
  const locale = useLocale();
  return (
    <div className="space-y-4">
      <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 md:p-6 text-sm text-stone-700 space-y-2">
        <h2 className="text-lg font-bold text-stone-900">{t("Độ tin cậy của AI — dùng để quyết định gì?")}</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <b>{t("Có cho AI tự loại bài không liên quan (không đo lại) chưa?")}</b> {t("Hồ sơ cam kết chỉ dùng AI khi độ chính xác từ 85%. Xem độ nhạy: thấp nghĩa là AI loại nhầm bài thật.")}
          </li>
          <li>
            <b>{t("Có giảm mẫu kiểm tra ngẫu nhiên từ 10% xuống 5% chưa?")}</b> {t("Khi đạt ngưỡng ổn định 2 tháng liền.")}
          </li>
          <li>
            <b>{t("Đổi model / sửa câu lệnh có tốt hơn không?")}</b> {t("So trên cùng bộ 50 bài mô phỏng trước, rồi trên bài thật.")}
          </li>
        </ul>
        <p className="text-xs text-stone-500">{t("Đã có {v0} nhãn xác minh của người. Bài người đánh dấu \"chưa chắc\" không được dùng làm chuẩn.", { v0: reviewedCount.toLocaleString(locale) })}</p>
      </section>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">
          {t("Chưa có cặp nhãn AI – người nào. Chạy AI, rồi xác minh vài chục bài ở tab \"Xác minh\" (nhất là hai hàng chấm mù).")}
        </div>
      ) : (
        groups.map((g) => <GroupCard key={g.key} g={g} />)
      )}

      {disagreements.length > 0 && (
        <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 md:p-6">
          <h2 className="text-lg font-bold text-stone-900">{t("Ca AI và người chấm khác nhau")}</h2>
          <p className="text-sm text-stone-500 mb-3">{t("Đọc các ca này để sửa câu lệnh (tăng phiên bản) hoặc bổ sung từ lóng mới vào bảng mã.")}</p>
          <div className="overflow-x-auto">
            <table className="text-sm w-full min-w-[640px]">
              <thead>
                <tr className="text-xs text-stone-500 text-left">
                  <th className="p-1.5 font-medium">{t("Bài")}</th>
                  <th className="p-1.5 font-medium">{t("Người")}</th>
                  <th className="p-1.5 font-medium">AI</th>
                </tr>
              </thead>
              <tbody>
                {disagreements.map((d) => (
                  <tr key={d.postId + d.model} className="border-t border-stone-100 align-top">
                    <td className="p-1.5 text-stone-800 max-w-md">{d.text}</td>
                    <td className="p-1.5 whitespace-nowrap font-medium">{t(labelOf("purpose", d.human))}</td>
                    <td className="p-1.5">
                      <span className="whitespace-nowrap font-medium text-amber-800">{t(labelOf("purpose", d.ai))}</span>
                      {d.reason && <span className="block text-xs text-stone-500">{d.reason}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
