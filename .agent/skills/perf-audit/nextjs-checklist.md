# Next.js Performance Checklist

## Core Web Vitals
- [ ] **LCP**: Are hero images using `priority`?
- [ ] **CLS**: Do all images have `width` and `height`?
- [ ] **INP**: Are event handlers lightweight?

## React & Next.js
- [ ] **Server Components**: Are you fetching data on the server?
- [ ] **Suspense**: Are loading states granular?
- [ ] **Dynamic Imports**: Are heavy components lazy loaded (`next/dynamic`)?
- [ ] **Fonts**: Are you using `next/font` with `swap`?

## Supabase
- [ ] **Select Fields**: Are you selecting specific columns `select('id, name')` instead of `select('*')`?
- [ ] **Indexes**: Are filtered columns indexed?
