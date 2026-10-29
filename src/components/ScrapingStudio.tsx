"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Play,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ListTodo,
  Zap,
  SignalHigh,
  FlaskConical,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STATUS_LABEL: Record<string, string> = {
  PLANNED: "LÊN KẾ HOẠCH",
  QUEUED: "TRONG HÀNG ĐỢI",
  RUNNING: "ĐANG THU THẬP",
  SUCCESS: "HOÀN THÀNH",
  FAILED: "THẤT BẠI",
  PARTIAL_SUCCESS: "THÀNH CÔNG MỘT PHẦN",
};

type ScheduleMode = "IMMEDIATE" | "QUEUE";

export default function ScrapingStudio({
  user,
  allowedActors,
  allowedGroups,
  hashtagsByGroup,
}: {
  user: any;
  allowedActors: any[];
  allowedGroups: any[];
  hashtagsByGroup: Record<string, any[]>;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [selectedActor, setSelectedActor] = useState(
    allowedActors[0]?.actor_id || "",
  );
  const [selectedGroup, setSelectedGroup] = useState(
    allowedGroups[0]?.group_id || "",
  );
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [maxItems, setMaxItems] = useState<number>(100);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("IMMEDIATE");
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [priority, setPriority] = useState<number>(1);
  const [apifyTokenOverride, setApifyTokenOverride] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    const defaultQueue = new Date(Date.now() + 10 * 60 * 1000 - tzOffset)
      .toISOString()
      .slice(0, 16);
    setScheduledAt(defaultQueue);
  }, []);

  const handleGroupChange = (groupId: string) => {
    setSelectedGroup(groupId);
    const tags = hashtagsByGroup[groupId] || [];
    setSelectedHashtags(tags.map((t) => t.hashtag_text));
  };

  const handleToggleHashtag = (tag: string) => {
    if (selectedHashtags.includes(tag)) {
      setSelectedHashtags((prev) => prev.filter((t) => t !== tag));
    } else {
      setSelectedHashtags((prev) => [...prev, tag]);
    }
  };

  const currentActor = allowedActors.find((a) => a.actor_id === selectedActor);
  const availableHashtags = selectedGroup
    ? hashtagsByGroup[selectedGroup] || []
    : [];

  const findOverlappingSuccessRuns = (
    history: any[],
    hashtags: string[],
    actorId: string,
  ) => {
    return history.filter((run) => {
      if (run.status !== "SUCCESS") return false;
      if (run.actor_id !== actorId) return false;
      const qp = run.query_parameters;
      if (!qp?.hashtags) return false;
      return hashtags.some((h) => (qp.hashtags as string[]).includes(h));
    });
  };

  const handleStartRun = async () => {
    if (!selectedActor) return alert("Vui lòng chọn Công cụ (Actor).");
    if (selectedHashtags.length === 0)
      return alert("Vui lòng chọn ít nhất 1 từ khóa để cào.");
    if (maxItems < 1) return alert("Giới hạn bài viết không hợp lệ.");
    if (scheduleMode === "QUEUE" && !scheduledAt)
      return alert("Vui lòng chọn thời gian đưa vào hàng đợi.");

    setLoading(true);

    try {
      const { data: historyData, error: histError } = await supabase
        .from("collection_runs")
        .select(
          "run_id, actor_id, status, query_parameters, started_at, items_count",
        )
        .eq("researcher_code", user.email)
        .eq("status", "SUCCESS")
        .eq("actor_id", selectedActor)
        .order("started_at", { ascending: false });

      if (!histError && historyData && historyData.length > 0) {
        const overlap = findOverlappingSuccessRuns(
          historyData,
          selectedHashtags,
          selectedActor,
        );
        if (overlap.length > 0) {
          const lastRun = overlap[0];
          const tagOverlap = selectedHashtags
            .filter((h) =>
              (lastRun.query_parameters?.hashtags as string[])?.includes(h),
            )
            .join(", ");
          const when = lastRun.started_at
            ? new Date(lastRun.started_at).toLocaleString("vi-VN")
            : "trước đó";
          const confirmed = confirm(
            `⚠️ Cảnh báo trùng lặp:\n` +
              `Bạn đã thu thập THÀNH CÔNG các từ khóa [${tagOverlap}] bằng Công cụ ${selectedActor} lúc ${when}.\n` +
              `Số bài đã thu: ${lastRun.items_count ?? 0}.\n\n` +
              `Dữ liệu đã có định hướng, lặp lại sẽ sinh chi phí không cần thiết.\n` +
              `Bạn vẫn muốn tạo kế hoạch mới?`,
          );
          if (!confirmed) {
            setLoading(false);
            return;
          }
        }
      }

      const nowIso = new Date().toISOString();
      const isImmediate = scheduleMode === "IMMEDIATE";
      // Luôn QUEUED: worker chỉ dispatch QUEUED/PLANNED. "Chạy ngay" = scheduled_at = now,
      // worker sẽ gửi lên Apify ở tick kế tiếp (≤15s) và tự chuyển sang RUNNING.
      const targetStatus = "QUEUED";

      const insertPayload: any = {
        actor_id: selectedActor,
        platform: currentActor?.platform || "Unknown",
        researcher_code: user.email,
        status: targetStatus,
        items_count: 0,
        priority: priority,
        scheduled_at: isImmediate
          ? nowIso
          : new Date(scheduledAt).toISOString(),
        started_at: null,
        query_parameters: {
          hashtags: selectedHashtags,
          maxItems: maxItems,
          group_id: selectedGroup,
          schedule_mode: scheduleMode,
          note: apifyTokenOverride
            ? "[test] token tạm thời được đính kèm trên dòng kế hoạch."
            : null,
        },
      };
      if (apifyTokenOverride && apifyTokenOverride.trim().length > 6) {
        insertPayload.apify_api_token_override = apifyTokenOverride.trim();
      }

      const { data, error } = await supabase
        .from("collection_runs")
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;

      alert(
        isImmediate
          ? "✅ Đã gửi lệnh thu thập NGAY LẬP TỨC thành công!\n" +
              (apifyTokenOverride.trim()
                ? "(Kèm API Key tạm thời cho kế hoạch này.)\n"
                : "(Chưa kèm API Key. Bạn cần điền trên màn hình này hoặc vào Cấu hình lưu token chung.)\n") +
              "Tiếp theo: chạy Worker (node scripts/worker.js --once) trên terminal để pick kế hoạch → gọi Apify → lưu kết quả."
          : `⏱️ Đưa vào HÀNG ĐỢI thành công!\n` +
              `Chạy lúc: ${new Date(scheduledAt).toLocaleString("vi-VN")}\n` +
              (apifyTokenOverride.trim()
                ? "(Kèm API Key tạm thời.)"
                : "(Chưa có API Key.)"),
      );

      setSelectedHashtags([]);
      setMaxItems(100);

      router.refresh();
    } catch (err: any) {
      alert("Lỗi khởi tạo: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
          <h2 className="text-lg font-bold text-stone-900 mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" /> Lên Kế Hoạch Thu Thập
          </h2>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">
                1. Chọn Nền tảng (Công cụ)
              </label>
              {allowedActors.length === 0 ? (
                <div className="p-3 bg-red-50 text-red-600 text-xs rounded border border-red-100">
                  Bạn chưa được phân công Công cụ nào.
                </div>
              ) : (
                <select
                  value={selectedActor}
                  onChange={(e) => setSelectedActor(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {allowedActors.map((a) => (
                    <option key={a.actor_id} value={a.actor_id}>
                      {a.platform} - {a.actor_name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">
                2. Chọn Nhóm Từ khóa
              </label>
              {allowedGroups.length === 0 ? (
                <div className="p-3 bg-red-50 text-red-600 text-xs rounded border border-red-100">
                  Bạn chưa được phân công Nhóm nào.
                </div>
              ) : (
                <select
                  value={selectedGroup}
                  onChange={(e) => handleGroupChange(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="" disabled>
                    -- Chọn một nhóm --
                  </option>
                  {allowedGroups.map((g) => (
                    <option key={g.group_id} value={g.group_id}>
                      {g.group_name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedGroup && (
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">
                  3. Từ khóa cụ thể ({selectedHashtags.length}/
                  {availableHashtags.length})
                </label>
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2">
                  {availableHashtags.length === 0 ? (
                    <div className="text-xs text-stone-500 italic text-center">
                      Không có từ khóa nào trong nhóm này.
                    </div>
                  ) : (
                    availableHashtags.map((tag) => (
                      <label
                        key={tag.hashtag_id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-stone-100 p-1.5 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={selectedHashtags.includes(tag.hashtag_text)}
                          onChange={() => handleToggleHashtag(tag.hashtag_text)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-stone-800">
                          {tag.hashtag_text}
                        </span>
                        {tag.keyword_track === "FIXED" && (
                          <span className="text-[10px] bg-red-100 text-red-700 px-1.5 rounded">
                            FIXED
                          </span>
                        )}
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">
                4. Giới hạn bài viết tối đa (Max Items)
              </label>
              <input
                type="number"
                value={maxItems}
                onChange={(e) => setMaxItems(parseInt(e.target.value) || 0)}
                className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <div className="text-xs text-stone-500 mt-1">
                Nên đặt giới hạn để kiểm soát chi phí Apify.
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100">
              <p className="block text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2">
                🔑 5. API Key TEST nhanh (Lưu tạm trên kế hoạch này)
              </p>
              <div className="space-y-2">
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="apify_api_XXXXXXXX (để trống → dùng token chung từ Cấu hình)"
                  value={apifyTokenOverride}
                  onChange={(e) => setApifyTokenOverride(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-400 outline-none"
                />
                <div className="text-[11px] text-stone-500 leading-relaxed">
                  ✅ <b>TEST NHANH</b>: Token chỉ lưu tạm trên dòng kế hoạch
                  này. <br />
                  📌 <b>CHUẨN SAU NÀY</b>: Admin → Cấu hình hệ thống → lưu
                  APIFY_API_TOKEN dùng chung.
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100">
              <p className="block text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-indigo-500" /> 6. Lên lịch
                thực hiện
              </p>

              <div className="space-y-3">
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${scheduleMode === "IMMEDIATE" ? "bg-emerald-50 border-emerald-200 shadow-sm" : "bg-stone-50 border-stone-200 hover:bg-stone-100"}`}
                >
                  <input
                    type="radio"
                    name="mode"
                    className="mt-0.5 text-emerald-600"
                    checked={scheduleMode === "IMMEDIATE"}
                    onChange={() => setScheduleMode("IMMEDIATE")}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-bold text-stone-900 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-500" /> Chạy NGAY LẬP
                      TỨC
                    </div>
                    <div className="text-[11px] text-stone-500 mt-0.5">
                      Gửi lệnh cho Apify ngay sau khi nhấn nút (mock).
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${scheduleMode === "QUEUE" ? "bg-indigo-50 border-indigo-200 shadow-sm" : "bg-stone-50 border-stone-200 hover:bg-stone-100"}`}
                >
                  <input
                    type="radio"
                    name="mode"
                    className="mt-0.5 text-indigo-600"
                    checked={scheduleMode === "QUEUE"}
                    onChange={() => setScheduleMode("QUEUE")}
                  />
                  <div className="flex-1 space-y-2">
                    <div className="text-sm font-bold text-stone-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-500" /> Đưa vào Hàng
                      đợi (Queue)
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                          Thời gian chạy
                        </label>
                        <input
                          type="datetime-local"
                          disabled={scheduleMode !== "QUEUE"}
                          value={scheduledAt}
                          onChange={(e) => setScheduledAt(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-stone-300 rounded-lg bg-white disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-500 mb-1 flex items-center gap-1">
                          <SignalHigh className="w-3 h-3" /> Ưu tiên
                        </label>
                        <select
                          disabled={scheduleMode !== "QUEUE"}
                          value={priority}
                          onChange={(e) =>
                            setPriority(parseInt(e.target.value))
                          }
                          className="w-full px-2 py-1.5 text-xs border border-stone-300 rounded-lg bg-white disabled:opacity-60"
                        >
                          <option value={0}>0 - Thấp</option>
                          <option value={1}>1 - Bình thường</option>
                          <option value={2}>2 - Cao</option>
                          <option value={3}>3 - Khẩn cấp</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <button
              onClick={handleStartRun}
              disabled={
                loading ||
                allowedActors.length === 0 ||
                allowedGroups.length === 0
              }
              className={`w-full flex items-center justify-center gap-2 py-3 ${scheduleMode === "IMMEDIATE" ? "bg-emerald-700 hover:bg-emerald-800" : "bg-indigo-700 hover:bg-indigo-800"} disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-all active:scale-95`}
            >
              {scheduleMode === "IMMEDIATE" ? (
                <>
                  <Zap className="w-5 h-5" />{" "}
                  {loading ? "Đang gửi..." : "Chạy Thu thập NGAY"}
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5" />{" "}
                  {loading ? "Đang lên lịch..." : "Thêm vào Hàng đợi"}
                </>
              )}
            </button>

            <p className="text-[11px] text-stone-500 text-center">
              💡 Hệ thống sẽ cảnh báo nếu từ khóa &amp; công cụ này đã được bạn
              thu thập thành công trước đó.
            </p>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 min-h-full">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" /> Bảng Theo dõi
              Tiến trình
            </h2>
            <div className="flex flex-wrap gap-2">
              <LegendBadge
                color="bg-amber-100 text-amber-700"
                icon={<Clock className="w-3 h-3" />}
                label="Kế hoạch"
              />
              <LegendBadge
                color="bg-indigo-100 text-indigo-700"
                icon={<ListTodo className="w-3 h-3" />}
                label="Queue"
              />
              <LegendBadge
                color="bg-blue-100 text-blue-700"
                icon={<Activity className="w-3 h-3 animate-pulse" />}
                label="Đang chạy"
              />
              <LegendBadge
                color="bg-green-100 text-green-700"
                icon={<CheckCircle2 className="w-3 h-3" />}
                label="Thành công"
              />
              <LegendBadge
                color="bg-red-100 text-red-700"
                icon={<XCircle className="w-3 h-3" />}
                label="Thất bại"
              />
            </div>
          </div>

          {/* Quét thử cho cộng tác viên đã chuyển sang trang riêng */}
          <Link
            href="/dashboard/quet-thu"
            className="mt-6 flex items-center gap-3 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 p-4 text-emerald-900 hover:bg-emerald-100"
          >
            <FlaskConical className="w-5 h-5 text-emerald-700 shrink-0" />
            <span className="text-sm">
              <strong>Quét thử</strong> (dùng API key cá nhân, không ghi DB, xuất Excel) nay ở trang riêng →
            </span>
          </Link>

          <RunHistoryTable userEmail={user.email} />
        </div>
      </div>
    </div>
  );
}

function LegendBadge({
  color,
  icon,
  label,
}: {
  color: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border ${color} border-white/40`}
    >
      {icon} {label}
    </span>
  );
}

function RunHistoryTable({ userEmail }: { userEmail: string }) {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from("collection_runs")
        .select("*")
        .eq("researcher_code", userEmail)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(30);

      if (data) setRuns(data);
      setLoading(false);
    };

    fetchHistory();
    const interval = setInterval(fetchHistory, 5000);
    return () => clearInterval(interval);
  }, [userEmail]);

  const handleRunNow = async (runId: string) => {
    setRuns(
      runs.map((r) =>
        r.run_id === runId
          ? { ...r, status: "RUNNING", started_at: new Date().toISOString() }
          : r,
      ),
    );

    const { error } = await supabase
      .from("collection_runs")
      .update({
        status: "RUNNING",
        started_at: new Date().toISOString(),
      })
      .eq("run_id", runId);

    if (error) {
      alert("Lỗi khi chạy: " + error.message);
    } else {
      alert("Đã bắn lệnh thu thập lên hệ thống (Mockup)!");
    }
  };

  const handleDeleteRun = async (runId: string) => {
    if (!confirm("Bạn có chắc muốn xóa Kế hoạch này?")) return;
    setRuns(runs.filter((r) => r.run_id !== runId));
    const { error } = await supabase
      .from("collection_runs")
      .delete()
      .eq("run_id", runId);
    if (error) alert("Lỗi khi xóa: " + error.message);
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PLANNED: "bg-amber-100 text-amber-700",
      QUEUED: "bg-indigo-100 text-indigo-700",
      RUNNING: "bg-blue-100 text-blue-700",
      SUCCESS: "bg-green-100 text-green-700",
      FAILED: "bg-red-100 text-red-700",
    };
    const icons: Record<string, React.ReactNode> = {
      PLANNED: <Clock className="w-3 h-3" />,
      QUEUED: <ListTodo className="w-3 h-3" />,
      RUNNING: <Activity className="w-3 h-3 animate-pulse" />,
      SUCCESS: <CheckCircle2 className="w-3 h-3" />,
      FAILED: <XCircle className="w-3 h-3" />,
    };
    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${styles[status] ?? "bg-stone-100 text-stone-700"}`}
      >
        {icons[status] ?? <AlertCircle className="w-3 h-3" />}
        {STATUS_LABEL[status] ?? status}
      </span>
    );
  };

  if (loading)
    return (
      <div className="text-sm text-stone-500 text-center py-10">
        Đang tải lịch sử...
      </div>
    );
  if (runs.length === 0)
    return (
      <div className="text-center py-20 border-2 border-dashed border-stone-200 rounded-2xl bg-stone-50">
        <Clock className="w-10 h-10 text-stone-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-stone-500">
          Chưa có kế hoạch thu thập nào.
        </p>
      </div>
    );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-medium text-xs uppercase">
          <tr>
            <th className="px-4 py-3">Công cụ &amp; Cấu hình</th>
            <th className="px-4 py-3">Trạng thái</th>
            <th className="px-4 py-3">Thời gian</th>
            <th className="px-4 py-3 w-20">Ưu tiên</th>
            <th className="px-4 py-3 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {runs.map((run) => {
            const isSuccess = run.status === "SUCCESS";
            const isLocked = isSuccess || run.status === "RUNNING";
            const scheduledTs = run.scheduled_at
              ? new Date(run.scheduled_at)
              : null;
            const startedTs = run.started_at ? new Date(run.started_at) : null;
            return (
              <tr
                key={run.run_id}
                className={`transition-all ${isSuccess ? "opacity-40 grayscale cursor-not-allowed select-none" : "hover:bg-stone-50"} ${run.status === "QUEUED" ? "bg-indigo-50/30" : ""}`}
              >
                <td className="px-4 py-3">
                  <div className="font-semibold text-stone-900 mb-1">
                    {run.platform}{" "}
                    <span className="font-normal text-stone-500 text-[10px]">
                      ({run.actor_id})
                    </span>
                  </div>
                  {run.query_parameters && run.query_parameters.hashtags ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {run.query_parameters.hashtags.map((h: string) => (
                        <span
                          key={h}
                          className="bg-stone-100 border border-stone-200 text-stone-600 px-1.5 py-0.5 rounded text-[10px]"
                        >
                          {h}
                        </span>
                      ))}
                      <span className="text-[10px] text-stone-400 bg-white border border-stone-200 px-1.5 py-0.5 rounded">
                        Max: {run.query_parameters.maxItems}
                      </span>
                      {run.query_parameters.group_id && (
                        <span className="text-[10px] text-stone-500 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                          Nhóm: {run.query_parameters.group_id}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-stone-400 text-xs">N/A</span>
                  )}
                </td>
                <td className="px-4 py-3">{statusBadge(run.status)}</td>
                <td className="px-4 py-3 text-[11px] text-stone-600 font-mono space-y-0.5">
                  {scheduledTs && (
                    <div className="flex items-center gap-1">
                      <ListTodo className="w-3 h-3 text-indigo-400" /> Dự kiến:{" "}
                      {scheduledTs.toLocaleString("vi-VN")}
                    </div>
                  )}
                  {startedTs &&
                    run.status !== "PLANNED" &&
                    run.status !== "QUEUED" && (
                      <div className="flex items-center gap-1">
                        <Activity className="w-3 h-3 text-blue-400" /> Bắt đầu:{" "}
                        {startedTs.toLocaleString("vi-VN")}
                      </div>
                    )}
                </td>
                <td className="px-4 py-3">
                  {run.priority === 3 ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                      3-Cao
                    </span>
                  ) : run.priority === 2 ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
                      2-Bình+
                    </span>
                  ) : run.priority === 1 ? (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-stone-100 text-stone-700">
                      1-Bình
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-stone-50 text-stone-500 border border-stone-200">
                      0-Thấp
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {isSuccess ? (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />{" "}
                      {run.items_count ?? 0} BĐ
                    </span>
                  ) : run.status === "RUNNING" ? (
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-100 inline-flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5 animate-spin" /> Đang
                      chạy
                    </span>
                  ) : run.status === "FAILED" ? (
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-xs font-semibold text-red-600 mr-1">
                        Thất bại
                      </span>
                      <button
                        onClick={() => handleRunNow(run.run_id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5" fill="currentColor" />{" "}
                        Chạy lại
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      {run.status === "QUEUED" || run.status === "PLANNED" ? (
                        <button
                          onClick={() => handleRunNow(run.run_id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                          <Play className="w-3.5 h-3.5" fill="currentColor" />{" "}
                          Chạy
                        </button>
                      ) : null}
                      {!isLocked && (
                        <button
                          onClick={() => handleDeleteRun(run.run_id)}
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Xóa Kế hoạch"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
