"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "ダッシュボード" },
  { href: "/transactions", label: "取引一覧" },
  { href: "/transactions/new", label: "取引登録" },
  { href: "/receipts/upload", label: "レシート登録" },
  { href: "/imports", label: "CSVインポート" },
  { href: "/triage", label: "未処理一覧" },
  { href: "/vendors", label: "取引先" },
  { href: "/categories", label: "カテゴリ管理" },
  { href: "/exports", label: "エクスポート履歴" }
];

export default function DashboardHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const { error } = await signOut();
      if (error) {
        console.error("Failed to sign out", error);
      }
    } catch (err) {
      console.error("Failed to sign out", err);
    } finally {
      setIsSigningOut(false);
      router.push("/login");
    }
  };

  return (
    <header className="mb-8 border-b border-gray-200 pb-6 relative">
      <div className="flex items-center justify-between">
        {/* Title: Hidden when menu is open on mobile */}
        <div className={cn("transition-opacity duration-200", isMenuOpen ? "opacity-0 md:opacity-100" : "opacity-100")}>
          <h1 className="text-xl font-bold text-gray-900">3m Dashboard</h1>
          <p className="text-xs text-gray-600">ローカル運用向けの取引可視化MVP</p>
        </div>

        {/* Mobile Menu Button - Absolute right. Visible only when menu is closed. */}
        <div className={cn("md:hidden z-50 absolute right-0 top-0 h-full flex items-center transition-opacity duration-200", isMenuOpen ? "opacity-0 pointer-events-none" : "opacity-100")}>
          <button
            type="button"
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open Menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Slide-out Menu Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity md:hidden",
          isMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsMenuOpen(false)}
      />

      {/* Mobile Slide-out Menu Content */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-64 bg-white shadow-xl transition-transform duration-300 ease-in-out md:hidden flex flex-col px-6 py-6",
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Drawer Header with Close Button */}
        <div className="flex justify-end mb-8">
          <button
            type="button"
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
            onClick={() => setIsMenuOpen(false)}
            aria-label="Close Menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex flex-col gap-4 text-base font-medium text-gray-600">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block px-2 py-1 transition-colors",
                  isActive ? "text-blue-700 font-semibold" : "hover:text-blue-600"
                )}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={handleSignOut}
            className={cn(
              "mt-4 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100",
              isSigningOut && "cursor-not-allowed opacity-70"
            )}
            disabled={isSigningOut}
          >
            {isSigningOut ? "ログアウト中..." : "ログアウト"}
          </button>
        </nav>
      </div>

      {/* Desktop Navigation (Hidden on Mobile) */}
      <div className="hidden md:flex flex-col gap-4 mt-4 md:mt-0 md:flex-row md:items-center md:justify-end">
        <nav className="flex flex-row gap-3 text-sm font-medium text-gray-600 whitespace-nowrap">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={handleSignOut}
          className={cn(
            "rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 whitespace-nowrap",
            isSigningOut && "cursor-not-allowed opacity-70"
          )}
          disabled={isSigningOut}
        >
          {isSigningOut ? "ログアウト中..." : "ログアウト"}
        </button>
      </div>
    </header>
  );
}

