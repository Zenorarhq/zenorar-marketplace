# Finance Page Fixes — Todo

## Checklist

- [x] 1. LOW — Delete dead Next.js `/api/finance/overview/route.ts` (conflicts with Express backend)
- [x] 2. MEDIUM — Clear expense validation error at start of form submit (`finance/page.tsx`)
- [x] 3. MEDIUM — Show error feedback when `saveEdit` validation fails (`finance/page.tsx`)
- [x] 4. MEDIUM — Fix global `isPending` on delete mutation — track per-row with `deletingId` (`finance/page.tsx`)

## Review

### What changed and why

1. **Dead API route** (`app/api/finance/overview/route.ts`): Deleted. This Next.js route queried `orders` with raw SQL and returned a different data shape than the Express `/payments/finance/overview` endpoint. The frontend calls Express, so this was dead code that could return wrong numbers if accidentally hit.

2. **Expense error on resubmit** (`finance/page.tsx` line 194): Added `setExpenseError('')` at the start of `onSubmit`. Previously, stale validation errors stayed visible during a valid resubmit until `onSuccess` fired.

3. **Silent saveEdit failure** (`finance/page.tsx` lines 101-103): Added `setExpenseError(...)` calls before early returns in `saveEdit()`. Previously clicking Save with invalid data did nothing — no feedback.

4. **Per-row delete pending** (`finance/page.tsx` lines 19, 87-88, 344-349): Added `deletingId` state. Delete button now checks `deletingId === exp.id` instead of `deleteExpenseMutation.isPending`. Only the row being deleted is disabled, not all rows. Update mutation left as-is — only one edit row is visible at a time so global `isPending` is correct there.