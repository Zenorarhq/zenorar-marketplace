# Purchases Page Fixes — Todo

## Files in Scope

| File | Role |
|------|------|
| `app/admin/purchases/page.tsx` | All 5 fixes — single file |

---

## Checklist

- [ ] 1. MEDIUM — Reset `currentPage` when sort changes (`page.tsx:247`)
- [ ] 2. MEDIUM — Escape double quotes in CSV export (`page.tsx:104`)
- [ ] 3. LOW — Skip API call when status dropdown re-selects same value (`page.tsx:263`)
- [ ] 4. LOW — Add confirmation dialog to payment status change (`page.tsx:280`)
- [ ] 5. LOW — Clear `statusNote` when closing detail panel (`page.tsx:181`)

---

## Fix Detail

### Fix 1 — Reset pagination on sort change

**Root cause:** `useEffect` at line 247 resets `currentPage` on filter changes but not on sort changes. User stays on stale page after re-sorting.

```ts
// Before (line 247)
useEffect(() => { setCurrentPage(1) }, [statusFilter, searchQuery, startDate, endDate])

// After
useEffect(() => { setCurrentPage(1) }, [statusFilter, searchQuery, startDate, endDate, sortField, sortDir])
```

---

### Fix 2 — CSV escape double quotes

**Root cause:** Line 104 wraps fields in `"${c}"` but doesn't double inner quotes. A customer email like `john"doe@test.com` breaks the CSV.

```ts
// Before (line 104)
const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')

// After
const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
```

---

### Fix 3 — Skip same-status re-selection

**Root cause:** `handleStatusUpdate` at line 263 fires on every `onChange`, including when admin re-selects the current status. Triggers unnecessary confirm dialog + API call.

```ts
// Before (line 263)
async function handleStatusUpdate(newStatus: string) {
  if (!detailOrder) return

// After
async function handleStatusUpdate(newStatus: string) {
  if (!detailOrder) return
  if (newStatus === detailOrder.status) return
```

---

### Fix 4 — Add confirmation to payment status change

**Root cause:** `handlePaymentUpdate` at line 280 has no `confirm()` — unlike `handleStatusUpdate`. Payment status changes are critical (PAID triggers license generation).

```ts
// Before (line 280-281)
async function handlePaymentUpdate(newStatus: string) {
  if (!detailOrder) return

// After
async function handlePaymentUpdate(newStatus: string) {
  if (!detailOrder) return
  if (newStatus === detailOrder.paymentStatus) return
  if (!confirm(`Change payment status to ${newStatus}?`)) return
```

---

### Fix 5 — Clear statusNote on panel close

**Root cause:** Line 181-186 clears `detailOrder`, `cryptoPayment`, `adminTxHash`, `adminPaymentNote` when panel closes — but misses `statusNote`.

```ts
// Before (line 184-185)
  setAdminTxHash('')
  setAdminPaymentNote('')

// After
  setAdminTxHash('')
  setAdminPaymentNote('')
  setStatusNote('')
```

---

## Execution Order

All fixes in 1 file (`app/admin/purchases/page.tsx`):

1. Fix 5 — clear statusNote (smallest, least risk)
2. Fix 3 — skip same-status (guard clause)
3. Fix 4 — payment confirmation (guard clause)
4. Fix 1 — pagination reset deps
5. Fix 2 — CSV escape

---

## Review

*(To be filled in after implementation)*