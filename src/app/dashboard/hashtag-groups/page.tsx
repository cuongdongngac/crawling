import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guards";
import { Hash, Tags } from "lucide-react";
import HashtagGroupTable from "@/components/HashtagGroupTable";

// Danh mục từ khóa là việc của nghiên cứu viên (duyệt, xếp nhóm) — DEC vai trò 02/11/2026.
export default async function HashtagGroupsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!me.isResearcher) redirect("/dashboard");
  return (
    <div className="p-8 bg-stone-50 min-h-full">
      <div className="mb-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 rounded-xl shadow-sm">
            <Tags className="w-6 h-6 text-amber-700" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-stone-900 tracking-tight">
              Nhóm Từ Khóa
            </h1>
            <p className="text-stone-500 mt-1">
              Quản lý các nhóm từ khóa (Hashtag Groups) để phân loại mục đích theo dõi.
            </p>
          </div>
        </div>

        <HashtagGroupTable />
      </div>
    </div>
  );
}
