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
- [ ] Export `isTestModeEnabled()` — reads `globalTestMode` from `site_settings` (cached for 30s)
- [ ] Export `requireTestModeOrAdmin(user)` — returns true if test mode enabled OR user is admin
- [ ] All test endpoints use this instead of duplicating the check

### Task 2: eSIM sandbox — test purchase endpoint
**File:** `app/api/esim/test-purchase/route.ts`
- [ ] Creates a mock `user_esims` record with fake QR code data and ICCID
- [ ] Creates order + order_item (product_type='esim') for dashboard tracking
- [ ] Deducts from wallet (real payment flow)
- [ ] Mock data: fake QR code URL, test ICCID (8901...), mock SMDP address
- [ ] Returns the user_esim ID so user is redirected to their eSIM detail page

### Task 3: Gift Card sandbox — test purchase endpoint
**File:** `app/api/gift-cards/test-purchase/route.ts`
- [ ] Creates a mock `user_gift_cards` record with a fake code and PIN
- [ ] Creates order + order_item (product_type='gift_card') for dashboard tracking
- [ ] Deducts from wallet (real payment flow)
- [ ] Mock data: fake code (TEST-XXXX-XXXX), fake PIN, mock brand/denomination
- [ ] Returns the user_gift_card ID

### Task 4: Cards sandbox — test purchase endpoint
**File:** `app/api/cards/test-purchase/route.ts`
- [ ] Creates a mock `user_cards` record with encrypted fake card number/CVV
- [ ] Creates order + order_item (product_type='card') for dashboard tracking
- [ ] Creates card_transaction (type='creation')
- [ ] Deducts from wallet (real payment flow)
- [ ] Mock data: fake card number (4111...1111), test CVV, test expiry
- [ ] Supports both virtual and instant card types
- [ ] Returns the card ID

### Task 5: Add test mode banner to eSIM page
**File:** `app/(shop)/esim/page.tsx`
- [ ] Add test mode banner at top (same style as virtual numbers)
- [ ] "Create Test eSIM" button → calls test-purchase endpoint
- [ ] Redirects to eSIM detail/library page after creation

### Task 6: Add test mode banner to Gift Cards page
**File:** `app/(shop)/gift-cards/page.tsx`
- [ ] Add test mode banner at top
- [ ] "Create Test Gift Card" button → calls test-purchase endpoint
- [ ] Redirects to gift card library after creation

### Task 7: Add test mode banner to Cards page
**File:** `app/(shop)/cards/page.tsx`
- [ ] Add test mode banner at top
- [ ] "Create Test Virtual Card" and "Create Test Instant Card" buttons
- [ ] Redirects to card library after creation

### Task 8: Add test mode API route for frontend to check status + cleanup
**File:** `app/api/test-mode/route.ts`
- [ ] GET returns `{ enabled: true/false }` — any authenticated user can check
- [ ] DELETE cleans up ALL test/mock data for the current user (test numbers, test eSIMs, test gift cards, test cards, and their associated orders/order_items/transactions)
- [ ] Pages fetch GET on mount to show/hide the banner

### Task 9: Auto-cleanup when globalTestMode is turned OFF
**File:** `app/admin/settings/page.tsx` (modify save handler)
- [ ] When `globalTestMode` changes from true → false, call `DELETE /api/test-mode?cleanup=all` to purge ALL test data across all users
- [ ] This ensures the DB is clean before going live

### Task 10: All test products tagged with `provider = 'test'`
- [ ] All test endpoints set `provider = 'test'` so cleanup queries can target them precisely:
  - `DELETE FROM user_virtual_numbers WHERE provider = 'test'`
  - `DELETE FROM user_esims WHERE provider = 'test'`
  - `DELETE FROM user_gift_cards WHERE provider = 'test'`
  - `DELETE FROM user_cards WHERE provider = 'test'`
  - `DELETE FROM orders WHERE id IN (SELECT "orderId" FROM order_items WHERE metadata->>'test_mode' = 'true')`

### Task 11: Verify build passes
- [ ] `next build` clean

---

## Files Summary

New files:
```
lib/test-mode.ts
app/api/test-mode/route.ts
app/api/esim/test-purchase/route.ts
app/api/gift-cards/test-purchase/route.ts
app/api/cards/test-purchase/route.ts
```

Modified files:
```
app/(shop)/esim/page.tsx (add banner)
app/(shop)/gift-cards/page.tsx (add banner)
app/(shop)/cards/page.tsx (add banner)
app/api/virtual-numbers/test-number/route.ts (use shared checker)
```

---

## Review
*(To be filled after implementation)*
