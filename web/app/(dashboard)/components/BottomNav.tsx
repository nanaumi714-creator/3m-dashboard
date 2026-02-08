"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const items = [
    {
        href: "/balance",
        label: "残高",
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                <path d="M12 18V6" />
            </svg>
        ),
    },
    {
        href: "/expenses",
        label: "経費",
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" />
                <path d="m19 9-5 5-4-4-3 3" />
            </svg>
        ),
    },
    {
        href: "/transactions",
        label: "取引",
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
        ),
    },
    {
        href: "/triage",
        label: "判定",
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 12h6" />
                <path d="M12 9v6" />
            </svg>
        ),
    },
];

export default function BottomNav() {
    const pathname = usePathname();
    const [showAddMenu, setShowAddMenu] = useState(false);
    const hasPushedMenuStateRef = useRef(false);

    useEffect(() => {
        const handlePopState = () => {
            if (!hasPushedMenuStateRef.current) return;
            hasPushedMenuStateRef.current = false;
            setShowAddMenu(false);
        };

        window.addEventListener("popstate", handlePopState);
        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
    }, []);

    useEffect(() => {
        if (!showAddMenu) return;
        if (hasPushedMenuStateRef.current) return;

        window.history.pushState({ __addMenuOpen: true }, "");
        hasPushedMenuStateRef.current = true;
    }, [showAddMenu]);

    const closeAddMenu = () => {
        if (!showAddMenu) return;
        if (hasPushedMenuStateRef.current) {
            window.history.back();
            return;
        }
        setShowAddMenu(false);
    };

    return (
        <>
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 px-4 py-3 flex justify-between items-center z-[100] pb-8">
                {items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center gap-1 transition-all flex-1",
                                isActive ? "text-blue-600 font-black" : "text-gray-300 font-bold"
                            )}
                        >
                            <div className={cn("p-1.5 rounded-xl transition-all", isActive ? "bg-blue-50" : "")}>
                                {item.icon}
                            </div>
                            <span className="text-[10px] tracking-tighter">{item.label}</span>
                        </Link>
                    );
                })}

                <button
                    onClick={() => setShowAddMenu(true)}
                    className="flex flex-col items-center gap-1 flex-1 text-gray-300 font-bold"
                >
                    <div className="p-1.5 rounded-xl bg-gray-900 text-white shadow-lg shadow-gray-200">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                    </div>
                    <span className="text-[10px] tracking-tighter">追加</span>
                </button>
            </nav>

            {/* Add Menu Modal */}
            {showAddMenu && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[110] flex items-end animate-in fade-in duration-200" onClick={closeAddMenu}>
                    <div className="bg-white w-full rounded-t-[40px] p-8 pb-12 animate-in slide-in-from-bottom-20 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="w-12 h-1 bg-gray-100 rounded-full mx-auto mb-8" />
                        <h3 className="text-xl font-black text-gray-900 mb-6 tracking-tight">登録方法を選択</h3>

                        <div className="grid grid-cols-1 gap-3">
                            <Link
                                href="/receipts/upload"
                                onClick={() => setShowAddMenu(false)}
                                className="flex items-center gap-4 p-5 bg-blue-50 text-blue-600 rounded-3xl hover:bg-blue-100 transition-all group"
                            >
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-active:scale-95 transition-transform">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                                </div>
                                <div className="flex-1">
                                    <span className="block font-black text-sm">レシートを登録</span>
                                    <span className="block text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-0.5">Receipt</span>
                                </div>
                            </Link>

                            <Link
                                href="/transactions/new"
                                onClick={() => setShowAddMenu(false)}
                                className="flex items-center gap-4 p-5 bg-gray-50 text-gray-700 rounded-3xl hover:bg-gray-100 transition-all group"
                            >
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-active:scale-95 transition-transform">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                </div>
                                <div className="flex-1">
                                    <span className="block font-black text-sm">手動で入力</span>
                                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Manual Entry</span>
                                </div>
                            </Link>

                            <Link
                                href="/imports"
                                onClick={() => setShowAddMenu(false)}
                                className="flex items-center gap-4 p-5 bg-gray-50 text-gray-700 rounded-3xl hover:bg-gray-100 transition-all group"
                            >
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-active:scale-95 transition-transform">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                </div>
                                <div className="flex-1">
                                    <span className="block font-black text-sm">CSVインポート</span>
                                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Batch Import</span>
                                </div>
                            </Link>
                        </div>

                        <button
                            onClick={closeAddMenu}
                            className="w-full mt-8 py-4 text-xs font-black text-gray-300 uppercase tracking-widest"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
