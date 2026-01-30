"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getClientSession, onAuthStateChange, supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      const { data, error } = await getClientSession();
      if (!isMounted) return;
      if (error) {
        console.error("Failed to read session", error);
      }
      if (data.session) {
        router.replace("/");
        return;
      }
      setLoading(false);
    }

    checkSession();

    const { data } = onAuthStateChange((_event, session) => {
      if (session) {
        router.replace("/");
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
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      if (error) {
        setErrorMessage("Googleログインに失敗しました。再度お試しください。");
        console.error("Failed to sign in with Google", error);
      }
    } catch (err) {
      setErrorMessage("Googleログインに失敗しました。再度お試しください。");
      console.error("Failed to sign in with Google", err);
    } finally {
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-600 shadow-sm">
            認証状態を確認しています...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900">ログイン</h1>
          <p className="mt-2 text-gray-600">
            3m Dashboard にアクセスするには Google アカウントでログインしてください。
          </p>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="mt-6 w-full rounded-lg bg-blue-600 px-6 py-3 text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={signingIn}
          >
            {signingIn ? "Googleに接続中..." : "Googleでログイン"}
          </button>

          {errorMessage && (
            <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          )}

          <div className="mt-6 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <p>ログイン後はダッシュボード画面に戻ります。</p>
            <p className="mt-2">Supabase Auth の Google OAuth を優先して利用します。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
