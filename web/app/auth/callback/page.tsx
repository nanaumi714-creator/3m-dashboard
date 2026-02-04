"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function normalizeRedirect(path: string | null) {
  if (!path) return "/dashboard";
  if (!path.startsWith("/")) return "/dashboard";
  return path;
}

function parseHashParams(hash: string) {
  const trimmed = hash.startsWith("#") ? hash.slice(1) : hash;
  return new URLSearchParams(trimmed);
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function finalizeAuth() {
      const currentUrl = new URL(window.location.href);
      const code = currentUrl.searchParams.get("code");
      const redirectTo = normalizeRedirect(
        currentUrl.searchParams.get("redirectTo")
      );
      const error = currentUrl.searchParams.get("error");
      const errorDescription = currentUrl.searchParams.get("error_description");

      if (error) {
        if (!isMounted) return;
        setErrorMessage(
          errorDescription
            ? decodeURIComponent(errorDescription)
            : "ログインに失敗しました。"
        );
        return;
      }

      try {
        const { data: existingSession } = await supabase.auth.getSession();
        if (existingSession.session) {
          router.replace(redirectTo);
          return;
        }

        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            throw exchangeError;
          }
        } else {
          const hashParams = parseHashParams(currentUrl.hash);
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessionError) {
              throw sessionError;
            }
          } else {
            const { data: sessionAfterHash } = await supabase.auth.getSession();
            if (sessionAfterHash.session) {
              router.replace(redirectTo);
              return;
            }
            throw new Error("missing_code");
          }
        }

        window.history.replaceState({}, document.title, currentUrl.pathname);
        router.replace(redirectTo);
      } catch (err) {
        console.error("OAuth callback error:", err);
        if (!isMounted) return;
        setErrorMessage(
          "OAuth の認証コードが見つかりませんでした。もう一度ログインしてください。"
        );
      }
    }

    finalizeAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-gray-600 shadow-sm">
          {errorMessage ?? "ログイン処理中です…"}
        </div>
      </div>
    </div>
  );
}
