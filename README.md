# 3m Dashboard (Phase 1 MVP)

ローカル専用で稼働するフリーランス向けの取引・証憑管理MVPです。`docker compose up` でNext.js UIとローカルDBを起動し、CSVの半自動インポートを行うためのImporterを用意しています。

## 起動手順

```bash
docker compose up --build
```

- Web UI: http://127.0.0.1:3000
- Postgres (Supabase互換): `localhost:5432`

## CSVインポート（例）

```bash
docker compose run --rm importer \
  python import_csv.py data/sample.csv YOUR_PAYMENT_METHOD_ID \
  --date "利用日" \
  --amount "利用金額" \
  --description "利用店舗" \
  --url "http://localhost:54321" \
  --key "YOUR_SUPABASE_ANON_KEY"
```

## ディレクトリ構成

- `web/`: Next.js UI (Phase 1: ダッシュボード / 取引一覧 / Triage Queue)
- `supabase/`: 初期DDL
- `importer/`: CSVインポーター + fingerprint生成
