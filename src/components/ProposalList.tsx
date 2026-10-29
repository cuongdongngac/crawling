"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Star } from "lucide-react";
import { reviewProposal, type ReviewDecision } from "@/app/actions/proposals";

export type ProposalRow = {
  id: number;
  hashtag: string;
  platform: string;
  province: string | null;
  proposer: string | null;
  meaning: string | null;
  evidenceUrls: string[];
  evidencePostCount: number | null;
  crit: [boolean, boolean, boolean];
  status: string;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  isFirst: boolean;
  sameTagCount: number;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  SUBMITTED: { label: "Chờ duyệt", cls: "bg-blue-100 text-blue-800" },
  NEED_INFO: { label: "Cần bổ sung", cls: "bg-amber-100 text-amber-800" },
  APPROVED: { label: "Đã duyệt", cls: "bg-green-100 text-green-800" },
  REJECTED: { label: "Từ chối", cls: "bg-red-100 text-red-800" },
  DUPLICATE: { label: "Trùng", cls: "bg-stone-200 text-stone-700" },
};

const PROVINCE: Record<string, string> = { CENTRAL: "Trung ương", HUNG_YEN: "Hưng Yên", DONG_THAP: "Đồng Tháp" };
const CRIT_LABELS = ["Hình", "Chữ", "Giao dịch"];

export default function ProposalList({
  rows,
  isAdmin,
  groups,
}: {
  rows: ProposalRow[];
  isAdmin: boolean;
  groups: { group_id: string; group_name: string }[];
}) {
  const [filter, setFilter] = useState<string>(isAdmin ? "PENDING" : "ALL");
  const list = useMemo(
    () =>
      rows.filter((r) =>
        filter === "ALL" ? true : filter === "PENDING" ? r.status === "SUBMITTED" || r.status === "NEED_INFO" : r.status === filter,
      ),
    [rows, filter],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[
          ["PENDING", `Đang chờ (${(counts.SUBMITTED ?? 0) + (counts.NEED_INFO ?? 0)})`],
          ["APPROVED", `Đã duyệt (${counts.APPROVED ?? 0})`],
          ["REJECTED", `Từ chối (${counts.REJECTED ?? 0})`],
          ["DUPLICATE", `Trùng (${counts.DUPLICATE ?? 0})`],
          ["ALL", `Tất cả (${rows.length})`],
        ].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={
              "px-3 py-1.5 rounded-full text-sm font-semibold border " +
              (filter === k ? "bg-stone-900 text-white border-stone-900" : "bg-white border-stone-300 text-stone-700")
            }
          >
            {l}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-stone-500 py-8 text-center bg-white rounded-2xl border border-stone-200">
          Chưa có phiếu nào ở mục này.
        </p>
      ) : (
        <ul className="space-y-3">
          {list.map((r) => (
            <ProposalCard key={r.id} r={r} isAdmin={isAdmin} groups={groups} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ProposalCard({
  r,
  isAdmin,
  groups,
}: {
  r: ProposalRow;
  isAdmin: boolean;
  groups: { group_id: string; group_name: string }[];
}) {
  const router = useRouter();
  const st = STATUS[r.status] ?? { label: r.status, cls: "bg-stone-100" };
  const score = r.crit.filter(Boolean).length;
  const canReview = isAdmin && r.status !== "APPROVED";
  const [note, setNote] = useState("");
  const [groupId, setGroupId] = useState(groups[0]?.group_id ?? "");
  const [busy, setBusy] = useState<ReviewDecision | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: ReviewDecision) {
    setBusy(decision);
    setError(null);
    const res = await reviewProposal({ proposalId: r.id, decision, note, groupId: decision === "APPROVED" ? groupId : null });
    setBusy(null);
    if (!res.ok) return setError(res.error);
    router.refresh();
  }

  return (
    <li className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-lg font-bold text-stone-900">#{r.hashtag}</span>
        <span className={"px-2 py-0.5 rounded-full text-xs font-semibold " + st.cls}>{st.label}</span>
        <span className="text-xs text-stone-500">{r.platform}</span>
        <span className="text-xs text-stone-500">{new Date(r.createdAt).toLocaleString("vi-VN")}</span>
        {r.isFirst ? (
          <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-semibold" title="Người đề xuất từ này sớm nhất">
            <Star className="w-3.5 h-3.5" /> Đề xuất sớm nhất
          </span>
        ) : (
          <span className="text-xs text-stone-500">Có người đề xuất từ này trước</span>
        )}
        {r.sameTagCount > 1 && <span className="text-xs text-stone-400">· {r.sameTagCount} phiếu cùng từ</span>}
      </div>

      {isAdmin && (
        <p className="text-sm text-stone-600 mt-1">
          {r.proposer} {r.province ? `· ${PROVINCE[r.province] ?? r.province}` : "· (chưa gán tỉnh)"}
        </p>
      )}

      {r.meaning && <p className="text-sm text-stone-800 mt-2">{r.meaning}</p>}

      <div className="flex flex-wrap gap-2 mt-2 text-xs">
        {CRIT_LABELS.map((l, i) => (
          <span
            key={l}
            className={"px-2 py-0.5 rounded-full border " + (r.crit[i] ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "border-stone-200 text-stone-400")}
          >
            {l}
          </span>
        ))}
        <span className={score >= 2 ? "text-red-700 font-semibold" : "text-stone-500"}>Điểm {score}/3</span>
        {r.evidencePostCount !== null && <span className="text-stone-500">· {r.evidencePostCount} bài trong lần quét</span>}
      </div>

      <div className="flex flex-wrap gap-2 mt-2">
        {r.evidenceUrls.map((u, i) => (
          <a
            key={u}
            href={u}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-emerald-700 border border-emerald-200 rounded-lg px-2 py-1 hover:bg-emerald-50"
          >
            Bài {i + 1} <ExternalLink className="w-3 h-3" />
          </a>
        ))}
      </div>

      {r.reviewNote && (
        <p className="text-sm mt-3 p-2 rounded-lg bg-stone-50 border border-stone-200">
          <span className="font-semibold">Lý do: </span>
          {r.reviewNote}
          {r.reviewedAt && <span className="text-xs text-stone-500"> · {new Date(r.reviewedAt).toLocaleDateString("vi-VN")}</span>}
        </p>
      )}

      {canReview && (
        <div className="mt-3 pt-3 border-t border-stone-100 space-y-2">
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Lý do quyết định (bắt buộc)…"
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white"
              title="Nhóm hashtag sẽ gắn khi duyệt"
            >
              {groups.map((g) => (
                <option key={g.group_id} value={g.group_id}>
                  Gắn vào nhóm: {g.group_name}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["APPROVED", "Duyệt", "bg-green-700 text-white"],
                  ["NEED_INFO", "Cần bổ sung", "bg-amber-100 text-amber-900"],
                  ["DUPLICATE", "Trùng", "bg-stone-200 text-stone-800"],
                  ["REJECTED", "Từ chối", "bg-red-100 text-red-800"],
                ] as [ReviewDecision, string, string][]
              ).map(([d, l, cls]) => (
                <button
                  key={d}
                  onClick={() => decide(d)}
                  disabled={busy !== null || (d === "APPROVED" && !groupId)}
                  className={"px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 " + cls}
                >
                  {busy === d ? <Loader2 className="w-4 h-4 animate-spin inline" /> : l}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>
      )}
    </li>
  );
}
