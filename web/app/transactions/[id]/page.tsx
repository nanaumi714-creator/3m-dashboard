import Link from "next/link";
import { notFound } from "next/navigation";
import { receipts, transactions } from "../../lib/mock-data";

export default function TransactionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const transaction = transactions.find((item) => item.id === params.id);

  if (!transaction) {
    notFound();
  }

  const relatedReceipts = receipts.filter(
    (receipt) => receipt.transactionId === transaction.id
  );

  return (
    <section>
      <div className="card">
        <h2>取引詳細</h2>
        <p>日付: {transaction.occurredOn}</p>
        <p>金額: ¥{transaction.amountYen.toLocaleString()}</p>
        <p>支払い手段: {transaction.paymentMethod}</p>
        <p>内容: {transaction.description}</p>
        <p>ベンダー: {transaction.vendorRaw}</p>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3>証憑</h3>
        {relatedReceipts.length === 0 ? (
          <p className="notice">証憑は未登録です。</p>
        ) : (
          <ul>
            {relatedReceipts.map((receipt) => (
              <li key={receipt.id}>
                <a href={receipt.storageUrl} target="_blank" rel="noreferrer">
                  {receipt.storageUrl}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <Link href="/transactions">← 取引一覧に戻る</Link>
      </div>
    </section>
  );
}
