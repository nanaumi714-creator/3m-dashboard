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
    <header className="mb-8 flex flex-col gap-4 border-b border-gray-200 pb-6 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">3m Dashboard</h1>
        <p className="text-sm text-gray-600">ローカル運用向けの取引可視化MVP</p>
      </div>
      <div className="flex flex-col gap-4 md:items-end">
        <nav className="flex flex-wrap gap-3 text-sm font-medium text-gray-600">
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
            "rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100",
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
