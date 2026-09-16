"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { Save, Key } from "lucide-react";

export default function SettingsForm() {
  const [apifyKey, setApifyKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .eq("setting_key", "APIFY_API_TOKEN")
        .single();
      
      if (data) {
        setApifyKey(data.setting_value);
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("system_settings")
      .upsert({ 
        setting_key: "APIFY_API_TOKEN", 
        setting_value: apifyKey,
        updated_at: new Date().toISOString()
      }, { onConflict: "setting_key" });

    if (error) {
      alert("Lỗi khi lưu: " + error.message);
    } else {
      alert("Lưu cấu hình thành công!");
    }
    setSaving(false);
  };

  if (loading) return <div className="text-center py-12 text-stone-500">Đang tải cấu hình...</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden p-6 space-y-6">
      
      <div className="border border-indigo-100 bg-indigo-50/30 rounded-xl p-5">
        <h2 className="text-sm font-bold text-indigo-900 mb-4 flex items-center gap-2">
          <Key className="w-4 h-4 text-indigo-600" /> Kết nối Apify (Scraping Provider)
        </h2>
        
        <div className="space-y-3">
          <label className="block text-sm font-medium text-stone-700">
            Apify API Token
          </label>
          <div className="flex gap-3">
            <input 
              type="password" 
              value={apifyKey}
              onChange={(e) => setApifyKey(e.target.value)}
              placeholder="apify_api_..."
              className="flex-1 px-4 py-2 text-sm font-mono border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <p className="text-xs text-stone-500">
            Token này được dùng để khởi tạo các tiến trình cào dữ liệu trên Apify. Bạn có thể thay đổi token này bất cứ lúc nào (ví dụ: khi tài khoản cũ hết quota) mà không cần phải khởi động lại máy chủ.
          </p>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-stone-100">
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {saving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </div>

    </div>
  );
}
