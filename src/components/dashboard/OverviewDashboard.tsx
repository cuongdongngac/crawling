"use client";

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, ExternalLink, Table2 } from "lucide-react";

// ---------------------------------------------------------------
// Kiểu dữ liệu (khớp các view trong docs/migrations/2026-10-31_dashboard-views.sql)
// ---------------------------------------------------------------
export type WeeklyRow = {
  week_start: string;
  platform: string;
  group_id: string;
  total: number;
  related: number;
  unclear: number;
  unrelated: number;
  pending: number;
  mock: number;
};
export type StageRow = {
  week_start: string;
  run_type: string;
  platform: string;
  runs: number;
  failed: number;
  pending: number;
  items: number;
  cost_usd: number | null;
  runs_with_cost: number;
  last_run_at: string | null;
};
export type GrowthRow = {
  post_id: string;
  platform: string;
  group_id: string | null;
  post_url: string;
  published_at: string | null;
  created_at: string;
  relevance: string;
  text_preview: string | null;
  last_at: string;
  last_eng: number;
  last_views: number | null;
  n_snapshots: number;
  base_at: string | null;
  base_eng: number | null;
  gain: number | null;
  gain_per_day: number | null;
};

type Props = {
  weekly: WeeklyRow[];
  stages: StageRow[];
  growth: GrowthRow[] | null; // null = không phải quản trị viên
  groups: { id: string; name: string }[];
  intervention: string | null;
  interventionAssumed: boolean;
};

// Nhóm hashtag cố định (DEC-005) — màu theo NHÓM, thứ tự cố định, không theo hạng.
// Bảng màu đã kiểm (light): lam, cam, ngọc, vàng — 2 màu nhạt dưới 3:1 nên luôn có nhãn trực tiếp + bảng số liệu.
const GROUP_ORDER = ["COMMERCIAL", "LIFESTYLE", "EVASION", "WARNING"];
const GROUP_COLOR: Record<string, string> = {
  COMMERCIAL: "#2a78d6",
  LIFESTYLE: "#eb6834",
  EVASION: "#1baf7a",
  WARNING: "#eda100",
};
const GROUP_FALLBACK_NAME: Record<string, string> = {
  COMMERCIAL: "Tiếp thị trực tiếp",
  LIFESTYLE: "Lối sống",
  EVASION: "Từ lóng lách luật",
  WARNING: "Cai thuốc và cảnh báo",
};
const PLATFORM_VI: Record<string, string> = { TIKTOK: "TikTok", FACEBOOK: "Facebook" };
const STAGES = [
  { type: "DISCOVERY", label: "Phát hiện bài", tool: "Apify", unit: "bài tìm được" },
  { type: "MEASURE", label: "Đo biến động", tool: "Social Fetch", unit: "lượt đo" },
  { type: "TREND", label: "Nhiệt kế từ khóa", tool: "Social Fetch", unit: "lượt tra" },
];

const fmt = (n: number | null | undefined) => (n === null || n === undefined ? "–" : Math.round(n).toLocaleString("vi-VN"));
const usd = (n: number | null | undefined) =>
  n === null || n === undefined ? "chưa ghi" : n.toLocaleString("vi-VN", { maximumFractionDigits: 2 }) + " USD";
const pct = (a: number, b: number) => (b > 0 ? ((100 * a) / b).toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + "%" : "–");
const dateVi = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("vi-VN") : "–");
const DAY = 86400000;
const addDays = (ymd: string, d: number) => new Date(Date.parse(ymd + "T00:00:00Z") + d * DAY).toISOString().slice(0, 10);
const shortDate = (ymd: string) => {
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y.slice(2)}`;
};

type Metric = "related" | "total";

// ---------------------------------------------------------------
export default function OverviewDashboard({ weekly, stages, growth, groups, intervention, interventionAssumed }: Props) {
  const [platform, setPlatform] = useState<"ALL" | "TIKTOK" | "FACEBOOK">("ALL");
  const [metric, setMetric] = useState<Metric>("related");
  const [showTable, setShowTable] = useState(false);

  // Thời điểm có dữ liệu mới nhất (lần chạy gần nhất) — để biết tuần cuối đã đủ 7 ngày chưa
  const dataUntil = stages.reduce<string>((m, r) => (r.last_run_at && r.last_run_at > m ? r.last_run_at : m), "");
  const groupName = (id: string) => groups.find((g) => g.id === id)?.name ?? GROUP_FALLBACK_NAME[id] ?? id;
  const isMock = weekly.some((r) => r.mock > 0);
  const rows = useMemo(() => weekly.filter((r) => platform === "ALL" || r.platform === platform), [weekly, platform]);
  const stageRows = useMemo(() => stages.filter((r) => platform === "ALL" || r.platform === platform), [stages, platform]);

  // Trục tuần đầy đủ (tuần không có bài = 0)
  const weeks = useMemo(() => {
    const ws = Array.from(new Set(weekly.map((r) => r.week_start))).sort();
    if (ws.length === 0) return [] as string[];
    const out: string[] = [];
    for (let w = ws[0]; w <= ws[ws.length - 1]; w = addDays(w, 7)) out.push(w);
    return out;
  }, [weekly]);

  const series = useMemo(() => {
    const idx = new Map(weeks.map((w, i) => [w, i]));
    return GROUP_ORDER.map((g) => {
      const values = new Array(weeks.length).fill(0) as number[];
      for (const r of rows) if (r.group_id === g) values[idx.get(r.week_start) ?? 0] += metric === "related" ? r.related : r.total;
      return { id: g, name: groupName(g), color: GROUP_COLOR[g], values };
    }).filter((s) => s.values.some((v) => v > 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, weeks, metric, groups]);

  const totals = useMemo(() => {
    const t = { total: 0, related: 0, unclear: 0, unrelated: 0, pending: 0 };
    for (const r of rows) {
      t.total += r.total;
      t.related += r.related;
      t.unclear += r.unclear;
      t.unrelated += r.unrelated;
      t.pending += r.pending;
    }
    return t;
  }, [rows]);

  const btn = (active: boolean) =>
    "px-3 py-1.5 rounded-lg text-sm font-semibold border " +
    (active ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-700 border-stone-300 hover:bg-stone-100");

  return (
    <div className="space-y-6">
      {isMock && (
        <div className="flex gap-3 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Đang hiển thị DỮ LIỆU GIẢ để thử giao diện.</p>
            <p>Mọi con số dưới đây là mô phỏng — không trích dẫn, không đưa vào báo cáo.</p>
          </div>
        </div>
      )}

      {/* Bộ lọc: một hàng, áp cho mọi phần bên dưới */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-stone-500 mr-1">Nền tảng:</span>
        {(["ALL", "TIKTOK", "FACEBOOK"] as const).map((p) => (
          <button key={p} className={btn(platform === p)} onClick={() => setPlatform(p)}>
            {p === "ALL" ? "Tất cả" : PLATFORM_VI[p]}
          </button>
        ))}
      </div>

      {/* Số liệu chính */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Bài đã phát hiện" value={fmt(totals.total)} note="toàn kỳ" />
        <Stat label="Bài liên quan" value={fmt(totals.related)} note={pct(totals.related, totals.total - totals.pending) + " số bài đã sàng lọc"} />
        <Stat label="Không liên quan" value={fmt(totals.unrelated)} note="giữ lại, không đo tiếp" />
        <Stat label="Chờ sàng lọc / chưa rõ" value={fmt(totals.pending + totals.unclear)} note="chờ AI hoặc nghiên cứu viên" />
      </div>

      {/* Q1 */}
      <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
          <div>
            <h2 className="text-lg font-bold text-stone-900">
              {metric === "related" ? "Bài liên quan mới mỗi tuần" : "Mọi bài tìm được mỗi tuần (trước sàng lọc)"}, theo nhóm hashtag
            </h2>
            <p className="text-sm text-stone-500">
              Câu hỏi 1: thị trường thích ứng thế nào trước và sau mốc chính sách?
            </p>
          </div>
          <div className="flex gap-2">
            <button className={btn(metric === "related")} onClick={() => setMetric("related")}>Bài liên quan</button>
            <button className={btn(metric === "total")} onClick={() => setMetric("total")}>Tất cả bài</button>
            <button className={btn(showTable)} onClick={() => setShowTable((v) => !v)} title="Xem bảng số liệu">
              <Table2 className="w-4 h-4 inline -mt-0.5" /> Bảng
            </button>
          </div>
        </div>
        {weeks.length === 0 ? (
          <p className="text-sm text-stone-500 py-10 text-center">Chưa có bài nào.</p>
        ) : (
          <>
            <WeeklyLineChart
              weeks={weeks}
              series={series}
              intervention={intervention}
              interventionAssumed={interventionAssumed}
              lastPartial={!!dataUntil && addDays(weeks[weeks.length - 1], 7) > dataUntil.slice(0, 10)}
            />
            <Legend series={series} />
            {showTable && <WeeklyTable weeks={weeks} series={series} />}
          </>
        )}
        <p className="text-xs text-stone-500 mt-3">
          <strong>Hạn chế:</strong> chỉ là thị trường hiện diện qua hashtag công khai, không phải toàn bộ thị trường; số bài phụ thuộc nỗ lực quét
          (giữ ổn định) và thuật toán tìm kiếm của nền tảng; mô tả xu hướng, không chứng minh nguyên nhân.
        </p>
      </section>

      {/* Điều hành theo khâu */}
      <StagePanel rows={stageRows} />

      {/* Q3 */}
      <GrowthPanel growth={growth ? growth.filter((g) => platform === "ALL" || g.platform === platform) : null} groupName={groupName} isMock={isMock} />
    </div>
  );
}

// ---------------------------------------------------------------
function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4">
      <p className="text-xs font-semibold text-stone-500">{label}</p>
      <p className="text-2xl font-bold text-stone-900 tabular-nums mt-1">{value}</p>
      <p className="text-xs text-stone-500 mt-0.5">{note}</p>
    </div>
  );
}

type Series = { id: string; name: string; color: string; values: number[] };

function Legend({ series }: { series: Series[] }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-sm text-stone-700">
      {series.map((s) => (
        <span key={s.id} className="inline-flex items-center gap-2">
          <svg width="18" height="6" aria-hidden="true">
            <line x1="1" y1="3" x2="17" y2="3" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          {s.name}
        </span>
      ))}
    </div>
  );
}

function niceMax(v: number) {
  if (v <= 0) return 10;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

// Biểu đồ đường theo tuần: lưới nhạt, đường 2px, vạch mốc chính sách, nhãn trực tiếp ở đầu mút, đường dò + chú thích khi rê chuột
function WeeklyLineChart({
  weeks,
  series,
  intervention,
  interventionAssumed,
  lastPartial,
}: {
  weeks: string[];
  series: Series[];
  intervention: string | null;
  interventionAssumed: boolean;
  lastPartial: boolean;
}) {
  const W = 1000, H = 340, ML = 44, MR = 150, MT = 18, MB = 34;
  const iw = W - ML - MR, ih = H - MT - MB;
  const maxV = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const x = (i: number) => ML + (weeks.length <= 1 ? 0 : (i * iw) / (weeks.length - 1));
  const y = (v: number) => MT + ih - (v / maxV) * ih;
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);

  const ticksY = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxV);
  // Nhãn trục X: tuần đầu tiên của mỗi quý (tháng 1, 4, 7, 10) hoặc mỗi 2 tháng nếu chuỗi ngắn
  const monthStep = weeks.length > 40 ? 3 : 1;
  const ticksX: number[] = [];
  let lastMonth = "";
  weeks.forEach((w, i) => {
    const m = w.slice(0, 7);
    if (m !== lastMonth) {
      lastMonth = m;
      if ((Number(w.slice(5, 7)) - 1) % monthStep === 0) ticksX.push(i);
    }
  });

  // Vị trí mốc chính sách (nội suy giữa các tuần)
  let ix: number | null = null;
  if (intervention && weeks.length > 1) {
    const t0 = Date.parse(weeks[0]), t1 = Date.parse(weeks[weeks.length - 1]), t = Date.parse(intervention);
    if (t >= t0 && t <= t1) ix = ML + ((t - t0) / (t1 - t0)) * iw;
  }

  // Nhãn trực tiếp ở đầu mút — giãn cách tối thiểu 15px để không chồng nhau
  const ends = series
    .map((s) => ({ s, yy: y(s.values[s.values.length - 1]) }))
    .sort((a, b) => a.yy - b.yy);
  for (let i = 1; i < ends.length; i++) if (ends[i].yy - ends[i - 1].yy < 15) ends[i].yy = ends[i - 1].yy + 15;

  const path = (vals: number[], from = 0) =>
    vals.map((v, i) => (i < from ? "" : `${i === from ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)).join("");
  // Tuần cuối chưa đủ 7 ngày: vẽ đoạn cuối nét đứt để không bị đọc thành "giảm"
  const nSolid = lastPartial && weeks.length > 2 ? weeks.length - 1 : weeks.length;

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const sx = ((e.clientX - r.left) * W) / r.width;
    const i = Math.round(((sx - ML) / iw) * (weeks.length - 1));
    setHover(Math.max(0, Math.min(weeks.length - 1, i)));
  }

  const hx = hover === null ? 0 : x(hover);
  const tipLeftPct = (hx / W) * 100;

  return (
    <div className="mt-3 overflow-x-auto -mx-1 px-1">
    <div className="relative min-w-[720px]">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none" role="img" aria-label="Biểu đồ đường số bài mỗi tuần theo nhóm hashtag">
        {ticksY.map((v) => (
          <g key={v}>
            <line x1={ML} x2={ML + iw} y1={y(v)} y2={y(v)} stroke="#e7e5e4" strokeWidth="1" />
            <text x={ML - 8} y={y(v) + 4} textAnchor="end" fontSize="12" fill="#78716c">
              {Math.round(v).toLocaleString("vi-VN")}
            </text>
          </g>
        ))}
        {ticksX.map((i) => (
          <text key={i} x={x(i)} y={H - 10} textAnchor="middle" fontSize="12" fill="#78716c">
            {`T${Number(weeks[i].slice(5, 7))}/${weeks[i].slice(2, 4)}`}
          </text>
        ))}
        {ix !== null && (
          <g>
            <line x1={ix} x2={ix} y1={MT - 4} y2={MT + ih} stroke="#44403c" strokeWidth="1.5" strokeDasharray="5 4" />
            <text x={ix + 6} y={MT + 8} fontSize="12" fill="#44403c" fontWeight="600">
              {interventionAssumed ? "Mốc chính sách (giả định)" : "Mốc chính sách"}
            </text>
          </g>
        )}
        {series.map((s) => (
          <g key={s.id}>
            <path d={path(s.values.slice(0, nSolid))} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {nSolid < weeks.length && (
              <path d={path(s.values, nSolid - 1)} fill="none" stroke={s.color} strokeWidth="2" strokeDasharray="3 4" strokeLinecap="round" />
            )}
          </g>
        ))}
        {nSolid < weeks.length && (
          <text x={x(weeks.length - 1) - 4} y={MT + ih - 6} textAnchor="end" fontSize="11" fill="#a8a29e">tuần chưa đủ →</text>
        )}
        {ends.map(({ s, yy }) => (
          <g key={s.id}>
            <line x1={ML + iw + 8} x2={ML + iw + 20} y1={yy} y2={yy} stroke={s.color} strokeWidth="2.5" strokeLinecap="round" />
            <text x={ML + iw + 25} y={yy + 4} fontSize="12" fill="#292524">
              {s.name.length > 18 ? s.name.slice(0, 17) + "…" : s.name}
            </text>
          </g>
        ))}
        {hover !== null && (
          <g>
            <line x1={hx} x2={hx} y1={MT} y2={MT + ih} stroke="#a8a29e" strokeWidth="1" />
            {series.map((s) => (
              <circle key={s.id} cx={hx} cy={y(s.values[hover])} r="4" fill={s.color} stroke="#fff" strokeWidth="2" />
            ))}
          </g>
        )}
        <rect
          x={ML}
          y={MT}
          width={iw}
          height={ih}
          fill="transparent"
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-9 z-10 rounded-lg border border-stone-200 bg-white/95 shadow-md px-3 py-2 text-sm"
          style={tipLeftPct > 60 ? { right: `${100 - tipLeftPct + 1}%` } : { left: `${tipLeftPct + 1}%` }}
        >
          <p className="text-xs text-stone-500 mb-1">
            Tuần từ {shortDate(weeks[hover])}
            {hover === weeks.length - 1 && nSolid < weeks.length ? " (chưa đủ 7 ngày)" : ""}
          </p>
          {series.map((s) => (
            <p key={s.id} className="flex items-center gap-2 whitespace-nowrap">
              <svg width="14" height="6" aria-hidden="true">
                <line x1="1" y1="3" x2="13" y2="3" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              <strong className="tabular-nums text-stone-900">{fmt(s.values[hover])}</strong>
              <span className="text-stone-500">{s.name}</span>
            </p>
          ))}
        </div>
      )}
    </div>
    </div>
  );
}

function WeeklyTable({ weeks, series }: { weeks: string[]; series: Series[] }) {
  const order = weeks.map((w, i) => ({ w, i })).reverse();
  return (
    <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-stone-200">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="sticky top-0 bg-stone-50">
          <tr className="text-left text-stone-500">
            <th className="py-2 px-3">Tuần từ</th>
            {series.map((s) => (
              <th key={s.id} className="py-2 px-3 text-right">{s.name}</th>
            ))}
            <th className="py-2 px-3 text-right">Cộng</th>
          </tr>
        </thead>
        <tbody>
          {order.map(({ w, i }) => (
            <tr key={w} className="border-t border-stone-100">
              <td className="py-1.5 px-3 tabular-nums">{shortDate(w)}</td>
              {series.map((s) => (
                <td key={s.id} className="py-1.5 px-3 text-right tabular-nums">{fmt(s.values[i])}</td>
              ))}
              <td className="py-1.5 px-3 text-right tabular-nums font-semibold">{fmt(series.reduce((a, s) => a + s.values[i], 0))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Điều hành theo khâu: mỗi khâu một dòng — số lần chạy, lỗi, khối lượng, chi phí
function StagePanel({ rows }: { rows: StageRow[] }) {
  const lastWeek = rows.reduce((m, r) => (r.week_start > m ? r.week_start : m), "");
  const from4 = lastWeek ? addDays(lastWeek, -21) : "";
  const agg = STAGES.map((st) => {
    const all = rows.filter((r) => r.run_type === st.type);
    const recent = all.filter((r) => r.week_start >= from4);
    const sum = (list: StageRow[], k: "runs" | "failed" | "items" | "pending") => list.reduce((a, r) => a + r[k], 0);
    const costRows = recent.filter((r) => r.runs_with_cost > 0);
    return {
      ...st,
      runs: sum(all, "runs"),
      runs4: sum(recent, "runs"),
      failed: sum(all, "failed"),
      pending: sum(all, "pending"),
      items4: sum(recent, "items"),
      cost4: costRows.length ? costRows.reduce((a, r) => a + (r.cost_usd ?? 0), 0) : null,
      last: all.reduce<string | null>((m, r) => (r.last_run_at && (!m || r.last_run_at > m) ? r.last_run_at : m), null),
    };
  });
  return (
    <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 md:p-6">
      <h2 className="text-lg font-bold text-stone-900">Vận hành theo khâu</h2>
      <p className="text-sm text-stone-500">
        Mỗi khâu một công cụ, một nhật ký, một khoản chi phí — nhìn vào là biết khâu nào đang nghẽn. 4 tuần gần nhất tính từ tuần có dữ liệu mới nhất.
      </p>
      <div className="overflow-x-auto mt-3">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-stone-500 border-b border-stone-200">
              <th className="py-2 pr-3">Khâu</th>
              <th className="py-2 pr-3 text-right">Lần chạy (4 tuần)</th>
              <th className="py-2 pr-3 text-right">Khối lượng (4 tuần)</th>
              <th className="py-2 pr-3 text-right">Lỗi (toàn kỳ)</th>
              <th className="py-2 pr-3 text-right">Chi phí (4 tuần)</th>
              <th className="py-2 pr-3 text-right">Lần chạy gần nhất</th>
            </tr>
          </thead>
          <tbody>
            {agg.map((a) => (
              <tr key={a.type} className="border-b border-stone-100">
                <td className="py-2 pr-3">
                  <p className="font-semibold text-stone-900">{a.label}</p>
                  <p className="text-xs text-stone-500">{a.tool} · {a.type}</p>
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">{a.runs ? fmt(a.runs4) : "chưa chạy"}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{a.runs ? `${fmt(a.items4)} ${a.unit}` : "–"}</td>
                <td className="py-2 pr-3 text-right tabular-nums">
                  {a.runs ? (
                    <span className={a.failed > 0 ? "text-red-700 font-semibold" : ""}>
                      {a.failed > 0 ? "⚠ " : ""}{fmt(a.failed)} ({pct(a.failed, a.runs)})
                    </span>
                  ) : "–"}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">{a.runs ? usd(a.cost4) : "–"}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{dateVi(a.last)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-stone-500 mt-3">
        Quét thử của cộng tác viên không nằm ở đây (xem trang Hoạt động). &ldquo;Chưa ghi&rdquo; chi phí: lần chạy chưa lưu chi phí thật từ nhà cung cấp.
      </p>
    </section>
  );
}

function GrowthPanel({ growth, groupName, isMock }: { growth: GrowthRow[] | null; groupName: (id: string) => string; isMock: boolean }) {
  return (
    <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 md:p-6">
      <h2 className="text-lg font-bold text-stone-900">Bài tăng tương tác mạnh nhất (khoảng 7 ngày gần nhất)</h2>
      <p className="text-sm text-stone-500">
        Câu hỏi 3: bài nào đang có biểu hiện tương tác mạnh nhất? Chỉ tính bài liên quan hoặc chưa rõ, còn tồn tại, có lần đo trong 14 ngày qua.
      </p>
      {growth === null ? (
        <p className="text-sm text-stone-600 mt-3 rounded-lg bg-stone-50 p-3">
          Danh sách bài kèm đường dẫn chỉ dành cho nghiên cứu viên (quản trị viên), theo nguyên tắc hạn chế người xem dữ liệu liên kết.
        </p>
      ) : growth.length === 0 ? (
        <p className="text-sm text-stone-500 py-6 text-center">Chưa có bài nào đủ hai lần đo cách nhau từ 6 ngày.</p>
      ) : (
        <div className="overflow-x-auto mt-3">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-stone-500 border-b border-stone-200">
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">Bài</th>
                <th className="py-2 pr-3 text-right">Tăng thêm</th>
                <th className="py-2 pr-3 text-right">Mỗi ngày</th>
                <th className="py-2 pr-3 text-right">Tương tác hiện tại</th>
                <th className="py-2 pr-3 text-right">Số lần đo</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {growth.map((g, i) => (
                <tr key={g.post_id} className="border-b border-stone-100 align-top">
                  <td className="py-2 pr-3 font-bold text-stone-700">{i + 1}</td>
                  <td className="py-2 pr-3 max-w-md">
                    <p className="text-xs text-stone-500">
                      {PLATFORM_VI[g.platform] ?? g.platform} · {g.group_id ? groupName(g.group_id) : "chưa xếp nhóm"} · đăng {dateVi(g.published_at)}
                      {g.relevance === "UNCLEAR" && <span className="ml-1 text-amber-700 font-semibold">· chưa rõ, chờ xác minh</span>}
                    </p>
                    <p className="text-stone-800 line-clamp-2">{g.text_preview || "(không có nội dung chữ)"}</p>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums font-semibold">+{fmt(g.gain)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmt(g.gain_per_day)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmt(g.last_eng)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmt(g.n_snapshots)}</td>
                  <td className="py-2 pr-3 text-right">
                    <a href={g.post_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-700 font-semibold whitespace-nowrap">
                      Mở <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-stone-500 mt-3">
        <strong>Lưu ý:</strong> tương tác = like + bình luận + chia sẻ. Đây là danh sách <em>đề xuất xem xét</em> — nghiên cứu viên phải xem từng bài trước khi đưa vào
        danh sách chuyển tuyến.{isMock && " Với dữ liệu giả, đường dẫn bài là giả và không mở được."}
      </p>
    </section>
  );
}
