import { redirect } from "next/navigation";
import { Award } from "lucide-react";
import { getCurrentUser, getServiceClient } from "@/lib/auth/guards";
import ActivityBoard, { type ActivityRow, type LogRow } from "@/components/ActivityBoard";

function monthStart(ym: string | undefined) {
  const m = /^(\d{4})-(\d{2})$/.exec(ym || "");
  const now = new Date();
  const y = m ? Number(m[1]) : now.getFullYear();
  const mo = m ? Number(m[2]) - 1 : now.getMonth();
  return { start: new Date(Date.UTC(y, mo, 1)), end: new Date(Date.UTC(y, mo + 1, 1)), ym: `${y}-${String(mo + 1).padStart(2, "0")}` };
}

export default async function HoatDongPage({ searchParams }: { searchParams: Promise<{ thang?: string }> }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!me.isAdmin) redirect("/dashboard");

  const { thang } = await searchParams;
  const { start, end, ym } = monthStart(thang);
  const svc = getServiceClient();

  const [{ data: profiles }, { data: monthly, error }, { data: logs }] = await Promise.all([
    svc.from("profiles").select("id, email, full_name, province, is_admin").order("email"),
    svc
      .from("v_collaborator_monthly")
      .select("*")
      .gte("month", start.toISOString())
      .lt("month", end.toISOString()),
    svc
      .from("test_scan_logs")
      .select("log_id, user_id, actor_id, keywords, started_at, posts_total, posts_vi, new_hashtags, cost_usd, export_count")
      .gte("started_at", start.toISOString())
      .lt("started_at", end.toISOString())
      .order("started_at", { ascending: false })
      .limit(300),
  ]);

  const byUser = new Map((monthly || []).map((m) => [m.user_id as string, m]));
  const rows: ActivityRow[] = (profiles || [])
    .filter((p) => !p.is_admin || byUser.has(p.id))
    .map((p) => {
      const m = byUser.get(p.id);
      return {
        userId: p.id,
        email: p.email,
        fullName: p.full_name ?? null,
        province: p.province ?? null,
        scans: Number(m?.scans ?? 0),
        postsScanned: Number(m?.posts_scanned ?? 0),
        postsVi: Number(m?.posts_vi ?? 0),
        newHashtagsSeen: Number(m?.new_hashtags_seen ?? 0),
        costUsd: Number(m?.cost_usd ?? 0),
        proposals: Number(m?.proposals ?? 0),
        approved: Number(m?.approved ?? 0),
        approvedFirst: Number(m?.approved_first ?? 0),
        rejected: Number(m?.rejected ?? 0),
        avgCrit: m?.avg_crit_score === null || m?.avg_crit_score === undefined ? null : Number(m.avg_crit_score),
      };
    });

  const emailOf = new Map((profiles || []).map((p) => [p.id as string, p.full_name || p.email]));
  const logRows: LogRow[] = (logs || []).map((l) => ({
    id: Number(l.log_id),
    who: emailOf.get(l.user_id) ?? l.user_id,
    actorId: l.actor_id,
    keywords: l.keywords || [],
    startedAt: l.started_at,
    postsTotal: l.posts_total,
    postsVi: l.posts_vi,
    newHashtags: (l.new_hashtags || []).length,
    costUsd: l.cost_usd === null ? null : Number(l.cost_usd),
    exports: Number(l.export_count ?? 0),
  }));

  return (
    <div className="p-4 md:p-8 bg-stone-50 min-h-full">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start gap-3 mb-6">
          <div className="shrink-0 inline-flex items-center justify-center w-11 h-11 bg-indigo-600 rounded-xl text-white shadow-sm">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight">Hoạt động cộng tác viên</h1>
            <p className="text-sm text-stone-500 mt-1">
              Căn cứ khen thưởng theo chất lượng: ưu tiên số đề xuất được duyệt và được duyệt khi là người đề xuất sớm
              nhất. Số lần quét chỉ cho biết có làm việc hay không.
            </p>
          </div>
        </div>
        {error ? (
          <p className="p-4 rounded-xl bg-red-50 text-red-800 text-sm">
            Không đọc được số liệu: {error.message}. Kiểm tra đã chạy file SQL bổ sung schema chưa.
          </p>
        ) : (
          <ActivityBoard month={ym} rows={rows} logs={logRows} />
        )}
      </div>
    </div>
  );
}
