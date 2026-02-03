"use client";

import { cn } from "@/lib/utils";

interface ValidationResult {
    rowNumber: number;
    issues: string[];
}

interface CsvPreviewProps {
    headers: string[];
    rows: any[];
    validationErrors: ValidationResult[];
    validationSummary: {
        totalRows: number;
        errorCount: number;
        missingHeaders: string[];
    };
}

export function CsvPreview({
    headers,
    rows,
    validationErrors,
    validationSummary,
}: CsvPreviewProps) {
    if (rows.length === 0) {
        return (
            <div className="py-10 text-center">
                <p className="text-gray-400 font-medium">CSVを選ぶとここにデータが表示されます</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-6 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    Total: {validationSummary.totalRows}
                </span>
                <span className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", validationSummary.errorCount > 0 ? "bg-red-500" : "bg-green-500")}></div>
                    Errors: {validationSummary.errorCount}
                </span>
            </div>

            <div className="overflow-x-auto border border-gray-100 rounded-2xl shadow-inner bg-gray-50/30">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50/50 text-gray-500 text-[10px] font-black uppercase tracking-wider">
                        <tr>
                            {headers.map((header) => (
                                <th key={header} className="px-5 py-4 text-left border-b border-gray-100">
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {rows.slice(0, 5).map((row, index) => (
                            <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                                {headers.map((header) => (
                                    <td key={header} className="px-5 py-4 text-gray-600 font-medium">
                                        {row[header]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
                    <p className="text-sm font-black text-red-700 mb-3">
                        フォーマットエラーが見つかりました（先頭5件）
                    </p>
                    <ul className="text-sm text-red-600 space-y-2 font-medium">
                        {validationErrors.slice(0, 5).map((error) => (
                            <li key={error.rowNumber} className="flex items-center gap-2">
                                <span className="bg-red-200 text-red-800 text-[10px] px-2 py-0.5 rounded-full font-black">
                                    {error.rowNumber}行目
                                </span>
                                {error.issues.join(" / ")}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
