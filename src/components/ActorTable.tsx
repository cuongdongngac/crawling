"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { Search, Edit2, Save, X, Plus, Trash, Database } from "lucide-react";

export interface ActorRow {
  actor_id: string;
  actor_name: string;
  platform: string;
  default_config: any;
  is_active: boolean;
}

export default function ActorTable() {
  const [actors, setActors] = useState<ActorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForms, setEditForms] = useState<{ [key: string]: any }>({});
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({});
  
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newActorForm, setNewActorForm] = useState({
    actor_id: "",
    actor_name: "",
    platform: "Tiktok",
    default_config: "{\n  \"maxItems\": 100\n}",
    is_active: true,
  });
  const [savingNew, setSavingNew] = useState(false);

  const supabase = createClient();

  const fetchData = async () => {
    const { data, error } = await supabase
      .from("apify_actors")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setActors(data as any[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredActors = actors.filter((a) =>
    a.actor_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.actor_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (actor: ActorRow) => {
    setEditingId(actor.actor_id);
    setEditForms((prev) => ({
      ...prev,
      [actor.actor_id]: {
        actor_id: actor.actor_id,
        actor_name: actor.actor_name,
        platform: actor.platform,
        default_config: JSON.stringify(actor.default_config, null, 2),
        is_active: actor.is_active,
      },
    }));
  };

  const handleSave = async (id: string) => {
    setSaving((prev) => ({ ...prev, [id]: true }));
    const form = editForms[id];
    
    try {
      let parsedConfig = {};
      try {
        parsedConfig = JSON.parse(form.default_config);
      } catch (e) {
        throw new Error("JSON Cấu hình mặc định không hợp lệ!");
      }

      const { error: hError } = await supabase
        .from("apify_actors")
        .update({
          actor_id: form.actor_id,
          actor_name: form.actor_name,
          platform: form.platform,
          default_config: parsedConfig,
          is_active: form.is_active,
        })
        .eq("actor_id", id);
        
      if (hError) throw hError;

      setEditingId(null);
      await fetchData(); 
    } catch (error: any) {
      alert("Lỗi khi lưu: " + error.message);
    }
    setSaving((prev) => ({ ...prev, [id]: false }));
  };

  const handleAddNew = async () => {
    if (!newActorForm.actor_id || !newActorForm.actor_name) {
      return alert("ID và Tên công cụ không được để trống!");
    }

    setSavingNew(true);
    try {
      let parsedConfig = {};
      try {
        parsedConfig = JSON.parse(newActorForm.default_config);
      } catch (e) {
        throw new Error("JSON Cấu hình mặc định không hợp lệ!");
      }

      const { error: hError } = await supabase
        .from("apify_actors")
        .insert({
          actor_id: newActorForm.actor_id.trim(),
          actor_name: newActorForm.actor_name.trim(),
          platform: newActorForm.platform,
          default_config: parsedConfig,
          is_active: newActorForm.is_active
        });

      if (hError) throw hError;

      setNewActorForm({ actor_id: "", actor_name: "", platform: "Tiktok", default_config: "{\n  \"maxItems\": 100\n}", is_active: true });
      setIsAddingNew(false);
      await fetchData();
    } catch (error: any) {
      alert("Lỗi: " + error.message);
    } finally {
      setSavingNew(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa vĩnh viễn công cụ "${name}"?`)) return;
    try {
      const { error } = await supabase.from("apify_actors").delete().eq("actor_id", id);
      if (error) throw error;
      setActors(actors.filter((h) => h.actor_id !== id));
    } catch (error: any) {
      alert("Lỗi: " + error.message);
    }
  };

  if (loading) return <div className="text-center py-12 text-stone-500">Đang tải danh sách...</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
      {/* ToolBar */}
      <div className="p-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Tìm kiếm công cụ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <button
          onClick={() => setIsAddingNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Thêm Công cụ
        </button>
      </div>

      {/* Inline Add Form */}
      {isAddingNew && (
        <div className="p-5 bg-indigo-50/50 border-b border-indigo-100 flex gap-6 items-start">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Actor ID (vd: clockwork/tiktok)</label>
              <input
                type="text"
                value={newActorForm.actor_id}
                onChange={(e) => setNewActorForm({ ...newActorForm, actor_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Tên hiển thị</label>
              <input
                type="text"
                value={newActorForm.actor_name}
                onChange={(e) => setNewActorForm({ ...newActorForm, actor_name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Nền tảng (Platform)</label>
              <select
                value={newActorForm.platform}
                onChange={(e) => setNewActorForm({ ...newActorForm, platform: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Tiktok">Tiktok</option>
                <option value="Facebook">Facebook</option>
                <option value="YouTube">YouTube</option>
                <option value="Instagram">Instagram</option>
              </select>
            </div>
            <div className="col-span-1 md:col-span-3">
              <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-2">
                Cấu hình Mặc định (Default JSON Payload)
                <span className="font-normal text-stone-400">Dùng cho những cấu hình cố định không cho user sửa (vd: limit)</span>
              </label>
              <textarea
                value={newActorForm.default_config}
                onChange={(e) => setNewActorForm({ ...newActorForm, default_config: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 min-w-[100px]">
            <button onClick={handleAddNew} disabled={savingNew} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
              {savingNew ? "Đang lưu..." : "Lưu"}
            </button>
            <button onClick={() => setIsAddingNew(false)} className="px-4 py-2 bg-stone-200 text-stone-700 text-sm font-medium rounded-lg hover:bg-stone-300">
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-medium">
            <tr>
              <th className="px-6 py-3 w-1/4">Công cụ (Actor)</th>
              <th className="px-6 py-3 w-1/6">Nền tảng</th>
              <th className="px-6 py-3 w-1/3">Cấu hình Mặc định (JSON)</th>
              <th className="px-6 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filteredActors.map((tag) => {
              const isEditing = editingId === tag.actor_id;
              const form = editForms[tag.actor_id] || {};

              return (
                <tr key={tag.actor_id} className={isEditing ? "bg-indigo-50/30 items-start" : "hover:bg-stone-50 transition-colors"}>
                  <td className="px-6 py-4 align-top">
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={form.actor_id || ""}
                          onChange={(e) => setEditForms(p => ({ ...p, [tag.actor_id]: { ...form, actor_id: e.target.value } }))}
                          className="w-full px-2 py-1 text-xs font-mono border border-indigo-300 rounded outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          type="text"
                          value={form.actor_name || ""}
                          onChange={(e) => setEditForms(p => ({ ...p, [tag.actor_id]: { ...form, actor_name: e.target.value } }))}
                          className="w-full px-2 py-1 text-sm font-semibold border border-indigo-300 rounded outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    ) : (
                      <div>
                        <div className="font-semibold text-stone-900">{tag.actor_name}</div>
                        <div className="text-xs font-mono text-stone-500">{tag.actor_id}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 align-top">
                    {isEditing ? (
                      <select
                        value={form.platform}
                        onChange={(e) => setEditForms(p => ({ ...p, [tag.actor_id]: { ...form, platform: e.target.value } }))}
                        className="w-full px-2 py-1.5 text-sm border border-indigo-300 rounded outline-none"
                      >
                        <option value="Tiktok">Tiktok</option>
                        <option value="Facebook">Facebook</option>
                        <option value="YouTube">YouTube</option>
                        <option value="Instagram">Instagram</option>
                      </select>
                    ) : (
                      <span className="px-2.5 py-1 text-xs font-bold rounded bg-stone-100 text-stone-700">
                        {tag.platform}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 align-top">
                    {isEditing ? (
                      <textarea
                        value={form.default_config || ""}
                        onChange={(e) => setEditForms(p => ({ ...p, [tag.actor_id]: { ...form, default_config: e.target.value } }))}
                        rows={5}
                        className="w-full px-2 py-1.5 text-xs font-mono border border-indigo-300 rounded outline-none focus:ring-2 focus:ring-indigo-500 bg-stone-50"
                      />
                    ) : (
                      <pre className="text-[10px] font-mono text-stone-600 bg-stone-50 p-2 rounded border border-stone-200 overflow-x-auto max-h-[100px] overflow-y-auto">
                        {JSON.stringify(tag.default_config, null, 2)}
                      </pre>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right align-top">
                    <div className="flex items-center justify-end gap-2">
                      {isEditing ? (
                        <>
                          <button onClick={() => handleSave(tag.actor_id)} disabled={saving[tag.actor_id]} className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700" title="Lưu">
                            <Save className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setEditingId(null); setEditForms(p => { const n={...p}; delete n[tag.actor_id]; return n; }); }} className="p-1.5 text-stone-500 bg-stone-200 hover:bg-stone-300 rounded" title="Hủy">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleEdit(tag)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Sửa">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(tag.actor_id, tag.actor_name)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                            <Trash className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredActors.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-stone-500">
                  <Database className="w-10 h-10 mx-auto text-stone-300 mb-3" />
                  <p>Chưa cấu hình công cụ Apify nào.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
