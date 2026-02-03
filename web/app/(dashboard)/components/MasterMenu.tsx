"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const masterNavItems = [
    { href: "/vendors", label: "取引先管理" },
    { href: "/categories", label: "カテゴリ管理" },
    { href: "/exports", label: "CSV出力・レポート" }
];

interface MasterMenuProps {
    isMobile?: boolean;
    onSignOut?: () => void;
}

export function MasterMenu({ isMobile, onSignOut }: MasterMenuProps) {
    const pathname = usePathname();
    const [showMenu, setShowMenu] = useState(false);

    if (isMobile) {
        return (
            <div className="relative">
                <button
                    onClick={() => setShowMenu(!showMenu)}
                    className={cn(
                        "p-2.5 rounded-xl transition-all",
                        masterNavItems.some(i => pathname === i.href) || showMenu ? "bg-blue-50 text-blue-600" : "bg-gray-50 text-gray-400"
                    )}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                </button>

                {showMenu && (
                    <>
                        <div className="fixed inset-0 z-[105]" onClick={() => setShowMenu(false)} />
                        <div className="absolute top-full right-0 mt-2 z-[110] animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl p-2 min-w-[200px]">
                                <div className="px-3 py-2 border-b border-gray-50 mb-1">
                                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Settings & Master</span>
                                </div>
                                {masterNavItems.map(item => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setShowMenu(false)}
                                        className={cn(
                                            "block px-4 py-3 rounded-xl text-[12px] font-bold transition-all",
                                            pathname === item.href ? "bg-blue-50 text-blue-600" : "text-gray-500 active:bg-gray-50"
                                        )}
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                                {onSignOut && (
                                    <div className="mt-2 pt-2 border-t border-gray-50">
                                        <button
                                            onClick={() => {
                                                setShowMenu(false);
                                                onSignOut();
                                            }}
                                            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-[12px] font-black text-red-400 active:bg-red-50 transition-all"
                                        >
                                            LOGOUT
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="relative">
            <button
                onMouseEnter={() => setShowMenu(true)}
                onMouseLeave={() => setShowMenu(false)}
                className={cn(
                    "px-4 py-2.5 rounded-2xl text-[12px] font-bold transition-all whitespace-nowrap flex items-center gap-2",
                    masterNavItems.some(i => pathname === i.href) ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
                )}
            >
                設定・マスタ
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>

                {showMenu && (
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
    );
}
