"use server";

/**
 * Phiếu đề xuất hashtag (Trinh sát -> Phê duyệt).
 *  - Cộng tác viên gửi phiếu từ màn hình Quét thử.
 *  - Quản trị viên duyệt / yêu cầu bổ sung / từ chối / đánh dấu trùng — mọi quyết định có lý do.
 *  - Duyệt => thêm hashtag vào danh mục (Track 2 – ADAPTIVE) và gắn vào nhóm hashtag.
 */

import { revalidatePath } from "next/cache";
import { getServiceClient, requireAdmin, requireUser } from "@/lib/auth/guards";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export type ProposalInput = {
  hashtag: string;
  platform: string;
  meaning: string;
  evidenceUrls: string[];
  evidencePostCount: number | null;
  critImage: boolean;
  critText: boolean;
  critTransaction: boolean;
  sourceLogId: number | null;
};

function normTag(s: string) {
  return String(s || "").trim().replace(/^#+/, "").replace(/\s+/g, "").toLowerCase();
}

export async function submitProposal(input: ProposalInput): Promise<Result<{ proposalId: number; othersBefore: number }>> {
  try {
    const user = await requireUser();
    const tag = normTag(input.hashtag);
    if (!tag || tag.length > 100) throw new Error("Hashtag không hợp lệ.");
    const urls = (input.evidenceUrls || [])
      .map((u) => String(u).trim())
      .filter((u) => /^https?:\/\//i.test(u))
      .slice(0, 10);
    if (urls.length === 0) throw new Error("Cần ít nhất 1 bài làm minh chứng.");
    if (!input.critImage && !input.critText && !input.critTransaction)
      throw new Error("Chấm ít nhất 1 trong 3 tiêu chí (hình / chữ / giao dịch).");

    const svc = getServiceClient();
    // Đã có trong danh mục?
    const { data: existing } = await svc
      .from("hashtags")
      .select("hashtag_id")
      .in("hashtag_text", [tag, "#" + tag])
      .limit(1);
    if (existing && existing.length) throw new Error(`#${tag} đã có trong danh mục, không cần đề xuất.`);

    // Mình đã gửi phiếu cho từ này và đang chờ?
    const { data: mine } = await svc
      .from("hashtag_proposals")
      .select("proposal_id")
      .eq("proposed_by", user.id)
      .eq("hashtag_text", tag)
      .in("status", ["SUBMITTED", "NEED_INFO"])
      .limit(1);
    if (mine && mine.length) throw new Error(`Bạn đã đề xuất #${tag} và phiếu đang chờ duyệt.`);

    const { count: othersBefore } = await svc
      .from("hashtag_proposals")
      .select("proposal_id", { count: "exact", head: true })
      .eq("hashtag_text", tag)
      .neq("proposed_by", user.id);

    const { data, error } = await svc
      .from("hashtag_proposals")
      .insert({
        proposed_by: user.id,
        province: user.province,
        hashtag_text: tag,
        platform: String(input.platform || "").slice(0, 20),
        meaning: String(input.meaning || "").trim().slice(0, 2000) || null,
        evidence_urls: urls,
        evidence_post_count: input.evidencePostCount ?? null,
        crit_image: !!input.critImage,
        crit_text: !!input.critText,
        crit_transaction: !!input.critTransaction,
        source_log_id: input.sourceLogId && input.sourceLogId > 0 ? input.sourceLogId : null,
      })
      .select("proposal_id")
      .single();
    if (error) throw error;
    revalidatePath("/dashboard/de-xuat");
    return { ok: true, data: { proposalId: Number(data.proposal_id), othersBefore: othersBefore ?? 0 } };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export type ReviewDecision = "APPROVED" | "NEED_INFO" | "REJECTED" | "DUPLICATE";

export async function reviewProposal(args: {
  proposalId: number;
  decision: ReviewDecision;
  note: string;
  groupId?: string | null;
}): Promise<Result<true>> {
  try {
    const admin = await requireAdmin();
    const note = String(args.note || "").trim();
    if (note.length < 3) throw new Error("Ghi lý do cho quyết định (ít nhất vài chữ).");
    if (!["APPROVED", "NEED_INFO", "REJECTED", "DUPLICATE"].includes(args.decision)) throw new Error("Quyết định không hợp lệ.");

    const svc = getServiceClient();
    const { data: p, error: pErr } = await svc
      .from("hashtag_proposals")
      .select("proposal_id, hashtag_text, status")
      .eq("proposal_id", args.proposalId)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!p) throw new Error("Không tìm thấy phiếu.");
    if (p.status === "APPROVED") throw new Error("Phiếu này đã được duyệt trước đó.");

    let approvedHashtagId: number | null = null;
    if (args.decision === "APPROVED") {
      if (!args.groupId) throw new Error("Chọn nhóm hashtag để gắn từ được duyệt.");
      const tag = normTag(p.hashtag_text);
      const { data: ex } = await svc
        .from("hashtags")
        .select("hashtag_id")
        .in("hashtag_text", [tag, "#" + tag])
        .limit(1);
      if (ex && ex.length) {
        approvedHashtagId = Number(ex[0].hashtag_id);
      } else {
        // Danh mục hiện lưu dạng "#tu" (theo màn hình Từ khóa)
        const { data: ins, error: insErr } = await svc
          .from("hashtags")
          .insert({ hashtag_text: "#" + tag, keyword_track: "ADAPTIVE", is_active: true })
          .select("hashtag_id")
          .single();
        if (insErr) throw insErr;
        approvedHashtagId = Number(ins.hashtag_id);
      }
      const { error: mErr } = await svc
        .from("hashtag_group_mapping")
        .upsert({ hashtag_id: approvedHashtagId, group_id: args.groupId }, { onConflict: "hashtag_id,group_id", ignoreDuplicates: true });
      if (mErr) throw mErr;
    }

    const { error: uErr } = await svc
      .from("hashtag_proposals")
      .update({
        status: args.decision,
        review_note: note,
        reviewed_by: admin.id,
        reviewed_at: new Date().toISOString(),
        approved_hashtag_id: approvedHashtagId,
      })
      .eq("proposal_id", args.proposalId);
    if (uErr) throw uErr;

    revalidatePath("/dashboard/de-xuat");
    revalidatePath("/dashboard/hashtags");
    return { ok: true, data: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}
