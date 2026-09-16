"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { Search, Edit2, Save, X, Hash, Plus, Trash, Check } from "lucide-react";

export interface HashtagRow {
  hashtag_id: number;
  hashtag_text: string;
  keyword_track: string;
  is_active: boolean;
  hashtag_group_mapping: { group_id: string }[];
}

export interface GroupItem {
  group_id: string;
  group_name: string;
}

export default function HashtagTable() {
  const [hashtags, setHashtags] = useState<HashtagRow[]>([]);
  const [availableGroups, setAvailableGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForms, setEditForms] = useState<{ [key: number]: any }>({});
  const [saving, setSaving] = useState<{ [key: number]: boolean }>({});
  
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newHashtagForm, setNewHashtagForm] = useState({
    hashtag_text: "",
    keyword_track: "ADAPTIVE",
    is_active: true,
    selected_groups: [] as string[]
  });
  const [savingNew, setSavingNew] = useState(false);

  const supabase = createClient();

  const fetchData = async () => {
    // 1. Fetch available groups
    const { data: groupsData } = await supabase.from("hashtag_groups").select("group_id, group_name").order("group_name");
    if (groupsData) setAvailableGroups(groupsData);

    // 2. Fetch hashtags with mapped groups
    const { data, error } = await supabase
      .from("hashtags")
      .select(`
        hashtag_id, hashtag_text, keyword_track, is_active,
        hashtag_group_mapping ( group_id )
      `)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setHashtags(data as any[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredHashtags = hashtags.filter((h) =>
    h.hashtag_text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (hashtag: HashtagRow) => {
    setEditingId(hashtag.hashtag_id);
    setEditForms((prev) => ({
      ...prev,
      [hashtag.hashtag_id]: {
        hashtag_text: hashtag.hashtag_text,
        keyword_track: hashtag.keyword_track,
        is_active: hashtag.is_active,
        selected_groups: hashtag.hashtag_group_mapping.map(m => m.group_id)
      },
    }));
  };

  const handleSave = async (id: number) => {
    setSaving((prev) => ({ ...prev, [id]: true }));
    const form = editForms[id];
    
    try {
      // 1. Update hashtag
      const { error: hError } = await supabase
        .from("hashtags")
        .update({
          hashtag_text: form.hashtag_text,
          keyword_track: form.keyword_track,
          is_active: form.is_active,
        })
        .eq("hashtag_id", id);
      if (hError) throw hError;

      // 2. Update mapping (Delete old, insert new)
      await supabase.from("hashtag_group_mapping").delete().eq("hashtag_id", id);
      if (form.selected_groups.length > 0) {
        const mappings = form.selected_groups.map((g: string) => ({ hashtag_id: id, group_id: g }));
        const { error: mError } = await supabase.from("hashtag_group_mapping").insert(mappings);
        if (mError) throw mError;
      }

      setEditingId(null);
      await fetchData(); // Refresh data to sync
    } catch (error: any) {
      alert("Lỗi khi lưu: " + error.message);
    }
    setSaving((prev) => ({ ...prev, [id]: false }));
  };

  const handleAddNew = async () => {
    let text = newHashtagForm.hashtag_text.trim();
    if (!text) return alert("Vui lòng nhập từ khóa!");
    if (!text.startsWith("#")) text = "#" + text;

    setSavingNew(true);
    try {
      // 1. Insert Hashtag
      const { data, error: hError } = await supabase
        .from("hashtags")
        .insert({
          hashtag_text: text,
          keyword_track: newHashtagForm.keyword_track,
          is_active: newHashtagForm.is_active
        })
        .select()
        .single();

      if (hError) throw hError;
      const newId = data.hashtag_id;

      // 2. Insert mappings
      if (newHashtagForm.selected_groups.length > 0) {
        const mappings = newHashtagForm.selected_groups.map(g => ({ hashtag_id: newId, group_id: g }));
        const { error: mError } = await supabase.from("hashtag_group_mapping").insert(mappings);
        if (mError) throw mError;
      }

      setNewHashtagForm({ hashtag_text: "", keyword_track: "ADAPTIVE", is_active: true, selected_groups: [] });
      setIsAddingNew(false);
      await fetchData();
    } catch (error: any) {
      alert("Lỗi: " + error.message);
    } finally {
      setSavingNew(false);
    }
  };

  const handleDelete = async (id: number, text: string) => {
    if (!confirm(`Bạn có chắc muốn xóa vĩnh viễn từ khóa "${text}"?`)) return;
    try {
      const { error } = await supabase.from("hashtags").delete().eq("hashtag_id", id);
      if (error) throw error;
      setHashtags(hashtags.filter((h) => h.hashtag_id !== id));
    } catch (error: any) {
      alert("Lỗi: " + error.message);
    }
  };

  const toggleGroupSelection = (formObj: any, setFormFn: any, groupId: string) => {
    const isSelected = formObj.selected_groups.includes(groupId);
    const newGroups = isSelected 
      ? formObj.selected_groups.filter((g: string) => g !== groupId)
      : [...formObj.selected_groups, groupId];
    setFormFn({ ...formObj, selected_groups: newGroups });
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
            placeholder="Tìm kiếm từ khóa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>
        <button
          onClick={() => setIsAddingNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Thêm Từ khóa
        </button>
      </div>

      {/* Inline Add Form */}
      {isAddingNew && (
        <div className="p-5 bg-amber-50 border-b border-amber-100 flex gap-6 items-start">
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Từ khóa (Bắt đầu bằng #)</label>
              <input
                type="text"
                value={newHashtagForm.hashtag_text}
                onChange={(e) => setNewHashtagForm({ ...newHashtagForm, hashtag_text: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="#vape"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Chế độ Tracking</label>
              <select
                value={newHashtagForm.keyword_track}
                onChange={(e) => setNewHashtagForm({ ...newHashtagForm, keyword_track: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="ADAPTIVE">ADAPTIVE (Mở rộng tự động)</option>
                <option value="FIXED">FIXED (Cố định)</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-2">Chọn nhóm (Có thể chọn nhiều)</label>
              <div className="flex flex-wrap gap-2">
                {availableGroups.map(g => (
                  <label key={g.group_id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-stone-300 bg-white cursor-pointer hover:bg-stone-50">
                    <input 
                      type="checkbox" 
                      className="text-amber-600 rounded" 
                      checked={newHashtagForm.selected_groups.includes(g.group_id)}
                      onChange={() => toggleGroupSelection(newHashtagForm, setNewHashtagForm, g.group_id)}
                    />
                    <span className="text-xs font-medium text-stone-800">{g.group_name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 min-w-[100px]">
            <button onClick={handleAddNew} disabled={savingNew} className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700">
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
              <th className="px-6 py-3 w-1/4">Từ khóa</th>
              <th className="px-6 py-3 w-1/5">Tracking</th>
              <th className="px-6 py-3 w-1/3">Thuộc nhóm</th>
              <th className="px-6 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filteredHashtags.map((tag) => {
              const isEditing = editingId === tag.hashtag_id;
              const form = editForms[tag.hashtag_id] || {};

              return (
                <tr key={tag.hashtag_id} className={isEditing ? "bg-amber-50/50" : "hover:bg-stone-50 transition-colors"}>
                  <td className="px-6 py-4 font-semibold text-stone-900">
                    {isEditing ? (
                      <input
                        type="text"
                        value={form.hashtag_text || ""}
                        onChange={(e) => setEditForms(p => ({ ...p, [tag.hashtag_id]: { ...form, hashtag_text: e.target.value } }))}
                        className="w-full px-2 py-1 text-sm border border-amber-300 rounded outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    ) : (
                      tag.hashtag_text
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <select
                        value={form.keyword_track}
                        onChange={(e) => setEditForms(p => ({ ...p, [tag.hashtag_id]: { ...form, keyword_track: e.target.value } }))}
                        className="w-full px-2 py-1.5 text-sm border border-amber-300 rounded outline-none"
                      >
                        <option value="ADAPTIVE">ADAPTIVE</option>
                        <option value="FIXED">FIXED</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${tag.keyword_track === 'ADAPTIVE' ? 'bg-blue-100 text-blue-800' : 'bg-stone-200 text-stone-800'}`}>
                        {tag.keyword_track}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <div className="flex flex-wrap gap-1.5">
                        {availableGroups.map(g => (
                          <label key={g.group_id} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-amber-200 cursor-pointer hover:bg-amber-100 text-xs">
                            <input 
                              type="checkbox" 
                              className="text-amber-600 rounded" 
                              checked={form.selected_groups.includes(g.group_id)}
                              onChange={() => toggleGroupSelection(form, (newF: any) => setEditForms(p => ({ ...p, [tag.hashtag_id]: newF })), g.group_id)}
                            />
                            {g.group_id}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {tag.hashtag_group_mapping.map((m, i) => (
                          <span key={i} className="px-2 py-1 text-xs font-medium bg-stone-100 text-stone-700 border border-stone-200 rounded">
                            {m.group_id}
                          </span>
                        ))}
                        {tag.hashtag_group_mapping.length === 0 && <span className="text-stone-400 italic text-xs">Chưa gắn nhóm</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isEditing ? (
                        <>
                          <button onClick={() => handleSave(tag.hashtag_id)} disabled={saving[tag.hashtag_id]} className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700" title="Lưu">
                            <Save className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setEditingId(null); setEditForms(p => { const n={...p}; delete n[tag.hashtag_id]; return n; }); }} className="p-1.5 text-stone-500 bg-stone-200 hover:bg-stone-300 rounded" title="Hủy">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleEdit(tag)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Sửa">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(tag.hashtag_id, tag.hashtag_text)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                            <Trash className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredHashtags.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-stone-500">
                  <Hash className="w-10 h-10 mx-auto text-stone-300 mb-3" />
                  <p>Chưa có từ khóa nào.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
