import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Database, LayoutDashboard } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get profile to check role
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.is_admin === true;

  return (
    <div className="min-h-screen bg-stone-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-stone-900 text-stone-300 flex flex-col">
        <div className="p-6 border-b border-stone-800">
          <h1 className="text-white font-bold text-xl tracking-tight">VPHA M&E</h1>
          <p className="text-xs text-stone-500 mt-1">Social Listening System</p>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 hover:text-white transition-colors">
            <LayoutDashboard className="w-5 h-5 text-stone-400" /> Dashboard
          </Link>
          <Link href="/dashboard/scraping" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 hover:text-white transition-colors">
            <Database className="w-5 h-5 text-stone-400" /> Cào dữ liệu
          </Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DashboardHeader isAdmin={isAdmin} userEmail={user?.email} />
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
