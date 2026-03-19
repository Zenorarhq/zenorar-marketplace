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
