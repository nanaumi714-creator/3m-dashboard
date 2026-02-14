# Dev Container 使用ガイド

## 概要

VS Code の Dev Containers 機能を使用することで、Docker コンテナ内で一貫した開発環境を構築できます。

---

## セットアップ

### 1. 前提条件

- Visual Studio Code
- Docker Desktop (起動済み)
- VS Code 拡張機能「Dev Containers」（ms-vscode-remote.remote-containers）

### 2. コンテナで開く

1. プロジェクトをクローン
```bash
git clone https://github.com/YOUR_USERNAME/3m-dashboard.git
cd 3m-dashboard
```

2. VS Code で開く
```bash
code .
```

3. 通知が表示されたら「Reopen in Container」をクリック  
   または、コマンドパレット（F1）から  
   「Dev Containers: Reopen in Container」を実行

4. 初回ビルドには数分かかります

---

## 利用可能な機能

### 自動インストール

コンテナ起動時に以下が自動実行されます：
- Node.js 依存関係（`npm install`）
- Python 依存関係（`pip install -r requirements.txt`）

### プリインストール拡張機能

以下のVS Code拡張機能が自動インストールされます：
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Python
- Pylance
- Docker
- Supabase

### ポートフォワーディング

以下のポートが自動的にフォワードされます：
- **3000**: Next.js 開発サーバー
- **54321**: Supabase API
- **54323**: Supabase Studio

---

## 開発開始

### Web アプリケーション

```bash
cd web
npm run dev
```

http://localhost:3000 でアクセス

### CSV インポート

```bash
cd importer
python import_csv.py path/to/file.csv
```

### Gmail 連携

```bash
cd importer
python gmail_sync.py
```

---

## コンテナ操作

### コンテナを再ビルド

設定変更後やクリーンビルドしたい場合：

コマンドパレット（F1）→「Dev Containers: Rebuild Container」

### コンテナから出る

コマンドパレット（F1）→「Dev Containers: Reopen Folder Locally」

### ターミナルセッション

VS Code 統合ターミナル（Ctrl+`）でコンテナ内のシェルが開きます。

---

## トラブルシューティング

### コンテナが起動しない

1. Docker Desktop が起動しているか確認
2. ポート3000, 54321, 54323が使用されていないか確認
3. コンテナを再ビルド

### 依存関係が見つからない

```bash
# Node.js
cd web && npm install

# Python
cd importer && pip install -r requirements.txt
```

### データベースに接続できない

Docker Compose でSupabaseが起動しているか確認：

```bash
docker compose ps
```

起動していない場合：

```bash
docker compose up -d
```

---

## カスタマイズ

`.devcontainer/devcontainer.json` を編集することで：
- 追加の VS Code 拡張機能
- 環境変数
- ポートフォワーディング設定
- postCreateCommand（追加セットアップスクリプト）

などをカスタマイズできます。

---

## 利点

✅ **環境の一貫性**: チーム全員が同じ環境で開発  
✅ **クリーンな環境**: ホストマシンを汚さない  
✅ **自動セットアップ**: 拡張機能・依存関係が自動インストール  
✅ **簡単な切り替え**: プロジェクトごとに異なる環境を管理  
✅ **再現性**: `.devcontainer`をGit管理で環境を共有

---

## 参考資料

- [VS Code Dev Containers 公式ドキュメント](https://code.visualstudio.com/docs/devcontainers/containers)
- [Docker 公式ドキュメント](https://docs.docker.com/)
