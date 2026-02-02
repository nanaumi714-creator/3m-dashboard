"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const mainNavItems = [
    { href: "/transactions", label: "支出一覧" },
    { href: "/triage", label: "判定待ち" },
];

export function NavigationLinks() {
    const pathname = usePathname();

    return (
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
        </nav>
    );
}
