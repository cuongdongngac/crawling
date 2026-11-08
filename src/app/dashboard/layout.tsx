import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Database,
  LayoutDashboard,
  Users,
  Activity,
  Tags,
  Hash,
  Settings,
  UserCircle,
  ChevronRight,
  Radar,
  Lightbulb,
  Award,
  ClipboardCheck,
} from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";
import { getT } from "@/lib/i18n/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.is_admin === true;
  // Vai nghiên cứu viên (dữ liệu, kết luận) — độc lập với quản trị (vận hành).
  // Chưa chạy migration 2026-11-02 (chưa có cột) thì tạm coi quản trị viên là nghiên cứu viên như trước.
  const isResearcher = profile?.is_researcher === undefined ? isAdmin : profile?.is_researcher === true;

  return (
    <div className="min-h-screen bg-stone-50 flex">
      <aside className="hidden md:flex w-64 shrink-0 bg-stone-900 text-stone-300 flex-col">
        <div className="p-6 border-b border-stone-800">
          <h1 className="text-white font-bold text-xl tracking-tight">
            VPHA M&E
          </h1>
          <p className="text-xs text-stone-500 mt-1">Social Listening System</p>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-8 overflow-y-auto">
          <div className="space-y-1">
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              {t("Chung")}
            </p>
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 hover:text-white transition-colors"
            >
              <LayoutDashboard className="w-5 h-5 text-stone-400" /> {t("Tổng quan")}
            </Link>
            <Link
              href="/dashboard/scraping"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 hover:text-white transition-colors"
            >
              <Database className="w-5 h-5 text-indigo-400" /> {t("Cào dữ liệu")}
            </Link>
            <Link
              href="/dashboard/quet-thu"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 hover:text-white transition-colors"
            >
              <Radar className="w-5 h-5 text-emerald-400" /> {t("Quét thử")}
            </Link>
            <Link
              href="/dashboard/de-xuat"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 hover:text-white transition-colors"
            >
              <Lightbulb className="w-5 h-5 text-amber-400" /> {t("Đề xuất hashtag")}
            </Link>
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 hover:text-white transition-colors"
            >
              <UserCircle className="w-5 h-5 text-stone-400" /> {t("Tài khoản cá nhân")}
            </Link>
          </div>

          {isResearcher && (
            <div className="space-y-1">
              <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-violet-400/80">
                {t("Nghiên cứu viên")}
              </p>
              <Link
                href="/dashboard/gan-nhan"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 hover:text-white transition-colors"
              >
                <ClipboardCheck className="w-5 h-5 text-violet-400" />
                <span className="flex-1">{t("Gắn nhãn (AI)")}</span>
                <ChevronRight className="w-3.5 h-3.5 text-stone-600" />
              </Link>
              <Link
                href="/dashboard/hashtag-groups"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 hover:text-white transition-colors"
              >
                <Tags className="w-5 h-5 text-amber-400" />
                <span className="flex-1">{t("Nhóm Từ khóa")}</span>
                <ChevronRight className="w-3.5 h-3.5 text-stone-600" />
              </Link>
              <Link
                href="/dashboard/hashtags"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 hover:text-white transition-colors"
              >
                <Hash className="w-5 h-5 text-amber-400" />
                <span className="flex-1">{t("Từ khóa (Hashtags)")}</span>
                <ChevronRight className="w-3.5 h-3.5 text-stone-600" />
              </Link>
            </div>
          )}

          {isAdmin && (
            <div className="space-y-1">
              <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-500/80">
                {t("Quản trị hệ thống")}
              </p>
              <Link
                href="/dashboard/users"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 hover:text-white transition-colors"
              >
                <Users className="w-5 h-5 text-amber-400" />
                <span className="flex-1">{t("Quản lý Người dùng")}</span>
                <ChevronRight className="w-3.5 h-3.5 text-stone-600" />
              </Link>
              <Link
                href="/dashboard/do-tuong-tac"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 hover:text-white transition-colors"
              >
                <Activity className="w-5 h-5 text-emerald-400" />
                <span className="flex-1">{t("Đo tương tác")}</span>
                <ChevronRight className="w-3.5 h-3.5 text-stone-600" />
              </Link>
              <Link
                href="/dashboard/hoat-dong"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 hover:text-white transition-colors"
              >
                <Award className="w-5 h-5 text-indigo-400" />
                <span className="flex-1">{t("Hoạt động cộng tác viên")}</span>
                <ChevronRight className="w-3.5 h-3.5 text-stone-600" />
              </Link>
              <Link
                href="/dashboard/researchers"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 hover:text-white transition-colors"
              >
                <Activity className="w-5 h-5 text-indigo-400" />
                <span className="flex-1">{t("Giám sát & Phân công")}</span>
                <ChevronRight className="w-3.5 h-3.5 text-stone-600" />
              </Link>
              <Link
                href="/dashboard/actors"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 hover:text-white transition-colors"
              >
                <Database className="w-5 h-5 text-indigo-400" />
                <span className="flex-1">{t("Công cụ Cào")}</span>
                <ChevronRight className="w-3.5 h-3.5 text-stone-600" />
              </Link>
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 hover:text-white transition-colors"
              >
                <Settings className="w-5 h-5 text-stone-400" />
                <span className="flex-1">{t("Cấu hình")}</span>
                <ChevronRight className="w-3.5 h-3.5 text-stone-600" />
              </Link>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-stone-800">
          <p className="text-[10px] text-stone-600 text-center">
            {t("Thu thập dữ liệu có định hướng © VPHA")}
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DashboardHeader isAdmin={isAdmin} userEmail={user?.email} />
        {/* Menu gọn cho điện thoại (thanh bên bị ẩn trên màn hình nhỏ) */}
        <nav className="md:hidden flex gap-1 overflow-x-auto px-3 py-2 bg-stone-900 text-stone-200 text-sm">
          <Link href="/dashboard" className="shrink-0 px-3 py-1.5 rounded-lg hover:bg-stone-800">{t("Tổng quan")}</Link>
          <Link href="/dashboard/quet-thu" className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-700 text-white">{t("Quét thử")}</Link>
          <Link href="/dashboard/de-xuat" className="shrink-0 px-3 py-1.5 rounded-lg hover:bg-stone-800">{t("Đề xuất")}</Link>
          {isResearcher && <Link href="/dashboard/gan-nhan" className="shrink-0 px-3 py-1.5 rounded-lg hover:bg-stone-800">{t("Gắn nhãn")}</Link>}
          <Link href="/dashboard/scraping" className="shrink-0 px-3 py-1.5 rounded-lg hover:bg-stone-800">{t("Cào dữ liệu")}</Link>
          <Link href="/dashboard/profile" className="shrink-0 px-3 py-1.5 rounded-lg hover:bg-stone-800">{t("Tài khoản")}</Link>
        </nav>
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
