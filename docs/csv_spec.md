# CSV仕様（Phase 1）

## 対応フォーマット

- 文字コード: UTF-8 (BOM付きでも可)
- 区切り: カンマ区切り (CSV)
- 日付形式: `YYYY/MM/DD`

## ヘッダ例

```csv
利用日,利用金額,利用店舗
```

## サンプル行

```csv
2025/01/05,1234,Amazon Web Services
2025/01/09,560,セブンイレブン 新宿店
```

## 列マッピング

Importerの引数で以下を指定します。

- `--date`: 利用日列（例: `利用日`）
- `--amount`: 金額列（例: `利用金額`）
- `--description`: 摘要/利用店舗列（例: `利用店舗`）

実行例:

```bash
python importer/import_csv.py import/card_202501.csv YOUR_PAYMENT_METHOD_ID \
  --date "利用日" \
  --amount "利用金額" \
  --description "利用店舗" \
  --url "http://localhost:54321" \
  --key "YOUR_SUPABASE_ANON_KEY"
```
