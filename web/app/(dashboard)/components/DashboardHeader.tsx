"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const mainNavItems = [
  { href: "/transactions", label: "取引一覧" },
  { href: "/triage", label: "未処理一覧" },
];

const inputNavItems = [
  { href: "/transactions/new", label: "取引登録" },
  { href: "/receipts/upload", label: "レシートから登録" },
  { href: "/imports", label: "CSVインポート" },
];

const secondaryNavItems = [
  { href: "/vendors", label: "取引先" },
  { href: "/categories", label: "カテゴリ管理" },
  { href: "/exports", label: "エクスポート履歴" }
];

export default function DashboardHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isInputOpen, setIsInputOpen] = useState(false);

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

  const isSecondaryActive = secondaryNavItems.some(item => pathname === item.href);
  const isInputActive = inputNavItems.some(item => pathname === item.href);

  return (
    <header className="mb-10 pt-4 relative">
      <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-100 shadow-sm px-4 md:px-6 py-3 flex items-center justify-between">
        {/* Logo Section */}
        <Link href="/" className="flex flex-col shrink-0">
          <h1 className="text-lg font-black text-gray-900 leading-none tracking-tight">3m Dashboard</h1>
          <p className="text-[10px] text-blue-600 font-bold tracking-tighter uppercase mt-0.5 whitespace-nowrap">Local Finance Ops</p>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1 mx-6">
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                {item.label}
              </Link>
            );
          })}

          {/* Input Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setIsInputOpen(true)}
            onMouseLeave={() => setIsInputOpen(false)}
          >
            <button
              type="button"
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all outline-none whitespace-nowrap",
                isInputActive
                  ? "bg-blue-50 text-blue-700"
                  : isInputOpen ? "bg-gray-50 text-gray-900" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              取引登録
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={cn("transition-transform duration-300", isInputOpen && "rotate-180")}>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {isInputOpen && (
              <div className="absolute right-0 top-full pt-2 w-52 z-50">
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                  {inputNavItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "block px-5 py-3 text-sm font-bold transition-colors",
                          isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        )}
                        onClick={() => setIsInputOpen(false)}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Manage Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setIsMoreOpen(true)}
            onMouseLeave={() => setIsMoreOpen(false)}
          >
            <button
              type="button"
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all outline-none whitespace-nowrap",
                isSecondaryActive
                  ? "bg-blue-50 text-blue-700"
                  : isMoreOpen ? "bg-gray-50 text-gray-900" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              管理
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={cn("transition-transform duration-300", isMoreOpen && "rotate-180")}>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {isMoreOpen && (
              <div className="absolute right-0 top-full pt-2 w-52 z-50">
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                  {secondaryNavItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "block px-5 py-3 text-sm font-bold transition-colors",
                          isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        )}
                        onClick={() => setIsMoreOpen(false)}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSignOut}
            className={cn(
              "hidden md:inline-flex rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-500 transition-all hover:border-gray-900 hover:text-gray-900 active:scale-[0.98] whitespace-nowrap",
              isSigningOut && "opacity-50"
            )}
            disabled={isSigningOut}
          >
            {isSigningOut ? "signing out..." : "Sign Out"}
          </button>

          {/* Mobile Toggle */}
          <button
            type="button"
            className="lg:hidden rounded-xl p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all"
            onClick={() => setIsMenuOpen(true)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <div
        className={cn(
          "fixed inset-0 z-[100] bg-gray-900/40 backdrop-blur-sm transition-opacity lg:hidden",
          isMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsMenuOpen(false)}
      />

      <div
        className={cn(
          "fixed inset-y-0 right-0 z-[101] w-80 bg-white shadow-2xl transition-transform duration-300 ease-out lg:hidden flex flex-col p-8",
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex justify-between items-center mb-10">
          <span className="text-xl font-black text-gray-900">MENU</span>
          <button
            type="button"
            className="rounded-full p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            onClick={() => setIsMenuOpen(false)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex flex-col gap-2 overflow-y-auto pr-2">
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block px-5 py-4 rounded-2xl font-bold transition-all",
                  isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "text-gray-600 hover:bg-gray-50"
                )}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="px-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Registration</p>
            <div className="grid grid-cols-1 gap-1">
              {inputNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "block px-5 py-3 rounded-xl text-sm font-bold transition-all",
                    pathname === item.href ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-50"
                  )}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-100">
            <p className="px-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Settings</p>
            <div className="grid grid-cols-1 gap-1">
              {secondaryNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "block px-5 py-3 rounded-xl text-sm font-bold transition-all",
                    pathname === item.href ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-50"
                  )}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-10">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full rounded-2xl bg-gray-900 px-6 py-5 text-sm font-black text-white transition-all active:scale-[0.98] shadow-xl shadow-gray-200"
              disabled={isSigningOut}
            >
              {isSigningOut ? "SIGNING OUT..." : "LOGOUT"}
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
