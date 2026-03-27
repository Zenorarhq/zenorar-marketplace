# Library Purchase Flow Fixes

## Checklist

- [x] **Fix 1 (Critical):** Stripe confirm route silently discards fulfillment failures
  - File: `app/api/payments/stripe/confirm/route.ts`
  - Root cause: fulfillment errors are caught + console.warn'd, always returns `{ success: true }` even if gift card/digital delivery failed
  - Fix: detect failed items after fulfillment → send "delivery failed" notification + include `fulfillmentWarning` in response

- [x] **Fix 2 (Low):** Gift card wallet purchase doesn't invalidate library cache before redirect
  - File: `app/(shop)/gift-cards/page.tsx`
  - Root cause: `router.push('/profile/library...')` fires before React Query cache is invalidated
  - Fix: call `queryClient.invalidateQueries({ queryKey: ['user-library'] })` before the push

- [x] **Fix 3 (Medium):** Scripts/digital products with failed Stripe fulfillment show no pending/failed state in library
  - File: `app/api/library/route.ts`
  - Root cause: library only queries `licenses` table; if no license created (fulfillment failed), product never appears
  - Fix: add query for digital product orders (script/tool/api) with no license yet → show as pending/failed items

---

# Gift Card Provider Deactivation — Task Plan

## Goal
When a gift card provider (Reloadly, Tango, Zendit) is disabled in Admin Settings,
all cards sourced from that provider are set to is_active = false so they disappear
from the storefront. Sales history in user_gift_cards is never touched.

## Approach
Add deactivation logic inside syncAllGiftCardProviders() in lib/gift-cards/sync.ts.
After getting the enabled providers list, for each provider NOT in that list, set all
its cards to is_active = false. Runs automatically because the settings page
auto-triggers a sync after saving when at least one provider is still enabled.

## Known gap
If ALL providers are disabled at once, no auto-sync runs so cards won't deactivate
automatically. Admin must manually deactivate in that case.

## Files changed
- lib/gift-cards/sync.ts

## Checklist
- [x] 1. Add task to todo.md
- [x] 2. Add deactivation loop to syncAllGiftCardProviders in sync.ts
- [x] 3. Commit and push

## Review
Deactivation runs as part of every sync. Disabled provider cards become inactive.
Re-enabling a provider and re-syncing restores them. All purchase history preserved.

---

# Vendor Badge — Task Plan

## Goal
Show a "Verified Vendor" badge in 4 places for users where `user.isVendor === true`.

## Locations

### 1. `/profile` page — next to user name (profile/page.tsx)
- After `<h1>` name line, add a green pill badge: `✦ Verified Vendor`
- Renders only when `user?.isVendor`

### 2. Header desktop dropdown — top of menu (Header.tsx)
- Above the wallet balance `<Link>`, add a non-clickable vendor pill row
- Renders only when `user?.isVendor`

### 3. Header avatar button — vendor dot overlay (Header.tsx, both desktop + mobile avatar)
- Add a small green dot (absolute positioned) on bottom-right of avatar circle when `user?.isVendor`
- Applies to both the desktop button (line ~508) and mobile button (line ~313)

### 4. `/profile/commissions` page header (commissions/page.tsx)
- Next to "Commissions" h1, add the same green pill badge

## Rules
- No new components — inline JSX only
- Conditional on `user?.isVendor` every time
- Badge style: `text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full`

## Order of work
- [ ] 1. profile/page.tsx — badge next to name
- [ ] 2. Header.tsx — vendor dot on desktop avatar
- [ ] 3. Header.tsx — vendor dot on mobile avatar
- [ ] 4. Header.tsx — vendor pill in desktop dropdown
- [ ] 5. Header.tsx — vendor pill in mobile dropdown
- [ ] 6. commissions/page.tsx — badge next to h1
- [ ] 7. Build check
- [ ] 8. Commit and push

## Review
(added after completion)

---

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

# Script Commission Tiers — Task Plan

## Goal
Replace the flat global `vendorCommissionPercent` for scripts with price-range tiers.
Each tier has editable min price, max price, and commission %. No defaults — if nothing
is saved, commission is 0%. Fully managed from Admin → Settings → Price Markup tab.

## Files (6 total, 2 new)

### API (zenorar-api)
1. `src/services/script-commission-tiers.service.ts` *(new)* — load/save 3 tiers from SiteSetting DB (keys: scriptCommTier1Min/Max/Pct, tier2, tier3). 5-min cache. No defaults.
2. `src/controllers/settings.controller.ts` — add GET + PUT handlers for `/settings/script-commission-tiers`
3. `src/routes/settings.routes.ts` — register 2 routes + Zod schema
4. `src/services/vendor.service.ts` — for `script` type: load tiers, find matching tier by itemPrice, use that commission %; if no tier matches → 0%

### Marketplace (zenorar-marketplace)
5. `components/admin/ScriptCommissionTiersSection.tsx` *(new)* — mirror of ProtectionLevelsSection: 3 tiers, each with min/max/commission inputs
6. `app/admin/settings/page.tsx` — import and render `<ScriptCommissionTiersSection />` in Price Markup tab

## Order of work
- [ ] 1. Create script-commission-tiers.service.ts
- [ ] 2. Add controller handlers
- [ ] 3. Register routes
- [ ] 4. Update vendor.service.ts commission branch
- [ ] 5. Create ScriptCommissionTiersSection.tsx component
- [ ] 6. Add component to settings page
- [ ] 7. Build (marketplace)
- [ ] 8. Commit and push both repos

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

---

# Virtual Numbers (Monthly + OTP) — Audit Fix Plan

## Issues Found

### Issue 1 (HIGH) — Monthly numbers have no wallet payment path
- **Root cause:** Monthly number purchase only charges via Stripe. Wallet balance is never offered as a payment option, even though OTP numbers support wallet payment.
- **Files:** `app/api/virtual-numbers/purchase/route.ts`, purchase UI page

### Issue 2 (HIGH) — No renewal endpoint for monthly numbers
- **Root cause:** No `POST /api/virtual-numbers/[id]/renew` endpoint exists. Users have no way to extend a monthly number before expiry. No renew button exists in UI either.
- **Files:** New route `app/api/virtual-numbers/[id]/renew/route.ts`, backend service, UI library page

### Issue 3 (MEDIUM) — SMS limit not persisted at provisioning time
- **Root cause:** After provider confirms number allocation, the `sms_limit` from the product record is not written to the `virtual_numbers` row. Field is NULL, making enforcement impossible.
- **Files:** Backend provisioning service (wherever provider response is saved to DB)

### Issue 4 (MEDIUM) — No provider availability check before payment capture
- **Root cause:** For monthly purchases, payment is captured first. If provider then rejects the allocation, user is already charged with no automatic refund issued.
- **Fix:** Call provider availability check API before capturing payment. Return error if unavailable.
- **Files:** Backend purchase service / purchase route handler

### Issue 5 (LOW) — Inconsistent metadata field names across flows
- **Root cause:** OTP and monthly flows write different keys into `metadata` JSON (`otp_number` vs `phone_number`, `provider_ref` vs `provider_id`). Code reading these fields is fragile and error-prone.
- **Fix:** Standardise on one set of keys and update all read/write paths.
- **Files:** Backend virtual numbers service, any route reading metadata

### Issue 6 (LOW) — Test-mode OTP records never cleaned up
- **Root cause:** In sandbox/test mode, OTP provisioning creates a DB row but TTL/cleanup cron only targets live-mode records. Stale test rows accumulate indefinitely.
- **Fix:** Add `is_test` boolean to the row; include test rows in cleanup (delete after ~10 min).
- **Files:** Backend OTP provisioning path, cleanup cron job

---

## Checklist

- [x] 1. Add wallet payment path to monthly number purchase — already implemented; no change needed
- [x] 2. Renewal: endpoint existed; fixed library Renew button for expired VNs to call correct endpoint
- [ ] 3. Write `sms_limit` to virtual_numbers row at provisioning time
- [x] 4. Add provider availability check before wallet payment — added guard to `handleInstantCheckout`
- [ ] 5. Standardise metadata keys across OTP and monthly flows
- [ ] 6. Add `is_test` flag and include test rows in TTL/cleanup cron

## Review
(added after completion)
