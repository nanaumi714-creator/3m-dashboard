"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TemplatesPage() {
    const [templates, setTemplates] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newTemplate, setNewTemplate] = useState({
        name: "",
        columns: ["occurred_on", "description", "amount_yen", "category_name"],
        filters: {}
    });

    const availableColumns = [
        { key: "occurred_on", label: "取引日" },
        { key: "description", label: "内容" },
        { key: "vendor_name", label: "取引先" },
        { key: "amount_yen", label: "金額" },
        { key: "category_name", label: "カテゴリ" },
        { key: "is_business", label: "事業フラグ" },
        { key: "business_ratio", label: "按分率" },
        { key: "payment_method_name", label: "支払い方法" },
    ];

    async function handleCreate() {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any)
                .from("export_templates")
                .insert({
                    name: newTemplate.name,
                    format: "csv",
                    columns: newTemplate.columns,
                    filters: newTemplate.filters
                });

            if (error) throw error;
            alert("テンプレートを作成しました");
            setShowAddForm(false);
            setNewTemplate({ name: "", columns: [], filters: {} });
        } catch (err) {
            console.error(err);
            alert("作成に失敗しました");
        }
    }

    function toggleColumn(columnKey: string) {
        if (newTemplate.columns.includes(columnKey)) {
            setNewTemplate({
                ...newTemplate,
                columns: newTemplate.columns.filter(c => c !== columnKey)
            });
        } else {
            setNewTemplate({
                ...newTemplate,
                columns: [...newTemplate.columns, columnKey]
            });
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">エクスポートテンプレート</h1>

                <button
                    onClick={() => setShowAddForm(true)}
                    className="mb-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                    + 新しいテンプレートを作成
                </button>

                {showAddForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
                            <h2 className="text-xl font-semibold mb-4">新しいテンプレート</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        テンプレート名
                                    </label>
                                    <input
                                        type="text"
                                        value={newTemplate.name}
                                        onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="例: 確定申告用"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        出力カラム
                                    </label>
                                    <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                                        {availableColumns.map((col) => (
                                            <label key={col.key} className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={newTemplate.columns.includes(col.key)}
                                                    onChange={() => toggleColumn(col.key)}
                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                />
                                                <span className="ml-2 text-sm text-gray-700">{col.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    onClick={() => setShowAddForm(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                >
                                    キャンセル
                                </button>
                                <button
                                    onClick={handleCreate}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                                >
                                    作成
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
