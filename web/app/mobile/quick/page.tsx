"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import CameraCapture from "../../(dashboard)/components/CameraCapture";

export default function MobileQuickEntryPage() {
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [showCamera, setShowCamera] = useState(false);

    async function handleQuickEntry(e: React.FormEvent) {
        e.preventDefault();

        if (!amount || !description) {
            alert("金額と内容を入力してください");
            return;
        }

        try {
            setLoading(true);

            const { error } = await supabase.from("transactions").insert({
                occurred_on: new Date().toISOString().split("T")[0],
                description: description,
                amount_yen: parseInt(amount),
                payment_method_id: null, // Will need to fetch default
            });

            if (error) throw error;

            alert("登録しました");
            setAmount("");
            setDescription("");
        } catch (err) {
            console.error(err);
            alert("エラーが発生しました");
        } finally {
            setLoading(false);
        }
    }

    async function handleCameraCapture(file: File) {
        try {
            // Upload to Supabase Storage
            const fileName = `receipts/${Date.now()}_${file.name}`;
            const { data, error } = await supabase.storage
                .from("receipts")
                .upload(fileName, file);

            if (error) throw error;

            // Create receipt record
            await supabase.from("receipts").insert({
                storage_path: data.path,
            });

            alert("レシートをアップロードしました");
            setShowCamera(false);
        } catch (err) {
            console.error(err);
            alert("アップロードに失敗しました");
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="container-mobile py-6 space-y-6">
                <h1 className="text-2xl font-bold">簡易入力</h1>

                {/* Quick cash entry */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold mb-4">現金支払い</h2>

                    <form onSubmit={handleQuickEntry} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                金額
                            </label>
                            <input
                                type="number"
                                inputMode="decimal"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="input-mobile"
                                placeholder="1000"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                内容
                            </label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="input-mobile"
                                placeholder="ランチ代"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-mobile w-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? "登録中..." : "登録"}
                        </button>
                    </form>
                </div>

                {/* Camera capture */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold mb-4">レシート撮影</h2>

                    {!showCamera ? (
                        <button
                            onClick={() => setShowCamera(true)}
                            className="btn-mobile w-full bg-green-600 text-white hover:bg-green-700"
                        >
                            カメラを起動
                        </button>
                    ) : (
                        <CameraCapture onCapture={handleCameraCapture} />
                    )}
                </div>
            </div>

            {/* Mobile navigation */}
            <nav className="nav-mobile">
                <a href="/dashboard" className="flex flex-col items-center text-gray-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span className="text-xs mt-1">ホーム</span>
                </a>

                <a href="/transactions" className="flex flex-col items-center text-gray-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="text-xs mt-1">取引</span>
                </a>

                <a href="/mobile/quick" className="flex flex-col items-center text-blue-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-xs mt-1">入力</span>
                </a>

                <a href="/reports" className="flex flex-col items-center text-gray-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="text-xs mt-1">レポート</span>
                </a>
            </nav>
        </div>
    );
}
