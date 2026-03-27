# Script Product Page — Improvements Plan

## What's being fixed / added
1. Review dates shown (trivial)
2. Language/platform badge on page header + Specs tab
3. Docs tab — built-in markdown rendered with Tailwind prose
4. Requirements surfaced in Specs tab (same as language_platform)
5. Wishlist button in purchase panel
6. Tags fetched + shown as chips on Overview tab
7. Screenshot lightbox (click to zoom)
8. Social share (native Share API + copy-link fallback)
9. Hero image opacity fix (opacity-60 → opacity-80)

## New DB columns needed
- `language_platform TEXT` on products table
- `docs_content TEXT` on products table

---

## Checklist

### Step 1 — DB migration
- [ ] Create `zenorar-api/prisma/migrations/add_product_docs_language.sql`
  - `ALTER TABLE products ADD COLUMN IF NOT EXISTS language_platform TEXT;`
  - `ALTER TABLE products ADD COLUMN IF NOT EXISTS docs_content TEXT;`
- [ ] Update `zenorar-api/prisma/schema.prisma` — add `languagePlatform String? @map("language_platform")` and `docsContent String? @map("docs_content")` to Product model
- [ ] Run `npx prisma generate` in zenorar-api

### Step 2 — API: products service + controller
- [ ] `zenorar-api/src/services/products.service.ts` — add `languagePlatform` and `docsContent` to CreateProductDto, UpdateProductDto, and update() handler
- [ ] Verify save path reaches the DB column (select from products.service.ts update query)

### Step 3 — lib/types.ts
- [ ] Add `languagePlatform?: string` and `docsContent?: string` to Product interface

### Step 4 — page.tsx (script product page)
- [ ] Add `p.tags`, `p.language_platform as language_platform`, `p.docs_content as docs_content` to SQL SELECT
- [ ] Map them into the returned Product object
- [ ] Fix hero image: change `opacity-60` → `opacity-80`

### Step 5 — ProductTabs.tsx
- [ ] Add `'docs'` to TabId union — only show tab when `product.docsContent` exists
- [ ] Review dates: add `{review.date}` in review list
- [ ] Tags: show as chips in Overview tab (below description, skip if empty)
- [ ] Language/platform: show as a badge in Overview header
- [ ] Docs tab: render `docsContent` markdown with `prose` classes via `dangerouslySetInnerHTML` (custom lightweight parser — no new library)
- [ ] Lightbox: on screenshot click, open full-screen overlay

### Step 6 — ProductPurchasePanel.tsx
- [ ] Add wishlist heart button (uses existing `GET/POST/DELETE /api/wishlist` endpoints)
- [ ] Add share button (native Share API, fallback copy-link)

### Step 7 — Admin product edit page
- [ ] `app/admin/products/[id]/edit/page.tsx` — add `language_platform` text input and `docs_content` textarea (markdown)

### Step 8 — Build + push
- [ ] `npx next build` — zero errors
- [ ] Commit API changes (zenorar-api)
- [ ] Commit marketplace changes (zenorar-marketplace)
- [ ] Push both

---

## Files touched
1. `zenorar-api/prisma/migrations/add_product_docs_language.sql` (new)
2. `zenorar-api/prisma/schema.prisma`
3. `zenorar-api/src/services/products.service.ts`
4. `zenorar-marketplace/lib/types.ts`
5. `zenorar-marketplace/app/(shop)/scripts/[slug]/page.tsx`
6. `zenorar-marketplace/components/product/ProductTabs.tsx`
7. `zenorar-marketplace/components/product/ProductPurchasePanel.tsx`
8. `zenorar-marketplace/app/admin/products/[id]/edit/page.tsx`

## Review Section
*(filled after implementation)*