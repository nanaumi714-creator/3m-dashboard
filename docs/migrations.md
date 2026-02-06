# Supabase ミグレーション反映手順

## 目的
`supabase/migrations/` に追加した SQL をローカル / クラウドへ反映する方法を整理する。

## 前提
- Supabase CLI が導入済み
- プロジェクトルートで作業 (`c:\Users\nanau\source\3m-dashboard`)

## ローカルへ反映（開発用）

1. ローカル Supabase を起動
```bash
supabase start
```

2. すべてのマイグレーションを適用
```bash
supabase db reset
```

- `db reset` は **全データを消して再適用** するので注意。

## 既存ローカルDBに追加分だけ反映したい場合

```bash
supabase migration up
```

- 既に適用済みのマイグレーションはスキップされます。

## クラウド（Supabase Cloud）へ反映

1. `supabase link` が済んでいない場合（初回のみ）
```bash
supabase link --project-ref <your-project-ref>
```

2. リモートへ反映
```bash
supabase db push
```

## 型定義の更新（DB変更があった場合のみ）

```bash
supabase gen types typescript --local > web/lib/database.types.ts
```

## 注意点
- `db reset` はローカルDBを初期化します（本番では絶対に使わない）
- 変更があるたびに `migration up` か `db reset` を使う
- DBスキーマ変更後は **必ず型定義を再生成**

## よく使うコマンドまとめ

```bash
supabase start
supabase migration up
supabase db reset
supabase db push
supabase gen types typescript --local > web/lib/database.types.ts
```
