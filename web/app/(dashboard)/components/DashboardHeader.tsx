"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { CreateMenu } from "./CreateMenu";
import { MasterMenu } from "./MasterMenu";
import { NavigationLinks } from "./NavigationLinks";

export default function DashboardHeader() {
  const router = useRouter();
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
        <Link href="/" replace className="flex flex-col shrink-0">
          <h1 className="text-xl font-black text-gray-900 leading-none tracking-tighter">3M</h1>
          <p className="text-[8px] text-blue-600 font-black tracking-widest uppercase mt-1">My Money Management</p>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-1 mx-6">
          <NavigationLinks />
          <div className="h-4 w-px bg-gray-100 mx-2" />
          <CreateMenu />
          <MasterMenu />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 md:gap-3 ml-auto">
          {/* Mobile Master Menu */}
          <div className="lg:hidden">
            <MasterMenu isMobile onSignOut={handleSignOut} />
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
