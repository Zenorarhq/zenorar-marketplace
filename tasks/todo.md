# Fix Dashboard "Total Products" and "Top Products" to include all product types

## Root Cause

The dashboard has two metrics that only query the `products` table (scripts only):

1. **"Total Products" stat card** — calls `productsApi.list({ limit: 1 })` and reads `pagination.total`, which only counts rows in the `products` table
2. **"Top Products" section** — calls `productsApi.list({ sortBy: 'sales', limit: 4 })`, which only returns scripts

Other product types live in separate tables:
- eSIM plans: `esim_plans` (5,388 records)
- Gift cards: `gift_cards` (5,660 records)
- Virtual number plans: `virtual_number_plans` (5 records)
- Cards: `card_pricing` where `is_enabled = true` (3 records)

Revenue, orders, and recent activity are already correct — the `orders` table tracks ALL purchase types.

## Plan

### Task 1: Fix "Total Products" count
- [x] Add backend endpoint `GET /analytics/total-products` — sums counts from products, esim_plans, gift_cards, virtual_number_plans, card_pricing
- [x] Update dashboard frontend to call new endpoint instead of `productsApi.list({ limit: 1 })`

### Task 2: Fix "Top Products" section
- [x] Add backend endpoint `GET /analytics/top-selling?limit=N` — queries order_items grouped by name/product_type
- [x] Update dashboard frontend to render product type icons and sales/revenue instead of product images/prices

---

## Review

### What changed:

**Backend (zenorar-api) — 3 files:**
- `src/services/analytics.service.ts` — added `getTotalProductCount()` and `getTopSellingItems()` methods
- `src/controllers/analytics.controller.ts` — added `getTotalProductCount` and `getTopSellingItems` handlers
- `src/routes/analytics.routes.ts` — added `GET /total-products` and `GET /top-selling` routes

**Frontend (zenorar-marketplace) — 2 files:**
- `lib/api/analytics.ts` — replaced `productsApi.list()` with `/analytics/total-products` endpoint; replaced `getTopProducts` with `/analytics/top-selling` endpoint
- `app/admin/page.tsx` — updated Top Products rendering to show product type icon, type label, sales count, and revenue

### Build status:
- Backend: TypeScript compiles clean
- Frontend: `next build` passes clean