"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import {
  Search,
  Edit2,
  Save,
  X,
  Tags,
  Plus,
  Trash
} from "lucide-react";

export interface HashtagGroupRow {
  group_id: string;
  group_name: string;
  description: string | null;
  created_at: string | null;
}

export default function HashtagGroupTable() {
  const [groups, setGroups] = useState<HashtagGroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForms, setEditForms] = useState<{ [key: string]: Partial<HashtagGroupRow> }>({});
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newGroupForm, setNewGroupForm] = useState<Partial<HashtagGroupRow>>({
    group_id: "",
    group_name: "",
    description: "",
  });
  const [savingNew, setSavingNew] = useState(false);

  const supabase = createClient();

  const fetchGroups = async () => {
    const { data, error } = await supabase
      .from("hashtag_groups")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setGroups(data as HashtagGroupRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const filteredGroups = groups.filter(
    (group) =>
      group.group_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.group_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (group: HashtagGroupRow) => {
    setEditingId(group.group_id);
    setEditForms((prev) => ({
      ...prev,
      [group.group_id]: {
        group_id: group.group_id,
        group_name: group.group_name,
        description: group.description,
      },
    }));
  };

  const handleSave = async (groupId: string) => {
    setSaving((prev) => ({ ...prev, [groupId]: true }));
    const editForm = editForms[groupId];
    
    const { error } = await supabase
      .from("hashtag_groups")
      .update({
        group_id: editForm.group_id,
        group_name: editForm.group_name,
        description: editForm.description,
      })
      .eq("group_id", groupId);

    if (!error) {
      setGroups(groups.map((g) => (g.group_id === groupId ? { ...g, ...editForm, group_id: editForm.group_id || groupId } : g)));
      setEditingId(null);
      setEditForms((prev) => {
        const newForms = { ...prev };
        delete newForms[groupId];
        return newForms;
      });
    } else {
      alert("Lỗi khi lưu: " + error.message);
    }
    setSaving((prev) => ({ ...prev, [groupId]: false }));
  };

  const handleAddNew = async () => {
    if (!newGroupForm.group_id?.trim() || !newGroupForm.group_name?.trim()) {
      alert("Vui lòng nhập ID và Tên nhóm!");
      return;
    }

    setSavingNew(true);
    try {
      const { data, error } = await supabase
        .from("hashtag_groups")
        .insert({
          group_id: newGroupForm.group_id.trim().toUpperCase(),
          group_name: newGroupForm.group_name.trim(),
          description: newGroupForm.description?.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) setGroups([data as HashtagGroupRow, ...groups]);

      setNewGroupForm({ group_id: "", group_name: "", description: "" });
      setIsAddingNew(false);
    } catch (error: any) {
      alert("Không thể thêm nhóm mới! Lỗi: " + error.message);
    } finally {
      setSavingNew(false);
    }
  };

  const handleDelete = async (groupId: string, groupName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa nhóm "${groupName}"?`)) return;

    try {
      const { error } = await supabase.from("hashtag_groups").delete().eq("group_id", groupId);
      if (error) throw error;
      setGroups((prev) => prev.filter((g) => g.group_id !== groupId));
    } catch (error: any) {
      alert("Không thể xóa nhóm! Lỗi: " + error.message);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-stone-500">Đang tải danh sách...</div>;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
      {/* ToolBar */}
      <div className="p-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Tìm kiếm nhóm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
          />
        </div>
        <button
          onClick={() => setIsAddingNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Thêm Nhóm
        </button>
      </div>

      {/* Inline Add Form */}
      {isAddingNew && (
        <div className="p-5 bg-amber-50 border-b border-amber-100 flex gap-4 items-start">
          <div className="flex-1 grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">ID Nhóm (Viết hoa liền không dấu)</label>
              <input
                type="text"
                value={newGroupForm.group_id || ""}
                onChange={(e) => setNewGroupForm({ ...newGroupForm, group_id: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="VD: COMMERCIAL"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Tên Nhóm</label>
              <input
                type="text"
                value={newGroupForm.group_name || ""}
                onChange={(e) => setNewGroupForm({ ...newGroupForm, group_name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="VD: Thương mại & Bán lẻ"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Mô tả chi tiết</label>
              <input
                type="text"
                value={newGroupForm.description || ""}
                onChange={(e) => setNewGroupForm({ ...newGroupForm, description: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="Tuỳ chọn..."
              />
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <button
              onClick={handleAddNew}
              disabled={savingNew || !newGroupForm.group_id || !newGroupForm.group_name}
              className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {savingNew ? "Đang lưu..." : "Lưu"}
            </button>
            <button
              onClick={() => setIsAddingNew(false)}
              className="px-4 py-2 bg-stone-200 text-stone-700 text-sm font-medium rounded-lg hover:bg-stone-300 transition-colors"
            >
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
              <th className="px-6 py-3 w-1/5">ID Nhóm</th>
              <th className="px-6 py-3 w-1/4">Tên Nhóm</th>
              <th className="px-6 py-3 w-2/5">Mô tả</th>
              <th className="px-6 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filteredGroups.map((group) => {
              const isEditing = editingId === group.group_id;
              const editForm = editForms[group.group_id] || {};

              return (
                <tr key={group.group_id} className={isEditing ? "bg-amber-50/50" : "hover:bg-stone-50 transition-colors"}>
                  <td className="px-6 py-4 font-semibold text-stone-700">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.group_id || ""}
                        onChange={(e) => setEditForms((prev) => ({ ...prev, [group.group_id]: { ...editForm, group_id: e.target.value.toUpperCase() } }))}
                        className="w-full px-2 py-1 text-sm border border-amber-300 rounded focus:ring-2 focus:ring-amber-500 outline-none uppercase font-semibold"
                      />
                    ) : (
                      group.group_id
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.group_name || ""}
                        onChange={(e) => setEditForms((prev) => ({ ...prev, [group.group_id]: { ...editForm, group_name: e.target.value } }))}
                        className="w-full px-2 py-1 text-sm border border-amber-300 rounded focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    ) : (
                      <span className="font-medium text-stone-900">{group.group_name}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.description || ""}
                        onChange={(e) => setEditForms((prev) => ({ ...prev, [group.group_id]: { ...editForm, description: e.target.value } }))}
                        className="w-full px-2 py-1 text-sm border border-amber-300 rounded focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    ) : (
                      <span className="text-stone-600">{group.description || "—"}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleSave(group.group_id)}
                            disabled={saving[group.group_id]}
                            className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                            title="Lưu"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditForms((p) => { const n = { ...p }; delete n[group.group_id]; return n; });
                            }}
                            className="p-1.5 text-stone-500 bg-stone-200 hover:bg-stone-300 rounded transition-colors"
                            title="Hủy"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(group)}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Sửa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(group.group_id, group.group_name)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            
            {filteredGroups.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-stone-500">
                  <Tags className="w-10 h-10 mx-auto text-stone-300 mb-3" />
                  <p>Chưa có nhóm từ khóa nào.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
