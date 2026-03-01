# Todo — Pro License Price Bug

## Root Cause
`cart.service.ts → getOrCreateCart` always recalculates the cart item price from
`item.product.price` (base price), ignoring the `item.price` field that was correctly
stored in the DB when the buyer chose "Pro License ($149.99)".

This wrong price flows into `cart.subtotal` → `createFromCart` → the order total.

## Investigation Summary
- Frontend + cart context: correctly sends `{ license: 'pro', price: 149.99 }` to the API.
- `cartService.addItem`: correctly stores that price in `cart_items.price`.
- `cartService.getOrCreateCart` **(BUG)**: ignores stored `item.price`, always uses
  `item.variant?.price || item.product.price`.

## Fix
One-line change in `zenorar-api/src/services/cart.service.ts → getOrCreateCart`:
```
// Before (always base price):
const price = item.variant?.price || item.product.price

// After (stored price first, fallback to base):
const price = item.price != null ? Number(item.price) : Number(item.variant?.price || item.product.price)
```

## Tasks

### 1. Fix `getOrCreateCart` in `cart.service.ts`
- [x] Use stored `item.price` when non-null; fall back to product/variant price otherwise

---

## Review
**`zenorar-api/src/services/cart.service.ts`** — Changed one line in `getOrCreateCart`:
```
const price = item.price != null ? Number(item.price) : Number(item.variant?.price || item.product.price)
```
Now the stored license-specific price (Pro $149.99, Extended, etc.) is used when present.
All downstream consumers (cart display, checkout total, order creation) automatically get the correct price.

---
---

# Previous: Library: One Card Per License

## Root Cause
`GET /api/library` (Next.js route) uses `SELECT DISTINCT … GROUP BY p.id` on orders+products.
Two purchases of "Web 3" collapse into one row. Fix: query the `licenses` table instead, one row per license.

## Approach
- Keep `item.id = productId` so download / snippet / api-key / renew routes all still work unchanged
- Add `item.licenseId` as a new field — used for unique React key and license lookup
- Map the real license `status` (ACTIVE → active, SUSPENDED → suspended, REVOKED/EXPIRED → expired)

## Tasks

### 1. Replace product query in `app/api/library/route.ts`
- [x] Swap the `SELECT DISTINCT … GROUP BY p.id` query for a licenses-based join
- [x] Return `id: productId, licenseId: licenseId` plus real license status

### 2. Add `licenseId` field to `LibraryItem` in `lib/api/library.ts`
- [x] Add `licenseId?: string` to the interface

### 3. Update `app/profile/library/page.tsx`
- [x] Change React `key={item.id}` → `key={item.licenseId || item.id}`
- [x] Change license lookup: `licenses.find(l => l.productId === item.id)` → use `item.licenseId` when present

---

## Review

### Changes Made
1. **`app/api/library/route.ts`** — Replaced the `SELECT DISTINCT … GROUP BY p.id` query (which deduplicated by product) with a `FROM licenses l JOIN products p … JOIN categories c …` query. Each license row becomes one library card. Added `statusMap` to convert `ACTIVE/SUSPENDED/REVOKED/EXPIRED` → `active/suspended/expired`. Kept `id: row.product_id` for backward compat with download/api-key/renew routes; added `licenseId: row.license_id` as a new field.
2. **`lib/api/library.ts`** — Added `licenseId?: string` to the `LibraryItem` interface.
3. **`app/profile/library/page.tsx`** — Changed React key to `item.licenseId || item.id` (unique per card). Changed license lookup to use `licenses.find(l => l.id === item.licenseId)` when `licenseId` is present, falling back to `productId` lookup for older items.

### No Breaking Changes
- `item.id` still equals `productId` — all download/snippet/api-key/renew calls that use `item.id` as productId continue to work.
- Virtual numbers and gift cards are unaffected (separate queries).
