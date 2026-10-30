import HeaderMenu from "./HeaderMenu";
import InstallAppButton from "./InstallAppButton";
import HelpLink from "./HelpLink";

interface DashboardHeaderProps {
  isAdmin: boolean;
  userEmail?: string;
}

export default function DashboardHeader({ isAdmin, userEmail }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 border-b border-stone-200 shadow-sm backdrop-blur-sm transition-all duration-200">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-end gap-3">
        {/* Tên ứng dụng cho điện thoại (thanh bên bị ẩn trên màn hình nhỏ) */}
        <span className="md:hidden mr-auto font-bold text-stone-900 tracking-tight">VPHA M&amp;E</span>
        <InstallAppButton />
        <HelpLink label="Trợ giúp" className="hidden sm:inline-flex" />
        <HelpLink label="" className="sm:hidden p-1" />
        <HeaderMenu isAdmin={isAdmin} userEmail={userEmail} />
      </div>
    </header>
  );
}
