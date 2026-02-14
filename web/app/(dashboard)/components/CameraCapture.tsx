"use client";

import { useRef, useState } from "react";
import Image from "next/image";

export default function CameraCapture({ onCapture }: { onCapture: (file: File) => void }) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Pass file to parent
        onCapture(file);
    }

    return (
        <div className="space-y-4">
            {/* Camera button - uses native camera on mobile */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment" // Use rear camera on mobile
                onChange={handleFileChange}
                className="hidden"
            />

            <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium active:scale-95 transition-transform"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>レシートを撮影</span>
            </button>

            {/* Preview */}
            {preview && (
                <div className="relative">
                    <Image
                        src={preview}
                        alt="Preview"
                        width={0}
                        height={0}
                        sizes="100vw"
                        className="w-full rounded-lg border border-gray-300 h-auto"
                        unoptimized
                    />
                    <button
                        onClick={() => {
                            setPreview(null);
                            if (fileInputRef.current) {
                                fileInputRef.current.value = "";
                            }
                        }}
                        className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
}
