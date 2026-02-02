"use client";

import { useRef } from "react";

interface CsvDropzoneProps {
    fileName: string;
    onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CsvDropzone({ fileName, onFileChange }: CsvDropzoneProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div>
            <h2 className="text-lg font-black text-gray-900 mb-4">CSVファイルを選択</h2>
            <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group"
            >
                <svg className="mx-auto h-12 w-12 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="mt-4 text-sm font-bold text-gray-600">クリックしてファイルを選択</p>
                <p className="text-xs text-gray-400 mt-1">.csv 形式のファイルに対応しています</p>
            </div>
            <input
                ref={fileInputRef}
                type="file"
                accept="text/csv"
                onChange={onFileChange}
                className="hidden"
            />
            {fileName && (
                <div className="mt-4 flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-bold w-fit">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                    </svg>
                    選択中: {fileName}
                </div>
            )}
        </div>
    );
}
