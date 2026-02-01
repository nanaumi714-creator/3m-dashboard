import Link from "next/link";

export default function ReceiptCompletePage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            保存が完了しました
          </h1>
          <p className="text-gray-600 mb-6">
            取引とレシートの紐付けが完了しました。
          </p>
          <div className="flex flex-col md:flex-row gap-3">
            <Link
              href={`/transactions/${params.id}`}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm text-center"
            >
              取引詳細を見る
            </Link>
            <Link
              href="/receipts/upload"
              className="bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium text-center"
            >
              続けてアップロード
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
