# カテゴリ設計ガイド

## 概要

経費カテゴリ（Expense Categories）は、事業支出を体系的に分類するための仕組みです。確定申告時の帳簿作成や、月次レポートでの分析に活用します。

---

## 1. 初期カテゴリ

システムには以下の基本カテゴリが用意されています：

| カテゴリ | 説明 | 具体例 |
|---------|------|--------|
| **事務用品** | Office supplies, stationery | 文房具、ノート、ファイル |
| **通信費** | Internet, phone, hosting | インターネット、携帯、サーバー |
| **交通費** | Transportation, travel | 電車、タクシー、出張旅費 |
| **会議費** | Meeting expenses, meals | カフェMTG、ランチ |
| **研修費** | Training, books, courses | 技術書、オンライン講座 |
| **その他** | Other business expenses | 雑費 |

---

## 2. カテゴリ追加

### 2.1 UIから追加

1. `/categories` ページを開く
2. 「+ 新しいカテゴリを追加」をクリック
3. 以下を入力：
   - **カテゴリ名**: 簡潔な名称（例: `広告宣伝費`）
   - **説明**: 具体例（例: `Google Ads、SNS広告`）

### 2.2 SQLで追加

```sql
INSERT INTO expense_categories (name, description)
VALUES ('広告宣伝費', 'Google Ads、SNS広告、アフィリエイト');
```

---

## 3. カテゴリ設計の考え方

### 3.1 業種別の推奨カテゴリ

#### エンジニア・フリーランス
- サーバー費用
- ソフトウェアライセンス
- 技術書・教材
- コワーキングスペース
- ドメイン・SSL

#### デザイナー
- デザインツール（Adobe CC等）
- 素材購入（写真、フォント）
- 機材（ペンタブ、モニター）

#### コンサルタント
- 交通費
- 会議費
- 接待交際費
- セミナー参加費

### 3.2 粒度の目安

#### 粗い分類（5-10カテゴリ）
**メリット**: 管理が楽、判定が早い  
**デメリット**: 詳細分析できない

**例:**
- IT関連費
- 移動費
- 消耗品
- その他

#### 細かい分類（20-30カテゴリ）
**メリット**: 詳細分析可能  
**デメリット**: 判定に迷う、管理コスト高

**例:**
- AWSクラウド費用
- Vercelホスティング
- GitHub Pro
- Notion
- Adobe CC
- ...

**推奨**: **10-15カテゴリ**が最適

---

## 4. カテゴリ運用ルール

### 4.1 命名規則

#### Good 👍
- `通信費` - シンプル
- `交通費（出張含む）` - 補足説明あり
- `SaaS利用料` - 業界用語

#### Bad 👎
- `インターネット回線とかサーバーとか` - 冗長
- `その他いろいろ` - 曖昧
- `2024年度専用` - 時限的

### 4.2 「その他」の使い方

- **頻度**: 全体の10%以下に抑える
- **用途**: 一時的・不定期な支出
- **見直し**: 月次で「その他」を確認し、パターンがあれば新カテゴリ化

### 4.3 カテゴリ変更時の注意

- **過去データは変更されない**: 変更後の取引のみ影響
- **無効化**: `is_active = false` で論理削除（物理削除は非推奨）

---

## 5. Vendor Rules との連携

### 5.1 デフォルトカテゴリ設定

ベンダーにデフォルトカテゴリを設定：

```sql
UPDATE vendors 
SET default_category_id = 'uuid-通信費'
WHERE name = 'Amazon';
```

### 5.2 Vendor Rules で上書き

より具体的な判定：

```sql
INSERT INTO vendor_rules 
  (vendor_id, category_id, is_business, business_ratio)
VALUES 
  ('uuid-amazon', 'uuid-通信費', true, 100);
```

---

## 6. 確定申告との対応

### 6.1 白色申告の場合

- カテゴリ粒度: 粗め（5-10個）
- 必要最低限: 収支内訳書の項目に対応

### 6.2 青色申告の場合

- カテゴリ粒度: 細かめ（15-20個）
- 科目対応: 勘定科目と1:1対応

#### 推奨マッピング

| 3Mカテゴリ | 勘定科目 |
|-----------|---------|
| 通信費 | 通信費 |
| 交通費 | 旅費交通費 |
| 会議費 | 会議費 |
| 研修費 | 研修費 |
| 事務用品 | 消耗品費 |
| 広告宣伝費 | 広告宣伝費 |
| その他 | 雑費 |

---

## 7. カテゴリ分析

### 7.1 月次レポート

カテゴリ別支出額を確認：

```sql
SELECT 
  c.name AS category,
  SUM(ABS(t.amount_yen)) AS total
FROM transactions t
JOIN transaction_business_info bi ON t.id = bi.transaction_id
JOIN expense_categories c ON bi.category_id = c.id
WHERE bi.is_business = true
  AND t.occurred_on >= '2024-01-01'
  AND t.occurred_on < '2024-02-01'
GROUP BY c.name
ORDER BY total DESC;
```

### 7.2 トレンド分析

月ごとの推移を確認：

```sql
SELECT 
  DATE_TRUNC('month', t.occurred_on) AS month,
  c.name AS category,
  SUM(ABS(t.amount_yen)) AS total
FROM transactions t
JOIN transaction_business_info bi ON t.id = bi.transaction_id
JOIN expense_categories c ON bi.category_id = c.id
WHERE bi.is_business = true
GROUP BY month, c.name
ORDER BY month, total DESC;
```

---

## 8. カテゴリ最適化

### 8.1 定期見直し（四半期ごと）

#### チェックポイント
- [ ] 使われていないカテゴリはないか
- [ ] 「その他」の割合は10%以下か
- [ ] 新しい支出パターンが出現していないか
- [ ] カテゴリ名が実態と合っているか

### 8.2 リファクタリング

#### 統合例
```
Before: AWS費用、Vercel費用、GitHub費用
After: SaaS利用料
```

#### 分割例
```
Before: IT関連費
After: サーバー費用、ソフトウェアライセンス、ドメイン費用
```

---

## 9. ベストプラクティス

### 9.1 初期設定

1. **Phase 1（初月）**: 基本6カテゴリのみ
2. **Phase 2（2-3ヶ月目）**: パターンが見えたら追加
3. **Phase 3（半年後）**: 安定運用

### 9.2 判定に迷った時のルール

- **優先度1**: 金額が大きい方のカテゴリ
- **優先度2**: より具体的な方
- **優先度3**: 「その他」

### 9.3 ドキュメント化

カテゴリごとに判定基準を明文化：

```markdown
## 通信費
- インターネット回線
- 携帯電話
- クラウドホスティング（AWS, Vercel等）
- ドメイン・SSL

## SaaS利用料
- 開発ツール（GitHub, Notion等）
- デザインツール（Figma, Adobe CC等）
- マーケティングツール
```

---

## 10. トラブルシューティング

### 問題: カテゴリが多すぎて選べない

**対処法**: 
- 20個以上なら統合検討
- 使用頻度の低いものを `is_active = false` に

### 問題: 「その他」が50%を超える

**対処法**:
- 「その他」の内訳を分析
- 頻出パターンを新カテゴリ化

### 問題: カテゴリが不足している

**対処法**:
- 月次レポートで未分類取引を確認
- 3回以上出現するパターンは新カテゴリ候補

---

## 参考リンク

- [ベンダー管理ガイド](./vendor_management.md)
- [CSV仕様書](./csv_spec.md)
- Web UI: [/categories](http://localhost:3000/categories)
