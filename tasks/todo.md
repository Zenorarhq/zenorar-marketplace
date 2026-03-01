# Todo — Library: One Card Per License

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
