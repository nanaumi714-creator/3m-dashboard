"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    // デフォルトは経費タブへリダイレクト
    router.replace("/expenses");
  }, [router]);

  return (
    <div className="animate-pulse bg-white h-52 rounded-[32px] border border-gray-100" />
  );
}

