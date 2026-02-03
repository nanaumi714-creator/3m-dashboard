"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ResetPasswordConfirmPage() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleUpdatePassword(e: React.FormEvent) {
        e.preventDefault();

        if (password !== confirmPassword) {
            alert("パスワードが一致しません");
            return;
        }

        if (password.length < 8) {
            alert("パスワードは8文字以上で入力してください");
            return;
        }

        try {
            setLoading(true);

            const { error } = await supabase.auth.updateUser({
                password: password,
            });

            if (error) throw error;

            alert("パスワードを更新しました");
            router.push("/login");
        } catch (err) {
            console.error(err);
            alert("エラーが発生しました: " + (err instanceof Error ? err.message : "不明なエラー"));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">新しいパスワード設定</h1>
                <p className="text-gray-600 mb-6">
                    新しいパスワードを入力してください。
                </p>

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            新しいパスワード
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="8文字以上"
                            required
                            minLength={8}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            パスワード（確認）
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="もう一度入力"
                            required
                            minLength={8}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                    >
                        {loading ? "更新中..." : "パスワードを更新"}
                    </button>
                </form>
            </div>
        </div>
    );
}
