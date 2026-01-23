import { buildSummary } from "./lib/summary";
import { transactions } from "./lib/mock-data";

export default function DashboardPage() {
  const summary = buildSummary(transactions);

  return (
    <section>
      <div className="card-grid">
        <div className="card">
          <h3>今月の収入</h3>
          <p>¥{summary.income.toLocaleString()}</p>
        </div>
        <div className="card">
          <h3>今月の支出</h3>
          <p>¥{Math.abs(summary.expenses).toLocaleString()}</p>
        </div>
        <div className="card">
          <h3>差額</h3>
          <p>¥{summary.balance.toLocaleString()}</p>
        </div>
        <div className="card">
          <h3>未判定</h3>
          <p>{summary.untriaged} 件</p>
        </div>
      </div>

      <div className="card">
        <h2>今週のアクション</h2>
        <ul>
          <li>未判定取引をTriage Queueで判定する</li>
          <li>CSVをImporterに配置して半自動登録を試す</li>
          <li>支払い手段別の傾向を確認</li>
        </ul>
      </div>
    </section>
  );
}
