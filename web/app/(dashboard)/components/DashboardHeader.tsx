"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const mainNavItems = [
  { href: "/transactions", label: "支出一覧" },
  { href: "/triage", label: "判定待ち" },
];

const masterNavItems = [
  { href: "/vendors", label: "取引先管理" },
  { href: "/categories", label: "カテゴリ管理" },
  { href: "/exports", label: "CSV出力・レポート" }
];

export default function DashboardHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showMasterMenu, setShowMasterMenu] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      router.push("/login");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <header className="mb-6 pt-2 relative z-[100]">
      <div className="bg-white/80 backdrop-blur-md rounded-2xl md:rounded-[32px] border border-gray-100 shadow-sm px-4 md:px-6 py-3 md:py-4 flex items-center justify-between w-full">
        {/* Logo Section */}
        <Link href="/" className="flex flex-col shrink-0">
          <h1 className="text-xl font-black text-gray-900 leading-none tracking-tighter">3M</h1>
          <p className="text-[8px] text-blue-600 font-black tracking-widest uppercase mt-1">My Money Management</p>
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
                  "px-5 py-2.5 rounded-2xl text-[13px] font-black transition-all whitespace-nowrap",
                  isActive
                    ? "bg-gray-900 text-white shadow-xl shadow-gray-200"
                    : "text-gray-400 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                {item.label}
              </Link>
            );
          })}

          <div className="h-4 w-px bg-gray-100 mx-2" />

          <div className="relative">
            <button
              onMouseEnter={() => setShowCreateMenu(true)}
              onMouseLeave={() => setShowCreateMenu(false)}
              className={cn(
                "px-4 py-2.5 rounded-2xl text-[13px] font-black transition-all whitespace-nowrap flex items-center gap-2",
                showCreateMenu ? "text-gray-900 bg-gray-50/50" : "text-gray-400 hover:text-gray-900"
              )}
            >
              データの作成
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>

              {showCreateMenu && (
                <div className="absolute top-full left-0 pt-2 z-[110]">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl p-2 min-w-[200px]">
                    <Link href="/receipts/upload" className="flex items-center gap-3 px-4 py-3 rounded-xl text-[12px] font-bold text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                      レシートを登録
                    </Link>
                    <Link href="/transactions/new" className="flex items-center gap-3 px-4 py-3 rounded-xl text-[12px] font-bold text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 transition-all">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      手動で追加
                    </Link>
                    <Link href="/imports" className="flex items-center gap-3 px-4 py-3 rounded-xl text-[12px] font-bold text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition-all border-t border-gray-50 mt-1">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                      CSV読込
                    </Link>
                  </div>
                </div>
              )}
            </button>
          </div>

          <div className="relative">
            <button
              onMouseEnter={() => setShowMasterMenu(true)}
              onMouseLeave={() => setShowMasterMenu(false)}
              className={cn(
                "px-4 py-2.5 rounded-2xl text-[12px] font-bold transition-all whitespace-nowrap flex items-center gap-2",
                masterNavItems.some(i => pathname === i.href) ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
              )}
            >
              設定・マスタ
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>

              {showMasterMenu && (
                <div className="absolute top-full left-0 pt-2 z-[110]">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl p-2 min-w-[180px]">
                    {masterNavItems.map(item => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "block px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all",
                          pathname === item.href ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                        )}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </button>
          </div>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 md:gap-3 ml-auto">
          {/* Mobile Master Menu */}
          <div className="relative lg:hidden">
            <button
              onClick={() => setShowMasterMenu(!showMasterMenu)}
              className={cn(
                "p-2.5 rounded-xl transition-all",
                masterNavItems.some(i => pathname === i.href) || showMasterMenu ? "bg-blue-50 text-blue-600" : "bg-gray-50 text-gray-400"
              )}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
            </button>

            {showMasterMenu && (
              <>
                {/* Backdrop overlay for closing the menu */}
                <div
                  className="fixed inset-0 z-[105]"
                  onClick={() => setShowMasterMenu(false)}
                />
                <div className="absolute top-full right-0 mt-2 z-[110] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl p-2 min-w-[200px]">
                    <div className="px-3 py-2 border-b border-gray-50 mb-1">
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Settings & Master</span>
                    </div>
                    {masterNavItems.map(item => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setShowMasterMenu(false)}
                        className={cn(
                          "block px-4 py-3 rounded-xl text-[12px] font-bold transition-all",
                          pathname === item.href ? "bg-blue-50 text-blue-600" : "text-gray-500 active:bg-gray-50"
                        )}
                      >
                        {item.label}
                      </Link>
                    ))}
                    <div className="mt-2 pt-2 border-t border-gray-50 lg:hidden">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-[12px] font-black text-red-400 active:bg-red-50 transition-all"
                      >
                        LOGOUT
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className={cn(
              "hidden lg:block rounded-xl md:rounded-2xl border border-transparent bg-gray-50 px-3 md:px-5 py-2 md:py-2.5 text-[10px] md:text-[11px] font-black text-gray-400 transition-all hover:bg-gray-900 hover:text-white active:scale-[0.98] whitespace-nowrap",
              isSigningOut && "opacity-50"
            )}
            disabled={isSigningOut}
          >
            {isSigningOut ? "..." : "LOGOUT"}
          </button>
        </div>
      </div>
    </header>
  );
}
