"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Receipt = {
    id: string;
    transaction_id: string | null;
    storage_url: string;
    original_filename: string | null;
    content_type: string | null;
    file_size_bytes: number | null;
    user_id: string | null;
    ocr_text: string | null;
    ocr_confidence: number | null;
    uploaded_at: string;
};

export default function ReceiptDetailPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const receiptId = typeof params.id === "string" ? params.id : "";
    const [receipt, setReceipt] = useState<Receipt | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [editedText, setEditedText] = useState("");

    useEffect(() => {
        if (!receiptId) return;

        async function loadReceipt() {
            try {
                if (!receiptId) return;
                const { data, error } = await supabase
                    .from("receipts")
                    .select("*")
                    .eq("id", receiptId)
                    .single();

                if (error) throw error;
                setReceipt(data);
                setEditedText(data.ocr_text || "");
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        loadReceipt();
    }, [receiptId]);

    async function handleSave() {
        try {
            if (!receiptId) return;
            const { error } = await supabase
                .from("receipts")
                .update({ ocr_text: editedText })
                .eq("id", receiptId);

            if (error) throw error;
            setEditing(false);
            alert("保存しました");
        } catch (err) {
            console.error(err);
            alert("保存に失敗しました");
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-gray-600">Loading...</div>
            </div>
        );
    }

    if (!receipt) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-red-600">Receipt not found</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">OCR結果確認・修正</h1>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">OCR抽出テキスト</h2>

                    {receipt.ocr_confidence && (
                        <div className="mb-4">
                            <span className="text-sm text-gray-600">信頼度: </span>
                            <span className={`font-medium ${receipt.ocr_confidence > 0.8 ? 'text-green-600' :
                                receipt.ocr_confidence > 0.5 ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                {(receipt.ocr_confidence * 100).toFixed(1)}%
                            </span>
                        </div>
                    )}

                    {editing ? (
                        <div>
                            <textarea
                                value={editedText}
                                onChange={(e) => setEditedText(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-4 font-mono text-sm min-h-[300px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex justify-end space-x-3 mt-4">
                                <button
                                    onClick={() => {
                                        setEditing(false);
                                        setEditedText(receipt.ocr_text || "");
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                >
                                    キャンセル
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                                >
                                    保存
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <pre className="bg-gray-50 p-4 rounded-lg border border-gray-200 font-mono text-sm whitespace-pre-wrap min-h-[300px]">
                                {receipt.ocr_text || "（OCRテキストがありません）"}
                            </pre>
                            <button
                                onClick={() => setEditing(true)}
                                className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                            >
                                編集
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex justify-between">
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                        戻る
                    </button>
                </div>
            </div>
        </div>
    );
}
