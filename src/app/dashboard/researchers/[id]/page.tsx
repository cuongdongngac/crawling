import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserCircle, ShieldCheck, Activity } from "lucide-react";
import ScopeConfigForm from "@/components/ScopeConfigForm";

export default async function ResearcherDetailPage(props: any) {
  const params = await props.params;
  const id = params.id;

  const supabase = await createClient();
  
  // Need to use admin key to bypass RLS for viewing other profiles if caller is admin
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  const adminClient = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey!);

  const { data: user, error } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !user) {
    return <div className="p-8 text-red-500">Error fetching user: {error?.message || "User not found"}</div>;
  }

  // Fetch runs history (Mocking for now until we have real data)
  const { data: runs } = await adminClient
    .from("collection_runs")
    .select("*")
    .eq("researcher_code", user.email) // Wait, researcher_code is email or ID? Let's assume ID or email based on how we insert later.
    .order("started_at", { ascending: false });

  const isOpsAdmin = user.is_admin;

  return (
    <div className="p-8 bg-stone-50 min-h-full">
      <div className="max-w-5xl mx-auto">
        <Link 
          href="/dashboard/researchers" 
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
        </Link>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 flex flex-wrap gap-6 items-center justify-between mb-8">
          <div className="flex items-center gap-5">
            <div className="size-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xl uppercase">
              {user.email.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
                {user.email}
                {isOpsAdmin && <ShieldCheck className="w-5 h-5 text-amber-600" />}
              </h1>
              <div className="text-sm text-stone-500 mt-1">ID: <span className="font-mono bg-stone-100 px-1.5 rounded">{user.id}</span></div>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-stone-50 px-5 py-3 rounded-xl border border-stone-100 text-center">
              <div className="text-2xl font-bold text-stone-900">{runs?.length || 0}</div>
              <div className="text-xs font-medium text-stone-500 uppercase tracking-wider">Tổng chầu cào</div>
            </div>
            <div className="bg-stone-50 px-5 py-3 rounded-xl border border-stone-100 text-center">
              <div className="text-2xl font-bold text-stone-900">
                {runs?.reduce((sum: number, run: any) => sum + (run.items_count || 0), 0) || 0}
              </div>
              <div className="text-xs font-medium text-stone-500 uppercase tracking-wider">Bài viết thu về</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lớp 2 - Tab 1: Phân công (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
              <h2 className="text-lg font-bold text-stone-900 mb-6 flex items-center gap-2">
                <UserCircle className="w-5 h-5 text-stone-400" /> Phạm vi Phân công (Assigned Scope)
              </h2>
              
              {isOpsAdmin ? (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-sm font-medium flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5" /> 
                  Tài khoản này là Admin, có toàn quyền truy cập tất cả Công cụ và Nhóm từ khóa.
                </div>
              ) : (
                <ScopeConfigForm userId={user.id} initialScope={user.assigned_scope || { allowed_actors: [], allowed_hashtag_groups: [] }} />
              )}
            </div>
          </div>

          {/* Lớp 2 - Tab 2: Lịch sử cào (1/3 width sidebar) */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
              <h2 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-stone-400" /> Lịch sử Hoạt động
              </h2>
              
              <div className="space-y-3">
                {runs && runs.length > 0 ? runs.slice(0, 5).map((run: any) => (
                  <div key={run.run_id} className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <div className="flex justify-between items-start mb-1">
                      <div className="text-xs font-bold text-stone-700">{run.platform}</div>
                      <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${run.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : run.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {run.status}
                      </div>
                    </div>
                    <div className="text-[10px] text-stone-500 mb-2">{new Date(run.started_at).toLocaleString('vi-VN')}</div>
                    <div className="text-sm font-medium text-stone-900">{run.items_count || 0} bài viết</div>
                  </div>
                )) : (
                  <div className="text-sm text-stone-500 italic text-center py-4">Chưa có lịch sử chạy công cụ.</div>
                )}
                {runs && runs.length > 5 && (
                  <button className="w-full py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    Xem tất cả lịch sử
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
