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

---
---

# Current: Stripe/Paystack Post-Payment — No Licenses Generated

## Root Cause

**Stripe:** `webhooks.controller.ts → payment_intent.succeeded` only handles `metadata.depositId` (wallet top-ups). If `depositId` is absent, it `break`s immediately — `metadata.orderId` is never read. If the client-side `/api/payments/stripe/confirm` fails or `fulfillOrder()` errors out, the order is stuck PAID+PROCESSING forever with no safety net.

**Paystack:** `paymentsService.verifyAndCompletePaystackPayment` → `markAsPaid` sets order to `CONFIRMED+PAID` but **never calls `generateLicensesForOrder`**. All Paystack orders get no licenses.

## Fix

Mirror exactly what `ordersService.updatePaymentStatus(id, PAID)` does (the working wallet path):
- Updates order to CONFIRMED+PAID
- Sends confirmation email + notification
- Calls `generateLicensesForOrder`

## Tasks

### 1. Make `generateLicensesForOrder` public in `orders.service.ts`
- [x] Change `private async generateLicensesForOrder` → `async generateLicensesForOrder`

### 2. Add `orderId` branch to Stripe webhook in `webhooks.controller.ts`
- [x] After the `depositId` block, add an `else if (paymentIntent.metadata?.orderId)` branch
- [x] Inside: find the order; if not already PAID, call `ordersService.updatePaymentStatus(orderId, PaymentStatus.PAID)`

### 3. Fix Paystack webhook in `payments.controller.ts`
- [x] After `verifyAndCompletePaystackPayment(reference)`, capture return value and extract `orderId`
- [x] Call `ordersService.generateLicensesForOrder(orderId)` (fire-and-forget with `.catch` log)

### 4. Write recovery SQL for stuck orders
- [x] SQL to identify PAID orders with zero licenses
- [x] SQL to set them back to a re-triggerable state (or manual re-run notes)

#### Step 1 — Identify stuck orders (PAID but no licenses)
```sql
SELECT o.id, o."orderNumber", o."paymentStatus", o.status, o."createdAt", o."userId",
       COUNT(l.id) AS license_count
FROM orders o
LEFT JOIN licenses l ON l.order_id = o.id
WHERE o."paymentStatus" = 'PAID'
  AND o.status IN ('PROCESSING', 'CONFIRMED')
GROUP BY o.id
HAVING COUNT(l.id) = 0
ORDER BY o."createdAt" DESC;
```

#### Step 2 — Trigger re-generation manually
For each stuck `orderId` returned above, call the API or run this to mark them ready for the webhook to re-process:
```sql
-- Set status back to CONFIRMED so the next deploy re-triggers license gen via the webhook fix
-- NOTE: The webhook fix only generates licenses on NEW webhook events.
-- For already-stuck orders, run the Node script below instead.
```

#### Step 3 — One-time Node recovery script (run once on Railway console)
```typescript
// Run: npx ts-node scripts/recover-licenses.ts
import { ordersService } from './src/services/orders.service'
import prisma from './src/config/database'

async function recoverLicenses() {
  const stuckOrders = await prisma.$queryRaw`
    SELECT o.id
    FROM orders o
    LEFT JOIN licenses l ON l.order_id = o.id
    WHERE o."paymentStatus" = 'PAID'
      AND o.status IN ('PROCESSING', 'CONFIRMED')
    GROUP BY o.id
    HAVING COUNT(l.id) = 0
  ` as { id: string }[]

  console.log(`Found ${stuckOrders.length} orders with no licenses`)
  for (const { id } of stuckOrders) {
    console.log('Generating licenses for order', id)
    await ordersService.generateLicensesForOrder(id)
  }
  console.log('Done')
}

recoverLicenses().catch(console.error).finally(() => prisma.$disconnect())
```

---

## Review

### Changes Made
1. **`zenorar-api/src/services/orders.service.ts`** — Removed `private` from `generateLicensesForOrder` so it can be called externally (by Paystack/Stripe handlers).

2. **`zenorar-api/src/controllers/webhooks.controller.ts`** — Added `ordersService` + `PaymentStatus` imports. In `payment_intent.succeeded`: restructured the `depositId`-only block into `if (depositId) { deposit path } else if (orderId) { order path }`. The order path calls `ordersService.updatePaymentStatus(orderId, PAID)` — which sets CONFIRMED+PAID, sends confirmation email, sends notification, and generates licenses. Idempotent (skips if already PAID).

3. **`zenorar-api/src/controllers/payments.controller.ts`** — Added `ordersService` import. In `handlePaystackWebhook → charge.success`: captured return value of `verifyAndCompletePaystackPayment`, then fire-and-forget `ordersService.generateLicensesForOrder(payment.orderId)`.

### Recovery for Stuck Orders
Run the Step 1 SQL above on the Neon DB to find affected orders, then run the Step 3 recovery script on Railway to generate their missing licenses.

### No Breaking Changes
- Deposit/wallet flows unchanged.
- `generateLicensesForOrder` is still called the same way internally; only visibility changed (private → public).
