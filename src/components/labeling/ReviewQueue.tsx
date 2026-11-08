"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EyeOff, ExternalLink, Loader2, RefreshCw, SkipForward, Sparkles, Check, AlertTriangle } from "lucide-react";
import { loadQueue, submitReview } from "@/app/actions/labeling";
import type { AiSuggestion, QueueBucket, QueueItem } from "@/lib/ai/review";
import { CURRENT_CODEBOOK } from "@/lib/ai/codebook";
import LabelForm, { PURPOSE_FIELD, fromAi, labelOf, type FormValues } from "@/components/labeling/LabelForm";
import { useT, useLocale } from "@/lib/i18n/client";

const BUCKETS: { id: QueueBucket; title: string; note: string }[] = [
  { id: "UNCLEAR", title: "AI chưa rõ", note: "AI không chắc — người chốt. Có gợi ý AI." },
  { id: "SAMPLE", title: "Mẫu chấm mù (~10%)", note: "Ẩn gợi ý AI tới khi lưu — để đo AI đúng đến đâu." },
  { id: "ALL", title: "Tự chọn", note: "Mọi bài AI đã gắn, lọc theo mục đích. Có gợi ý AI." },
];

const REL_LABEL: Record<string, string> = { RELATED: "Liên quan", UNRELATED: "Không liên quan", UNCLEAR: "Chưa rõ", PENDING: "Chưa sàng lọc" };

function emptyForm(): FormValues {
  return fromAi(null);
}

function Highlight({ text, terms }: { text: string; terms: string[] }) {
  const t = terms.filter((x) => x.length >= 2).slice(0, 10);
  if (!t.length) return <>{text}</>;
  const esc = t.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = text.split(new RegExp(`(${esc.join("|")})`, "gi"));
  return (
    <>
      {parts.map((p, i) =>
        t.some((x) => x.toLowerCase() === p.toLowerCase()) ? (
          <mark key={i} className="bg-amber-200/70 rounded px-0.5">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export default function ReviewQueue({ initialCounts, onReviewed }: { initialCounts: Record<QueueBucket, number>; onReviewed?: () => void }) {
  const t = useT();
  const locale = useLocale();
  const [bucket, setBucket] = useState<QueueBucket>("UNCLEAR");
  const [purpose, setPurpose] = useState<string>("");
  const [items, setItems] = useState<QueueItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [counts, setCounts] = useState(initialCounts);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [unsure, setUnsure] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [reveal, setReveal] = useState<{ ai: AiSuggestion | null; mine: string } | null>(null);
  const [doneCount, setDoneCount] = useState(0);
  const reqId = useRef(0);

  const item = items[idx] ?? null;

  const startItem = useCallback((list: QueueItem[], i: number) => {
    const it = list[i];
    setIdx(i);
    setForm(it && it.ai ? fromAi(it.ai.output) : emptyForm());
    setUnsure(false);
    setNote("");
    setReveal(null);
  }, []);

  const load = useCallback(
    async (b: QueueBucket, p: string) => {
      const my = ++reqId.current;
      setLoading(true);
      setError(null);
      const res = await loadQueue({ bucket: b, purpose: p || null, limit: 20 });
      if (my !== reqId.current) return;
      setLoading(false);
      if (!res.ok) {
        setError(res.error);
        setItems([]);
        return;
      }
      setItems(res.data.items);
      setCounts(res.data.counts);
      startItem(res.data.items, 0);
    },
    [startItem],
  );

  useEffect(() => {
    // tải hàng đợi khi mở trang / đổi hàng (setState chỉ chạy sau khi có kết quả)
    let alive = true;
    (async () => {
      if (alive) await load(bucket, purpose);
    })();
    return () => {
      alive = false;
    };
  }, [bucket, purpose, load]);

  const next = useCallback(() => {
    if (idx + 1 < items.length) startItem(items, idx + 1);
    else void load(bucket, purpose);
  }, [idx, items, startItem, load, bucket, purpose]);

  const save = useCallback(async () => {
    if (!item || saving || reveal) return;
    if (!form.purpose) {
      setError(t("Cần chọn Mục đích nội dung."));
      return;
    }
    setSaving(true);
    setError(null);
    // Không liên quan: bỏ các chi tiết còn sót từ gợi ý AI
    const labels: FormValues = form.purpose === "UNRELATED" ? { ...emptyForm(), purpose: "UNRELATED" } : form;
    const res = await submitReview({ postId: item.postId, labels, unsure, shownAiLabelId: item.ai?.labelId ?? null, note: note.trim() || null });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDoneCount((n) => n + 1);
    onReviewed?.();
    if (item.blind) setReveal({ ai: res.data.ai, mine: String(form.purpose) });
    else next();
  }, [item, saving, reveal, form, unsure, note, next, onReviewed]);

  // Phím tắt: 1–5 chọn mục đích, Ctrl/⌘+Enter lưu, Enter đi tiếp sau khi xem đối chiếu, N bỏ qua
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (reveal && e.key === "Enter") {
        e.preventDefault();
        next();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        void save();
        return;
      }
      const n = Number(e.key);
      if (!reveal && n >= 1 && n <= PURPOSE_FIELD.values.length) setForm((f) => ({ ...f, purpose: PURPOSE_FIELD.values[n - 1].code }));
      if (!reveal && (e.key === "n" || e.key === "N")) next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reveal, next, save]);

  const aiTerms = useMemo(() => (item?.ai && Array.isArray(item.ai.output.slang_terms) ? (item.ai.output.slang_terms as string[]) : []), [item]);
  const btn = (on: boolean) => `px-3 py-2 rounded-xl border text-sm text-left ${on ? "bg-stone-900 border-stone-900 text-white" : "bg-white border-stone-200 hover:border-stone-400"}`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {BUCKETS.map((b) => (
          <button key={b.id} className={btn(bucket === b.id)} onClick={() => setBucket(b.id)}>
            <span className="flex items-center justify-between gap-2">
              <span className="font-semibold">{t(b.title)}</span>
              <span className={`text-xs tabular-nums ${bucket === b.id ? "text-stone-300" : "text-stone-500"}`}>{counts[b.id].toLocaleString(locale)}</span>
            </span>
            <span className={`block text-xs mt-0.5 ${bucket === b.id ? "text-stone-300" : "text-stone-500"}`}>{t(b.note)}</span>
          </button>
        ))}
      </div>

      {bucket === "ALL" && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-stone-500">{t("AI xếp mục đích:")}</span>
          <select className="rounded-lg border border-stone-300 px-2 py-1.5 bg-white" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
            <option value="">{t("Tất cả")}</option>
            {PURPOSE_FIELD.values.map((v) => (
              <option key={v.code} value={v.code}>
                {t(v.label)}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {t(error)}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-stone-500 text-sm py-12 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> {t("Đang tải hàng đợi…")}
        </div>
      ) : !item ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">
          <p className="font-medium text-stone-700">{t("Hàng này đã hết bài cần xem.")}</p>
          <p className="mt-1">{t("Bài chỉ vào hàng đợi sau khi AI đã gắn nhãn (tab \"Chạy AI\"). Bài người đã kết luận tự rời hàng.")}</p>
          <button className="mt-4 inline-flex items-center gap-1 text-violet-700 font-medium" onClick={() => load(bucket, purpose)}>
            <RefreshCw className="w-4 h-4" /> {t("Tải lại")}
          </button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-5 gap-4">
          {/* Bài */}
          <section className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 shadow-sm p-4 space-y-3 h-fit">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-semibold">{item.platform}</span>
              {item.isMock && <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-800 font-semibold">{t("BÀI GIẢ")}</span>}
              {item.scanHashtag && <span className="px-2 py-0.5 rounded-md bg-violet-50 text-violet-800">{t("tìm qua {scanHashtag}", { scanHashtag: item.scanHashtag })}</span>}
              <span className="text-stone-500 ml-auto tabular-nums">
                {t("{v0}/{length} · đã xem {doneCount}", { v0: idx + 1, length: items.length, doneCount })}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-stone-900 break-words">
              <Highlight text={item.text} terms={aiTerms} />
            </p>
            <div className="text-xs text-stone-500 space-y-0.5">
              <p>{t("Phát hiện: {v0}", { v0: new Date(item.foundAt).toLocaleDateString(locale) })}{item.publishedAt ? t(" · đăng: {v0}", { v0: new Date(item.publishedAt).toLocaleDateString(locale) }) : ""}</p>
              {item.relevance && <p>{t("Kết luận hiện tại: {v0} (AI)", { v0: t(REL_LABEL[item.relevance] ?? item.relevance) })}</p>}
            </div>
            {item.isMock ? (
              <p className="text-xs text-stone-400">{t("Bài giả — không có bài thật để mở.")}</p>
            ) : (
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-violet-700 font-medium hover:underline">
                <ExternalLink className="w-4 h-4" /> {t("Mở bài gốc (xem cả ảnh/video)")}
              </a>
            )}

            {item.blind ? (
              <div className="flex gap-2 rounded-xl bg-stone-100 p-3 text-xs text-stone-700">
                <EyeOff className="w-4 h-4 shrink-0" />
                <span>{t("Chấm mù: gợi ý AI được ẩn tới khi bạn lưu, để số đo độ chính xác của AI không bị ảnh hưởng bởi việc nhìn gợi ý.")}</span>
              </div>
            ) : (
              item.ai && (
                <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm">
                  <p className="flex items-center gap-1.5 font-semibold text-violet-900">
                    <Sparkles className="w-4 h-4" /> {t("AI gợi ý: {v0}", { v0: t(labelOf("purpose", item.ai.output.purpose)) })}
                    {item.ai.confidence !== null && <span className="font-normal text-violet-700">{t("· chắc {v0}%", { v0: Math.round(item.ai.confidence * 100) })}</span>}
                  </p>
                  {item.ai.output.reason && <p className="mt-1 text-violet-900/80">{String(item.ai.output.reason)}</p>}
                  <p className="mt-1 text-[11px] text-violet-700/70">{item.ai.model}</p>
                </div>
              )
            )}
          </section>

          {/* Nhãn */}
          <section className="lg:col-span-3 bg-white rounded-2xl border border-stone-200 shadow-sm p-4">
            {reveal ? (
              <div className="space-y-4">
                <p className="font-semibold text-stone-900 flex items-center gap-2">
                  <Check className="w-5 h-5 text-emerald-600" /> {t("Đã lưu. Đối chiếu với AI:")}
                </p>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-stone-200 p-3">
                    <p className="text-xs text-stone-500">{t("Bạn chấm")}</p>
                    <p className="font-semibold mt-0.5">{t(labelOf("purpose", reveal.mine))}</p>
                  </div>
                  <div className={`rounded-xl border p-3 ${reveal.ai?.output.purpose === reveal.mine ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
                    <p className="text-xs text-stone-500">AI ({reveal.ai?.model ?? "—"})</p>
                    <p className="font-semibold mt-0.5">
                      {reveal.ai ? t(labelOf("purpose", reveal.ai.output.purpose)) : t("Không có nhãn AI")}
                      {reveal.ai?.confidence != null && <span className="font-normal"> {t("· chắc {v0}%", { v0: Math.round(reveal.ai.confidence * 100) })}</span>}
                    </p>
                    {reveal.ai?.output.reason && <p className="mt-1 text-stone-700">{String(reveal.ai.output.reason)}</p>}
                  </div>
                </div>
                <p className="text-sm text-stone-600">
                  {reveal.ai?.output.purpose === reveal.mine ? t("Trùng mục đích.") : t("Khác nhau — ca này được tính vào bảng độ tin cậy của AI.")}
                </p>
                <button onClick={next} className="px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-medium">
                  {t("Bài tiếp theo")} <span className="opacity-60">(Enter)</span>
                </button>
              </div>
            ) : (
              <>
                <LabelForm values={form} onChange={setForm} ai={item.ai?.output ?? null} disabled={saving} />
                <div className="mt-4 border-t border-stone-200 pt-3 space-y-3">
                  <label className="flex items-center gap-2 text-sm text-stone-700">
                    <input type="checkbox" checked={unsure} onChange={(e) => setUnsure(e.target.checked)} />
                    {t("Tôi chưa chắc — để bài ở trạng thái \"chưa rõ\", không dùng làm chuẩn đo AI")}
                  </label>
                  <input
                    className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
                    placeholder={t("Ghi chú (không bắt buộc), ví dụ: từ lóng mới, ảnh cho thấy sản phẩm…")}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => void save()}
                      disabled={saving || !form.purpose}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-700 text-white text-sm font-medium disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {item.ai && !item.blind ? t("Xác nhận / lưu") : t("Lưu")} <span className="opacity-60 hidden sm:inline">(Ctrl+Enter)</span>
                    </button>
                    <button onClick={next} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-stone-300 text-sm text-stone-700">
                      <SkipForward className="w-4 h-4" /> {t("Bỏ qua")} <span className="opacity-60 hidden sm:inline">(N)</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-stone-400">
                    {t("Phím tắt: 1–{length} chọn mục đích. Bảng mã {version}. Lưu = kết luận của người, thắng kết luận của AI.", { length: PURPOSE_FIELD.values.length, version: CURRENT_CODEBOOK.version })}
                  </p>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
