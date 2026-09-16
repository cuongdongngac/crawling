"use client";

import { updateAssignedScope } from "@/app/actions/user";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Save, Tags, Database } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ScopeConfigForm({ 
  userId, 
  initialScope 
}: { 
  userId: string, 
  initialScope: { allowed_actors: string[], allowed_hashtag_groups: string[] } 
}) {
  const router = useRouter();
  const [scope, setScope] = useState(initialScope || { allowed_actors: [], allowed_hashtag_groups: [] });
  const [groups, setGroups] = useState<any[]>([]);
  const [actors, setActors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const [groupsRes, actorsRes] = await Promise.all([
        supabase.from("hashtag_groups").select("group_id, group_name").order("group_name"),
        supabase.from("apify_actors").select("actor_id, actor_name").order("actor_name")
      ]);
      
      if (groupsRes.data) setGroups(groupsRes.data);
      if (actorsRes.data) setActors(actorsRes.data);
      setLoading(false);
    };
    fetchData();
  }, []);

  const [groupSearch, setGroupSearch] = useState("");

  const unselectedGroups = groups.filter(g => 
    !scope.allowed_hashtag_groups?.includes(g.group_id) && 
    (g.group_name.toLowerCase().includes(groupSearch.toLowerCase()) || g.group_id.toLowerCase().includes(groupSearch.toLowerCase()))
  );

  const selectedGroups = groups.filter(g => scope.allowed_hashtag_groups?.includes(g.group_id));

  const handleToggleGroup = (groupId: string) => {
    const isSelected = scope.allowed_hashtag_groups?.includes(groupId);
    const newGroups = isSelected 
      ? scope.allowed_hashtag_groups.filter(id => id !== groupId)
      : [...(scope.allowed_hashtag_groups || []), groupId];
    setScope({ ...scope, allowed_hashtag_groups: newGroups });
  };

  const handleToggleActor = (actorId: string) => {
    const isSelected = scope.allowed_actors?.includes(actorId);
    const newActors = isSelected 
      ? scope.allowed_actors.filter(id => id !== actorId)
      : [...(scope.allowed_actors || []), actorId];
    setScope({ ...scope, allowed_actors: newActors });
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await updateAssignedScope(userId, scope);
    if (res.error) {
      alert(res.error);
      setSaving(false);
    } else {
      router.push("/dashboard/researchers");
    }
  };

  if (loading) return <div className="text-sm text-stone-500 py-4">Đang tải cấu hình...</div>;

  return (
    <div className="space-y-8">
      {/* Hashtag Groups */}
      <div>
        <h3 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
          <Tags className="w-4 h-4 text-amber-600" /> Nhóm Từ khóa được phép theo dõi
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {groups.map(g => {
            const checked = scope.allowed_hashtag_groups?.includes(g.group_id);
            return (
              <label 
                key={g.group_id} 
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${checked ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone-200 hover:bg-stone-50'}`}
              >
                <input 
                  type="checkbox" 
                  className="mt-0.5 text-amber-600 rounded"
                  checked={checked}
                  onChange={() => handleToggleGroup(g.group_id)}
                />
                <div>
                  <div className="text-sm font-semibold text-stone-900">{g.group_name}</div>
                  <div className="text-xs text-stone-500">{g.group_id}</div>
                </div>
              </label>
            )
          })}
          {groups.length === 0 && <div className="text-xs text-stone-500 italic col-span-full">Chưa có dữ liệu Nhóm từ khóa trong hệ thống.</div>}
        </div>
      </div>

      {/* Actors */}
      <div>
        <h3 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-600" /> Công cụ thu thập (Apify Actors) được phép dùng
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {actors.map(a => {
            const checked = scope.allowed_actors?.includes(a.actor_id);
            return (
              <label 
                key={a.actor_id} 
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${checked ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-stone-200 hover:bg-stone-50'}`}
              >
                <input 
                  type="checkbox" 
                  className="mt-0.5 text-indigo-600 rounded"
                  checked={checked}
                  onChange={() => handleToggleActor(a.actor_id)}
                />
                <div>
                  <div className="text-sm font-semibold text-stone-900">{a.actor_name}</div>
                  <div className="text-xs text-stone-500">{a.actor_id}</div>
                </div>
              </label>
            )
          })}
          {actors.length === 0 && <div className="text-xs text-stone-500 italic col-span-full">Chưa có cấu hình Actor nào trong hệ thống.</div>}
        </div>
      </div>

      <div className="pt-4 border-t border-stone-100 flex justify-end">
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 text-white font-medium text-sm rounded-xl hover:bg-stone-800 disabled:opacity-50 transition-colors shadow-sm"
        >
          <Save className="w-4 h-4" /> {saving ? "Đang lưu..." : "Lưu Phân Công"}
        </button>
      </div>
    </div>
  );
}
