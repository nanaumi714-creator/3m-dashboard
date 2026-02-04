import Link from "next/link";
import type { Metadata } from "next";
import DevAutoLogin from "./_components/DevAutoLogin";
import "./styles/globals.css";

export const metadata: Metadata = {
  title: "3m Dashboard",
  description: "Freelance money flow tracker",
  icons: {
    icon: "/favicon.ico"
  }
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
