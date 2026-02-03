"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function PasswordResetPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    async function handleReset(e: React.FormEvent) {
        e.preventDefault();

        if (!email.trim()) {
            alert("メールアドレスを入力してください");
            return;
        }

        try {
            setLoading(true);

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/reset-password-confirm`,
            });

            if (error) throw error;

            setSent(true);
        } catch (err) {
            console.error(err);
            alert("エラーが発生しました: " + (err instanceof Error ? err.message : "不明なエラー"));
        } finally {
            setLoading(false);
        }
    }

    if (sent) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">メール送信完了</h2>
                    <p className="text-gray-600 mb-6">
                        パスワードリセット用のリンクを {email} に送信しました。
                        メールを確認してください。
                    </p>
                    <button
                        onClick={() => router.push("/login")}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                        ログインページに戻る
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">パスワードリセット</h1>
                <p className="text-gray-600 mb-6">
                    登録されているメールアドレスを入力してください。
                    パスワードリセット用のリンクを送信します。
                </p>

                <form onSubmit={handleReset} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            メールアドレス
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="example@email.com"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                    >
                        {loading ? "送信中..." : "リセットリンクを送信"}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => router.push("/login")}
                        className="text-sm text-blue-600 hover:underline"
                    >
                        ログインページに戻る
                    </button>
                </div>
            </div>
        </div>
    );
}
