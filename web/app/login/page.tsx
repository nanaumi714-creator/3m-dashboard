"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getClientSession, onAuthStateChange, supabase } from "@/lib/supabase";

function normalizeRedirect(path: string | null) {
  if (!path) return "/dashboard";
  if (!path.startsWith("/")) return "/dashboard";
  return path;
}

function formatAuthError(code: string, description?: string | null) {
  switch (code) {
    case "missing_code":
      return "OAuth の認証コードが見つかりませんでした。もう一度ログインしてください。";
    case "access_denied":
      return "Google ログインがキャンセルされました。";
    case "oauth_exchange_failed":
      return "認証情報の交換に失敗しました。もう一度ログインしてください。";
    case "invalid_redirect_uri":
      return "リダイレクト URL が許可されていません。Supabase の設定を確認してください。";
    default:
      if (description) return decodeURIComponent(description);
      return "ログインに失敗しました。もう一度お試しください。";
  }
}

function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const redirectTo = useMemo(
    () => normalizeRedirect(searchParams.get("redirectTo")),
    [searchParams]
  );

  useEffect(() => {
    const error = searchParams.get("error");
    const description = searchParams.get("error_description");
    if (error) {
      setErrorMessage(formatAuthError(error, description));
    }
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      const { data, error } = await getClientSession();
      if (!isMounted) return;
      if (error) {
        console.error("Failed to read session", error);
      }
      if (data.session) {
        router.replace("/dashboard");
        return;
      }
      setLoading(false);
    }

    checkSession();

    const { data } = onAuthStateChange((_event, session) => {
      if (session) {
        router.replace("/dashboard");
      }
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [router]);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setErrorMessage(null);
    try {
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("redirectTo", redirectTo);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
        },
      });
      if (error) {
        setErrorMessage("Google ログインに失敗しました。もう一度お試しください。");
        console.error("Failed to sign in with Google", error);
      }
    } catch (err) {
      setErrorMessage("Google ログインに失敗しました。もう一度お試しください。");
      console.error("Failed to sign in with Google", err);
    } finally {
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 text-gray-600 shadow-sm">
            セッションを確認しています…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen items-center justify-center px-4 py-8 md:px-8 lg:px-12">
        <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            ログイン
          </h1>
          <p className="mt-2 text-gray-600 font-medium">
            3m Dashboard を利用するには Google アカウントでログインしてください。
          </p>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="mt-6 w-full rounded-2xl bg-blue-600 px-6 py-3.5 text-white font-bold shadow-lg shadow-blue-100 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={signingIn}
          >
            {signingIn ? "Google にリダイレクト中…" : "Google でログイン"}
          </button>

          {errorMessage && (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">
              {errorMessage}
            </p>
          )}

          <div className="mt-6 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600 font-medium">
            <p>ログイン後はダッシュボードへ移動します。</p>
            <p className="mt-2">
              Supabase Auth の Google OAuth を使用しています。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50">
          <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 text-gray-600 shadow-sm">
              セッションを確認しています…
            </div>
          </div>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
