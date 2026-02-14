# CSV仕様書

## 概要

3M Dashboardは現在、以下のCSVフォーマットに対応しています：

1. **クレジットカード明細** - 標準形式

将来的に以下の形式にも対応予定です：
- 銀行口座明細
- d払い明細
- カスタム形式（`import_configs`テーブル経由）

---

## 1. クレジットカード明細（標準形式）

### 必須カラム

| カラム名 | 説明 | 例 | 備考 |
|---------|------|-----|------|
| `occurred_on` | 取引日 | `2024-01-15` | YYYY-MM-DD形式 |
| `amount_yen` | 金額（円） | `-3500` | 負数=支出、正数=収入 |
| `description` | 取引内容 | `コンビニ 東京店` | 自由形式 |
| `payment_method_id` | 支払い方法ID | `uuid形式` | `payment_methods`テーブルのID |

### オプションカラム

| カラム名 | 説明 | 例 | デフォルト |
|---------|------|-----|----------|
| `vendor_raw` | 加盟店名（生データ） | `ｺﾝﾋﾞﾆ ﾄｳｷﾖｳ` | `description`から抽出 |

---

## 2. CSVインポートルール

### 2.1 ファイル形式
- **エンコーディング**: UTF-8 推奨（Shift_JIS, CP932も自動検出）
- **区切り文字**: カンマ (`,`)
- **ヘッダー行**: 必須（1行目）
- **データ行**: 2行目以降

### 2.2 重複検出ロジック

取引の一意性は **fingerprint** で判定します。

#### Fingerprint生成ルール
```python
fingerprint = SHA256(
    occurred_on + "|" + 
    abs(amount_yen) + "|" + 
    normalize(description) + "|" + 
    payment_method_id
)
```

#### Normalization（正規化）ルール
- 半角/全角統一（全角→半角）
- 空白除去
- 記号除去（一部）
- 小文字統一

### 2.3 重複時の挙動
- 同一 `fingerprint` の取引が既存の場合、**スキップ**（挿入しない）
- インポート結果ログに「Skipped (duplicate)」と記録

### 2.4 Vendor正規化

`vendor_raw` から `vendor_norm` を自動生成します：

| vendor_raw | vendor_norm | 説明 |
|-----------|-------------|------|
| `ｱﾏｿﾞﾝ ｼﾞｬﾊﾟﾝ` | `amazon` | カナ→英字、全角→半角 |
| `セブン-イレブン 渋谷店` | `セブンイレブン` | 記号除去、店舗名削除 |
| `株式会社ABC` | `ABC` | 法人格除去 |

詳細は [`docs/fingerprint.md`](./fingerprint.md) を参照。

---

## 3. インポート実行方法

### 3.1 コマンド

```bash
docker compose run --rm importer python import_csv.py \
  --file /data/sample.csv \
  --payment-method-id <UUID>
```

### 3.2 環境変数

| 変数名 | 説明 | 必須 | デフォルト |
|--------|------|------|-----------|
| `SUPABASE_URL` | SupabaseのURL | ○ | `http://localhost:54321` |
| `SUPABASE_KEY` | Supabase APIキー | ○ | - |
| `PAYMENT_METHOD_ID` | 支払い方法ID | ○ | - |

### 3.3 出力例

```
Processing file: /data/sample.csv
Found 50 rows
- 45 new transactions
- 5 duplicates (skipped)
- Vendor resolution: 40 matched, 5 new vendors
- Applied 30 vendor rules
Import completed successfully.
```

---

## 4. エラーハンドリング

### 4.1 一般的なエラー

| エラー | 原因 | 対処法 |
|--------|------|--------|
| `Missing required column: occurred_on` | ヘッダーに必須カラムがない | CSVテンプレート確認 |
| `Invalid date format` | 日付が `YYYY-MM-DD` でない | Excel日付書式をテキスト形式に変更 |
| `Payment method not found` | `payment_method_id` が存在しない | `payment_methods` テーブルを確認 |
| `Checksum already exists` | 同一ファイルを再インポート | 意図的な再インポートの場合、`--force` フラグ使用 |

### 4.2 部分的失敗

- トランザクション単位で処理
- 途中でエラーが発生した場合、**ロールバック**
- インポート元ファイルの `checksum` を記録し、再実行を防止

---

## 5. 将来対応予定の形式

### 5.1 銀行口座明細

```csv
取引日,お支払金額,お預り金額,差引残高,摘要
2024-01-15,-3500,,1234567,振込 ABC株式会社
```

### 5.2 d払い明細

```csv
ご利用日,ご利用先,ご利用金額
2024-01-15,ファミリーマート,540
```

### 5.3 カスタム形式

`import_configs` テーブルでカラムマッピングを定義し、任意のCSVに対応予定。

---

## 6. ベストプラクティス

1. **CSVは常にバックアップを取る** - インポート前にコピーを保存
2. **小規模テストから開始** - 数行のみでまずテスト実行
3. **支払い方法IDを事前確認** - `payment_methods` テーブルをクエリ
4. **手動入力と併用** - 少額・イレギュラーな取引は手動入力

---

## 参考リンク

- [fingerprint仕様](./fingerprint.md)
- [ベンダー管理ガイド](./vendor_management.md)
- [カテゴリ設計ガイド](./category_guide.md)
