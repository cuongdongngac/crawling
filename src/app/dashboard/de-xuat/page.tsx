import { redirect } from "next/navigation";
import { Lightbulb } from "lucide-react";
import { getCurrentUser, getServiceClient } from "@/lib/auth/guards";
import ProposalList, { type ProposalRow } from "@/components/ProposalList";

export default async function DeXuatPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const svc = getServiceClient();
  let q = svc
    .from("hashtag_proposals")
    .select(
      "proposal_id, proposed_by, province, hashtag_text, platform, meaning, evidence_urls, evidence_post_count, crit_image, crit_text, crit_transaction, status, review_note, reviewed_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(500);
  if (!me.isAdmin) q = q.eq("proposed_by", me.id);
  const { data: proposals, error } = await q;

  // Thứ tự đề xuất theo từng từ (ai đề xuất sớm nhất) — tính trên toàn bộ phiếu
  const { data: allForOrder } = await svc
    .from("hashtag_proposals")
    .select("proposal_id, hashtag_text, created_at")
    .order("created_at", { ascending: true });
  const firstByTag = new Map<string, number>();
  const countByTag = new Map<string, number>();
  for (const p of allForOrder || []) {
    const k = String(p.hashtag_text).toLowerCase();
    if (!firstByTag.has(k)) firstByTag.set(k, Number(p.proposal_id));
    countByTag.set(k, (countByTag.get(k) ?? 0) + 1);
  }

  const emailById = new Map<string, { email: string; full_name: string | null }>();
  let groups: { group_id: string; group_name: string }[] = [];
  if (me.isAdmin) {
    const ids = Array.from(new Set((proposals || []).map((p) => p.proposed_by)));
    if (ids.length) {
      const { data: profs } = await svc.from("profiles").select("id, email, full_name").in("id", ids);
      for (const p of profs || []) emailById.set(p.id, { email: p.email, full_name: p.full_name ?? null });
    }
    const { data: g } = await svc.from("hashtag_groups").select("group_id, group_name").order("group_name");
    groups = g || [];
  }

  const rows: ProposalRow[] = (proposals || []).map((p) => {
    const k = String(p.hashtag_text).toLowerCase();
    const who = emailById.get(p.proposed_by);
    return {
      id: Number(p.proposal_id),
      hashtag: p.hashtag_text,
      platform: p.platform,
      province: p.province,
      proposer: me.isAdmin ? (who?.full_name ? `${who.full_name} (${who.email})` : who?.email ?? "") : null,
      meaning: p.meaning,
      evidenceUrls: p.evidence_urls || [],
      evidencePostCount: p.evidence_post_count,
      crit: [p.crit_image, p.crit_text, p.crit_transaction],
      status: p.status,
      reviewNote: p.review_note,
      reviewedAt: p.reviewed_at,
      createdAt: p.created_at,
      isFirst: firstByTag.get(k) === Number(p.proposal_id),
      sameTagCount: countByTag.get(k) ?? 1,
    };
  });

  return (
    <div className="p-4 md:p-8 bg-stone-50 min-h-full">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start gap-3 mb-6">
          <div className="shrink-0 inline-flex items-center justify-center w-11 h-11 bg-amber-500 rounded-xl text-white shadow-sm">
            <Lightbulb className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight">Đề xuất hashtag</h1>
            <p className="text-sm text-stone-500 mt-1">
              {me.isAdmin
                ? "Duyệt các phiếu đề xuất từ cộng tác viên. Mọi quyết định cần ghi lý do; duyệt sẽ thêm hashtag vào danh mục (Track 2)."
                : "Các phiếu bạn đã gửi và kết quả duyệt. Gửi phiếu mới từ tab “Hashtag đi kèm” trong Quét thử."}
            </p>
          </div>
        </div>
        {error ? (
          <p className="p-4 rounded-xl bg-red-50 text-red-800 text-sm">
            Không đọc được phiếu đề xuất: {error.message}. Kiểm tra đã chạy file SQL bổ sung schema chưa.
          </p>
        ) : (
          <ProposalList rows={rows} isAdmin={me.isAdmin} groups={groups} />
        )}
      </div>
    </div>
  );
}
