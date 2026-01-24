# 3m Dashboard (Phase 1 MVP)

ローカル専用で稼働するフリーランス向けの取引・証憑管理MVPです。`docker compose up` でNext.js UIとローカルDBを起動し、CSVの半自動インポートを行うためのImporterを用意しています。

## 起動手順

```bash
docker compose up --build
```

- Web UI: http://127.0.0.1:3000
- Postgres (Supabase互換): `localhost:5432`

## 停止手順

```bash
docker compose down
```

## DB初期化（ローカル）

```bash
docker compose down --volumes
docker compose up --build
```

## バックアップ / リストア

```bash
# バックアップ
docker compose exec db pg_dump -U postgres -d postgres > backup.sql

# リストア
cat backup.sql | docker compose exec -T db psql -U postgres -d postgres
```

## 運用手順（毎月）

1. CSVを `import/` に配置する
2. Importerを実行する
3. UIのTriage Queueで未判定を処理する
4. Overviewで月次の支出傾向を確認する
5. 月次で繰り返す

## CSVインポート（例）

```bash
docker compose run --rm importer \
  python import_csv.py import/card_202501.csv YOUR_PAYMENT_METHOD_ID \
  --date "利用日" \
  --amount "利用金額" \
  --description "利用店舗" \
  --url "http://localhost:54321" \
  --key "YOUR_SUPABASE_ANON_KEY"
```

## サンプルCSV例

```csv
利用日,利用金額,利用店舗
2025/01/05,1234,Amazon Web Services
2025/01/09,560,セブンイレブン 新宿店
```

## ディレクトリ構成

- `web/`: Next.js UI (Phase 1: ダッシュボード / 取引一覧 / Triage Queue)
- `supabase/`: 初期DDL
- `importer/`: CSVインポーター + fingerprint生成
