import DashboardHeader from "./components/DashboardHeader";

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <DashboardHeader />
        {children}
      </div>
    </div>
  );
}
