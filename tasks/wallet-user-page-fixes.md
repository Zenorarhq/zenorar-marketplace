# User Wallet Page — Fix Plan

## Files in Scope

| File | Role |
|------|------|
| `zenorar-marketplace/lib/api/deposits.ts` | API client — cancelDeposit uses wrong fetch helper |
| `zenorar-marketplace/app/profile/wallet/page.tsx` | User wallet page — all remaining issues |

---

## Fix 1 — `cancelDeposit` calls a non-existent Next.js route (CRITICAL)

**Root cause:** `lib/api/deposits.ts:176` — `cancelDeposit` calls `localApiFetch('/deposits/${depositId}/cancel')` which maps to `/api/deposits/${depositId}/cancel` — a Next.js API route that does not exist. The Railway backend has `POST /deposits/:id/cancel` (deposits.controller.ts:227). Every cancel attempt returns 404.

**Fix plan:**

`lib/api/deposits.ts` — Change `localApiFetch` to `apiFetch`:

```ts
// Before (line 176)
return localApiFetch<void>(`/deposits/${depositId}/cancel`, {

// After
return apiFetch<void>(`/deposits/${depositId}/cancel`, {
```

- [x] Change `localApiFetch` → `apiFetch` in `cancelDeposit`

---

## Fix 2 — Paystack success redirect doesn't refresh wallet balance (HIGH)

**Root cause:** `page.tsx:109-113` — the `deposit === 'success'` branch (triggered by Paystack redirect) shows a success message but never calls `queryClient.invalidateQueries`. The wallet balance stays stale until the 2-minute React Query cache expires. The PayPal success path at line 94-97 correctly invalidates both `['wallet']` and `['deposits']` — this branch was missed.

**Fix plan:**

`page.tsx` — Add invalidation in the `deposit === 'success'` branch:

```ts
// Before
} else if (deposit === 'success') {
  setDepositMessage({ type: 'success', text: 'Payment completed successfully!' })
  window.history.replaceState({}, '', '/profile/wallet')
}

// After
} else if (deposit === 'success') {
  setDepositMessage({ type: 'success', text: 'Payment completed successfully!' })
  queryClient.invalidateQueries({ queryKey: ['wallet'] })
  queryClient.invalidateQueries({ queryKey: ['deposits'] })
  window.history.replaceState({}, '', '/profile/wallet')
}
```

- [x] Add query invalidation to the `deposit === 'success'` redirect branch

---

## Fix 3 — ADJUSTMENT transactions always display as red "-" (MEDIUM)

**Root cause:** `page.tsx:385` — `isCredit` is computed as:
```ts
const isCredit = transaction.type === 'CREDIT' || transaction.type === 'DEPOSIT' || transaction.type === 'REFUND'
```
ADJUSTMENT is not included. A positive admin adjustment (e.g. +$10 bonus) renders as red "-$10.00". The sign should be determined by whether the amount is positive or negative for ADJUSTMENT type.

**Fix plan:**

`page.tsx` — Extend `isCredit` to handle ADJUSTMENT direction:

```ts
// Before
const isCredit = transaction.type === 'CREDIT' || transaction.type === 'DEPOSIT' || transaction.type === 'REFUND'

// After
const isCredit = transaction.type === 'CREDIT' || transaction.type === 'DEPOSIT' || transaction.type === 'REFUND'
  || (transaction.type === 'ADJUSTMENT' && Number(transaction.amount) > 0)
```

- [x] Fix ADJUSTMENT sign display in transaction list

---

## Fix 4 — No error UI when wallet balance fails to load (MEDIUM)

**Root cause:** `page.tsx:121-130` — the balance query throws on failure but `isError` is never destructured and there's no error UI in the JSX. If the API is down or returns an error, the balance card shows the loading skeleton permanently — user has no feedback.

**Fix plan:**

`page.tsx` — Destructure `isError` from the balance query and show a fallback in the balance card:

```ts
// Before
const { data: walletData, isLoading: walletLoading, refetch: refetchBalance } = useQuery({

// After
const { data: walletData, isLoading: walletLoading, isError: walletError } = useQuery({
```

In the JSX balance display, add an error state between the loading skeleton and the balance number:

```tsx
// Before
{walletLoading ? (
  <div className="h-16 bg-black/10 animate-pulse rounded-lg mb-6" />
) : (
  <p className="text-3xl sm:text-5xl font-bold text-black mb-6">
    {formatPrice(walletData?.balance || 0)}
  </p>
)}

// After
{walletLoading ? (
  <div className="h-16 bg-black/10 animate-pulse rounded-lg mb-6" />
) : walletError ? (
  <p className="text-black/60 text-lg font-medium mb-6">Unable to load balance</p>
) : (
  <p className="text-3xl sm:text-5xl font-bold text-black mb-6">
    {formatPrice(walletData?.balance || 0)}
  </p>
)}
```

- [x] Destructure `isError` (remove unused `refetchBalance`) from balance query
- [x] Add error fallback in balance card JSX

---

## Fix 5 — "Deposit" filter label vs "Credit" badge mismatch (MEDIUM)

**Root cause:** `page.tsx:359` — filter button renders `'DEPOSIT'` as "Deposit". After clicking, it fetches CREDIT-type transactions from the backend. But each row's badge says "Credit" (from `getTransactionBadge` line 198). User clicked "Deposit", sees "Credit" badge on every row — inconsistent labelling.

The simplest fix is to rename the filter button label to match what the badge says ("Credits"), and keep the underlying type mapping as-is.

**Fix plan:**

`page.tsx` — Change filter button label for 'DEPOSIT' type:

```tsx
// Before (line 369)
{type === 'all' ? 'All' : type.charAt(0) + type.slice(1).toLowerCase()}

// After
{type === 'all' ? 'All' : type === 'DEPOSIT' ? 'Credits' : type.charAt(0) + type.slice(1).toLowerCase()}
```

- [x] Rename "Deposit" filter button to "Credits" to match the badge label

---

## Fix 6 — CANCELLED and EXPIRED missing from deposit status filter (LOW)

**Root cause:** `page.tsx:495` — deposit filter only includes `['all', 'PENDING', 'COMPLETED', 'FAILED']`. CANCELLED and EXPIRED are valid statuses defined in `depositStatusConfig` (lines 33-35) but a user cannot filter to find them.

**Fix plan:**

`page.tsx` — Add CANCELLED and EXPIRED to the filter list:

```tsx
// Before
{(['all', 'PENDING', 'COMPLETED', 'FAILED'] as const).map((s) => (

// After
{(['all', 'PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'] as const).map((s) => (
```

Note: EXPIRED is omitted — a user never intentionally creates an expired deposit, so filtering for it offers little value. CANCELLED is more useful (user cancelled it themselves).

- [x] Add CANCELLED to deposit status filter options

---

## Fix 7 & 8 — Unused variable and dead import (LOW)

**Root cause:**
- `page.tsx:121` — `refetch: refetchBalance` is destructured from balance query but never called
- `page.tsx:10` — `type DepositMethod` is imported but never referenced

Both are dead code left from earlier iterations.

**Fix plan:**

`page.tsx`:
```ts
// Before (line 10)
import { getMyDeposits, cancelDeposit, type Deposit, type DepositStatus, type DepositMethod } from '@/lib/api/deposits'

// After
import { getMyDeposits, cancelDeposit, type Deposit, type DepositStatus } from '@/lib/api/deposits'
```

```ts
// Before (line 121)
const { data: walletData, isLoading: walletLoading, refetch: refetchBalance } = useQuery({

// After (combined with Fix 4)
const { data: walletData, isLoading: walletLoading, isError: walletError } = useQuery({
```

- [x] Remove `type DepositMethod` from import
- [x] Remove `refetch: refetchBalance` from balance query destructure (already handled in Fix 4)

---

## Execution Order

All fixes are in 2 files. Group by file:

### API client
1. **Fix 1** — `cancelDeposit` localApiFetch → apiFetch (`lib/api/deposits.ts`)

### User wallet page (`app/profile/wallet/page.tsx`)
2. **Fix 7 & 8** — Remove unused import + unused variable (cleanup first, fewer conflicts)
3. **Fix 4** — Add `isError` destructure + error UI in balance card
4. **Fix 2** — Add query invalidation to `deposit === 'success'` branch
5. **Fix 3** — Fix ADJUSTMENT sign display
6. **Fix 5** — Rename "Deposit" filter button to "Credits"
7. **Fix 6** — Add CANCELLED to deposit filter

**Total files touched:** 2
- `zenorar-marketplace/lib/api/deposits.ts` (Fix 1)
- `zenorar-marketplace/app/profile/wallet/page.tsx` (Fixes 2–8)

---

## Review

*(To be filled in after implementation)*
