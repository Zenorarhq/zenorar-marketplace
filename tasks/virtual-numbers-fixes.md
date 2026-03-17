# Virtual Numbers — Bug Fixes & Improvements

## Issues Identified

### Issue 1: OTP purchases missing from orders/revenue (Medium-High)
OTP purchases deduct from wallet and create `wallet_transactions` records, but never create `orders` or `order_items` records. This means OTP revenue is invisible in dashboard stats, admin purchases page, and finance reports.

### Issue 2: Profile numbers listing (Not a bug)
No dedicated page — by design. Numbers are accessed via Library page with filter. No fix needed.

### Issue 3: Grace period edge case (Low)
Cron-based expiry means a user could theoretically use a number briefly after expiry before the cron runs. Standard behavior for cron-based systems. Low risk.

### Issue 4: SMS forwarding email — no validation (Low)
Settings PATCH endpoint accepts any string for `sms_forward_email`. Invalid emails cause silent forwarding failure.

### Issue 5: Renewal price mismatch (Not a bug)
Migration 044 correctly handles UUID-to-TEXT conversion. No fix needed.

### Issue 6: In-memory rate limiting on serverless (Medium)
Rate limiter uses in-memory Map which resets on Lambda cold starts and doesn't share state across instances.

---

## Plan

### Fix 1: Add order record for OTP purchases
**File:** `lib/virtual-numbers/otp-service.ts` (or wherever the OTP purchase logic lives)
- [ ] After wallet deduction, create an `orders` record with `status='CONFIRMED'`, `paymentStatus='PAID'`
- [ ] Create an `order_items` record with `product_type='otp_number'`, metadata containing service/country/price
- [ ] On refund/cancel, update order status to `CANCELLED` and paymentStatus to `REFUNDED`
- [ ] Verify dashboard stats now include OTP revenue

### Fix 2: No action needed
Issue 2 is not a bug. Skip.

### Fix 3: Add expiry check to SMS send endpoint
**File:** `app/api/virtual-numbers/my-numbers/[id]/send-sms/route.ts`
- [ ] Before sending SMS, check if `expires_at < NOW()` on the user_virtual_numbers record
- [ ] If expired, return error "Number has expired" instead of attempting to send
- [ ] This is a 1-line guard, no architectural change needed

### Fix 4: Add email validation to settings endpoint
**File:** `app/api/virtual-numbers/my-numbers/[id]/settings/route.ts`
- [ ] Add email format validation before saving `sms_forward_email`
- [ ] Return 400 error if invalid format provided
- [ ] Simple regex check, no dependency needed

### Fix 5: No action needed
Issue 5 is not a bug. Skip.

### Fix 6: Move rate limiting to database
**File:** `lib/virtual-numbers/rate-limit.ts`
- [ ] Replace in-memory Map with database-backed rate limiting using existing `query()` helper
- [ ] Use a simple table or reuse an existing table to track request counts per user per window
- [ ] Alternative: use Arcjet (already in project) for SMS send rate limiting if it covers this route

---

## Review

### What changed:

**Fix 1 — OTP order records** (`lib/otp-numbers/service.ts`):
- `requestNumber()`: After wallet deduction + OTP record creation, now also creates an `orders` record (status=CONFIRMED, paymentStatus=PAID) and an `order_items` record (product_type='otp_number') with metadata linking back to the OTP ID
- `cancelNumber()`: After refunding wallet + cancelling OTP, now also updates the associated order to CANCELLED/REFUNDED via order_items metadata lookup

**Fix 3 — Expiry guard** (`app/api/virtual-numbers/my-numbers/[id]/send-sms/route.ts`):
- Added `expires_at` check after the active status check — returns 400 error if number is past expiry

**Fix 4 — Email validation** (`app/api/virtual-numbers/my-numbers/[id]/settings/route.ts`):
- Added regex validation on `smsForwardEmail` before saving — returns 400 if invalid format

**Fix 6 — DB-backed rate limiting** (`lib/virtual-numbers/rate-limit.ts`):
- Replaced in-memory Map with single SQL query counting outbound messages from `virtual_number_messages` table in last 1min/1hr/24hr
- No new tables needed — uses existing message log as the source of truth
- `checkSmsSendLimits()` is now async — updated send-sms route to await it

### Build status:
- `next build` passes clean