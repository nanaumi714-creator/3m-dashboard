"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type FeedbackData = {
    receipt_id: string;
    ocr_request_id: string;
    feedback_type: "accuracy" | "missing_field" | "wrong_format" | "other";
    details: string;
    corrected_data?: any;
};

export default function OCRFeedbackForm({ receiptId, ocrRequestId }: { receiptId: string; ocrRequestId: string }) {
    const [feedbackType, setFeedbackType] = useState<FeedbackData["feedback_type"]>("accuracy");
    const [details, setDetails] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        try {
            setSubmitting(true);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any)
                .from("ocr_feedback")
                .insert({
                    receipt_id: receiptId,
                    ocr_request_id: ocrRequestId,
                    feedback_type: feedbackType,
                    details: details,
                });

            if (error) throw error;

            alert("フィードバックを送信しました。ご協力ありがとうございます！");
            setDetails("");
        } catch (err) {
            console.error(err);
            alert("送信に失敗しました");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 mt-6">
            <h3 className="text-lg font-semibold mb-4">OCR精度向上にご協力ください</h3>
            <p className="text-sm text-gray-600 mb-4">
                OCR結果に問題がある場合、フィードバックをお送りください。
                今後の精度向上に活用させていただきます。
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        問題の種類
                    </label>
                    <select
                        value={feedbackType}
                        onChange={(e) => setFeedbackType(e.target.value as FeedbackData["feedback_type"])}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="accuracy">認識精度が低い</option>
                        <option value="missing_field">項目が抽出されていない</option>
                        <option value="wrong_format">フォーマットが間違っている</option>
                        <option value="other">その他</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        詳細（任意）
                    </label>
                    <textarea
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                        placeholder="具体的な問題点や改善提案があればお書きください"
                    />
                </div>

                <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                    {submitting ? "送信中..." : "フィードバックを送信"}
                </button>
            </form>
        </div>
    );
}
