# OCR使用ガイド

## 概要

Google Vision APIを使用したレシートOCR機能。

---

## セットアップ

### 1. Google Cloud Projectの設定

1. https://console.cloud.google.com/ でプロジェクト作成
2. Vision API を有効化
3. サービスアカウント作成
4. JSONキーをダウンロード

### 2. 環境変数設定

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
```

Vercelの場合:
```
GOOGLE_APPLICATION_CREDENTIALS=/var/task/credentials.json
```

---

## 使い方

### UIからアップロード

1. `/receipts` ページを開く
2. 「アップロード」ボタンをクリック
3. レシート画像を選択
4. OCR処理が自動実行

### 処理フロー

```
画像アップロード
  ↓
Storage保存
  ↓
OCR API呼び出し
  ↓
テキスト抽出
  ↓
構造化データ解析
  ↓
receipts テーブル保存
```

---

## 抽出される情報

- **店舗名**: レシート上部から自動検出
- **合計金額**: 「合計」「小計」キーワードから検出
- **日付**: YYYY/MM/DD または YYYY-MM-DD 形式
- **明細**: 品目と価格（ベストエフォート）

---

## 月次利用上限

環境変数 `OCR_MONTHLY_LIMIT` で制御:
- デフォルト: 100件/月
- 超過時: エラーメッセージ表示

### コスト管理

Google Vision API 料金:
- 最初の1,000リクエスト/月: $1.50
- 以降: $1.50 / 1,000リクエスト

**推奨**: 月100件 = 約$0.15

---

## 精度向上のコツ

### 撮影時
- 明るい場所で撮影
- レシートを平らにする
- 高解像度（最低 1000x1000 px推奨）
- 余白を含めて全体を撮影

### フォーマット
- JPG, PNG対応
- ファイルサイズ: 10MB以下

---

## OCR結果の確認・修正

`/receipts/[id]` ページで:
- 抽出テキストを表示
- 手動で修正可能
- 取引への紐付け

---

## トラブルシューティング

### 問題: OCRが実行されない

**原因**: API認証情報が不正

**対処法**:
```bash
# 認証確認
gcloud auth application-default print-access-token
```

### 問題: 店舗名が検出されない

**原因**: レシートフォーマットが特殊

**対処法**: 手動で入力し、フィードバック送信

### 問題: 月次上限エラー

**対処法**: `OCR_MONTHLY_LIMIT` を増やすか、翌月まで待つ

---

## API詳細

### エンドポイント

```
POST /api/ocr/process
```

**Body**:
```json
{
  "receipt_id": "uuid"
}
```

**Response**:
```json
{
  "ocr_request_id": "uuid",
  "status": "pending"
}
```

### 状態確認

```
GET /api/ocr/process?receipt_id=xxx
```

**Response**:
```json
{
  "id": "uuid",
  "status": "completed",
  "extracted_text": "...",
  "confidence": 0.95
}
```

---

## 制限事項

- 日本語レシートのみ対応（現状）
- 手書き文字は精度低下
- 複雑なレイアウトは手動確認推奨
