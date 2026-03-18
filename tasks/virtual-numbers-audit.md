# Virtual Numbers — Full Audit Report

**Scope:** Admin page, shop/user page, profile number detail page, API routes, API client lib
**Date:** 2026-03-18

---

## CRITICAL

### 1. `markMessagesRead` always 404s — messages can never be marked as read

**Root cause:**
`lib/api/virtual-numbers.ts:258` calls:
```
POST /api/virtual-numbers/my-numbers/${numberId}/messages/read
```
But this route does not exist. The only messages route is:
```
app/api/virtual-numbers/my-numbers/[id]/messages/route.ts  (GET only)
```
There is no `/messages/read/route.ts`. Every call silently 404s.

**Impact:** Inbound messages are permanently "unread". The unread indicator (left border highlight) never clears for any user.

**Files:** `lib/api/virtual-numbers.ts:258`, missing `app/api/virtual-numbers/my-numbers/[id]/messages/read/route.ts`

**Fix:** Create `app/api/virtual-numbers/my-numbers/[id]/messages/read/route.ts` — POST handler that accepts `{ messageIds: string[] }`, verifies ownership, and runs:
```sql
UPDATE virtual_number_messages SET is_read = true WHERE id = ANY($1) AND virtual_number_id = $2
```

---

## HIGH

### 2. No Renew button on profile numbers page

**Root cause:**
The backend is fully built:
- `GET /api/virtual-numbers/my-numbers/[id]/renew` — returns renewal price + wallet balance
- `POST /api/virtual-numbers/my-numbers/[id]/renew` — deducts wallet, renews number, records transaction

`lib/api/virtual-numbers.ts:278` has `renewNumber()` which calls the POST endpoint.

But `app/profile/numbers/[id]/page.tsx` has no Renew button anywhere. Users cannot renew expiring or expired numbers through the UI. The number just expires and they lose it.

**Files:** `app/profile/numbers/[id]/page.tsx`

**Fix:** Add a "Renew" button near the header (next to "Send SMS"), disabled unless `numberData.status !== 'cancelled'`. On click: fetch GET renew price, show a confirmation modal with price + wallet balance, then call POST renew.

---

### 3. Reply button shown on outbound messages (sends SMS to own number)

**Root cause:**
`app/profile/numbers/[id]/page.tsx:386–395` — the Reply button is rendered for every message:
```tsx
<button onClick={() => {
  setNewMessage({ to: message.fromNumber, body: '' })
  setShowSendModal(true)
}}>
  <Icon name="reply" size={18} />
</button>
```
For outbound messages, `message.fromNumber` is the user's own virtual number. Clicking reply pre-fills `to` with the user's own number → they'd be SMS-ing themselves.

**Fix:** Wrap the reply button in a direction check:
```tsx
{message.direction === 'inbound' && (
  <button ...>
    <Icon name="reply" size={18} />
  </button>
)}
```

**Files:** `app/profile/numbers/[id]/page.tsx` (around line 386)

---

## MEDIUM

### 4. `renewNumber` client type mismatch

**Root cause:**
`lib/api/virtual-numbers.ts:278–285` declares:
```ts
export async function renewNumber(numberId: string): Promise<{
  success: boolean
  data?: { redirectUrl: string }
  error?: string
}>
```
But the actual API POST response (`app/api/virtual-numbers/my-numbers/[id]/renew/route.ts:167`) returns:
```json
{ "success": true, "newExpiresAt": "...", "amountPaid": 9.99, "newBalance": 5.01, "message": "..." }
```
There is no `redirectUrl`. When the Renew UI is added, consuming `result.data?.redirectUrl` will always be undefined.

**Fix:** Update the return type to match the actual API response shape.

**Files:** `lib/api/virtual-numbers.ts:278–285`

---

### 5. Admin page uses `localStorage.getItem('admin_auth_token')` everywhere

**Root cause:**
All 6 data-fetching calls and 4 mutations in `app/admin/virtual-numbers/page.tsx` build auth manually:
```ts
const token = localStorage.getItem('admin_auth_token')
fetch('/api/admin/...', { headers: { Authorization: `Bearer ${token}` } })
```
All other admin pages use `localApiFetch` from the shared client which handles auth uniformly. If `admin_auth_token` is null (not set in localStorage), requests send `Authorization: Bearer null` — the server may accept or reject this, but there's no redirect to login and no user-facing error. The page silently stays on loading/empty state.

**Note:** This is an architectural inconsistency, not a crash. Low urgency unless `localApiFetch` is being standardised.

**Files:** `app/admin/virtual-numbers/page.tsx` (lines 147, 168, 183, 198, 213, 226, 252, 275, 293)

---

## LOW

### 6. `markMessagesRead` called without `await` — no query invalidation after read

**Root cause:**
`app/profile/numbers/[id]/page.tsx:104`:
```ts
markMessagesRead(numberId, unreadIds)  // no await
```
Even if the `/read` route existed (see issue #1), two problems remain:
1. No `await` — errors are silently swallowed
2. No `queryClient.invalidateQueries` after marking read — the message list won't update (remove the blue border) until the next 30-second poll cycle

**Fix:** `await markMessagesRead(...)` and call `queryClient.invalidateQueries({ queryKey: ['virtual-number-messages', numberId] })` on success.

**Files:** `app/profile/numbers/[id]/page.tsx` (around line 104)

---

### 7. `getUnreadCount` function defined but never used

**Root cause:**
`lib/api/virtual-numbers.ts:267` defines `getUnreadCount()` which calls `/virtual-numbers/my-numbers/${numberId}/unread-count`. There is no matching API route for this endpoint, and it's never called anywhere in the codebase.

**Action:** Dead code. Either implement the feature (unread badge on profile number cards) or delete the function.

**Files:** `lib/api/virtual-numbers.ts:267–273`

---

### 8. Starting price hardcoded at $2 on shop number cards

**Root cause:**
`app/(shop)/virtual-numbers/page.tsx:996`:
```ts
const startingPrice = 2
```
The "Starting From" price shown on each number card is always $2 regardless of the selected country's `retailMonthly` price or available plan base prices. If plans change, the displayed price won't update.

**Files:** `app/(shop)/virtual-numbers/page.tsx:996`

---

### 9. `AvailableNumber` interface missing `source` field — "INSTANT" badge never shows

**Root cause:**
`app/(shop)/virtual-numbers/page.tsx:1027`:
```tsx
{number.source === 'inventory' && (
  <span ...>INSTANT</span>
)}
```
`number` is typed as `AvailableNumber` from `lib/api/virtual-numbers.ts`, which has no `source` field. TypeScript doesn't error (implicit `undefined`), but `undefined === 'inventory'` is always false — the badge never renders even if the API returns a `source` field.

**Fix:** Add `source?: 'inventory' | 'provider'` to the `AvailableNumber` interface.

**Files:** `lib/api/virtual-numbers.ts:44–56` (`AvailableNumber` interface)

---

## Summary Table

| # | Severity | Issue | Files |
|---|----------|-------|-------|
| 1 | CRITICAL | `markMessagesRead` 404s — route missing | `lib/api/virtual-numbers.ts:258`, missing route |
| 2 | HIGH | No Renew button — backend built, UI missing | `app/profile/numbers/[id]/page.tsx` |
| 3 | HIGH | Reply button on outbound messages → sends to self | `app/profile/numbers/[id]/page.tsx:386` |
| 4 | MEDIUM | `renewNumber` return type wrong (`redirectUrl` vs real shape) | `lib/api/virtual-numbers.ts:278` |
| 5 | MEDIUM | Admin page uses raw localStorage auth instead of `localApiFetch` | `app/admin/virtual-numbers/page.tsx` |
| 6 | LOW | `markMessagesRead` not awaited, no query invalidation | `app/profile/numbers/[id]/page.tsx:104` |
| 7 | LOW | `getUnreadCount` defined but no route + never called | `lib/api/virtual-numbers.ts:267` |
| 8 | LOW | Starting price hardcoded $2 on shop cards | `app/(shop)/virtual-numbers/page.tsx:996` |
| 9 | LOW | `AvailableNumber` missing `source` field → INSTANT badge broken | `lib/api/virtual-numbers.ts:44` |

**Total issues: 9 (1 critical, 2 high, 2 medium, 4 low)**
