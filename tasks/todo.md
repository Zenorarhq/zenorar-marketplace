# Phone Refill Commission Fix — Task Plan

## Problem
Phone refill vendor commission is calculated using a flat 5% estimate.
The real profit (offer.price - offer.cost) is available from Zendit but
discarded before it reaches the order metadata. This fix stores the real
cost and uses it for accurate commission calculation.

## Files to change (3 total)

### 1. lib/phone-refills/provider.ts
- Add `cost` field to `TopupOfferSummary` interface
- Populate `cost` in `getOperators()` from Zendit's `offer.cost` object
- Use same divisor logic as `price` and `sendAmount`
- If cost is unavailable (range offers), store null

### 2. app/(shop)/phone-refills/page.tsx
- In `processWalletPayment`, add `providerCost: offer.cost` to item metadata
  when calling /api/orders/instant

### 3. zenorar-api/src/services/vendor.service.ts
- In the phone_refill commission branch, read `metadata.cost` from order item
- If present: markupProfit = itemPrice - metadata.cost
- If absent (old orders or range offers): fall back to current 5% estimate

## What does NOT change
- Customer-facing prices
- Wallet deduction amounts
- Order creation flow
- All other product type commission branches
- vendorCommissionPercent setting

## Order of work
- [ ] 1. Update TopupOfferSummary interface + getOperators() in provider.ts
- [ ] 2. Pass providerCost in metadata in page.tsx
- [ ] 3. Update phone_refill commission branch in vendor.service.ts
- [ ] 4. Build to verify no TypeScript errors
- [ ] 5. Commit and push

## Review
(added after completion)

---

# Vendor System Audit Fixes — Task Plan

## Issues Fixed (2026-03-19)

- [x] BUG 3: `getPayoutHistory`, `adminGetVendorDetail`, `adminListPayouts` used INNER JOIN on `vendor_payout_methods` — changed to LEFT JOIN so payouts with deleted methods still appear
- [x] BUG 4: `adminMarkPayoutPaid` marked ALL AVAILABLE commissions as PAID regardless of payout amount — replaced with CTE (oldest-first, up to payout amount)
- [x] BUG 5: `getCommissionHistory` aliased `order_id AS "orderNumber"` — LEFT JOIN `orders` table added, `COALESCE(o.order_number, vc.order_id)` used
- [x] BUG 6: React Fragment in applications table map had no `key` — replaced `<>` with `<Fragment key={app.id}>` in `admin/vendors/page.tsx`
- [x] MISSING 1: `become-a-vendor/apply/page.tsx` showed form unconditionally — added `useEffect` to check existing application on mount; shows status screen for PENDING/APPROVED/REJECTED
- [x] MISSING 3: `orders.service.ts cancel()` didn't call `reverseCommissions()` — added non-blocking call after the cancel transaction
- [x] MISSING 4: `recordCommissions()` checked `is_vendor` but not suspension — added `vendor_suspended_at` check
- [x] MISSING 5: Footer "Become a Vendor" link missing when CMS columns configured — added IIFE to inject link into Company column (or last column) if not already present
- [x] ISSUE 1: `adminAdjustCommissionBalance` with negative amount inserted negative AVAILABLE row corrupting `lifetimeEarned` — credits now insert AVAILABLE row, debits use CTE to mark existing AVAILABLE commissions as PAID
- [x] MISSING 2: Commission/payout history had no pagination (fixed limit=50) — added `commPage`/`payoutPage` state and Prev/Next controls; backend capped at 20/page

## Files Changed
- `zenorar-api/src/services/vendor.service.ts` — BUG 3, 4, 5, MISSING 4, ISSUE 1
- `zenorar-api/src/services/orders.service.ts` — MISSING 3
- `zenorar-marketplace/app/admin/vendors/page.tsx` — BUG 6
- `zenorar-marketplace/app/become-a-vendor/apply/page.tsx` — MISSING 1
- `zenorar-marketplace/app/profile/commissions/page.tsx` — MISSING 2
- `zenorar-marketplace/components/layout/Footer.tsx` — MISSING 5
