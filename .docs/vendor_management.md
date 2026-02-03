# ベンダー管理ガイド

## 概要

ベンダー（Vendor）機能を使うことで、取引先の表記ゆれを統一し、経費判定を自動化できます。

---

## 1. ベンダーマスタとは

### 1.1 構成要素

| テーブル | 役割 | 例 |
|---------|------|-----|
| **vendors** | 正規化された取引先名 | `Amazon` |
| **vendor_aliases** | 表記ゆれの辞書 | `ｱﾏｿﾞﾝ`, `Amazon Japan` |
| **vendor_rules** | 自動判定ルール | `Amazon` → 事業100%, カテゴリ=通信費 |

### 1.2 データフロー

```
CSVインポート
  ↓
vendor_raw: "ｱﾏｿﾞﾝ ｼﾞｬﾊﾟﾝ"
  ↓ (正規化)
vendor_norm: "amazon"
  ↓ (Alias照合)
vendor_id: uuid-amazon
  ↓ (Rules適用)
category_id: uuid-通信費
is_business: true
business_ratio: 100
```

---

## 2. ベンダー登録

### 2.1 UI から登録

1. `/vendors` ページを開く
2. 「+ 新しいベンダーを追加」をクリック
3. 以下を入力：
   - **名前**: 正規化された名称（例: `Amazon`）
   - **説明**: 任意（例: `オンラインショッピング`）
   - **デフォルトカテゴリ**: 経費カテゴリを選択

### 2.2 SQL で登録

```sql
INSERT INTO vendors (name, description, default_category_id)
VALUES ('Amazon', 'オンラインショッピング', 'uuid-通信費');
```

---

## 3. Alias（表記ゆれ）管理

### 3.1 Aliasとは

同一ベンダーの異なる表記を登録します。

**例: Amazonの場合**
- ｱﾏｿﾞﾝ
- Amazon Japan
- Amazonマーケットプレイス
- AMAZON.CO.JP

### 3.2 Alias登録

#### UI から（将来実装予定）
現在はSQL直接投入。

#### SQL で登録

```sql
INSERT INTO vendor_aliases (vendor_id, alias, confidence_score)
VALUES 
  ('uuid-amazon', 'ｱﾏｿﾞﾝ', 1.0),
  ('uuid-amazon', 'Amazon Japan', 1.0),
  ('uuid-amazon', 'Amazonマーケットプレイス', 0.9);
```

**confidence_score**: 
- `1.0` = 完全一致
- `0.9` = 高い確信度
- `0.7` = 中程度（曖昧な場合）

### 3.3 Alias照合ロジック

インポート時、以下の順で照合：

1. **完全一致**: `vendor_raw` が Alias と完全一致
2. **正規化一致**: `vendor_norm` が Alias の正規化値と一致
3. **部分一致**: 将来実装予定（Smart Suggestions）

---

## 4. Vendor Rules（自動判定）

### 4.1 Rulesとは

特定ベンダーの取引を自動的に分類するルール。

**例:**
- `Amazon` → 事業100%, カテゴリ=通信費
- `セブンイレブン` → 事業50%, カテゴリ=会議費

### 4.2 Rule作成

#### UI から（将来実装予定）
現在はSQL直接投入。

#### SQL で登録

```sql
INSERT INTO vendor_rules 
  (vendor_id, is_business, business_ratio, category_id, rule_priority)
VALUES 
  ('uuid-amazon', true, 100, 'uuid-通信費', 100),
  ('uuid-lawson', true, 80, 'uuid-会議費', 100);
```

**フィールド説明:**
- `is_business`: 経費かどうか（true/false）
- `business_ratio`: 按分率（0-100%）
- `category_id`: 経費カテゴリ
- `rule_priority`: 優先度（数値が小さいほど高優先）

### 4.3 Rule適用タイミング

- **CSVインポート時**: 自動適用
- **手動入力時**: 適用されない（将来実装予定）
- **Batch Actions時**: 適用されない

### 4.4 複数ルールがある場合

`rule_priority` が最も小さいルールを適用。

```sql
-- 優先度100のルールが適用される
INSERT INTO vendor_rules VALUES 
  ('uuid-amazon', true, 100, 'uuid-通信費', 100),
  ('uuid-amazon', true, 50, 'uuid-雑費', 200);
```

---

## 5. 運用ワークフロー

### 5.1 初回セットアップ

#### Step 1: 主要ベンダー登録
よく使う取引先10-20件を登録。

```sql
INSERT INTO vendors (name) VALUES 
  ('Amazon'),
  ('セブンイレブン'),
  ('ファミリーマート'),
  ('JR東日本'),
  ('Google Cloud');
```

#### Step 2: Alias登録
表記ゆれを登録（CSVインポート後、Triageで発見したものを追加）。

#### Step 3: Rules登録
確実に判定できるベンダーにルールを設定。

### 5.2 日常運用

#### 毎月のインポート後
1. `/triage` で未判定取引を確認
2. 新しいベンダーを発見 → 登録
3. 既存ベンダーの表記ゆれを発見 → Alias追加
4. 判定パターンが明確 → Rule追加

### 5.3 メンテナンス

#### 四半期ごと
- 使われていないベンダーを `is_active = false` に
- Rulesの精度確認（誤判定がないか）

---

## 6. ベストプラクティス

### 6.1 ベンダー名の命名規則

- **シンプル**: `Amazon`（良い） vs `Amazon.co.jp株式会社`（悪い）
- **統一**: `セブンイレブン`（良い） vs `7-Eleven`（混在は避ける）
- **正規化済み**: すでに正規化された形で登録

### 6.2 Alias登録のコツ

- **実際の取引データから**: CSVに出現した表記を登録
- **過剰登録しない**: 似ているが別物は別ベンダーに

### 6.3 Rule作成のコツ

- **確実な場合のみ**: 90%以上確信があるもの
- **段階的**: 最初は主要5-10ベンダーのみ
- **定期見直し**: 誤判定が発生したらRuleを調整

---

## 7. トラブルシューティング

### 問題: ベンダーが自動リンクされない

**原因**: Aliasに登録されていない

**対処法**:
1. Triageで `vendor_raw` を確認
2. 対応するベンダーの Alias に追加

### 問題: Ruleが適用されない

**原因**: 
- インポート前にベンダーリンクされていない
- Rule の `is_active = false` になっている

**対処法**:
1. ベンダーリンク確認
2. Rule の `is_active` を確認

### 問題: 誤ったRuleが適用される

**原因**: 複数Ruleで優先度が正しくない

**対処法**:
```sql
SELECT * FROM vendor_rules 
WHERE vendor_id = 'uuid-問題のベンダー'
ORDER BY rule_priority;
```

優先度を調整。

---

## 8. 高度な使い方

### 8.1 条件付きRule（将来実装予定）

金額に応じた判定：
- 3,000円以下 → 会議費
- 3,000円超 → 接待費

### 8.2 時期別Rule（将来実装予定）

- 1-3月: 確定申告準備期間 → より厳格な判定
- 4-12月: 通常判定

---

## 参考リンク

- [CSV仕様書](./csv_spec.md)
- [fingerprint仕様](./fingerprint.md)
- [カテゴリ設計ガイド](./category_guide.md)
- Web UI: [/vendors](http://localhost:3000/vendors)
