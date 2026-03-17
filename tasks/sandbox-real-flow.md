# Sandbox Mode v2 — Real User Flow with Mock Backend Data

## Root Cause
Current sandbox creates test products via shortcut buttons. The user wants to walk through the **real purchase flow** (browse → select → pay → receive) but with mock backend data when `globalTestMode` is ON. No real provider API calls.

## Approach
When `globalTestMode` is enabled, existing API endpoints detect it and return mock data instead of calling real providers. The frontend UI stays untouched — the user experiences the exact same journey a real buyer would.

### What changes per product:

---

### Virtual Numbers
**Endpoints modified:**
- [x] `GET /api/virtual-numbers/available` — returns mock 555 numbers when test mode ON
- [x] `lib/order-fulfillment.ts` processVirtualNumberItem — creates mock user_virtual_number with provider='test'

### eSIMs
**Endpoints modified:**
- [x] `lib/order-fulfillment.ts` processEsimItem — creates mock user_esims with source_type='test', fake QR/ICCID

### Gift Cards
**Endpoints modified:**
- [x] `lib/order-fulfillment.ts` processGiftCardItem — creates mock user_gift_cards with source='test', fake code/PIN

### Cards (Virtual + Instant)
**Endpoints modified:**
- [x] `POST /api/cards/purchase` — creates mock user_cards with provider='test', fake card number 4111...1111
- [x] `lib/order-fulfillment.ts` processCardItem — mock card data when test mode ON

### Cleanup & Tagging
- [x] Removed shortcut "Create Test" buttons from all pages
- [x] Removed test-purchase endpoints (deleted)
- [x] `TestModeBanner` changed to info-only (no button)
- [x] `lib/test-mode.ts` cleanup finds orders by product link AND metadata tag
- [x] `lib/order-fulfillment.ts` tags order_items with `test_mode: 'true'` after sandbox fulfillment
- [x] `app/api/cards/purchase/route.ts` tags order_items with `test_mode: 'true'` in sandbox path

---

## Bugs Found & Fixed

### Bug 1 (Critical): Cleanup orphaned orders
**Root cause:** Cleanup deleted products FIRST, then searched for orders by product link — found nothing because products were already gone. Orders and wallet transactions were left orphaned.
**Fix:** Cleanup now finds orders by BOTH metadata tag AND product link BEFORE deleting anything. Order IDs collected first, then refund, then delete wallet txns, then products, then orders.

### Bug 2 (High): order_items not tagged with test_mode
**Root cause:** The real purchase flow goes through `/api/orders/instant` → `fulfillOrder()` → process functions. But `fulfillOrder()` didn't tag order_items with `test_mode: 'true'` in the metadata. Cleanup by metadata found nothing.
**Fix:** Added tagging step in `fulfillOrder()` after processing all items when test mode is ON.

### Bug 3 (Medium): Cards purchase endpoint not tagging
**Root cause:** Cards purchase has its own flow outside `fulfillOrder()`, so the fulfillment tagging didn't apply.
**Fix:** Added metadata tagging in the sandbox branch of `/api/cards/purchase`.

### Bug 4 (Medium): processCardItem in order-fulfillment had no test mode check
**Root cause:** Cart checkout for cards goes through `processCardItem()` which called real provider APIs.
**Fix:** Added test mode check before provider call, returns mock card data.

### Bug 5 (Medium): `pricing` variable scoped inside else block but used after
**Root cause:** After adding test mode branch, `pricing` was only available in the else block but referenced later.
**Fix:** Moved `getProviderPricing()` before the branch with `.catch(() => null)`, used optional chaining.

---

## Review

### Files changed:

**Modified:**
- `app/api/virtual-numbers/available/route.ts` — mock numbers when test mode ON
- `lib/order-fulfillment.ts` — mock provisioning for VN/eSIM/gift cards/cards + order_items tagging
- `app/api/cards/purchase/route.ts` — mock card creation + order_items tagging
- `components/ui/TestModeBanner.tsx` — info-only banner, no shortcut buttons
- `app/(shop)/esim/page.tsx` — removed shortcut handler, simplified banner
- `app/(shop)/gift-cards/page.tsx` — removed shortcut handler, simplified banner
- `app/(shop)/cards/page.tsx` — removed shortcut handler, simplified banner
- `app/(shop)/virtual-numbers/page.tsx` — removed shortcut handler, simplified banner
- `lib/test-mode.ts` — cleanup by product link + metadata, zero-trace deletion

**Deleted:**
- `app/api/esim/test-purchase/route.ts`
- `app/api/gift-cards/test-purchase/route.ts`
- `app/api/cards/test-purchase/route.ts`
- `app/api/virtual-numbers/test-number/route.ts`

### Build status:
- `next build` compiles successfully
