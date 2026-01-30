# Gmail連携設定ガイド

## 概要

Gmail APIを使用して、メール添付の領収書を自動取得。

---

## セットアップ

### 1. Google Cloud Project設定

1. https://console.cloud.google.com/
2. Gmail API を有効化
3. OAuth 2.0 認証情報を作成
4. `credentials.json` をダウンロード

### 2. OAuth スコープ

```
https://www.googleapis.com/auth/gmail.readonly
```

### 3. 初回認証

```bash
cd importer
python gmail_sync.py
```

ブラウザでGoogle認証を完了。`token.json` が生成されます。

---

## 使い方

### 手動実行

```bash
python gmail_sync.py
```

### 自動実行（cron）

`vercel.json` で設定済み:
```json
{
  "crons": [{
    "path": "/api/cron/gmail-sync",
    "schedule": "0 9 * * *"
  }]
}
```

毎朝9時に自動実行。

---

## 検索条件

デフォルト:
- 添付ファイル付きメール
- 過去7日間
- 未読のみ

### カスタマイズ

`importer/gmail_sync.py`:
```python
query = "has:attachment newer_than:7d is:unread"
```

---

## 対応ファイル形式

- PDF
- JPG/JPEG
- PNG

---

## 保存先

Supabase Storage:
- Bucket: `receipts`
- Path: `gmail/{message_id}/{filename}`

---

## 取り込み履歴

`/gmail/logs` ページで確認:
- 実行日時
- 取得件数
- エラー

---

## トラブルシューティング

### 問題: 認証エラー

```
Error: invalid_grant
```

**対処法**: `token.json` を削除して再認証

```bash
rm token.json
python gmail_sync.py
```

### 問題: 添付ファイルが取得されない

**原因**: 検索条件が厳しすぎる

**対処法**: `query` を緩和

```python
query = "has:attachment"  # 全期間
```

### 問題: API制限エラー

```
Error: Quota exceeded
```

**対処法**: Gmail API制限を確認
- デフォルト: 1,000,000 クォータユニット/日
- 1通あたり約5ユニット

---

## セキュリティ

### 認証情報の管理

- `credentials.json`: Git管理外（`.gitignore`）
- `token.json`: 自動生成、Git管理外

### Vercelデプロイ時

環境変数として設定:
```
GOOGLE_CREDENTIALS=<base64 encoded credentials.json>
```

---

## 制限事項

- Gmailアカウント1つのみ対応
- 添付ファイルサイズ: 25MB以下
- API制限: 1日あたり約200,000通
