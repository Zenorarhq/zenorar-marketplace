# Wallet System Audit — Fix Plan

## Files in Scope

| File | Role |
|------|------|
| `zenorar-api/src/services/wallet.service.ts` | Backend service — frozen wallet checks |
| `zenorar-api/src/controllers/wallet.controller.ts` | Backend controller — error handling |
| `zenorar-marketplace/app/profile/wallet/page.tsx` | User wallet page — filter type mismatch |
| `zenorar-marketplace/app/admin/wallets/page.tsx` | Admin wallet page — mutations, sort, filters, confirm |

---

## Fix 1 — User "Deposit" filter sends invalid enum to backend (HIGH)

**Root cause:** `profile/wallet/page.tsx:14` defines `TransactionFilter = 'all' | 'DEPOSIT' | 'DEBIT'`. On line 134, the filter value `'DEPOSIT'` is passed directly to `getTransactionHistory` as the `type` param. The backend `WalletTransactionType` enum has no `DEPOSIT` value — only `CREDIT | DEBIT | REFUND | ADJUSTMENT`. Prisma receives an unknown enum value and returns 0 results. The Deposit filter tab appears to work but always shows nothing.

**Fix plan:**

`profile/wallet/page.tsx` — Map `'DEPOSIT'` to `'CREDIT'` before passing to the API:

```ts
// Before (line 134)
const type = filter === 'all' ? undefined : filter as any

// After
const type = filter === 'all' ? undefined : filter === 'DEPOSIT' ? 'CREDIT' : filter as any
```

- [x] Fix "Deposit" filter type mapping in user wallet page

---

## Fix 2 — Admin wallet mutations have no error handler — failures are silent (HIGH)

**Root cause:** Every mutation in `admin/wallets/page.tsx` (addCredit, deductCredit, adjustBalance, freeze, unfreeze, approve, reject, reset) has `onSuccess` but no `onError`. When an operation fails (e.g. "Insufficient balance" on deduct, 500 on frozen wallet credit, network error), the admin sees nothing. The modal may close or stay open with no indication of what happened.

**Fix plan:**

`admin/wallets/page.tsx` — Add a top-level `mutationError` state and populate it from each mutation's `onError`:

```ts
// Add near other state declarations
const [mutationError, setMutationError] = useState<string | null>(null)

// Add onError to each mutation, e.g. addCreditMutation:
onError: (err: any) => setMutationError(err.message || 'Operation failed')

// Display in the action modal above the buttons:
{mutationError && (
  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 text-red-400 text-sm">
    {mutationError}
  </div>
)}
```

Also clear `mutationError` on modal open (`openActionModal`), and on `resetActionModal`.

Apply the same `onError` pattern to freeze, unfreeze (inline, since it has no modal), approve, reject, and reset mutations — for these, a simple state `actionError` displayed near the table header will do.

- [x] Add `mutationError` state to admin wallets page
- [x] Add `onError` to addCredit, deductCredit, adjustBalance mutations — display in action modal
- [x] Add `onError` to freeze mutation — display in freeze modal
- [x] Add `onError` to unfreeze, approve, reject, reset mutations — display inline near table
- [x] Clear error state when modals open/close

---

## Fix 3 — Admin "Add Credit" / "Deduct Credit" on frozen wallet returns 500 (MEDIUM)

**Root cause:** `wallet.service.ts:82` — `addCredit` calls `validateWalletNotFrozen` before the DB transaction. `deductCredit` (line 137) does the same. When an admin manually adds or deducts credit on a frozen wallet, this throws `'Wallet is frozen. Please contact support.'` — an uncaught error that becomes a 500. The controller at `wallet.controller.ts:86` has no catch for this error (unlike `deductCredit` which catches `'Insufficient balance'`).

**Fix plan:**

The correct behaviour: admin-initiated credit and debit operations should be allowed on frozen wallets (the freeze prevents user spending, not admin corrections). Remove the frozen check from admin code paths by not calling `validateWalletNotFrozen` inside `addCredit` and `deductCredit` — those checks should live in the checkout/payment flow, not in the raw service methods.

`wallet.service.ts` — Remove `validateWalletNotFrozen` from `addCredit` and `deductCredit`:

```ts
// addCredit — Before (line 82)
await this.validateWalletNotFrozen(userId)

// After — remove this line entirely

// deductCredit — Before (line 137)
await this.validateWalletNotFrozen(userId)

// After — remove this line entirely
```

Then add the frozen check at the call site where it matters — in the checkout/payment flow — not in the base service method. This keeps the service unopinionated and lets the caller decide.

Note: `refundCredit` also has this call (Fix 4 below). Remove it there too.

- [x] Remove `validateWalletNotFrozen` from `addCredit` in wallet.service.ts
- [x] Remove `validateWalletNotFrozen` from `deductCredit` in wallet.service.ts

---

## Fix 4 — `refundCredit` blocked by frozen wallet check (MEDIUM)

**Root cause:** `wallet.service.ts:190` — `refundCredit` calls `validateWalletNotFrozen`. If a user's wallet is frozen and an order is refunded (cancelled order, etc.), the refund transaction throws `'Wallet is frozen'` and the user never receives their money. A freeze should prevent spending, not block incoming refunds — that's a financial integrity issue.

**Fix plan:**

`wallet.service.ts` — Remove `validateWalletNotFrozen` from `refundCredit`:

```ts
// Before (line 190)
await this.validateWalletNotFrozen(userId)

// After — remove this line entirely
```

- [x] Remove `validateWalletNotFrozen` from `refundCredit` in wallet.service.ts

---

## Fix 5 — Admin deposit sort is client-side only on paginated data (MEDIUM)

**Root cause:** `admin/wallets/page.tsx:519-525` — The deposits table sort (by amount, status, date) runs a JS `.sort()` on `depositsData.deposits`, which is only the current page of 20 results. With 200 deposits, sorting by amount shows the largest within the current 20, not globally. The sort arrows imply global ordering but only reorder the visible slice.

**Fix plan:**

`admin/wallets/page.tsx` — Add `sortField` and `sortOrder` to the `depositsData` query key and pass them to `getAllDeposits`. Add `sortField` and `sortOrder` query params to `getAllDeposits` in the API client, and handle them in the backend.

**Frontend (`admin/wallets/page.tsx`):**
```ts
// Change query key to include sort state
queryKey: ['admin', 'deposits', depositPage, depositStatus, depositSort]

// Pass sort params to API
const result = await getAllDeposits(
  depositPage, limit,
  depositStatus === 'all' ? undefined : depositStatus,
  depositSort.field,
  depositSort.order
)
```

Remove the client-side `.sort()` call (lines 519-525) — render `depositsData.deposits` directly.

**API client (`lib/api/deposits.ts`):**
```ts
async function getAllDeposits(page, limit, status?, sortField?, sortOrder?) {
  // add sortField and sortOrder to query params
}
```

**Backend (`deposits.controller.ts` / `deposits.service.ts`):**
- Accept `sortField` and `sortOrder` query params
- Pass to Prisma `orderBy` in `getAllDeposits` service method

- [x] Pass sort params from admin page to `getAllDeposits` API call
- [x] Update `getAllDeposits` in `lib/api/deposits.ts` to accept and forward sort params
- [x] Update deposits backend controller to read sort query params
- [x] Update deposits backend service to use sort in Prisma `orderBy`
- [x] Remove client-side `.sort()` from admin deposits tab

---

## Fix 6 — Admin transaction filter missing REFUND and ADJUSTMENT options (LOW)

**Root cause:** `admin/wallets/page.tsx:61` — `txFilter` state type is `'all' | 'CREDIT' | 'DEBIT'`. Line 639 only renders 3 filter buttons (All, Credit, Debit). REFUND and ADJUSTMENT are valid `WalletTransactionType` values that admins cannot filter for.

**Fix plan:**

`admin/wallets/page.tsx` — Expand the filter type and add the missing buttons:

```ts
// Before (line 61)
const [txFilter, setTxFilter] = useState<'all' | 'CREDIT' | 'DEBIT'>('all')

// After
const [txFilter, setTxFilter] = useState<'all' | 'CREDIT' | 'DEBIT' | 'REFUND' | 'ADJUSTMENT'>('all')
```

```tsx
// Before (line 639)
{(['all', 'CREDIT', 'DEBIT'] as const).map(...)}

// After
{(['all', 'CREDIT', 'DEBIT', 'REFUND', 'ADJUSTMENT'] as const).map(...)}
```

Also update the `getAllTransactions` call to pass the expanded type (it already accepts `WalletTransactionType | undefined`, so no backend change needed).

- [x] Expand `txFilter` type to include REFUND and ADJUSTMENT
- [x] Add REFUND and ADJUSTMENT filter buttons to admin transactions tab

---

## Fix 7 — No success feedback on admin wallet operations (LOW)

**Root cause:** All mutations close the modal on success but show no confirmation. After adding $50 to a user's wallet, the admin sees the modal disappear and the table silently refresh. No toast, no banner, nothing.

**Fix plan:**

`admin/wallets/page.tsx` — Add a `successMessage` state (string | null). Set it in each mutation's `onSuccess`. Display it as a dismissible green banner at the top of the page (same pattern as the admin tickets page stats section). Auto-clear after 4 seconds.

```ts
const [successMessage, setSuccessMessage] = useState<string | null>(null)

// In addCreditMutation onSuccess:
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['admin', 'wallets'] })
  setSuccessMessage('Credit added successfully')
  resetActionModal()
}
// Similarly for each mutation with a relevant message
```

```tsx
{successMessage && (
  <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3">
    <Icon name="check-circle" size={20} className="text-green-500" />
    <span className="text-green-400 text-sm font-medium">{successMessage}</span>
    <button onClick={() => setSuccessMessage(null)} className="ml-auto text-slate-500 hover:text-white">
      <Icon name="close" size={16} />
    </button>
  </div>
)}
```

- [x] Add `successMessage` state to admin wallets page
- [x] Set success message in each mutation's `onSuccess`
- [x] Display success banner above tabs

---

## Fix 8 — No approve confirmation — accidental approvals can't be undone (LOW)

**Root cause:** `admin/wallets/page.tsx:567` — Clicking "Approve" on a deposit fires `approveMutation.mutate(deposit.id)` immediately with no confirmation. Once approved, the user's wallet is credited and there is no undo. One misclick approves a potentially fraudulent deposit.

**Fix plan:**

`admin/wallets/page.tsx` — Add a `confirmApproveId` state. When "Approve" is clicked, set `confirmApproveId`. Show a small inline confirmation row (or use the existing modal pattern):

```ts
const [confirmApproveId, setConfirmApproveId] = useState<string | null>(null)
```

Replace the direct mutate call with a two-step confirm:

```tsx
// Step 1 — first click
{confirmApproveId === deposit.id ? (
  <>
    <span className="text-yellow-400 text-xs font-medium">Confirm?</span>
    <button
      onClick={() => { approveMutation.mutate(deposit.id); setConfirmApproveId(null) }}
      className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-medium"
    >
      Yes
    </button>
    <button onClick={() => setConfirmApproveId(null)} className="px-3 py-1 bg-surface-dark text-slate-400 rounded-lg text-xs font-medium">
      No
    </button>
  </>
) : (
  <button onClick={() => setConfirmApproveId(deposit.id)} ...>
    Approve
  </button>
)}
```

- [x] Add `confirmApproveId` state to admin wallets page
- [x] Replace direct approve mutate with two-step confirm UI

---

## Gap Assessment — Which Gaps to Fix

Of the 5 gaps identified in the audit:

### Fix: Gap 3 — Users can't cancel their own pending deposits (IMPORTANT)

`depositsApi.cancelDeposit()` already exists in the frontend API client but is never called. A user who submits a bank transfer and then changes their mind is stuck — they must contact support. The endpoint is built; the UI just needs a Cancel button on pending manual deposits (BANK_TRANSFER, CRYPTO).

**Why it matters:** Avoids support overhead and prevents pending ghost deposits from cluttering the admin review queue.

### Fix: Gap 4 — No status filter on user deposit history (IMPORTANT)

The user's Deposit History tab mixes all statuses with no filtering. As deposits accumulate, pending items get buried in completed ones. A simple status filter (same 3 buttons as the transaction filter) takes 10 lines.

**Why it matters:** Low effort, high daily usability for active users.

### Skip: Gap 1 — `requireRole('ADMIN')` excludes EDITOR

Leave as-is unless you confirm EDITOR staff need wallet management. Financial operations should be restricted by default.

### Skip: Gap 2 — Wallet balance in admin user detail views

Nice-to-have. Not a blocker. Can revisit when building a unified admin user profile page.

### Skip: Gap 5 — 3 aggregate queries in `getAdminWalletOverview`

Performance micro-optimization. Not worth the refactor now. Flag for later.

---

## Execution Order

### Backend first (zenorar-api)
1. **Fix 3** — Remove frozen check from `addCredit` and `deductCredit` (service)
2. **Fix 4** — Remove frozen check from `refundCredit` (service)
3. **Fix 5** — Add sort params to deposits backend (controller + service)

### Frontend (zenorar-marketplace)
4. **Fix 1** — User deposit filter type mapping (user wallet page)
5. **Fix 6** — Add REFUND/ADJUSTMENT filter buttons (admin wallets page)
6. **Fix 2** — Add `onError` handlers to all mutations (admin wallets page)
7. **Fix 7** — Add success feedback banner (admin wallets page)
8. **Fix 8** — Add approve confirmation (admin wallets page)
9. **Gap 3** — Add cancel button on pending manual deposits (user wallet page)
10. **Gap 4** — Add status filter to user deposit history (user wallet page)

**Total files touched:** 6
- `zenorar-api/src/services/wallet.service.ts` (Fixes 3, 4)
- `zenorar-api/src/controllers/deposits.controller.ts` (Fix 5)
- `zenorar-api/src/services/deposits.service.ts` (Fix 5)
- `zenorar-marketplace/lib/api/deposits.ts` (Fix 5)
- `zenorar-marketplace/app/profile/wallet/page.tsx` (Fix 1, Gap 3, Gap 4)
- `zenorar-marketplace/app/admin/wallets/page.tsx` (Fixes 2, 6, 7, 8)

---

## Review

All 10 fixes implemented. Summary of changes:

### Backend (zenorar-api) — 2 files
- **wallet.service.ts** — Removed `validateWalletNotFrozen` from `addCredit`, `deductCredit`, and `refundCredit`. Admin can now credit/debit frozen wallets; refunds to frozen wallets now succeed.
- **deposits.service.ts + deposits.controller.ts** — Added `sortField` / `sortOrder` to `DepositFilters`. `getAllDeposits` now passes these to Prisma `orderBy`. Controller reads and validates sort params from query string.

### Frontend (zenorar-marketplace) — 3 files
- **lib/api/deposits.ts** — Added `sortField` and `sortOrder` params to `getAllDeposits`.
- **profile/wallet/page.tsx** — Fixed Deposit filter (`'DEPOSIT'` now maps to `'CREDIT'`). Added deposit status filter (All / Pending / Completed / Failed). Added Cancel button on pending bank/crypto deposits.
- **admin/wallets/page.tsx** — Added `successMessage`, `mutationError`, `tableError`, `confirmApproveId` state. All mutations now have `onError` handlers with inline error display. All `onSuccess` handlers show a green success banner. Added REFUND and ADJUSTMENT to transaction filter. Deposit sort now server-side. Approve is now two-step confirm.

### Verification
- Backend: `tsc --noEmit` passes
- Frontend: `tsc --noEmit` passes
