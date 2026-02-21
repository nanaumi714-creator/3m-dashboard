# Supabase Migration: Local/Remote Mismatch 対応メモ

## 症状
`supabase db push` 実行時に以下が出て止まる。

```
Found local migration files to be inserted before the last migration on remote database.
Rerun the command with --include-all flag to apply these migrations:
  supabase\migrations\20260206000000_fix_categories_seed.sql
```

## 原因
- ローカル専用の修正マイグレーションが **リモートより古い番号**で存在する。
- そのため **リモート履歴とローカルファイルの順序が不一致**になり、`db push` が拒否される。

## 取れる選択肢

### A. その修正を本番にも反映する
ローカル専用でなく、本番にも同じ内容を適用してよい場合:

```
supabase db push --include-all
```

### B. 本番には反映しない（ローカル専用）
ローカルだけに留めたい場合:

1. ローカルのマイグレーション履歴を「未適用」にする
```
supabase migration repair --status reverted 20260206000000
```

2. そのマイグレーションをローカル専用として扱い、
   **リモートに送らない**（削除 or 別ファイルに退避）

3. その後 `supabase db push` を再実行

## 参考: 関連コマンド

```
supabase migration list
supabase migration up
supabase db push
supabase db pull
supabase migration repair --status reverted <version>
```

## 追記
- `20260206000000_fix_categories_seed.sql` は **ローカル修正用**として作成。
- これを本番に入れるかどうかで対応が分岐する。
