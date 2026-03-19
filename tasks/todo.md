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
