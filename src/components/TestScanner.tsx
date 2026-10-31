"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Square,
  RefreshCw,
  Download,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Loader2,
  KeyRound,
  Hash,
  Trash2,
  Link2,
} from "lucide-react";
import {
  abortScan,
  fetchScanResults,
  getScanStatus,
  logExport,
  lookupRun,
  startScan,
  type RelatedRow,
  type ScanRow,
  type ScanRun,
} from "@/app/actions/test-scan";
import ProposalDialog, { type ProposalTarget } from "@/components/ProposalDialog";

// ---------------------------------------------------------------
// Kiểu dữ liệu
// ---------------------------------------------------------------
type ActorInfo = {
  id: string;
  label: string;
  platform: "TIKTOK" | "FACEBOOK" | "INSTAGRAM";
  maxPerKeyword: number;
  minPerKeyword?: number;
  /** Có giá trị = actor tự quyết số bài, hiện chữ thay cho ô nhập */
  perKeywordFixed?: string;
  defaultPerKeyword: number;
  estUsdPerItem: number;
  note: string;
  capabilities?: { sortOrder?: boolean; dateRange?: boolean; periods?: number[] };
};

type Job = {
  actorId: string;
  keywords: string[];
  perKeyword: number;
  createdAt: string;
  runs: ScanRun[];
  rows: ScanRow[] | null;
  /** Hashtag liên quan do actor thống kê gợi ý */
  related?: RelatedRow[];
  /** mã nhật ký trên server (test_scan_logs) */
  logId?: number | null;
  rawCount?: number;
  skipped?: number;
  truncated?: boolean;
};

type SortKey = "engagement" | "like" | "comment" | "share" | "view" | "newest";
type LangFilter = "vi" | "vi_unknown" | "all";

const TERMINAL = ["SUCCEEDED", "FAILED", "TIMED-OUT", "ABORTED"];
const JOB_KEY = "vpha.quetthu.job.v1";
const TOKEN_KEY = "vpha.quetthu.token";
const POLL_MS = 6000;
const PAGE = 100;

const STATUS_VI: Record<string, { label: string; cls: string }> = {
  READY: { label: "Đang chờ", cls: "bg-stone-100 text-stone-700" },
  RUNNING: { label: "Đang quét", cls: "bg-blue-100 text-blue-700" },
  SUCCEEDED: { label: "Xong", cls: "bg-green-100 text-green-700" },
  FAILED: { label: "Lỗi", cls: "bg-red-100 text-red-700" },
  "TIMED-OUT": { label: "Quá giờ", cls: "bg-red-100 text-red-700" },
  ABORTED: { label: "Đã dừng", cls: "bg-amber-100 text-amber-700" },
  TIMING_OUT: { label: "Sắp quá giờ", cls: "bg-amber-100 text-amber-700" },
  ABORTING: { label: "Đang dừng", cls: "bg-amber-100 text-amber-700" },
};

const PLATFORM_VI: Record<string, string> = { TIKTOK: "TikTok", FACEBOOK: "Facebook", INSTAGRAM: "Instagram" };
const platformVi = (p: string) => PLATFORM_VI[p] ?? p;

const LANG_VI: Record<string, string> = {
  vi: "Tiếng Việt",
  en: "Tiếng Anh",
  zh: "Tiếng Trung",
  ko: "Tiếng Hàn",
  ja: "Tiếng Nhật",
  th: "Tiếng Thái",
  thai: "Tiếng Thái",
  id: "Tiếng Indonesia",
  ru: "Tiếng Nga",
  other: "Chưa rõ",
};

// ---------------------------------------------------------------
// Tiện ích
// ---------------------------------------------------------------
const fmt = (n: number | null | undefined) => (n === null || n === undefined ? "–" : n.toLocaleString("vi-VN"));
const engagement = (r: ScanRow) => (r.like_count ?? 0) + (r.comment_count ?? 0) + (r.share_count ?? 0);
const isVi = (r: ScanRow) => r.lang === "vi";
const isUnknown = (r: ScanRow) => !LANG_VI[r.lang] || r.lang === "other";

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* bộ nhớ trình duyệt đầy hoặc bị chặn — bỏ qua */
  }
}

function parseKeywords(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );
}

function dateVi(iso: string | null) {
  if (!iso) return "–";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "–" : d.toLocaleDateString("vi-VN");
}

// ---------------------------------------------------------------
// Component chính
// ---------------------------------------------------------------
export default function TestScanner({ actors, knownHashtags }: { actors: ActorInfo[]; knownHashtags: string[] }) {
  const known = useMemo(() => new Set(knownHashtags), [knownHashtags]);

  // --- Form ---
  const [actorId, setActorId] = useState(actors[0]?.id ?? "");
  const actor = actors.find((a) => a.id === actorId) ?? actors[0];
  const [keywordsText, setKeywordsText] = useState("");
  const [perKeyword, setPerKeyword] = useState<number>(actors[0]?.defaultPerKeyword ?? 50);
  const [searchType, setSearchType] = useState<"top" | "latest">("top");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [period, setPeriod] = useState<number>(30);
  const [token, setToken] = useState("");
  const [rememberToken, setRememberToken] = useState(false);

  // --- Lần quét ---
  const [job, setJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState<null | "start" | "fetch" | "abort" | "import">(null);
  const [error, setError] = useState<string | null>(null);
  const [importRef, setImportRef] = useState("");
  const [proposing, setProposing] = useState<ProposalTarget | null>(null);
  const [proposedTags, setProposedTags] = useState<Set<string>>(new Set());

  // --- Xem kết quả ---
  const [langFilter, setLangFilter] = useState<LangFilter>("vi_unknown");
  const [kwFilter, setKwFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("engagement");
  const [search, setSearch] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [tab, setTab] = useState<"posts" | "hashtags">("posts");

  // Khôi phục từ trình duyệt (mở lại trang / tắt màn hình điện thoại).
  // Phải đọc sau khi trang đã hiển thị (server không có localStorage), nên setState trong effect là chủ ý.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const t = safeGet(TOKEN_KEY);
    if (t) {
      setToken(t);
      setRememberToken(true);
    }
    const j = safeGet(JOB_KEY);
    if (j) {
      try {
        const parsed = JSON.parse(j) as Job;
        if (parsed && Array.isArray(parsed.runs)) {
          setJob(parsed);
          if (actors.some((a) => a.id === parsed.actorId)) setActorId(parsed.actorId);
        }
      } catch {
        /* dữ liệu cũ hỏng */
      }
    }
  }, [actors]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Lưu lần quét vào trình duyệt của chính người dùng.
  // Kết quả lớn có thể vượt dung lượng trình duyệt -> khi đó chỉ lưu tiến độ, kết quả tải lại từ Apify.
  useEffect(() => {
    if (!job) {
      safeSet(JOB_KEY, null);
      return;
    }
    try {
      window.localStorage.setItem(JOB_KEY, JSON.stringify(job));
    } catch {
      safeSet(JOB_KEY, JSON.stringify({ ...job, rows: null }));
    }
  }, [job]);

  useEffect(() => {
    safeSet(TOKEN_KEY, rememberToken && token ? token : null);
  }, [rememberToken, token]);

  const allDone = !!job && job.runs.length > 0 && job.runs.every((r) => !r.runId || TERMINAL.includes(r.status));
  const anyRunning = !!job && job.runs.some((r) => r.runId && !TERMINAL.includes(r.status));

  // ---------------- Hỏi tiến độ định kỳ ----------------
  const pollingRef = useRef(false);
  const poll = useCallback(() => {
    if (!job || !anyRunning || !token || pollingRef.current) return;
    pollingRef.current = true;
    startTransition(async () => {
      const res = await getScanStatus({ token, runs: job.runs });
      pollingRef.current = false;
      if (res.ok) setJob((j) => (j ? { ...j, runs: res.data } : j));
      else setError(res.error);
    });
  }, [job, anyRunning, token]);

  useEffect(() => {
    if (!anyRunning) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") poll();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && poll();
    document.addEventListener("visibilitychange", onVisible);
    poll();
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [anyRunning, poll]);

  // ---------------- Tải kết quả khi xong ----------------
  const loadResults = useCallback(
    async (j: Job) => {
      if (!token) {
        setError("Nhập API key để tải kết quả.");
        return;
      }
      setBusy("fetch");
      setError(null);
      const res = await fetchScanResults({ token, actorId: j.actorId, runs: j.runs.filter((r) => r.runId), logId: j.logId ?? null });
      setBusy(null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setShown(PAGE);
      setJob((cur) =>
        cur
          ? {
              ...cur,
              rows: res.data.rows,
              related: res.data.related,
              rawCount: res.data.rawCount,
              skipped: res.data.skipped,
              truncated: res.data.truncated,
            }
          : cur,
      );
    },
    [token],
  );

  // Tự tải kết quả MỘT lần khi mọi từ khóa đã xong (lỗi thì người dùng bấm "Tải lại kết quả")
  const autoLoadedRef = useRef<string>("");
  useEffect(() => {
    if (!job || !allDone || job.rows !== null || busy !== null || !token) return;
    const key = job.createdAt + "|" + job.runs.map((r) => r.runId).join(",");
    if (autoLoadedRef.current === key) return;
    autoLoadedRef.current = key;
    startTransition(() => loadResults(job));
  }, [job, allDone, busy, token, loadResults]);

  // ---------------- Hành động ----------------
  const keywords = parseKeywords(keywordsText);
  const perKw = Math.min(
    Math.max(Math.floor(perKeyword || 1), actor?.minPerKeyword ?? 1),
    actor?.maxPerKeyword ?? 1,
  );
  const caps = actor?.capabilities ?? {};
  const estUsd = keywords.length * perKw * (actor?.estUsdPerItem ?? 0);

  async function onStart() {
    setError(null);
    if (!token.trim()) return setError("Nhập API key Apify của bạn.");
    if (keywords.length === 0) return setError("Nhập ít nhất một từ khóa.");
    if (anyRunning && !window.confirm("Lần quét trước chưa xong. Bỏ theo dõi lần đó và quét mới?")) return;
    setBusy("start");
    const res = await startScan({
      token,
      actorId: actor.id,
      keywords,
      perKeyword: perKw,
      options: {
        ...(caps.sortOrder ? { searchType } : {}),
        ...(caps.dateRange ? { startDate: startDate || undefined, endDate: endDate || undefined } : {}),
        ...(caps.periods?.length ? { period } : {}),
      },
    });
    setBusy(null);
    if (!res.ok) return setError(res.error);
    setKwFilter("");
    setJob({
      actorId: actor.id,
      keywords: res.data.runs.map((r) => r.keyword),
      perKeyword: perKw,
      createdAt: new Date().toISOString(),
      runs: res.data.runs,
      logId: res.data.logId,
      rows: null,
    });
  }

  async function onAbort() {
    if (!job || !token) return;
    if (!window.confirm("Dừng các từ khóa đang quét? Bài đã lấy được vẫn giữ lại.")) return;
    setBusy("abort");
    const res = await abortScan({ token, runs: job.runs });
    setBusy(null);
    if (!res.ok) setError(res.error);
    poll();
  }

  async function onImport() {
    if (!token.trim()) return setError("Nhập API key Apify của tài khoản đã chạy lần quét đó.");
    if (!importRef.trim()) return;
    setBusy("import");
    setError(null);
    const sameJob = job && job.actorId === actor.id ? job : null;
    const res = await lookupRun({
      token,
      runIdOrUrl: importRef,
      keyword: keywords[0] || "",
      actorId: actor.id,
      logId: sameJob?.logId ?? null,
    });
    setBusy(null);
    if (!res.ok) return setError(res.error);
    setImportRef("");
    setJob((j) => {
      const base: Job =
        j && j.actorId === actor.id
          ? j
          : { actorId: actor.id, keywords: [], perKeyword: perKw, createdAt: new Date().toISOString(), runs: [], rows: null };
      const run = res.data.run;
      if (base.runs.some((r) => r.runId === run.runId)) return base;
      return {
        ...base,
        logId: res.data.logId ?? base.logId ?? null,
        keywords: Array.from(new Set([...base.keywords, run.keyword])),
        runs: [...base.runs, run],
        rows: null,
      };
    });
  }

  function onClear() {
    if (!window.confirm("Xóa kết quả lần quét này khỏi màn hình? (Dữ liệu trên Apify vẫn còn.)")) return;
    setJob(null);
    setError(null);
  }

  // ---------------- Lọc / sắp xếp ----------------
  const rows = useMemo(() => job?.rows ?? [], [job]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (langFilter === "vi" && !isVi(r)) return false;
      if (langFilter === "vi_unknown" && !(isVi(r) || isUnknown(r))) return false;
      if (kwFilter && !r.keywords.includes(kwFilter)) return false;
      if (q && !(r.text.toLowerCase().includes(q) || r.hashtags.some((h) => h.includes(q.replace(/^#/, ""))))) return false;
      return true;
    });
    const val = (r: ScanRow): number => {
      switch (sortKey) {
        case "like":
          return r.like_count ?? -1;
        case "comment":
          return r.comment_count ?? -1;
        case "share":
          return r.share_count ?? -1;
        case "view":
          return r.view_count ?? -1;
        case "newest":
          return r.published_at ? new Date(r.published_at).getTime() : 0;
        default:
          return engagement(r);
      }
    };
    return out.sort((a, b) => val(b) - val(a));
  }, [rows, langFilter, kwFilter, sortKey, search]);

  const totals = useMemo(() => {
    const t = { posts: filtered.length, vi: 0, like: 0, comment: 0, share: 0, view: 0, min: "", max: "" };
    for (const r of filtered) {
      if (isVi(r)) t.vi++;
      t.like += r.like_count ?? 0;
      t.comment += r.comment_count ?? 0;
      t.share += r.share_count ?? 0;
      t.view += r.view_count ?? 0;
      if (r.published_at) {
        if (!t.min || r.published_at < t.min) t.min = r.published_at;
        if (!t.max || r.published_at > t.max) t.max = r.published_at;
      }
    }
    return t;
  }, [filtered]);

  const langCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.lang, (m.get(r.lang) ?? 0) + 1);
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const scannedKw = useMemo(
    () => new Set((job?.keywords ?? []).map((k) => k.replace(/^#+/, "").replace(/\s+/g, "").toLowerCase())),
    [job],
  );

  const hashtagStats = useMemo(() => {
    const m = new Map<string, { tag: string; posts: number; vi: number; like: number; comment: number; share: number; view: number }>();
    for (const r of filtered) {
      for (const tag of r.hashtags) {
        const s = m.get(tag) ?? { tag, posts: 0, vi: 0, like: 0, comment: 0, share: 0, view: 0 };
        s.posts++;
        if (isVi(r)) s.vi++;
        s.like += r.like_count ?? 0;
        s.comment += r.comment_count ?? 0;
        s.share += r.share_count ?? 0;
        s.view += r.view_count ?? 0;
        m.set(tag, s);
      }
    }
    return Array.from(m.values()).sort((a, b) => b.posts - a.posts || b.like + b.comment - (a.like + a.comment));
  }, [filtered]);

  const related = useMemo(() => job?.related ?? [], [job]);

  const tagStatus = (tag: string) => (scannedKw.has(tag) ? "Đang quét" : known.has(tag) ? "Đã có trong danh mục" : "Mới");

  const totalUsd = (job?.runs ?? []).reduce((a, r) => a + (r.usageUsd ?? 0), 0);

  // ---------------- Đề xuất hashtag ----------------
  function buildTarget(tag: string): ProposalTarget {
    const posts = rows
      .filter((r) => r.hashtags.includes(tag))
      .sort((a, b) => engagement(b) - engagement(a));
    return {
      hashtag: tag,
      platform: actors.find((a) => a.id === job?.actorId)?.platform ?? "",
      sourceLogId: job?.logId ?? null,
      postCount: posts.length,
      posts: posts.slice(0, 10).map((r) => ({
        url: r.post_url,
        text: r.text.slice(0, 200),
        like: r.like_count,
        comment: r.comment_count,
        published: r.published_at,
      })),
    };
  }

  // ---------------- Xuất Excel ----------------
  async function onExport() {
    if (!job) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import("exceljs");
    const ExcelJS = mod.default ?? mod;
    const wb = new ExcelJS.Workbook();
    wb.creator = "VPHA – Quét thử";
    wb.created = new Date();

    const ws = wb.addWorksheet("Bài viết", { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = [
      { header: "STT", key: "stt", width: 6 },
      { header: "Nền tảng", key: "platform", width: 11 },
      { header: "Từ khóa quét", key: "keywords", width: 18 },
      { header: "Ngày đăng", key: "published", width: 18, style: { numFmt: "dd/mm/yyyy hh:mm" } },
      { header: "Ngôn ngữ", key: "lang", width: 12 },
      { header: "Nội dung", key: "text", width: 60 },
      { header: "Hashtag", key: "hashtags", width: 35 },
      { header: "Like", key: "like", width: 10 },
      { header: "Bình luận", key: "comment", width: 10 },
      { header: "Chia sẻ", key: "share", width: 10 },
      { header: "Lượt xem", key: "view", width: 12 },
      { header: "Lượt lưu", key: "save", width: 10 },
      { header: "Tổng tương tác (like+bình luận+chia sẻ)", key: "eng", width: 14 },
      { header: "Quảng cáo", key: "ad", width: 10 },
      { header: "Link bài", key: "url", width: 45 },
      { header: "Mã tác giả (đã băm)", key: "author", width: 20 },
      { header: "Mã bài", key: "postid", width: 22 },
    ];
    filtered.forEach((r, i) => {
      ws.addRow({
        stt: i + 1,
        platform: platformVi(r.platform),
        keywords: r.keywords.join(", "),
        published: r.published_at ? new Date(r.published_at) : null,
        lang: LANG_VI[r.lang] ?? r.lang,
        text: r.text,
        hashtags: r.hashtags.map((h) => "#" + h).join(" "),
        like: r.like_count,
        comment: r.comment_count,
        share: r.share_count,
        view: r.view_count,
        save: r.save_count,
        eng: engagement(r),
        ad: r.is_ad ? "Có" : "",
        url: { text: r.post_url, hyperlink: r.post_url },
        author: r.author_hash ? r.author_hash.slice(0, 16) : "",
        postid: r.native_post_id,
      });
    });
    ws.getRow(1).font = { bold: true };
    ws.getColumn("text").alignment = { wrapText: true, vertical: "top" };
    ws.autoFilter = { from: "A1", to: "Q1" };

    const wh = wb.addWorksheet("Hashtag đi kèm", { views: [{ state: "frozen", ySplit: 1 }] });
    wh.columns = [
      { header: "Hashtag", key: "tag", width: 28 },
      { header: "Trạng thái", key: "status", width: 22 },
      { header: "Số bài", key: "posts", width: 10 },
      { header: "Số bài tiếng Việt", key: "vi", width: 14 },
      { header: "Tổng like", key: "like", width: 12 },
      { header: "Tổng bình luận", key: "comment", width: 14 },
      { header: "Tổng chia sẻ", key: "share", width: 12 },
      { header: "Tổng lượt xem", key: "view", width: 14 },
    ];
    hashtagStats.forEach((s) => wh.addRow({ ...s, tag: "#" + s.tag, status: tagStatus(s.tag) }));
    wh.getRow(1).font = { bold: true };
    wh.autoFilter = { from: "A1", to: "H1" };

    if (related.length) {
      const wr = wb.addWorksheet("Hashtag liên quan", { views: [{ state: "frozen", ySplit: 1 }] });
      wr.columns = [
        { header: "Hashtag", key: "tag", width: 28 },
        { header: "Trạng thái", key: "status", width: 22 },
        { header: "Thông tin từ nền tảng", key: "info", width: 30 },
        { header: "Gợi ý từ từ khóa", key: "keywords", width: 30 },
      ];
      related.forEach((r) =>
        wr.addRow({ tag: "#" + r.tag, status: tagStatus(r.tag), info: r.info ?? "", keywords: r.keywords.join(", ") }),
      );
      wr.getRow(1).font = { bold: true };
      wr.autoFilter = { from: "A1", to: "D1" };
    }

    const wi = wb.addWorksheet("Thông tin");
    wi.columns = [
      { header: "Mục", key: "k", width: 30 },
      { header: "Giá trị", key: "v", width: 80 },
    ];
    const langLabel = { vi: "Chỉ tiếng Việt", vi_unknown: "Tiếng Việt + chưa rõ ngôn ngữ", all: "Tất cả ngôn ngữ" }[langFilter];
    [
      ["Công cụ", actors.find((a) => a.id === job.actorId)?.label ?? job.actorId],
      ["Actor Apify", job.actorId],
      ["Từ khóa", job.keywords.join(", ")],
      ["Số bài tối đa mỗi từ khóa", job.perKeyword],
      ["Thời điểm quét", new Date(job.createdAt).toLocaleString("vi-VN")],
      ["Thời điểm xuất file", new Date().toLocaleString("vi-VN")],
      ["Bộ lọc khi xuất", `${langLabel}${kwFilter ? "; từ khóa: " + kwFilter : ""}${search ? "; tìm: " + search : ""}`],
      ["Số bài trong file", filtered.length],
      ["Tổng số bài lấy về (trước lọc)", rows.length],
      ["Chi phí Apify thực tế (USD)", Math.round(totalUsd * 1000) / 1000],
      ["Mã các lần chạy Apify", job.runs.map((r) => `${r.keyword}: ${r.runId}`).join("; ")],
      ["Lưu ý", "File không chứa tên tài khoản; mã tác giả đã băm một chiều. Không chia sẻ công khai. Số like/bình luận là số tại thời điểm quét."],
    ].forEach(([k, v]) => wi.addRow({ k, v }));
    wi.getRow(1).font = { bold: true };

    const buf = await wb.xlsx.writeBuffer();
    void logExport({ logId: job.logId ?? null });
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const plat = (actors.find((x) => x.id === job.actorId)?.platform ?? "scan").toLowerCase();
    a.download = `quet-thu_${plat}_${stamp}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // ---------------------------------------------------------------
  // Giao diện
  // ---------------------------------------------------------------
  const inputCls =
    "w-full px-3 py-2.5 bg-white border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none";
  const labelCls = "block text-sm font-semibold text-stone-800 mb-1";

  return (
    <div className="space-y-6">
      {/* ================= FORM ================= */}
      <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nền tảng / công cụ</label>
            <select
              value={actorId}
              onChange={(e) => {
                setActorId(e.target.value);
                const a = actors.find((x) => x.id === e.target.value);
                if (a) setPerKeyword(a.defaultPerKeyword);
                if (a?.capabilities?.periods?.length && !a.capabilities.periods.includes(period))
                  setPeriod(a.capabilities.periods.includes(30) ? 30 : a.capabilities.periods[0]);
              }}
              className={inputCls}
            >
              {actors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-stone-500 mt-1">{actor?.note}</p>
          </div>

          <div>
            <label className={labelCls}>
              <KeyRound className="inline w-4 h-4 mr-1 -mt-0.5" /> API key Apify của bạn
            </label>
            <input
              type="password"
              autoComplete="off"
              placeholder="apify_api_..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className={inputCls + " font-mono"}
            />
            <label className="flex items-center gap-2 mt-1.5 text-xs text-stone-600">
              <input type="checkbox" checked={rememberToken} onChange={(e) => setRememberToken(e.target.checked)} />
              Nhớ key trên máy này (chỉ lưu trong trình duyệt của bạn, không gửi lên cơ sở dữ liệu)
            </label>
          </div>

          <div className="md:col-span-2">
            <label className={labelCls}>Từ khóa / hashtag (mỗi dòng một từ, hoặc cách nhau bằng dấu phẩy)</label>
            <textarea
              rows={3}
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              placeholder={actor?.platform === "FACEBOOK" ? "kẹo khói\n#podgiare" : "vapegiare\npodgiare"}
              className={inputCls}
            />
            <p className="text-xs text-stone-500 mt-1">
              {keywords.length} từ khóa · mỗi từ khóa là một lần quét riêng (tối đa 20).
            </p>
          </div>

          <div>
            <label className={labelCls}>Số bài tối đa mỗi từ khóa</label>
            {actor?.perKeywordFixed ? (
              <p className="text-sm text-stone-700 py-2.5">{actor.perKeywordFixed}</p>
            ) : (
              <>
                <input
                  type="number"
                  min={actor?.minPerKeyword ?? 1}
                  max={actor?.maxPerKeyword}
                  value={perKeyword}
                  onChange={(e) => setPerKeyword(Number(e.target.value))}
                  className={inputCls}
                />
                <p className="text-xs text-stone-500 mt-1">
                  {actor?.minPerKeyword ? `Tối thiểu ${actor.minPerKeyword}, t` : "T"}ối đa {actor?.maxPerKeyword}.
                </p>
              </>
            )}
          </div>

          {(caps.sortOrder || caps.dateRange || !!caps.periods?.length) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {caps.sortOrder && (
                <div>
                  <label className={labelCls}>Thứ tự</label>
                  <select value={searchType} onChange={(e) => setSearchType(e.target.value as "top" | "latest")} className={inputCls}>
                    <option value="top">Nổi bật</option>
                    <option value="latest">Mới nhất</option>
                  </select>
                </div>
              )}
              {caps.dateRange && (
                <>
                  <div>
                    <label className={labelCls}>Từ ngày</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Đến ngày</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
                  </div>
                </>
              )}
              {!!caps.periods?.length && (
                <div>
                  <label className={labelCls}>Số liệu trong</label>
                  <select value={period} onChange={(e) => setPeriod(Number(e.target.value))} className={inputCls}>
                    {caps.periods.map((d) => (
                      <option key={d} value={d}>
                        {d} ngày gần nhất
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            onClick={onStart}
            disabled={busy !== null}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold disabled:opacity-50"
          >
            {busy === "start" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Bắt đầu quét
          </button>
          <p className="text-xs text-stone-500">
            Ước tính tối đa ~{estUsd.toFixed(2)} USD trên tài khoản Apify của bạn (theo giá gói miễn phí; gói trả phí rẻ hơn).
          </p>
        </div>

        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-stone-600 font-medium inline-flex items-center gap-1">
            <Link2 className="w-4 h-4" /> Đã chạy trên Apify? Dán mã lần quét để xem kết quả tại đây
          </summary>
          <div className="mt-2 flex flex-col sm:flex-row gap-2">
            <input
              value={importRef}
              onChange={(e) => setImportRef(e.target.value)}
              placeholder="Mã lần quét hoặc link console.apify.com/.../runs/..."
              className={inputCls}
            />
            <button
              onClick={onImport}
              disabled={busy !== null}
              className="px-4 py-2.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 font-semibold disabled:opacity-50"
            >
              {busy === "import" ? "Đang tìm…" : "Thêm"}
            </button>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Chọn đúng công cụ ở trên trước khi thêm. Từ khóa đầu tiên trong ô từ khóa (nếu có) sẽ được dùng làm nhãn.
          </p>
        </details>

        {error && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-800 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
          </div>
        )}
      </section>

      {/* ================= TIẾN ĐỘ ================= */}
      {job && (
        <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 md:p-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <h2 className="font-bold text-stone-900 mr-auto">
              Tiến độ · {actors.find((a) => a.id === job.actorId)?.label ?? job.actorId}
            </h2>
            {anyRunning && (
              <button
                onClick={onAbort}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-300 text-amber-800 bg-amber-50 text-sm font-semibold"
              >
                <Square className="w-3.5 h-3.5" /> Dừng
              </button>
            )}
            {allDone && (
              <button
                onClick={() => loadResults(job)}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-300 text-sm font-semibold"
              >
                <RefreshCw className={"w-3.5 h-3.5 " + (busy === "fetch" ? "animate-spin" : "")} /> Tải lại kết quả
              </button>
            )}
            <button onClick={onClear} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-300 text-sm">
              <Trash2 className="w-3.5 h-3.5" /> Xóa
            </button>
          </div>

          {(anyRunning || (allDone && job.rows === null)) && !token && (
            <p className="text-sm text-amber-800 bg-amber-50 rounded-lg p-3 mb-3">
              Nhập lại API key ở trên để tiếp tục theo dõi và tải kết quả.
            </p>
          )}
          {anyRunning && (
            <p className="text-sm text-blue-800 bg-blue-50 rounded-lg p-3 mb-3 flex gap-2">
              <Loader2 className="w-4 h-4 animate-spin shrink-0 mt-0.5" />
              Apify đang quét. Bạn có thể tắt màn hình hoặc chuyển ứng dụng; mở lại trang này là tiếp tục.
            </p>
          )}
          {busy === "fetch" && (
            <p className="text-sm text-stone-700 bg-stone-50 rounded-lg p-3 mb-3 flex gap-2">
              <Loader2 className="w-4 h-4 animate-spin shrink-0 mt-0.5" /> Đang tải và đọc kết quả…
            </p>
          )}

          <ul className="divide-y divide-stone-100">
            {job.runs.map((r, i) => {
              const st = STATUS_VI[r.status] ?? { label: r.status, cls: "bg-stone-100 text-stone-700" };
              return (
                <li key={r.runId || i} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="font-semibold text-stone-900">{r.keyword}</span>
                  <span className={"px-2 py-0.5 rounded-full text-xs font-semibold " + st.cls}>{st.label}</span>
                  <span className="text-stone-500">{r.itemCount !== null ? `${fmt(r.itemCount)} bài` : ""}</span>
                  {r.usageUsd !== null && <span className="text-stone-400 text-xs">{r.usageUsd.toFixed(3)} USD</span>}
                  {r.runId && (
                    <a
                      href={`https://console.apify.com/actors/runs/${r.runId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-emerald-700 inline-flex items-center gap-1 ml-auto"
                    >
                      Xem trên Apify <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {r.error && <span className="basis-full text-xs text-red-700">{r.error}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ================= KẾT QUẢ ================= */}
      {job?.rows && (
        <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 md:p-6">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <h2 className="font-bold text-stone-900 mr-auto flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" /> Kết quả
            </h2>
            <button
              onClick={onExport}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> Xuất Excel ({filtered.length} bài)
            </button>
          </div>

          {job.truncated && (
            <p className="text-xs text-amber-800 bg-amber-50 rounded p-2 mb-3">
              Chỉ hiển thị 5.000 bài đầu tiên. Muốn xem hết, hãy quét ít từ khóa hơn mỗi lần.
            </p>
          )}

          {/* Số liệu tổng */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
            {[
              ["Bài (sau lọc)", fmt(totals.posts)],
              ["Bài tiếng Việt", fmt(totals.vi)],
              ["Tổng like", fmt(totals.like)],
              ["Tổng bình luận", fmt(totals.comment)],
              ["Tổng chia sẻ", fmt(totals.share)],
              ["Tổng lượt xem", totals.view ? fmt(totals.view) : "–"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-stone-50 border border-stone-200 p-3">
                <div className="text-[11px] text-stone-500">{k}</div>
                <div className="text-lg font-bold text-stone-900 tabular-nums">{v}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-stone-500 mb-4">
            Lấy về {fmt(rows.length)} bài (đã gộp bài trùng giữa các từ khóa)
            {job.skipped ? `, bỏ qua ${job.skipped} mục không đọc được` : ""}. Ngôn ngữ:{" "}
            {langCounts.map(([l, n]) => `${LANG_VI[l] ?? l} ${n}`).join(" · ")}.
            {totals.min && ` Ngày đăng từ ${dateVi(totals.min)} đến ${dateVi(totals.max)}.`}
            {totalUsd > 0 && ` Chi phí Apify: ${totalUsd.toFixed(3)} USD.`}
          </p>

          {/* Bộ lọc */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
            <select value={langFilter} onChange={(e) => { setLangFilter(e.target.value as LangFilter); setShown(PAGE); }} className={inputCls}>
              <option value="vi_unknown">Tiếng Việt + chưa rõ ngôn ngữ</option>
              <option value="vi">Chỉ tiếng Việt</option>
              <option value="all">Tất cả ngôn ngữ</option>
            </select>
            <select value={kwFilter} onChange={(e) => { setKwFilter(e.target.value); setShown(PAGE); }} className={inputCls}>
              <option value="">Mọi từ khóa</option>
              {job.keywords.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className={inputCls}>
              <option value="engagement">Tương tác cao nhất (like + bình luận + chia sẻ)</option>
              <option value="like">Nhiều like nhất</option>
              <option value="comment">Nhiều bình luận nhất</option>
              <option value="share">Nhiều chia sẻ nhất</option>
              <option value="view">Nhiều lượt xem nhất</option>
              <option value="newest">Mới đăng nhất</option>
            </select>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShown(PAGE); }}
              placeholder="Tìm trong nội dung / hashtag"
              className={inputCls}
            />
          </div>

          {/* Tab */}
          <div className="flex gap-1 border-b border-stone-200 mb-3">
            {[
              ["posts", `Bài viết (${filtered.length})`],
              ["hashtags", `Hashtag đi kèm (${hashtagStats.length + related.length})`],
            ].map(([k, l]) => (
              <button
                key={k}
                onClick={() => setTab(k as "posts" | "hashtags")}
                className={
                  "px-3 py-2 text-sm font-semibold border-b-2 -mb-px " +
                  (tab === k ? "border-emerald-600 text-emerald-800" : "border-transparent text-stone-500")
                }
              >
                {l}
              </button>
            ))}
          </div>

          {tab === "posts" ? (
            filtered.length === 0 ? (
              <p className="text-sm text-stone-500 py-6 text-center">Không có bài nào khớp bộ lọc.</p>
            ) : (
              <>
                <ul className="space-y-2">
                  {filtered.slice(0, shown).map((r, i) => (
                    <li key={r.platform + r.native_post_id} className="rounded-xl border border-stone-200 p-3">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 mb-1">
                        <span className="font-bold text-stone-700">#{i + 1}</span>
                        <span>{platformVi(r.platform)}</span>
                        <span>{dateVi(r.published_at)}</span>
                        <span>{LANG_VI[r.lang] ?? r.lang}</span>
                        {r.is_ad && <span className="text-amber-700 font-semibold">Quảng cáo</span>}
                        <span className="text-stone-400">từ khóa: {r.keywords.join(", ")}</span>
                      </div>
                      <p className="text-sm text-stone-800 whitespace-pre-line line-clamp-4">{r.text || "(không có nội dung chữ)"}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm tabular-nums">
                        <span>👍 {fmt(r.like_count)}</span>
                        <span>💬 {fmt(r.comment_count)}</span>
                        <span>↗ {fmt(r.share_count)}</span>
                        {r.view_count !== null && <span>👁 {fmt(r.view_count)}</span>}
                        <a
                          href={r.post_url}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-auto inline-flex items-center gap-1 text-emerald-700 font-semibold"
                        >
                          Mở bài <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
                {shown < filtered.length && (
                  <button
                    onClick={() => setShown((s) => s + PAGE)}
                    className="mt-3 w-full py-2.5 rounded-lg border border-stone-300 text-sm font-semibold"
                  >
                    Xem thêm ({filtered.length - shown} bài)
                  </button>
                )}
              </>
            )
          ) : (
            <div>
              <p className="text-xs text-stone-500 mb-2">
                Các hashtag xuất hiện cùng trong những bài đang lọc. Hashtag <strong>“Mới”</strong> chưa có trong danh mục
                của dự án — ứng viên để đề xuất (kèm bài minh chứng).
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-stone-500 border-b border-stone-200">
                      <th className="py-2 pr-3">Hashtag</th>
                      <th className="py-2 pr-3">Trạng thái</th>
                      <th className="py-2 pr-3 text-right">Số bài</th>
                      <th className="py-2 pr-3 text-right">Tiếng Việt</th>
                      <th className="py-2 pr-3 text-right">Like</th>
                      <th className="py-2 pr-3 text-right">Bình luận</th>
                      <th className="py-2 pr-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {hashtagStats.slice(0, 200).map((s) => {
                      const status = tagStatus(s.tag);
                      return (
                        <tr key={s.tag} className="border-b border-stone-100">
                          <td className="py-1.5 pr-3 font-medium">
                            <button
                              className="inline-flex items-center gap-0.5 hover:underline"
                              onClick={() => { setSearch(s.tag); setTab("posts"); setShown(PAGE); }}
                              title="Xem các bài có hashtag này"
                            >
                              <Hash className="w-3.5 h-3.5 text-stone-400" />
                              {s.tag}
                            </button>
                          </td>
                          <td className="py-1.5 pr-3">
                            <span
                              className={
                                "px-2 py-0.5 rounded-full text-xs font-semibold " +
                                (status === "Mới"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : status === "Đang quét"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-stone-100 text-stone-600")
                              }
                            >
                              {status}
                            </span>
                          </td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(s.posts)}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(s.vi)}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(s.like)}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(s.comment)}</td>
                          <td className="py-1.5 pr-3 text-right">
                            {status === "Mới" &&
                              (proposedTags.has(s.tag) ? (
                                <span className="text-xs text-emerald-700 font-semibold">Đã đề xuất</span>
                              ) : (
                                <button
                                  onClick={() => setProposing(buildTarget(s.tag))}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800"
                                >
                                  Đề xuất
                                </button>
                              ))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {related.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold text-stone-800 mb-1">Hashtag liên quan do nền tảng gợi ý ({related.length})</h3>
                  <p className="text-xs text-stone-500 mb-2">
                    Lấy từ công cụ thống kê hashtag, không gắn với bài cụ thể. Số bài là số nền tảng công bố (toàn cầu
                    hoặc theo khu vực của công cụ). Hashtag <strong>“Mới”</strong> nên quét thử thêm để có bài minh chứng
                    trước khi đề xuất.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-stone-500 border-b border-stone-200">
                          <th className="py-2 pr-3">Hashtag</th>
                          <th className="py-2 pr-3">Trạng thái</th>
                          <th className="py-2 pr-3">Thông tin</th>
                          <th className="py-2 pr-3">Gợi ý từ</th>
                          <th className="py-2 pr-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {related.slice(0, 300).map((r) => {
                          const status = tagStatus(r.tag);
                          return (
                            <tr key={r.tag} className="border-b border-stone-100">
                              <td className="py-1.5 pr-3 font-medium">
                                <span className="inline-flex items-center gap-0.5">
                                  <Hash className="w-3.5 h-3.5 text-stone-400" />
                                  {r.tag}
                                </span>
                              </td>
                              <td className="py-1.5 pr-3">
                                <span
                                  className={
                                    "px-2 py-0.5 rounded-full text-xs font-semibold " +
                                    (status === "Mới"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : status === "Đang quét"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-stone-100 text-stone-600")
                                  }
                                >
                                  {status}
                                </span>
                              </td>
                              <td className="py-1.5 pr-3 text-stone-600 tabular-nums">{r.info ?? "–"}</td>
                              <td className="py-1.5 pr-3 text-stone-500">{r.keywords.join(", ")}</td>
                              <td className="py-1.5 pr-3 text-right">
                                {status === "Mới" &&
                                  (proposedTags.has(r.tag) ? (
                                    <span className="text-xs text-emerald-700 font-semibold">Đã đề xuất</span>
                                  ) : (
                                    <button
                                      onClick={() => setProposing(buildTarget(r.tag))}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800"
                                    >
                                      Đề xuất
                                    </button>
                                  ))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}
      {proposing && (
        <ProposalDialog
          target={proposing}
          onClose={() => setProposing(null)}
          onSubmitted={(tag) => {
            setProposedTags((s) => new Set(s).add(tag));
            setProposing(null);
          }}
        />
      )}
    </div>
  );
}
