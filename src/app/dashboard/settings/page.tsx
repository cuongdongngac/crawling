import { Settings } from "lucide-react";
import SettingsForm from "@/components/SettingsForm";
import HelpLink from "@/components/HelpLink";
import { getSystemSettings } from "@/app/actions/system-settings";

export default async function SettingsPage() {
  const s = await getSystemSettings();

  return (
    <div className="p-4 sm:p-8 bg-stone-50 min-h-full">
      <div className="mb-8 max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-xl shadow-sm shrink-0">
            <Settings className="w-6 h-6 text-indigo-700" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">Cấu hình Hệ thống</h1>
            <p className="text-stone-500 mt-1">Khoá kết nối Apify và OpenRouter dùng cho quét chính thức.</p>
            <HelpLink slug="quan-tri/cau-hinh" className="mt-1" />
          </div>
        </div>

        {s.ok ? (
          <SettingsForm initial={s.data} />
        ) : (
          <div className="bg-white rounded-2xl border border-stone-200 p-6 text-sm text-stone-600">{s.error}</div>
        )}
      </div>
    </div>
  );
}
