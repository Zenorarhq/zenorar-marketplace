# Admin Settings — Notifications, Payments & Referral Audit Fixes

## Root Causes

### Notifications Tab
1. **Send Notification feature calls wrong API endpoints** — UI was calling non-existent paths. The correct Express routes are `/notifications/broadcast` and `/notifications/promotional`.
2. **Notification settings toggles seemed decorative** — Actually already wired via `admin-email.service.ts` in Express API. No fix needed.
3. **Slack webhook saved but never used** — Field saved to DB, but no code sent to Slack.
4. **Push notifications toggle is decorative** — No service worker, no VAPID keys.
5. **Sent notification history not loading** — Express `getSentBatches` queried `batchId` column only, but notifications sent via Next.js store batchId in metadata JSONB only.

### Payments Tab
6. **No test button for Crypto/Web3** — Minor UX gap. Not fixed (low priority).

### Referral Tab
7. **Public settings returned raw JSON strings** — Express `getPublicSettings()` didn't JSON-parse values, so referral reward amounts displayed as NaN on landing page.

---

## Plan

### Fix 1: Restore correct Send Notification endpoints
**File:** `app/admin/settings/page.tsx`
- [x] Broadcast calls `apiFetch('/notifications/broadcast')` (Express)
- [x] Targeted calls `apiFetch('/notifications/promotional')` (Express)
- [x] Both routes already exist on Express API

### Fix 2: Wire notification settings to backend services
- [x] **Already wired** — `admin-email.service.ts` reads emailNewOrder, emailNewUser, emailLowStock, emailTicket from DB via `shouldSend()`. No changes needed.

### Fix 3: Wire Slack webhook + test button
**Files:** `zenorar-api/src/services/slack.service.ts` (new), `orders.service.ts`, `auth.service.ts`, `tickets.service.ts`, `app/admin/settings/page.tsx`
- [x] Created `slack.service.ts` — reads webhook URL from settings, validates `hooks.slack.com`
- [x] Wired into orders (new order), auth (new user), tickets (new ticket)
- [x] Added "Test Webhook" button in settings UI with success/error feedback

### Fix 4: Label Push Notifications as Coming Soon
**File:** `app/admin/settings/page.tsx`
- [x] Toggle disabled and greyed out
- [x] Label shows "(Coming Soon)"

### Fix 5: Verify referral public settings exposure
**File:** `zenorar-api/src/services/settings.service.ts`
- [x] `getPublicSettings()` now JSON-parses values before returning
- [x] Referral settings are `isPublic: true` — correctly exposed
- [x] Landing page `/ref/[code]` now receives parsed numbers instead of raw JSON strings

### Fix 6: Fix sent notification history not loading via Express API
**Root cause:** Express `getSentBatches` used Prisma `groupBy` on `batchId` column. Notifications sent via Next.js store batchId in metadata JSONB only — column is null. Express found nothing.
**Files:** `zenorar-api/src/services/notifications.service.ts`
- [x] `getSentBatches` — rewritten with raw SQL using `COALESCE("batchId", metadata->>'batchId')` to check both
- [x] `deleteBatch` — uses raw SQL to match both column and metadata
- [x] `bulkDeleteBatches` — uses raw SQL to match both
- [x] `getBatchRecipients` — uses Prisma `OR` to match both column and metadata path

---

## Review

### Files changed:

**Marketplace (zenorar-marketplace):**
- `app/admin/settings/page.tsx` — Send notification uses correct Express endpoints, Slack test button, push notifications "(Coming Soon)", bio field, password text
- `app/api/admin/notifications/send/route.ts` — Added `userIds` support for targeted sends

**Express API (zenorar-api):**
- `src/services/slack.service.ts` — NEW: Slack webhook integration
- `src/services/orders.service.ts` — Added Slack notify on new order
- `src/services/auth.service.ts` — Added Slack notify on new user
- `src/services/tickets.service.ts` — Added Slack notify on new ticket
- `src/services/settings.service.ts` — `getPublicSettings()` JSON-parses values
- `src/services/notifications.service.ts` — `getSentBatches`, `deleteBatch`, `bulkDeleteBatches`, `getBatchRecipients` all handle both batchId column and metadata

### Bugs found during testing:
1. Send Notification was calling wrong Express paths — fixed by restoring original `/notifications/broadcast` and `/notifications/promotional`
2. Sent history not loading — Express queried batchId column but Next.js stores in metadata JSONB — fixed with COALESCE raw SQL
3. Public settings returned raw JSON strings — Express `getPublicSettings()` didn't parse — fixed with `JSON.parse()`

### Build status:
- Express API: `tsc --noEmit` clean
- Marketplace: `next build` compiled successfully
