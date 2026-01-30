# 3M Dashboard

**3M Dashboard** は、個人事業主・フリーランス向けの経費管理システムです。クレジットカード、銀行口座、d払いなどの複数の支払い方法に対応し、確定申告に必要なデータを効率的に管理できます。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)

---

## 📋 目次

- [特徴](#特徴)
- [技術スタック](#技術スタック)
- [環境構築](#環境構築)
- [使い方](#使い方)
- [ドキュメント](#ドキュメント)
- [デプロイ](#デプロイ)
- [ライセンス](#ライセンス)

---

## ✨ 特徴

### データ管理
- ✅ **複数CSV形式対応**: クレジットカード、銀行口座、d払いの明細を一括インポート
- ✅ **現金取引管理**: 手動入力による現金支払いの記録
- ✅ **重複検出**: fingerprint技術による自動重複検出とマージ機能
- ✅ **ベンダー管理**: 取引先の自動判定と表記ゆれ対応

### OCR・自動化
- ✅ **レシートOCR**: Google Vision APIによる自動テキスト抽出
- ✅ **Gmail連携**: メール添付レシートの自動取得（cron対応）
- ✅ **非同期処理**: 月次上限管理付きOCR処理

### レポート・分析
- ✅ **カスタムレポート**: 柔軟な条件指定による絞り込み
- ✅ **Excel/CSV/PDFエクスポート**: 複数フォーマット対応
- ✅ **月次サマリー**: カテゴリ別支出分析
- ✅ **確定申告対応**: 事業/個人の按分管理

### モバイル対応
- ✅ **レスポンシブデザイン**: スマホ・タブレット完全対応
- ✅ **カメラ撮影**: ブラウザネイティブカメラでレシート撮影
- ✅ **スワイプジェスチャー**: 直感的な操作（削除・編集）
- ✅ **簡易入力**: モバイル専用クイック入力フォーム

### セキュリティ
- ✅ **Supabase Auth**: 認証・認可の完全統合
- ✅ **RLS (Row Level Security)**: ユーザー別データ分離
- ✅ **パスワードリセット**: メール認証によるリセット機能

---

## 🛠 技術スタック

### フロントエンド
- **Next.js 14** - React フレームワーク (App Router)
- **TypeScript** - 型安全性
- **Tailwind CSS** - モバイルファーストのスタイリング
- **Supabase JS Client** - データベース・認証クライアント

### バックエンド
- **Supabase** - PostgreSQL + Auth + Storage
- **Python 3.x** - CSV インポートスクリプト
- **Google Vision API** - OCR 処理
- **Gmail API** - メール連携

### インフラ
- **Vercel** - ホスティング + Edge Functions
- **GitHub Actions** - CI/CD 自動デプロイ
- **Docker** - ローカル開発環境
- **Sentry** - エラートラッキング (オプション)

---

## 🚀 環境構築

### 前提条件

- **Node.js** 18.x 以上
- **Python** 3.9 以上
- **Docker & Docker Compose** (ローカル開発)
- **Git**

### セットアップ方法の選択

以下の2つの方法から選択できます：

#### 方法1: Dev Container を使う（推奨）

VS Code の Dev Containers 機能を使用すると、環境構築が自動化されます。

**前提条件:**
- Visual Studio Code
- Docker Desktop
- VS Code 拡張機能「Dev Containers」

**手順:**

1. リポジトリをクローン
```bash
git clone https://github.com/YOUR_USERNAME/3m-dashboard.git
cd 3m-dashboard
```

2. VS Code でプロジェクトを開く
```bash
code .
```

3. コマンドパレット（Ctrl+Shift+P / Cmd+Shift+P）を開き、  
   「Dev Containers: Reopen in Container」を選択

4. コンテナのビルドと起動が完了するまで待つ（初回は数分かかります）

5. コンテナ内で開発サーバーを起動
```bash
# コンテナ内のターミナル（VS Code統合ターミナル）で実行
cd web
npm run dev
```

6. ブラウザで http://localhost:3000 を開く

**Dev Container の特徴:**
- ✅ 依存関係の自動インストール
- ✅ VS Code 拡張機能の自動セットアップ
- ✅ Python と Node.js の両方が利用可能
- ✅ ポートフォワーディング自動設定
- ✅ チーム全体で同一環境
- ✅ ホストマシンを汚さない

#### 方法2: ローカル環境で直接セットアップ

従来の方法でローカル環境に直接セットアップします。
**1. リポジトリのクローン**

```bash
git clone https://github.com/YOUR_USERNAME/3m-dashboard.git
cd 3m-dashboard
```

**2. Supabase ローカルセットアップ**

```bash
# Docker でローカル Supabase を起動
docker compose up -d

# データベーススキーマを初期化
docker exec -i $(docker ps -qf "name=supabase-db") psql -U postgres -d postgres < supabase/init.sql
```

起動後、以下のURLでアクセス可能:
- **Supabase Studio**: http://localhost:54323
- **API URL**: http://localhost:54321
- **Anon Key**: Docker Compose ログから取得

**3. Web アプリケーションのセットアップ**

```bash
cd web

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env.local
```

`.env.local` を編集:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# OCR (オプション)
OCR_MONTHLY_LIMIT=100
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json

# その他
NODE_ENV=development
```

```bash
# 開発サーバー起動
npm run dev
```

ブラウザで http://localhost:3000 を開く

**4. Python インポーターのセットアップ**

```bash
cd ../importer

# 仮想環境作成
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

# 依存関係インストール
pip install -r requirements.txt

# 環境変数設定
cp .env.example .env
```

`.env` を編集:

```env
SUPABASE_URL=http://localhost:54321
SUPABASE_KEY=your-anon-key
```

---

## 📖 使い方

### CSVインポート

```bash
cd importer
python import_csv.py path/to/file.csv
```

対応フォーマット:
- クレジットカード明細
- 銀行口座明細
- d払い明細

詳細は [csv_spec.md](.docs/csv_spec.md) を参照

### レシートOCR

1. `/receipts` ページでレシート画像をアップロード
2. OCR処理が自動実行
3. `/receipts/[id]` で結果確認・修正

詳細は [ocr_guide.md](.docs/ocr_guide.md) を参照

### Gmail自動取り込み

```bash
# 初回認証
cd importer
python gmail_sync.py
```

Vercel で自動化する場合は `vercel.json` の cron 設定を参照

詳細は [gmail_sync.md](.docs/gmail_sync.md) を参照

### レポート生成

1. `/reports` ページでフィルタ条件を指定
2. CSV / Excel / PDF を選択
3. ダウンロード

詳細は [export_guide.md](.docs/export_guide.md) を参照

---

## 📚 ドキュメント

### 仕様書
- [CSV仕様](.docs/csv_spec.md) - インポート形式の詳細
- [Fingerprint仕様](.docs/fingerprint.md) - 重複検出ロジック
- [ベンダー管理](.docs/vendor_management.md) - 取引先マスタ運用
- [カテゴリ設計](.docs/category_guide.md) - 経費カテゴリ管理

### 運用ガイド
- [デプロイ手順](.docs/deployment.md) - Vercel/Supabase Cloud
- [セキュリティ設定](.docs/security.md) - RLS/認証設定
- [トラブルシューティング](.docs/troubleshooting.md) - よくある問題
- [クラウド移行](.docs/migration.md) - Local → Cloud 移行手順

### 機能別ガイド
- [OCR使用法](.docs/ocr_guide.md)
- [エクスポート](.docs/export_guide.md)
- [Gmail連携](.docs/gmail_sync.md)

---

## 🏗 ビルド

### 開発ビルド

```bash
cd web
npm run dev
```

### 本番ビルド

```bash
cd web
npm run build
npm run start
```

### Linting

```bash
npm run lint
```

### 型チェック

```bash
npm run type-check
```

---

## 🌐 デプロイ

### Vercel + Supabase Cloud

詳細は [deployment.md](.docs/deployment.md) を参照

**クイックスタート:**

```bash
# Vercel CLI インストール
npm install -g vercel

# デプロイ
cd web
vercel

# 環境変数設定
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY

# 本番デプロイ
vercel --prod
```

### 自動デプロイ (CI/CD)

GitHub Actions で自動化済み:
- `main` ブランチへの push で自動デプロイ
- `.github/workflows/deploy.yml` 参照

必要な GitHub Secrets:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`

---

## 🗄 データベーススキーマ

### 主要テーブル

- `transactions` - 取引データ
- `vendors` - 取引先マスタ
- `vendor_aliases` - 取引先表記ゆれ
- `expense_categories` - 経費カテゴリ
- `payment_methods` - 支払い方法
- `receipts` - レシート画像
- `import_configs` - CSVフォーマット定義

詳細は `supabase/init.sql` を参照

---

## 🔒 セキュリティ

### Row Level Security (RLS)

全テーブルで有効化済み。ユーザーは自分のデータのみアクセス可能。

### 環境変数管理

機密情報は `.env.local` (Git管理外) で管理:
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_APPLICATION_CREDENTIALS`

詳細は [security.md](.docs/security.md) を参照

---

## 🧪 テスト

```bash
# ユニットテスト (未実装)
npm run test

# E2Eテスト (未実装)
npm run test:e2e
```

---

## 🤝 コントリビューション

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照

---

## 📞 サポート

問題が発生した場合:
1. [トラブルシューティングガイド](.docs/troubleshooting.md) を確認
2. GitHub Issues で報告
3. `.docs/` 配下の各種ドキュメントを参照

---

## 🎯 プロジェクト構成

```
3m-dashboard/
├── .docs/              # ドキュメント
├── .github/            # GitHub Actions
├── importer/           # Python CSVインポーター
│   ├── parsers/        # CSV パーサー
│   ├── import_csv.py   # メインスクリプト
│   └── gmail_sync.py   # Gmail 連携
├── scripts/            # ユーティリティスクリプト
│   ├── data_validation.py
│   └── enhanced_migration.py
├── supabase/           # データベース
│   └── init.sql        # スキーマ定義
├── web/                # Next.js アプリケーション
│   ├── app/            # App Router
│   ├── lib/            # ライブラリ
│   └── middleware.ts   # 認証middleware
├── docker-compose.yml  # ローカル開発環境
├── vercel.json         # Vercel設定
└── README.md           # このファイル
```

---

## 🚀 ロードマップ

### 完了済み ✅
- Phase 1: 基本機能
- Phase 2: 効率化・複数入力対応
- Phase 3: OCR・高度検索・レポート
- Phase 4: クラウド移行準備・モバイル最適化

### 今後の拡張 (任意)
- [ ] AI カテゴリ自動判定
- [ ] React Native アプリ化
- [ ] 複数通貨対応
- [ ] チーム機能

---

## 📊 実装状況

**全機能実装完了: 100%**

- 作成ファイル: 62+
- 完了タスク: 58/58
- ドキュメント: 21件

詳細は [final_walkthrough.md](.brain/final_walkthrough.md) を参照

---

**Built with ❤️ for freelancers and individual business owners**
