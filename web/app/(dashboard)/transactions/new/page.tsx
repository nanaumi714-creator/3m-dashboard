"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const SOURCE_TYPE = "manual";

type PaymentMethod = {
  id: string;
  name: string;
};

function normalizeVendor(raw: string): string {
  return raw
    .slice(0, 30)
    .normalize("NFKC")
    .replace(/[\s\p{P}\p{S}]/gu, "")
    .toLowerCase();
}

async function sha256(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function TransactionNewPage() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [occurredOn, setOccurredOn] = useState("");
  const [amountYen, setAmountYen] = useState("");
  const [description, setDescription] = useState("");
  const [vendorRaw, setVendorRaw] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadPaymentMethods() {
      try {
        const { data, error } = await supabase
          .from("payment_methods")
          .select("id, name")
          .eq("is_active", true)
          .order("name");
        if (error) throw error;
        setPaymentMethods(data || []);
      } catch (err) {
        console.error("Failed to load payment methods", err);
      }
    }

    loadPaymentMethods();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage(null);

    if (!occurredOn) {
      setStatusMessage("取引日を入力してください。");
      return;
    }

    if (!amountYen || !Number.isFinite(Number(amountYen))) {
      setStatusMessage("金額を入力してください。");
      return;
    }

    if (!paymentMethodId) {
      setStatusMessage("支払い手段を選択してください。");
      return;
    }

    if (!description.trim()) {
      setStatusMessage("内容を入力してください。");
      return;
    }

    const rawAmount = Number(amountYen);
    const normalizedAmount = rawAmount < 0 ? rawAmount : -Math.abs(rawAmount);

    if (normalizedAmount === 0) {
      setStatusMessage("金額は0以外を入力してください。");
      return;
    }

    setSubmitting(true);
    try {
      const vendorValue = vendorRaw.trim() || description.trim();
      const vendorNorm = normalizeVendor(vendorValue);
      const { data: sourceInsert, error: sourceError } = await supabase
        .from("import_sources")
        .insert({
          source_type: SOURCE_TYPE,
          metadata: {
            created_by: "gui",
          },
        })
        .select("id")
        .single();

      if (sourceError) throw sourceError;
      if (!sourceInsert?.id) {
        throw new Error("入力ソースの登録に失敗しました。");
      }

      const fingerprint = await sha256(
        [occurredOn, normalizedAmount, paymentMethodId, vendorNorm, SOURCE_TYPE].join("|")
      );

      const { error } = await supabase.from("transactions").insert({
        occurred_on: occurredOn,
        amount_yen: normalizedAmount,
        description: description.trim(),
        payment_method_id: paymentMethodId,
        import_source_id: sourceInsert.id,
        vendor_raw: vendorValue,
        vendor_norm: vendorNorm,
        fingerprint,
      });

      if (error) throw error;

      setStatusMessage("取引を登録しました。");
      setOccurredOn("");
      setAmountYen("");
      setDescription("");
      setVendorRaw("");
      setPaymentMethodId("");
    } catch (err) {
      console.error("Failed to create transaction", err);
      setStatusMessage(
        err instanceof Error ? err.message : "登録に失敗しました。"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">手入力</h1>
            <p className="text-gray-600">取引を直接登録します（JPY・支出はマイナス）。</p>
          </div>
          <Link
            href="/transactions"
            className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取引一覧へ戻る
          </Link>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  取引日
                </label>
                <input
                  type="date"
                  value={occurredOn}
                  onChange={(event) => setOccurredOn(event.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  金額（JPY, 支出はマイナス）
                </label>
                <input
                  type="number"
                  value={amountYen}
                  onChange={(event) => setAmountYen(event.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                内容
              </label>
              <input
                type="text"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="例: Adobe Creative Cloud"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ベンダー（任意）
              </label>
              <input
                type="text"
                value={vendorRaw}
                onChange={(event) => setVendorRaw(event.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="例: Adobe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                支払い手段
              </label>
              <select
                value={paymentMethodId}
                onChange={(event) => setPaymentMethodId(event.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">選択してください</option>
                {paymentMethods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <p className="text-sm text-gray-600">
                入力内容は保存後に編集可能です。
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "保存中..." : "保存する"}
              </button>
            </div>

            {statusMessage && (
              <p className="text-sm text-gray-700">{statusMessage}</p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
