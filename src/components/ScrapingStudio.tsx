"use client";

import { useState, useEffect } from "react";
import { Play, Activity, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function ScrapingStudio({ 
  user,
  allowedActors,
  allowedGroups,
  hashtagsByGroup 
}: { 
  user: any;
  allowedActors: any[];
  allowedGroups: any[];
  hashtagsByGroup: Record<string, any[]>;
}) {
  const router = useRouter();
  const supabase = createClient();
  
  const [selectedActor, setSelectedActor] = useState(allowedActors[0]?.actor_id || "");
  const [selectedGroup, setSelectedGroup] = useState(allowedGroups[0]?.group_id || "");
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [maxItems, setMaxItems] = useState<number>(100);
  const [loading, setLoading] = useState(false);

  // Auto-select all hashtags when group changes
  const handleGroupChange = (groupId: string) => {
    setSelectedGroup(groupId);
    const tags = hashtagsByGroup[groupId] || [];
    setSelectedHashtags(tags.map(t => t.hashtag_text));
  };

  const handleToggleHashtag = (tag: string) => {
    if (selectedHashtags.includes(tag)) {
      setSelectedHashtags(prev => prev.filter(t => t !== tag));
    } else {
      setSelectedHashtags(prev => [...prev, tag]);
    }
  };

  const currentActor = allowedActors.find(a => a.actor_id === selectedActor);
  const availableHashtags = selectedGroup ? (hashtagsByGroup[selectedGroup] || []) : [];

  const handleStartRun = async () => {
    if (!selectedActor) return alert("Vui lòng chọn Công cụ (Actor).");
    if (selectedHashtags.length === 0) return alert("Vui lòng chọn ít nhất 1 từ khóa để cào.");
    if (maxItems < 1) return alert("Giới hạn bài viết không hợp lệ.");

    setLoading(true);

    try {
      // Create mockup run in DB
      const { data, error } = await supabase.from("collection_runs").insert({
        actor_id: selectedActor,
        platform: currentActor?.platform || "Unknown",
        researcher_code: user.email,
        status: "PLANNED",
        items_count: 0,
        query_parameters: {
          hashtags: selectedHashtags,
          maxItems: maxItems,
          group_id: selectedGroup
        }
      }).select().single();

      if (error) throw error;
      
      alert("Đã Lưu Kế Hoạch Cào thành công!");
      
      // Xóa form (Chống trùng lặp)
      setSelectedHashtags([]);
      setMaxItems(100);
      
      router.refresh(); // Reload server data to update history table
      
    } catch (err: any) {
      alert("Lỗi khởi tạo: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Control Panel (Left) */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
          <h2 className="text-lg font-bold text-stone-900 mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" /> Lên Kế Hoạch Cào
          </h2>

          <div className="space-y-5">
            {/* 1. Chọn Actor */}
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">1. Chọn Nền tảng (Công cụ)</label>
              {allowedActors.length === 0 ? (
                <div className="p-3 bg-red-50 text-red-600 text-xs rounded border border-red-100">Bạn chưa được phân công Công cụ nào.</div>
              ) : (
                <select 
                  value={selectedActor}
                  onChange={e => setSelectedActor(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {allowedActors.map(a => (
                    <option key={a.actor_id} value={a.actor_id}>{a.platform} - {a.actor_name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* 2. Chọn Group */}
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">2. Chọn Nhóm Từ khóa</label>
              {allowedGroups.length === 0 ? (
                <div className="p-3 bg-red-50 text-red-600 text-xs rounded border border-red-100">Bạn chưa được phân công Nhóm nào.</div>
              ) : (
                <select 
                  value={selectedGroup}
                  onChange={e => handleGroupChange(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="" disabled>-- Chọn một nhóm --</option>
                  {allowedGroups.map(g => (
                    <option key={g.group_id} value={g.group_id}>{g.group_name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* 3. Chọn Hashtags */}
            {selectedGroup && (
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">
                  3. Chọn Từ khóa cụ thể ({selectedHashtags.length}/{availableHashtags.length})
                </label>
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2">
                  {availableHashtags.length === 0 ? (
                    <div className="text-xs text-stone-500 italic text-center">Không có từ khóa nào trong nhóm này.</div>
                  ) : (
                    availableHashtags.map(tag => (
                      <label key={tag.hashtag_id} className="flex items-center gap-2 cursor-pointer hover:bg-stone-100 p-1.5 rounded">
                        <input 
                          type="checkbox" 
                          checked={selectedHashtags.includes(tag.hashtag_text)}
                          onChange={() => handleToggleHashtag(tag.hashtag_text)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-stone-800">{tag.hashtag_text}</span>
                        {tag.keyword_track === 'FIXED' && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 rounded">FIXED</span>}
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 4. Giới hạn */}
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">4. Giới hạn bài viết tối đa (Max Items)</label>
              <input 
                type="number" 
                value={maxItems}
                onChange={e => setMaxItems(parseInt(e.target.value) || 0)}
                className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <div className="text-xs text-stone-500 mt-1">Nên đặt giới hạn để kiểm soát chi phí Apify.</div>
            </div>

            <button
              onClick={handleStartRun}
              disabled={loading || allowedActors.length === 0 || allowedGroups.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-all active:scale-95"
            >
              <Clock className="w-5 h-5" /> 
              {loading ? "Đang lưu..." : "Lưu Kế hoạch Cào"}
            </button>
          </div>
        </div>
      </div>

      {/* History Panel (Right) */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 min-h-full">
          <h2 className="text-lg font-bold text-stone-900 mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" /> Bảng Theo dõi Tiến trình
          </h2>
          
          <RunHistoryTable userEmail={user.email} />
        </div>
      </div>
    </div>
  );
}

// Sub-component for history
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
        .order("started_at", { ascending: false })
        .limit(20);
      
      if (data) setRuns(data);
      setLoading(false);
    };

    fetchHistory();
    const interval = setInterval(fetchHistory, 3000);
    return () => clearInterval(interval);
  }, [userEmail]);

  const handleRunNow = async (runId: string) => {
    // Optimistic UI update
    setRuns(runs.map(r => r.run_id === runId ? { ...r, status: 'RUNNING', started_at: new Date().toISOString() } : r));
    
    // Update DB
    const { error } = await supabase
      .from("collection_runs")
      .update({ 
        status: 'RUNNING',
        started_at: new Date().toISOString()
      })
      .eq("run_id", runId);

    if (error) {
      alert("Lỗi khi chạy: " + error.message);
    } else {
      alert("Đã bắn lệnh cào lên hệ thống (Mockup)!");
    }
  };

  const handleDeleteRun = async (runId: string) => {
    if (!confirm("Bạn có chắc muốn xóa Kế hoạch cào này?")) return;
    
    // Optimistic UI update
    setRuns(runs.filter(r => r.run_id !== runId));
    
    // Update DB
    const { error } = await supabase
      .from("collection_runs")
      .delete()
      .eq("run_id", runId);

    if (error) {
      alert("Lỗi khi xóa: " + error.message);
    }
  };

  if (loading) return <div className="text-sm text-stone-500 text-center py-10">Đang tải lịch sử...</div>;
  if (runs.length === 0) return (
    <div className="text-center py-20 border-2 border-dashed border-stone-200 rounded-2xl bg-stone-50">
      <Clock className="w-10 h-10 text-stone-300 mx-auto mb-3" />
      <p className="text-sm font-medium text-stone-500">Chưa có kế hoạch cào nào được tạo.</p>
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-medium text-xs uppercase">
          <tr>
            <th className="px-4 py-3">Công cụ & Cấu hình</th>
            <th className="px-4 py-3">Trạng thái</th>
            <th className="px-4 py-3">Bắt đầu lúc</th>
            <th className="px-4 py-3 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {runs.map(run => (
            <tr key={run.run_id} className="hover:bg-stone-50">
              <td className="px-4 py-3">
                <div className="font-semibold text-stone-900 mb-1">{run.platform} <span className="font-normal text-stone-500 text-[10px]">({run.actor_id})</span></div>
                {run.query_parameters && run.query_parameters.hashtags ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {run.query_parameters.hashtags.map((h: string) => (
                      <span key={h} className="bg-stone-100 border border-stone-200 text-stone-600 px-1.5 py-0.5 rounded text-[10px]">{h}</span>
                    ))}
                    <span className="text-[10px] text-stone-400 bg-white border border-stone-200 px-1.5 py-0.5 rounded">Giới hạn: {run.query_parameters.maxItems}</span>
                  </div>
                ) : <span className="text-stone-400 text-xs">N/A</span>}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${
                  run.status === 'RUNNING' ? 'bg-blue-100 text-blue-700' :
                  run.status === 'SUCCESS' ? 'bg-green-100 text-green-700' :
                  run.status === 'FAILED' ? 'bg-red-100 text-red-700' : 
                  run.status === 'PLANNED' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-700'
                }`}>
                  {run.status === 'RUNNING' && <Activity className="w-3 h-3 animate-pulse" />}
                  {run.status === 'SUCCESS' && <CheckCircle2 className="w-3 h-3" />}
                  {run.status === 'FAILED' && <XCircle className="w-3 h-3" />}
                  {run.status === 'PLANNED' && <Clock className="w-3 h-3" />}
                  {run.status === 'PLANNED' ? 'LÊN KẾ HOẠCH' : run.status}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-stone-600 font-mono">
                {run.status === 'PLANNED' ? '-' : new Date(run.started_at).toLocaleString('vi-VN')}
              </td>
              <td className="px-4 py-3 text-right">
                {run.status === 'PLANNED' ? (
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => handleRunNow(run.run_id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5" fill="currentColor" /> Chạy
                    </button>
                    <button 
                      onClick={() => handleDeleteRun(run.run_id)}
                      className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Xóa Kế hoạch"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-stone-400 mr-2">{run.items_count || 0} bài viết</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
