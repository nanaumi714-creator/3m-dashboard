# 外部サービスセットアップガイド

このガイドでは、3M Dashboardで使用する各種外部サービスのアカウント作成とセットアップ手順を説明します。

---

## 📋 目次

1. [Supabase Cloud](#1-supabase-cloud)
2. [Vercel](#2-vercel)
3. [Google Cloud Platform (Vision API)](#3-google-cloud-platform-vision-api)
4. [Gmail API](#4-gmail-api)
5. [Sentry (オプション)](#5-sentry-オプション)

---

## 1. Supabase Cloud

データベース、認証、ストレージを提供するバックエンドサービスです。

### 1.1 アカウント作成

1. https://supabase.com/ にアクセス
2. 「Start your project」をクリック
3. GitHubアカウントでサインアップ

### 1.2 プロジェクト作成

1. 「New Project」をクリック
2. 以下を入力：
   - **Name**: `3m-dashboard` (任意)
   - **Database Password**: 強力なパスワードを設定（保存必須）
   - **Region**: `Northeast Asia (Tokyo)` を推奨
   - **Plan**: Free (開発用) / Pro (本番用)

3. 「Create new project」をクリック
4. プロジェクト作成完了まで数分待機

### 1.3 データベーススキーマの適用

1. Supabase ダッシュボードで「SQL Editor」を開く
2. `supabase/init.sql` の内容をコピー
3. SQL Editorに貼り付けて実行（Run）

### 1.4 認証設定

1. 「Authentication」→「Providers」を開く
2. 「Email」を有効化
3. 必要に応じて以下を設定：
   - **Confirm email**: メール確認の有効化
   - **Site URL**: `https://your-domain.vercel.app`
   - **Redirect URLs**: `https://your-domain.vercel.app/auth/callback`

### 1.5 ストレージ設定

1. 「Storage」を開く
2. 「New Bucket」をクリック
3. 以下を入力：
   - **Name**: `receipts`
   - **Public**: OFF（プライベート）

4. RLSポリシーを設定（自動的に`init.sql`で設定済み）

### 1.6 API キーの取得

1. 「Settings」→「API」を開く
2. 以下の値をコピー（後で使用）：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public**: `eyJhbG...` (公開用)
   - **service_role**: `eyJhbG...` (管理用、**秘密厳守**)

### 1.7 環境変数設定

`.env.local` に以下を追加：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG... # サーバーサイドのみ
```

---

## 2. Vercel

Next.jsアプリケーションのホスティングプラットフォームです。

### 2.1 アカウント作成

1. https://vercel.com/ にアクセス
2. 「Sign Up」をクリック
3. GitHubアカウントで連携

### 2.2 プロジェクトインポート

**方法1: GitHub連携（推奨）**

1. GitHubにリポジトリをpush
2. Vercelダッシュボードで「Add New」→「Project」
3. GitHubリポジトリ `3m-dashboard` を選択
4. 「Import」をクリック

**方法2: Vercel CLI**

```bash
# Vercel CLIインストール
npm install -g vercel

# プロジェクトディレクトリで実行
cd web
vercel

# 質問に答える
# - Set up and deploy: Y
# - Which scope: 個人アカウント選択
# - Link to existing project: N
# - Project name: 3m-dashboard
# - Directory: ./
# - Override settings: N
```

### 2.3 環境変数設定

Vercelダッシュボードで：

1. プロジェクト選択
2. 「Settings」→「Environment Variables」
3. 以下を追加：

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
OCR_MONTHLY_LIMIT=100
GOOGLE_APPLICATION_CREDENTIALS=（後述）
CRON_SECRET=ランダムな文字列
```

**Production / Preview / Development** それぞれにチェックを入れる

### 2.4 ビルド設定

1. 「Settings」→「General」
2. 以下を確認：
   - **Framework Preset**: Next.js
   - **Root Directory**: `web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

### 2.5 デプロイ

```bash
vercel --prod
```

または、GitHubに `git push` すると自動デプロイ

### 2.6 カスタムドメイン（オプション）

1. 「Settings」→「Domains」
2. ドメイン名を入力（例: `3m-dashboard.example.com`）
3. DNSレコード設定の指示に従う

---

## 3. Google Cloud Platform (Vision API)

レシートOCRに使用します。

### 3.1 Google Cloud アカウント作成

1. https://console.cloud.google.com/ にアクセス
2. Googleアカウントでログイン
3. 無料トライアル登録（クレジットカード必要、$300クレジット付与）

### 3.2 プロジェクト作成

1. コンソール上部の「プロジェクト選択」をクリック
2. 「新しいプロジェクト」
3. プロジェクト名: `3m-dashboard`
4. 「作成」をクリック

### 3.3 Vision API 有効化

1. 左メニュー「APIとサービス」→「ライブラリ」
2. 「Cloud Vision API」を検索
3. 「有効にする」をクリック

### 3.4 サービスアカウント作成

1. 「APIとサービス」→「認証情報」
2. 「認証情報を作成」→「サービスアカウント」
3. 以下を入力：
   - **名前**: `3m-dashboard-ocr`
   - **説明**: OCR処理用
   - 「作成して続行」

4. ロールを付与：
   - 「Cloud Vision API ユーザー」を選択
   - 「続行」→「完了」

### 3.5 JSONキーの生成

1. 作成したサービスアカウントをクリック
2. 「キー」タブ
3. 「鍵を追加」→「新しい鍵を作成」
4. 「JSON」を選択
5. ダウンロードされるJSONファイルを保存（`google-credentials.json`）

### 3.6 認証情報の配置

**ローカル開発:**

```bash
# プロジェクトルートに配置
cp ~/Downloads/xxx-xxx.json ./google-credentials.json

# .env.local に追加
echo "GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json" >> web/.env.local
```

**Vercel:**

```bash
# JSONファイルの内容をBase64エンコード
base64 -i google-credentials.json | tr -d '\n' > google-credentials-base64.txt

# Vercel環境変数に設定（内容をコピー）
# 変数名: GOOGLE_APPLICATION_CREDENTIALS_BASE64
```

アプリケーション側でデコード処理を追加：

```typescript
// web/lib/ocr/google-vision.ts 内
const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64
  ? JSON.parse(Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64, 'base64').toString())
  : require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
```

### 3.7 料金について

- **月間1,000枚まで無料**
- 1,001枚目以降: $1.50 / 1,000枚
- 無料枠を超えないよう `OCR_MONTHLY_LIMIT=100` で制限推奨

---

## 4. Gmail API

メール添付レシートの自動取得に使用します。

### 4.1 Google Cloud で Gmail API 有効化

1. 前述のGCPプロジェクトで作業
2. 「APIとサービス」→「ライブラリ」
3. 「Gmail API」を検索
4. 「有効にする」をクリック

### 4.2 OAuth 2.0 認証情報作成

1. 「APIとサービス」→「認証情報」
2. 「認証情報を作成」→「OAuth クライアント ID」
3. 「同意画面を構成」（初回のみ）
   - **User Type**: 外部
   - **アプリ名**: 3M Dashboard
   - **サポートメール**: 自分のメール
   - **スコープ追加**: `Gmail API` → `gmail.readonly`
   - 「保存」

4. OAuth クライアント作成：
   - **アプリケーションの種類**: デスクトップアプリ
   - **名前**: `3m-dashboard-gmail`
   - 「作成」

5. JSONをダウンロード（`credentials.json`）

### 4.3 認証情報の配置

```bash
# importer/ ディレクトリに配置
cp ~/Downloads/credentials.json importer/credentials.json

# .env に追加
echo "GMAIL_CREDENTIALS_PATH=./credentials.json" >> importer/.env
```

### 4.4 初回認証

```bash
cd importer
python gmail_sync.py
```

1. ブラウザが開く
2. Googleアカウントでログイン
3. アクセス許可
4. `token.pickle` が生成される（以降は自動認証）

### 4.5 Vercel Cron 設定（本番環境）

Gmail APIは通常ローカルで実行しますが、Vercel Cronで自動化する場合：

1. `token.pickle` をBase64エンコード
2. Vercel環境変数に設定
3. `/api/cron/gmail-sync` が毎日実行

詳細は `.docs/gmail_sync.md` 参照

---

## 5. Sentry (オプション)

エラートラッキングサービスです。

### 5.1 アカウント作成

1. https://sentry.io/ にアクセス
2. 「Get Started」
3. GitHubアカウントで連携

### 5.2 プロジェクト作成

1. 「Create Project」
2. プラットフォーム: **Next.js** を選択
3. プロジェクト名: `3m-dashboard`
4. 「Create Project」

### 5.3 DSN取得

1. プロジェクト作成後、DSNが表示される
2. コピー（例: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`）

### 5.4 環境変数設定

`.env.local` と Vercel に追加：

```env
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_AUTH_TOKEN=（後述）
```

### 5.5 Sentry設定ファイル

既に `web/lib/monitoring/sentry.ts` に実装済み

```bash
# 初期化（自動セットアップ）
npx @sentry/wizard@latest -i nextjs
```

### 5.6 ソースマップアップロード（オプション）

1. Sentry で「Settings」→「Auth Tokens」
2. 「Create New Token」
3. Scope: `project:releases` `project:write`
4. トークンをコピー
5. Vercel環境変数に `SENTRY_AUTH_TOKEN` を設定

---

## 🔐 セキュリティチェックリスト

- [ ] `.env.local` を `.gitignore` に追加（既に設定済み）
- [ ] Supabase `service_role` キーを GitHub Secrets に保存
- [ ] Google Cloud サービスアカウントJSONを暗号化
- [ ] Vercel環境変数は「Production」のみに制限
- [ ] Supabase RLSが全テーブルで有効
- [ ] Gmail token.pickle を安全に保管
- [ ] 定期的にAPIキーをローテーション

---

## 📝 環境変数一覧

### 公開 (クライアントで参照される `NEXT_PUBLIC_`)

| 変数名 | 取得元 | 用途 |
|--------|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | ブラウザからのSupabase接続 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | ブラウザ用 anon key |
| `NEXT_PUBLIC_DISABLE_AUTH` | 任意 | 開発用の認証無効化 |
| `NEXT_PUBLIC_DEV_LOGIN_EMAIL` | 任意 | 開発用自動ログイン |
| `NEXT_PUBLIC_DEV_LOGIN_PASSWORD` | 任意 | 開発用自動ログイン |
| `NEXT_PUBLIC_DEV_AUTO_SIGNUP` | 任意 | 開発用自動サインアップ |

### 非公開 (サーバー専用・`NEXT_PUBLIC_` 禁止)

| 変数名 | 取得元 | 用途 |
|--------|--------|------|
| `SUPABASE_URL` | Supabase | サーバー側のSupabase接続 |
| `SUPABASE_ANON_KEY` | Supabase | サーバー側の anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | サーバーサイド操作 |
| `GOOGLE_VISION_API_KEY` | GCP | OCR処理 |
| `OPENAI_API_KEY` | OpenAI | レシート抽出 |
| `OPENAI_MODEL` | OpenAI | レシート抽出モデル |
| `GOOGLE_APPLICATION_CREDENTIALS` | GCP | OCR処理 (代替) |
| `OCR_MONTHLY_LIMIT` | 任意 | OCR上限設定 |
| `GMAIL_CREDENTIALS_PATH` | GCP | Gmail連携 |
| `GOOGLE_CREDENTIALS` | GCP | Gmail連携 (Vercel用) |
| `CRON_SECRET` | 任意 | Cron保護 |
| `SENTRY_AUTH_TOKEN` | Sentry | ソースマップ |

---

## 🚀 デプロイ前チェックリスト

- [ ] Supabase プロジェクト作成完了
- [ ] データベーススキーマ適用
- [ ] Vercel プロジェクト作成
- [ ] 全環境変数設定完了
- [ ] Google Vision API 有効化（OCR使用時）
- [ ] Gmail API 設定（Gmail連携使用時）
- [ ] ビルドエラーなし（`npm run build`）
- [ ] ローカルで動作確認
- [ ] Vercel にデプロイ
- [ ] 本番環境で動作確認

---

## 📚 参考資料

- [Supabase 公式ドキュメント](https://supabase.com/docs)
- [Vercel 公式ドキュメント](https://vercel.com/docs)
- [Google Cloud Vision API](https://cloud.google.com/vision/docs)
- [Gmail API クイックスタート](https://developers.google.com/gmail/api/quickstart/python)
- [Sentry Next.js ガイド](https://docs.sentry.io/platforms/javascript/guides/nextjs/)

---

## 💡 ヒント

- **開発環境**: ローカルSupabase（Docker）を使用してコスト削減
- **ステージング**: Vercel Preview Deploymentsを活用
- **本番環境**: Supabase Pro + Vercel Pro を推奨
- **モニタリング**: Sentry + Vercel Analytics で包括的に監視
- **バックアップ**: Supabase は自動バックアップ（Pro プラン）

---

**準備完了！** これで全ての外部サービスがセットアップされ、3M Dashboard を本番環境にデプロイできます 🎉
