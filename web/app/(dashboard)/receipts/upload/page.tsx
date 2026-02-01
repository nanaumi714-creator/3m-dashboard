"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type IntakeResponse = {
  receipt: { id: string };
  extraction?: {
    occurredOn: string | null;
    amountYen: number | null;
    vendorName: string | null;
  };
};

export default function ReceiptUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleSelectClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("runOcr", "true");

      const response = await fetch("/api/receipts/intake", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "アップロードに失敗しました。");
      }

      const data = (await response.json()) as IntakeResponse;
      const extraction = data.extraction;
      const params = new URLSearchParams();
      if (extraction?.occurredOn) {
        params.set("occurredOn", extraction.occurredOn);
      }
      if (extraction?.amountYen) {
        params.set("amountYen", String(extraction.amountYen));
      }
      if (extraction?.vendorName) {
        params.set("vendorName", extraction.vendorName);
      }

      const query = params.toString();
      const href = query
        ? `/receipts/review/${data.receipt.id}?${query}`
        : `/receipts/review/${data.receipt.id}`;

      router.push(href);
    } catch (error) {
      console.error("Receipt upload failed", error);
      setErrorMessage(
        error instanceof Error ? error.message : "アップロードに失敗しました。"
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            レシートをアップロード
          </h1>
          <p className="text-gray-600">
            OCRとLLM抽出の候補を作成し、内容を確認してから保存します。
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex flex-col items-center justify-center text-center gap-6 py-6">
            <div className="text-gray-600">
              レシート画像またはPDFを選択してください。
            </div>
            <button
              type="button"
              onClick={handleSelectClick}
              disabled={uploading}
              className="w-full max-w-md bg-blue-600 text-white px-6 py-6 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {uploading ? "解析中..." : "レシートを選択してアップロード"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            {errorMessage && (
              <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                {errorMessage}
              </p>
            )}
            <p className="text-sm text-gray-500">
              スマホの場合はカメラから撮影してアップロードできます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
