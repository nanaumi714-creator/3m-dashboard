"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fetchVisibleExpenseCategories } from "@/lib/expense-categories";
import { Database } from "@/lib/database.types";

type PaymentMethod = Database["public"]["Tables"]["payment_methods"]["Row"];
type ExpenseCategory = Database["public"]["Tables"]["expense_categories"]["Row"];

export default function CashEntryPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        occurred_on: new Date().toISOString().split("T")[0],
        amount_yen: "",
        description: "",
        is_business: false,
        business_ratio: 100,
        category_id: "",
    });

    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [cashPaymentId, setCashPaymentId] = useState<string>("");

    useState(() => {
        loadData();
    });

    async function loadData() {
        const { data: pmData } = await supabase
            .from("payment_methods")
            .select("*")
            .eq("type", "cash")
            .eq("is_active", true);

        setPaymentMethods(pmData || []);
        if (pmData && pmData.length > 0) {
            setCashPaymentId(pmData[0].id);
        }

        const catData = await fetchVisibleExpenseCategories(supabase);
        setCategories(catData || []);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            // Insert transaction
            const { data: transaction, error: txError } = await supabase
                .from("transactions")
                .insert({
                    occurred_on: formData.occurred_on,
                    amount_yen: -Math.abs(parseInt(formData.amount_yen)),
                    description: formData.description,
                    payment_method_id: cashPaymentId,
                    vendor_raw: formData.description,
                    vendor_norm: formData.description.toLowerCase().replace(/\s+/g, ""),
                    fingerprint: "manual-" + Date.now(), // Simple fingerprint for manual entry
                })
                .select()
                .single();

            if (txError) throw txError;

            // Insert business info if checked
            if (formData.is_business && transaction) {
                const { error: biError } = await supabase
                    .from("transaction_business_info")
                    .insert({
                        transaction_id: transaction.id,
                        is_business: true,
                        business_ratio: formData.business_ratio,
                        category_id: formData.category_id || null,
                        judged_by: "manual_entry",
                        judged_at: new Date().toISOString(),
                        audit_note: null,
                    });

                if (biError) throw biError;
            }

            alert("現金取引を登録しました");
            router.push("/transactions");
        } catch (error) {
            console.error(error);
            alert("登録に失敗しました: " + (error instanceof Error ? error.message : ""));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-2xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">現金取引入力</h1>

                <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                    {/* Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">取引日 *</label>
                        <input
                            type="date"
                            required
                            value={formData.occurred_on}
                            onChange={(e) => setFormData({ ...formData, occurred_on: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">金額（円） *</label>
                        <input
                            type="number"
                            required
                            value={formData.amount_yen}
                            onChange={(e) => setFormData({ ...formData, amount_yen: e.target.value })}
                            placeholder="例: 1500"
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-sm text-gray-500 mt-1">支出として記録されます</p>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">内容 *</label>
                        <input
                            type="text"
                            required
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="例: コンビニ購入"
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Business Flag */}
                    <div className="border-t border-gray-200 pt-6">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={formData.is_business}
                                onChange={(e) => setFormData({ ...formData, is_business: e.target.checked })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700">事業経費として記録</span>
                        </label>
                    </div>

                    {/* Business Details */}
                    {formData.is_business && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">按分率 (%)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formData.business_ratio}
                                    onChange={(e) => setFormData({ ...formData, business_ratio: parseInt(e.target.value) })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">カテゴリ</label>
                                <select
                                    value={formData.category_id}
                                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">（未分類）</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    {/* Submit */}
                    <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                        >
                            {loading ? "登録中..." : "登録"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
