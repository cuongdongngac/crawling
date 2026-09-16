import { fetchUsers } from "@/app/actions/user";
import Link from "next/link";
import { UserCircle, Eye, ShieldCheck, Activity } from "lucide-react";

export default async function ResearchersPage() {
  const users = await fetchUsers();

  return (
    <div className="p-8 bg-stone-50 min-h-full">
      <div className="mb-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-xl shadow-sm">
            <Activity className="w-6 h-6 text-indigo-700" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-stone-900 tracking-tight">
              Giám sát & Phân công
            </h1>
            <p className="text-stone-500 mt-1">
              Phân công phạm vi công việc và theo dõi lịch sử thu thập dữ liệu của từng Nghiên cứu viên.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-medium">
                <tr>
                  <th className="px-6 py-4">Tài Khoản</th>
                  <th className="px-6 py-4">Phạm vi Nhóm Từ khóa</th>
                  <th className="px-6 py-4">Công cụ cào (Actors)</th>
                  <th className="px-6 py-4 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {users.map(user => {
                  const scope = user.assigned_scope || { allowed_actors: [], allowed_hashtag_groups: [] };
                  const groupCount = scope.allowed_hashtag_groups?.length || 0;
                  const actorCount = scope.allowed_actors?.length || 0;

                  return (
                    <tr key={user.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <div className="size-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-bold uppercase">
                          {user?.email?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div className="font-semibold text-stone-900 flex items-center gap-2">
                            {user?.email || 'Unknown'}
                            {user?.is_admin && <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />}
                          </div>
                          <div className="text-xs text-stone-500">ID: {user?.id?.slice(0,8)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {user.is_admin ? (
                          <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded">Tất cả (Admin)</span>
                        ) : groupCount > 0 ? (
                          <span className="text-xs font-medium text-stone-700 bg-stone-100 px-2 py-1 rounded">{groupCount} Nhóm</span>
                        ) : (
                          <span className="text-xs text-stone-400 italic">Chưa phân công</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {user.is_admin ? (
                          <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded">Tất cả (Admin)</span>
                        ) : actorCount > 0 ? (
                          <span className="text-xs font-medium text-stone-700 bg-stone-100 px-2 py-1 rounded">{actorCount} Công cụ</span>
                        ) : (
                          <span className="text-xs text-stone-400 italic">Chưa phân công</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link 
                          href={`/dashboard/researchers/${user.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 hover:text-indigo-700 rounded-lg text-xs font-medium transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> Theo dõi
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
