"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type GmailSyncLog = {
    id: string;
    status: string;
    started_at: string;
    completed_at: string | null;
    emails_processed: number | null;
    receipts_saved: number | null;
    error_message: string | null;
};

export default function GmailLogsPage() {
    const [logs, setLogs] = useState<GmailSyncLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLogs();
    }, []);

    async function loadLogs() {
        try {
            const { data, error } = await supabase
                .from("gmail_sync_logs")
                .select("*")
                .order("started_at", { ascending: false })
                .limit(50);

            if (error) throw error;
            setLogs(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-gray-600">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-6xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Gmail取り込み履歴</h1>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">実行日時</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">処理メール数</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">保存レシート数</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">所要時間</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        {new Date(log.started_at).toLocaleString("ja-JP")}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${log.status === "completed" ? "bg-green-100 text-green-800" :
                                                log.status === "running" ? "bg-blue-100 text-blue-800" :
                                                    "bg-red-100 text-red-800"
                                            }`}>
                                            {log.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        {log.emails_processed || 0}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        {log.receipts_saved || 0}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        {log.completed_at ?
                                            `${Math.round((new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000)}秒`
                                            : "-"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {logs.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-gray-500">取り込み履歴がありません</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
