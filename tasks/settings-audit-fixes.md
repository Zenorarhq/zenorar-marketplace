# Admin Settings — Notifications, Payments & Referral Audit Fixes

## Root Causes

### Notifications Tab
1. **Send Notification feature calls wrong API endpoints** — UI calls `/notifications/broadcast` and `/notifications/promotional` which don't exist. The actual working endpoint is `/admin/notifications/send`. Result: 404 when trying to send notifications.
2. **Notification settings toggles are decorative** — emailNewOrder, emailNewUser, emailLowStock, emailTicket are saved to DB but no backend service ever reads them. Order creation, user registration, stock alerts, and ticket creation don't check these settings before sending emails.
3. **Slack webhook saved but never used** — Field saves to DB, but no code sends notifications to Slack anywhere.
4. **Push notifications toggle is decorative** — No service worker registration, no VAPID key config, no subscription management.

### Payments Tab
5. **No test button for Crypto/Web3** — Minor UX gap, Stripe/Paystack/PayPal have test buttons but Crypto and Web3 don't.

### Referral Tab
6. **Public settings may not expose referral reward amounts** — Landing page `/ref/[code]` reads reward amounts from public settings. If not returned correctly, falls back to hardcoded $10.

---

## Plan

### Fix 1: Fix Send Notification endpoints (High)
**File:** `app/admin/settings/page.tsx`
- [ ] Find the Send Notification handler that calls `/notifications/broadcast` and `/notifications/promotional`
- [ ] Change to call the correct existing endpoint `/admin/notifications/send`
- [ ] Verify targeted mode is supported by the existing endpoint, or adapt the payload

### Fix 2: Wire notification settings to backend services (Medium)
**Files:** Backend order/user/ticket services that send emails
- [ ] In order creation service — check `emailNewOrder` setting before sending admin notification email
- [ ] In user registration service — check `emailNewUser` setting before sending admin notification email
- [ ] In ticket creation service — check `emailTicket` setting before sending admin notification email
- [ ] Note: `emailLowStock` requires a stock check mechanism — document as future improvement if no stock alert system exists

### Fix 3: Wire Slack webhook (Medium)
**File:** Create a utility or modify notification services
- [ ] Create a `lib/slack.ts` utility that reads `slackWebhook` from site_settings and sends messages
- [ ] Call it from the same places as Fix 2 (order created, user signup, ticket created)
- [ ] Add a "Test Webhook" button next to the Slack field in the UI

### Fix 4: Remove or label Push Notifications as "Coming Soon" (Low)
**File:** `app/admin/settings/page.tsx`
- [ ] Add "(Coming Soon)" label to the push notifications toggle
- [ ] Disable the toggle so users don't think it's working

### Fix 5: Verify referral public settings exposure (Low)
**File:** Public settings API endpoint
- [ ] Verify `/settings/public` returns referral group settings (referrerRewardAmount, refereeRewardAmount)
- [ ] If not, fix the endpoint to include them
- [ ] Verify the `/ref/[code]` landing page displays the correct amounts

---

## Review
*(To be filled after implementation)*
