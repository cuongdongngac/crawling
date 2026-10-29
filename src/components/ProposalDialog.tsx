"use client";

import { useState } from "react";
import { X, Loader2, ExternalLink, Send } from "lucide-react";
import { submitProposal } from "@/app/actions/proposals";

export type ProposalTarget = {
  hashtag: string;
  platform: string;
  sourceLogId: number | null;
  postCount: number;
  posts: { url: string; text: string; like: number | null; comment: number | null; published: string | null }[];
};

const CRITERIA = [
  { key: "critImage", label: "Nhìn hình", hint: "Có hình sản phẩm, thiết bị, khói" },
  { key: "critText", label: "Nhìn chữ", hint: "Có từ lách, từ lóng gắn với sản phẩm" },
  { key: "critTransaction", label: "Nhìn giao dịch", hint: "Có giá, cách liên hệ, giao hàng" },
] as const;

type CritKey = (typeof CRITERIA)[number]["key"];

export default function ProposalDialog({
  target,
  onClose,
  onSubmitted,
}: {
  target: ProposalTarget;
  onClose: () => void;
  onSubmitted: (tag: string) => void;
}) {
  const [meaning, setMeaning] = useState("");
  const [picked, setPicked] = useState<Set<string>>(() => new Set(target.posts.slice(0, 3).map((p) => p.url)));
  const [crit, setCrit] = useState<Record<CritKey, boolean>>({ critImage: false, critText: false, critTransaction: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const score = Number(crit.critImage) + Number(crit.critText) + Number(crit.critTransaction);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await submitProposal({
      hashtag: target.hashtag,
      platform: target.platform,
      meaning,
      evidenceUrls: Array.from(picked),
      evidencePostCount: target.postCount,
      critImage: crit.critImage,
      critText: crit.critText,
      critTransaction: crit.critTransaction,
      sourceLogId: target.sourceLogId,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setDone(
      res.data.othersBefore > 0
        ? `Đã gửi. Lưu ý: đã có ${res.data.othersBefore} người đề xuất #${target.hashtag} trước bạn.`
        : `Đã gửi đề xuất #${target.hashtag}. Bạn là người đầu tiên đề xuất từ này.`,
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl p-4 md:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="mr-auto">
            <h3 className="text-lg font-bold text-stone-900">Đề xuất hashtag #{target.hashtag}</h3>
            <p className="text-xs text-stone-500">
              {target.platform} · xuất hiện trong {target.postCount} bài của lần quét này
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-stone-100" aria-label="Đóng">
            <X className="w-5 h-5" />
          </button>
        </div>

        {done ? (
          <div className="space-y-4">
            <p className="p-3 rounded-lg bg-emerald-50 text-emerald-900 text-sm">{done}</p>
            <p className="text-sm text-stone-600">Theo dõi kết quả duyệt ở mục “Đề xuất hashtag”.</p>
            <button
              onClick={() => onSubmitted(target.hashtag)}
              className="w-full py-2.5 rounded-xl bg-emerald-700 text-white font-bold"
            >
              Xong
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-1">Nghĩa / cách dùng của từ này</label>
              <textarea
                rows={2}
                value={meaning}
                onChange={(e) => setMeaning(e.target.value)}
                placeholder="Ví dụ: cách gọi lóng của pod, hay đi kèm giá bán…"
                className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <div className="text-sm font-semibold text-stone-800 mb-1">
                Ba tiêu chí <span className="font-normal text-stone-500">(từ 2/3 trở lên là ca nghi ngờ)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {CRITERIA.map((c) => (
                  <label
                    key={c.key}
                    className={
                      "flex items-start gap-2 p-3 rounded-xl border cursor-pointer " +
                      (crit[c.key] ? "border-emerald-500 bg-emerald-50" : "border-stone-200")
                    }
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={crit[c.key]}
                      onChange={(e) => setCrit((s) => ({ ...s, [c.key]: e.target.checked }))}
                    />
                    <span>
                      <span className="block text-sm font-semibold">{c.label}</span>
                      <span className="block text-xs text-stone-500">{c.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
              <p className={"text-xs mt-1 " + (score >= 2 ? "text-red-700 font-semibold" : "text-stone-500")}>
                Điểm: {score}/3 {score >= 2 ? "— ca nghi ngờ" : ""}
              </p>
            </div>

            <div>
              <div className="text-sm font-semibold text-stone-800 mb-1">
                Bài minh chứng <span className="font-normal text-stone-500">(chọn 1–10 bài, đã sắp theo tương tác)</span>
              </div>
              <ul className="space-y-1.5 max-h-64 overflow-y-auto">
                {target.posts.map((p) => (
                  <li key={p.url} className="flex items-start gap-2 p-2 rounded-lg border border-stone-200">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={picked.has(p.url)}
                      onChange={(e) =>
                        setPicked((s) => {
                          const n = new Set(s);
                          if (e.target.checked) n.add(p.url);
                          else n.delete(p.url);
                          return n;
                        })
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-stone-800 line-clamp-2">{p.text || "(không có chữ)"}</p>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        👍 {p.like ?? "–"} · 💬 {p.comment ?? "–"}
                        {p.published ? " · " + new Date(p.published).toLocaleDateString("vi-VN") : ""}
                      </p>
                    </div>
                    <a href={p.url} target="_blank" rel="noreferrer" className="text-emerald-700 shrink-0" title="Mở bài">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {error && <p className="p-3 rounded-lg bg-red-50 text-red-800 text-sm">{error}</p>}

            <button
              onClick={submit}
              disabled={busy || picked.size === 0 || score === 0}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Gửi đề xuất
            </button>
            <p className="text-[11px] text-stone-500">
              Phiếu chỉ lưu đường dẫn bài công khai làm minh chứng, không lưu tên tài khoản. Ban nghiên cứu sẽ duyệt và ghi lý do.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
