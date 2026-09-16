import { Hash } from "lucide-react";
import HashtagTable from "@/components/HashtagTable";

export default function HashtagsPage() {
  return (
    <div className="p-8 bg-stone-50 min-h-full">
      <div className="mb-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 rounded-xl shadow-sm">
            <Hash className="w-6 h-6 text-amber-700" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-stone-900 tracking-tight">
              Quản lý Từ khóa (Hashtags)
            </h1>
            <p className="text-stone-500 mt-1">
              Thêm từ khóa, cấu hình loại tìm kiếm (FIXED/ADAPTIVE) và gắn thẻ vào nhiều nhóm.
            </p>
          </div>
        </div>

        <HashtagTable />
      </div>
    </div>
  );
}
