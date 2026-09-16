import HeaderMenu from "./HeaderMenu";

interface DashboardHeaderProps {
  isAdmin: boolean;
  userEmail?: string;
}

export default function DashboardHeader({ isAdmin, userEmail }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 border-b border-stone-200 shadow-sm backdrop-blur-sm transition-all duration-200">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-end">
        <HeaderMenu isAdmin={isAdmin} userEmail={userEmail} />
      </div>
    </header>
  );
}
