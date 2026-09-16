import { Database } from "lucide-react";
import ActorTable from "@/components/ActorTable";

export default function ActorsPage() {
  return (
    <div className="p-8 bg-stone-50 min-h-full">
      <div className="mb-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-xl shadow-sm">
            <Database className="w-6 h-6 text-indigo-700" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-stone-900 tracking-tight">
              Quản lý Công cụ (Apify Actors)
            </h1>
            <p className="text-stone-500 mt-1">
              Định nghĩa các công cụ thu thập dữ liệu và cấu hình JSON mặc định (Default Payload) cho từng công cụ.
            </p>
          </div>
        </div>

        <ActorTable />
      </div>
    </div>
  );
}
