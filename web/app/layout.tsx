// import Link from "next/link";
import type { Metadata, Viewport } from "next";
import DevAutoLogin from "./_components/DevAutoLogin";
import ServiceWorkerRegister from "./_components/ServiceWorkerRegister";
import "./styles/globals.css";

export const metadata: Metadata = {
  title: "3m Dashboard",
  description: "Freelance money flow tracker",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/icon.png"
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "3M Dashboard"
  }
};

export const viewport: Viewport = {
  themeColor: "#2563eb"
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
          <ServiceWorkerRegister />
          {children}
        </main>
      </body>
    </html>
  );
}
