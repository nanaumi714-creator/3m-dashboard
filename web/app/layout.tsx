import Link from "next/link";
import DevAutoLogin from "./_components/DevAutoLogin";
import "./styles/globals.css";

export const metadata = {
  title: "3m Dashboard",
  description: "Freelance money flow tracker"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <main className="min-h-screen">
          <DevAutoLogin />
          {children}
        </main>
      </body>
    </html>
  );
}
