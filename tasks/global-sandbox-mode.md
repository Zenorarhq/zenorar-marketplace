# Global Sandbox Mode — Test All Product Flows Without Provider APIs

## Overview
A single `globalTestMode` toggle in admin Settings → API Keys that enables sandbox/test features across ALL product pages. When enabled, any authenticated user can create test products with mock data — no real provider API calls. Wallet charges still work normally so the full payment flow is testable.

## What Already Exists
- `globalTestMode` setting added to admin Settings → API Keys tab (toggle + save)
- Virtual Numbers: test-number endpoint creates mock number in DB
- OTP: existing test-mock provider for simulated SMS codes

## Plan

### Task 1: Create shared test-mode checker utility
**File:** `lib/test-mode.ts`
- [x] Export `isTestModeEnabled()` — reads `globalTestMode` from `site_settings` (cached for 30s)
- [x] Export `canUseTestMode(userRole)` — returns true if test mode enabled OR user is admin
- [x] Export `cleanupTestDataForUser()` and `cleanupAllTestData()` — refunds wallet + deletes test records
- [x] All test endpoints use this instead of duplicating the check

### Task 2: eSIM sandbox — test purchase endpoint
**File:** `app/api/esim/test-purchase/route.ts`
- [x] Creates a mock `user_esims` record with fake QR code data and ICCID (source_type='test')
- [x] Creates order + order_item (product_type='esim', metadata.test_mode='true')
- [x] Deducts from wallet (real payment flow)
- [x] Redirects user to library page after creation

### Task 3: Gift Card sandbox — test purchase endpoint
**File:** `app/api/gift-cards/test-purchase/route.ts`
- [x] Creates a mock `user_gift_cards` record with fake code/PIN (source='test')
- [x] Creates order + order_item (product_type='gift_card', metadata.test_mode='true')
- [x] Deducts from wallet (real payment flow)

### Task 4: Cards sandbox — test purchase endpoint
**File:** `app/api/cards/test-purchase/route.ts`
- [x] Creates a mock `user_cards` record with encrypted fake card number/CVV (provider='test')
- [x] Creates card_transaction (type='creation')
- [x] Creates order + order_item (product_type='card', metadata.test_mode='true')
- [x] Supports both virtual and instant card types

### Task 5: Add test mode banner to eSIM page
**File:** `app/(shop)/esim/page.tsx`
- [x] Uses shared `TestModeBanner` component
- [x] "Create Test eSIM" button → redirects to library

### Task 6: Add test mode banner to Gift Cards page
**File:** `app/(shop)/gift-cards/page.tsx`
- [x] Uses shared `TestModeBanner` component
- [x] "Create Test Gift Card" button → redirects to library

### Task 7: Add test mode banner to Cards page
**File:** `app/(shop)/cards/page.tsx`
- [x] Uses shared `TestModeBanner` component
- [x] Switches between virtual/instant based on active tab

### Task 8: Add test mode API route + cleanup
**File:** `app/api/test-mode/route.ts`
- [x] GET returns `{ enabled: true/false }`
- [x] DELETE cleans up test data with wallet refunds + audit trail (CREDIT wallet_transactions)
- [x] Supports `?cleanup=all` (admin) and `?cleanup=mine` (user)

### Task 9: Auto-cleanup when globalTestMode turned OFF
**File:** `app/admin/settings/page.tsx`
- [x] Save handler calls `DELETE /api/test-mode?cleanup=all` when globalTestMode is false

### Task 10: Test products tagged for cleanup
- [x] Virtual Numbers: `provider = 'test'`
- [x] eSIMs: `source_type = 'test'`
- [x] Gift Cards: `source = 'test'`
- [x] Cards: `provider = 'test'`
- [x] Orders: `order_items.metadata->>'test_mode' = 'true'`

### Task 11: OTP test mode respects global toggle
**File:** `app/(shop)/virtual-numbers/page.tsx`
- [x] OTP tab test mode toggle wrapped in `{globalTestEnabled && (...)}`
- [x] Fetches `/api/test-mode` on mount to determine visibility

### Task 12: Reusable TestModeBanner component
**File:** `components/ui/TestModeBanner.tsx`
- [x] Shared component used by all product pages
- [x] Fetches test mode status, auto-hides when disabled
- [x] Expand/collapse UI with product-specific labels

### Task 13: Verify build passes
- [x] `next build` clean

---

## Files Summary

New files:
```
lib/test-mode.ts                              (shared utility)
components/ui/TestModeBanner.tsx               (reusable banner)
app/api/test-mode/route.ts                    (GET status + DELETE cleanup)
app/api/esim/test-purchase/route.ts           (mock eSIM)
app/api/gift-cards/test-purchase/route.ts     (mock gift card)
app/api/cards/test-purchase/route.ts          (mock card)
```

Modified files:
```
app/(shop)/esim/page.tsx                      (add banner)
app/(shop)/gift-cards/page.tsx                (add banner)
app/(shop)/cards/page.tsx                     (add banner)
app/(shop)/virtual-numbers/page.tsx           (shared banner + OTP global check)
app/api/virtual-numbers/test-number/route.ts  (use shared utility + order records)
app/admin/settings/page.tsx                   (globalTestMode toggle + auto-cleanup)
```

---

## Review

### What changed:
- **Global toggle**: Single `globalTestMode` setting in admin Settings → API Keys controls ALL test features
- **Shared utility** (`lib/test-mode.ts`): Cached check, cleanup with wallet refunds + CREDIT audit trail
- **Reusable banner** (`TestModeBanner.tsx`): All product pages use the same component
- **4 test-purchase endpoints**: Each creates mock data tagged for cleanup, charges wallet, creates order records
- **Cleanup on OFF**: When admin toggles off and saves, all test data is purged and wallets refunded
- **OTP respects global**: OTP tab test mode only shows when globalTestMode is enabled

### Bugs found and fixed during audit:
1. Cleanup refund missing wallet_transaction record → fixed with CREDIT entries
2. `balance_before/balance_after` NOT NULL constraint → fixed by querying current balance
3. Unused `vnTestMode` state → removed
4. OTP test mode always visible → wrapped in globalTestEnabled check

### Build status:
- `next build` passes clean
