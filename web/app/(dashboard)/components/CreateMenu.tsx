"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function CreateMenu() {
    const [showMenu, setShowMenu] = useState(false);

    return (
        <div className="relative">
            <button
                onMouseEnter={() => setShowMenu(true)}
                onMouseLeave={() => setShowMenu(false)}
                className={cn(
                    "px-4 py-2.5 rounded-2xl text-[13px] font-black transition-all whitespace-nowrap flex items-center gap-2",
                    showMenu ? "text-gray-900 bg-gray-50/50" : "text-gray-400 hover:text-gray-900"
                )}
            >
                データの作成
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>

                {showMenu && (
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
                            <Link href="/import-jobs" className="flex items-center gap-3 px-4 py-3 rounded-xl text-[12px] font-bold text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 8h10" /><path d="M7 12h6" /><path d="M7 16h8" /></svg>
                                明細の整理
                            </Link>
                        </div>
                    </div>
                )}
            </button>
        </div>
    );
}
