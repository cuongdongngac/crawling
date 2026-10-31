import { redirect } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import HelpLink from "@/components/HelpLink";
import { getCurrentUser, getServiceClient } from "@/lib/auth/guards";
import OverviewDashboard, {
  type GrowthRow,
  type StageRow,
  type WeeklyRow,
} from "@/components/dashboard/OverviewDashboard";

// Tổng quan: đọc các view tính sẵn (docs/migrations/2026-10-31_dashboard-views.sql).
// Số liệu tổng hợp: mọi người đã đăng nhập. Danh sách bài kèm link: chỉ quản trị viên.

type SB = ReturnType<typeof getServiceClient>;

async function fetchAll<T>(sb: SB, view: string, columns: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < 50000; from += 1000) {
    const { data, error } = await sb.from(view).select(columns).range(from, from + 999);
    if (error) throw new Error(`${view}: ${error.message}`);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export default async function DashboardPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const sb = getServiceClient();

  let weekly: WeeklyRow[] = [];
  let stages: StageRow[] = [];
  let growth: GrowthRow[] | null = null;
  let groups: { id: string; name: string }[] = [];
  let intervention: string | null = null;
  let interventionAssumed = false;
  let loadError: string | null = null;

  try {
    const [w, s, g, cfg, mockInfo] = await Promise.all([
      fetchAll<WeeklyRow>(sb, "v_weekly_new_posts", "week_start, platform, group_id, total, related, unclear, unrelated, pending, mock"),
      fetchAll<StageRow>(sb, "v_stage_runs_weekly", "week_start, run_type, platform, runs, failed, pending, items, cost_usd, runs_with_cost, last_run_at"),
      sb.from("hashtag_groups").select("group_id, group_name"),
      sb.from("project_config").select("intervention_date").eq("config_id", "MAIN_STUDY").maybeSingle(),
      sb.from("system_settings").select("setting_value").eq("setting_key", "MOCK_SEED_INFO").maybeSingle(),
    ]);
    weekly = w.map((r) => ({ ...r, total: +r.total, related: +r.related, unclear: +r.unclear, unrelated: +r.unrelated, pending: +r.pending, mock: +r.mock }));
    stages = s.map((r) => ({ ...r, runs: +r.runs, failed: +r.failed, pending: +r.pending, items: +r.items, cost_usd: r.cost_usd === null ? null : +r.cost_usd, runs_with_cost: +r.runs_with_cost }));
    groups = (g.data ?? []).map((x: { group_id: string; group_name: string }) => ({ id: x.group_id, name: x.group_name }));

    // Mốc chính sách: project_config; nếu đang dùng dữ liệu giả mà mốc nằm ngoài khoảng dữ liệu thì lấy mốc giả định của bộ dữ liệu giả
    const weeks = weekly.map((r) => r.week_start).sort();
    const inRange = (d: string) => weeks.length > 0 && d >= weeks[0] && d <= weeks[weeks.length - 1];
    const cfgDate = (cfg.data?.intervention_date as string | undefined) ?? null;
    let mockDate: string | null = null;
    try {
      mockDate = mockInfo.data ? String(JSON.parse(mockInfo.data.setting_value).intervention).slice(0, 10) : null;
    } catch {
      mockDate = null;
    }
    if (cfgDate && inRange(cfgDate)) intervention = cfgDate;
    else if (mockDate && inRange(mockDate)) {
      intervention = mockDate;
      interventionAssumed = true;
    }

    if (me.isAdmin) {
      const latest = await sb.from("v_post_growth").select("last_at").order("last_at", { ascending: false }).limit(1).maybeSingle();
      const ref = latest.data?.last_at ? new Date(latest.data.last_at as string) : new Date();
      const since = new Date(ref.getTime() - 14 * 86400000).toISOString();
      const { data, error } = await sb
        .from("v_post_growth")
        .select("post_id, platform, group_id, post_url, published_at, created_at, relevance, text_preview, last_at, last_eng, last_views, n_snapshots, base_at, base_eng, gain, gain_per_day")
        .in("relevance", ["RELATED", "UNCLEAR"])
        .is("unavailable_at", null)
        .gte("last_at", since)
        .not("gain", "is", null)
        .order("gain_per_day", { ascending: false })
        .limit(20);
      if (error) throw new Error(`v_post_growth: ${error.message}`);
      growth = (data ?? []) as GrowthRow[];
    }
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="p-4 md:p-8 bg-stone-50 min-h-full">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start gap-3 mb-6">
          <div className="shrink-0 inline-flex items-center justify-center w-11 h-11 bg-stone-900 rounded-xl text-white shadow-sm">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight">Tổng quan</h1>
            <p className="text-sm text-stone-500 mt-1">
              Mỗi biểu đồ trả lời một câu hỏi nghiên cứu và đi kèm hạn chế của nó. Hệ thống mô tả xu hướng, không kết luận nguyên nhân.
            </p>
            <HelpLink slug="thiet-ke/cau-hoi-nghien-cuu" label="Câu hỏi nghiên cứu và biểu đồ" className="mt-1" />
          </div>
        </div>
        {loadError ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
            <p className="font-semibold">Chưa đọc được số liệu tổng quan.</p>
            <p className="mt-1">
              Kiểm tra đã chạy <code>docs/migrations/2026-10-31_dashboard-views.sql</code> trên Supabase chưa.
            </p>
            <p className="mt-2 text-xs text-amber-800">Chi tiết: {loadError}</p>
          </div>
        ) : (
          <OverviewDashboard
            weekly={weekly}
            stages={stages}
            growth={growth}
            groups={groups}
            intervention={intervention}
            interventionAssumed={interventionAssumed}
          />
        )}
      </div>
    </div>
  );
}
