import DashboardHeader from "./components/DashboardHeader";
import BottomNav from "./components/BottomNav";

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 pb-32 lg:pb-8">
      <div className="mx-auto max-w-6xl px-[10px] pt-[10px] pb-6 md:px-4 md:py-8">
        <DashboardHeader />
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
