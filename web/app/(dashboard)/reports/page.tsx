"use client";

import { useState } from "react";
// import { supabase } from "@/lib/supabase";

export default function ReportsPage() {
    const [filters, setFilters] = useState({
        startDate: "",
        endDate: "",
        isBusinessOnly: false,
        categoryId: "",
        minAmount: "",
        maxAmount: "",
    });

    const [generating, setGenerating] = useState(false);

    async function handleGenerate(format: "csv" | "excel" | "pdf") {
        try {
            setGenerating(true);

            const response = await fetch("/api/reports/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    format,
                    filters
                })
            });

            if (!response.ok) throw new Error("Failed to generate report");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `report_${new Date().toISOString().split("T")[0]}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (err) {
            console.error(err);
            alert("レポート生成に失敗しました");
        } finally {
            setGenerating(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">カスタムレポート作成</h1>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">フィルタ条件</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">開始日</label>
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">終了日</label>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">最小金額</label>
                            <input
                                type="number"
                                value={filters.minAmount}
                                onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                                placeholder="例: 1000"
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">最大金額</label>
                            <input
                                type="number"
                                value={filters.maxAmount}
                                onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                                placeholder="例: 10000"
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={filters.isBusinessOnly}
                                    onChange={(e) => setFilters({ ...filters, isBusinessOnly: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm font-medium text-gray-700">事業経費のみ</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold mb-4">出力形式</h2>

                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => handleGenerate("csv")}
                            disabled={generating}
                            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                        >
                            CSV ダウンロード
                        </button>

                        <button
                            onClick={() => handleGenerate("excel")}
                            disabled={generating}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                        >
                            Excel ダウンロード
                        </button>

                        <button
                            onClick={() => handleGenerate("pdf")}
                            disabled={generating}
                            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                        >
                            PDF ダウンロード
                        </button>
                    </div>

                    {generating && (
                        <div className="mt-4 text-sm text-gray-600">
                            レポートを生成中...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
