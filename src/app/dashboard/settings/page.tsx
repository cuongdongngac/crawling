import { Settings } from "lucide-react";
import SettingsForm from "@/components/SettingsForm";

export default function SettingsPage() {
  return (
    <div className="p-8 bg-stone-50 min-h-full">
      <div className="mb-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-xl shadow-sm">
            <Settings className="w-6 h-6 text-indigo-700" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-stone-900 tracking-tight">
              Cấu hình Hệ thống
            </h1>
            <p className="text-stone-500 mt-1">
              Quản lý các thông số kỹ thuật, API Key và kết nối với các dịch vụ bên thứ 3.
            </p>
          </div>
        </div>

        <SettingsForm />
      </div>
    </div>
  );
}
