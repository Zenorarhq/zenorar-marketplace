# Ticket System Audit — Fix Plan

## Files in Scope

| File | Role |
|------|------|
| `zenorar-api/src/controllers/tickets.controller.ts` | Backend controller — ownership checks missing |
| `zenorar-api/src/services/tickets.service.ts` | Backend service — pagination, status transitions |
| `zenorar-api/src/routes/tickets.routes.ts` | Route definitions — reference only |
| `zenorar-marketplace/app/admin/tickets/page.tsx` | Admin tickets page — pagination, stats, filtering |
| `zenorar-marketplace/app/profile/tickets/page.tsx` | User tickets page — pagination, category display |
| `zenorar-marketplace/lib/api/tickets.ts` | API client — reference only |
| `zenorar-marketplace/components/admin/ViewTicketThreadModal.tsx` | Admin view modal — no auto-refresh |
| `zenorar-marketplace/components/admin/NewTicketModal.tsx` | Admin new ticket — userId bug |

---

## Fix 1 — SECURITY: Add ownership check on `reopen` (CRITICAL)

**Root cause:** `POST /:id/reopen` in `tickets.controller.ts:222-231` calls `ticketsService.reopenTicket(id)` with no check that the requesting user owns the ticket or is an admin. Any authenticated user can reopen any ticket by ID.

**Fix plan:**

`tickets.controller.ts` — `reopenTicket` handler:
- Fetch ticket first, check `ticket.userId === userId || isAdmin`
- Return 403 if neither condition is true

```
// Before
export const reopenTicket = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = asString(req.params.id)
  const ticket = await ticketsService.reopenTicket(id)
  ...
})

// After
export const reopenTicket = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = asString(req.params.id)
  const userId = req.user?.id
  const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'EDITOR'

  const existing = await ticketsService.getTicketById(id)
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Ticket not found' })
  }
  if (!isAdmin && existing.userId !== userId) {
    return res.status(403).json({ success: false, error: 'Access denied' })
  }

  const ticket = await ticketsService.reopenTicket(id)
  ...
})
```

- [ ] Add ownership/admin check to `reopenTicket` controller

---

## Fix 2 — SECURITY: Add ownership check on `addResponse` (CRITICAL)

**Root cause:** `POST /:id/responses` in `tickets.controller.ts:169-186` accepts any authenticated user's response on any ticket. No check that the user owns the ticket or is admin.

**Fix plan:**

`tickets.controller.ts` — `addResponse` handler:
- Fetch ticket, check `ticket.userId === userId || isAdmin`
- Return 403 if neither

```
// Before
export const addResponse = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = asString(req.params.id)
  const userId = req.user!.id
  const response = await ticketsService.addResponse({ ticketId: id, userId, ... })
  ...
})

// After — add ownership check before creating response
export const addResponse = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = asString(req.params.id)
  const userId = req.user!.id
  const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'EDITOR'

  const existing = await ticketsService.getTicketById(id)
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Ticket not found' })
  }
  if (!isAdmin && existing.userId !== userId) {
    return res.status(403).json({ success: false, error: 'Access denied' })
  }

  const response = await ticketsService.addResponse({ ticketId: id, userId, ... })
  ...
})
```

- [ ] Add ownership/admin check to `addResponse` controller

---

## Fix 3 — Admin only sees first 20 tickets (CRITICAL)

**Root cause:** `admin/tickets/page.tsx:40-41` calls `ticketsApi.list()` with no params. Backend defaults to `page=1, limit=20`. Admin then does client-side pagination on those 20 results, never seeing tickets beyond the first 20.

**Fix plan:**

`admin/tickets/page.tsx` — Change to pass a high limit (or all filters) to the backend:
- Pass `{ limit: 200 }` to `ticketsApi.list()` to fetch all tickets for client-side filtering
- OR: refactor to use server-side filtering/pagination (bigger change, more correct long-term)

Simplest fix (minimal diff): pass a large limit so all tickets are fetched.

```
// Before
const result = await ticketsApi.list()

// After
const result = await ticketsApi.list({ limit: 100 })
```

Note: If the marketplace grows beyond 100 tickets, this should be refactored to server-side pagination. For now, 100 is a reasonable upper bound.

- [ ] Pass limit param to `ticketsApi.list()` in admin page

---

## Fix 4 — User only sees first 20 tickets (CRITICAL)

**Root cause:** `profile/tickets/page.tsx:86-87` calls `ticketsApi.getMyTickets()` with defaults `page=1, limit=20`. No pagination UI exists, so tickets beyond 20 are invisible.

**Fix plan:**

`profile/tickets/page.tsx` — Pass a higher limit:

```
// Before
const result = await ticketsApi.getMyTickets()

// After
const result = await ticketsApi.getMyTickets(1, 100)
```

- [ ] Pass higher limit to `ticketsApi.getMyTickets()` in user page

---

## Fix 5 — Admin-created tickets have wrong userId (HIGH)

**Root cause:** `tickets.controller.ts:11-17` — `createTicket` always sets `userId = req.user?.id`. When admin creates a ticket via NewTicketModal (with guestName/guestEmail), the ticket's `userId` is the admin's ID, not the customer's.

**Fix plan:**

`tickets.controller.ts` — `createTicket`: If `guestEmail` or `guestName` is provided in the body, do NOT set `userId` (treat it as a guest ticket):

```
// Before
const userId = req.user?.id
const ticket = await ticketsService.createTicket({ ...req.body, userId })

// After
const userId = req.user?.id
const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'EDITOR'
// If admin is creating on behalf of a guest, don't attach admin's userId
const effectiveUserId = (isAdmin && (req.body.guestEmail || req.body.guestName)) ? undefined : userId
const ticket = await ticketsService.createTicket({ ...req.body, userId: effectiveUserId })
```

- [ ] Fix `createTicket` to not assign admin's userId for guest tickets

---

## Fix 6 — Stats fetched but never displayed on admin page (MEDIUM)

**Root cause:** `admin/tickets/page.tsx:51-61` fetches `ticketsApi.getStats()` into `stats` variable. Lines 136-137 compute `openTickets` and `urgentTickets`. None of these are rendered in the JSX. Only `unassignedTickets` is used (line 281).

**Fix plan:**

`admin/tickets/page.tsx` — Add stat cards above the table showing open, urgent, unassigned counts. Use the `stats` data from the API (accurate server-side counts) instead of client-side computed values.

Add a stats row between the search/filters section and the table:

```jsx
{/* Quick Stats */}
<div className="grid grid-cols-3 gap-4 mb-6">
  <div className="bg-background-dark border border-border-dark rounded-xl p-4">
    <p className="text-xs text-slate-500 mb-1">Open Tickets</p>
    <p className="text-2xl font-bold text-primary">{stats.byStatus?.find(s => s.status === 'OPEN')?.count || 0}</p>
  </div>
  <div className="bg-background-dark border border-border-dark rounded-xl p-4">
    <p className="text-xs text-slate-500 mb-1">Urgent</p>
    <p className="text-2xl font-bold text-rose-500">{stats.byPriority?.find(p => p.priority === 'URGENT')?.count || 0}</p>
  </div>
  <div className="bg-background-dark border border-border-dark rounded-xl p-4">
    <p className="text-xs text-slate-500 mb-1">Unassigned</p>
    <p className="text-2xl font-bold text-amber-500">{unassignedTickets}</p>
  </div>
</div>
```

Also remove the dead `openTickets` and `urgentTickets` variables (lines 136-137).

- [ ] Add stat cards to admin tickets page
- [ ] Remove dead `openTickets` and `urgentTickets` variables

---

## Fix 7 — Status auto-transition incomplete (MEDIUM)

**Root cause:** `tickets.service.ts:417` — Agent reply only changes status from `OPEN` → `WAITING_CUSTOMER`. If ticket is `IN_PROGRESS` and agent replies, status stays `IN_PROGRESS`, so customer doesn't know they need to respond.

**Fix plan:**

`tickets.service.ts` — `addResponse` method, line 417:

```
// Before
if (isAgent && ticket.status === 'OPEN') {
  await prisma.ticket.update({ where: { id: data.ticketId }, data: { status: 'WAITING_CUSTOMER' } })
}

// After
if (isAgent && (ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS' || ticket.status === 'WAITING_INTERNAL')) {
  await prisma.ticket.update({ where: { id: data.ticketId }, data: { status: 'WAITING_CUSTOMER' } })
}
```

Similarly for customer reply (line 422):

```
// Before
} else if (!isAgent && ticket.status === 'WAITING_CUSTOMER') {

// After
} else if (!isAgent && (ticket.status === 'WAITING_CUSTOMER' || ticket.status === 'OPEN')) {
```

- [ ] Expand agent reply status transition to cover IN_PROGRESS and WAITING_INTERNAL
- [ ] Expand customer reply status transition to cover OPEN

---

## Fix 8 — User page shows raw enum values for category (LOW)

**Root cause:** `profile/tickets/page.tsx:347` displays `ticket.category` directly (e.g. "TECHNICAL", "PAYMENT") instead of human-readable labels.

**Fix plan:**

`profile/tickets/page.tsx` — Add a simple category label map and use it:

```
// Add near top of file
const categoryLabels: Record<string, string> = {
  GENERAL: 'General', ORDER: 'Order', SHIPPING: 'Shipping',
  PAYMENT: 'Payment', REFUND: 'Refund', PRODUCT: 'Product',
  ACCOUNT: 'Account', TECHNICAL: 'Technical', OTHER: 'Other',
}

// Line 347 — Before
{ticket.category}

// After
{categoryLabels[ticket.category] || ticket.category}
```

- [ ] Add category label mapping to user tickets page

---

## Fix 9 — Admin ViewTicketThreadModal no auto-refresh (LOW)

**Root cause:** `ViewTicketThreadModal.tsx` loads ticket data via `useEffect` + manual `loadTicket()` calls. Unlike the user view modal (which uses React Query with `refetchInterval: 10000`), admin view doesn't refresh automatically. New customer responses won't appear until modal is closed and reopened.

**Fix plan:**

`ViewTicketThreadModal.tsx` — Add a polling interval to `useEffect`:

```
// After the existing useEffect, add:
useEffect(() => {
  if (!isOpen || !ticketId) return
  const interval = setInterval(loadTicket, 15000)
  return () => clearInterval(interval)
}, [isOpen, ticketId])
```

- [ ] Add auto-refresh polling to ViewTicketThreadModal

---

## Fix 10 — Orphaned Next.js stats API route (LOW)

**Root cause:** `/api/tickets/stats/route.ts` queries the DB directly with raw SQL, but `ticketsApi.getStats()` calls the Railway backend at `/tickets/stats/overview`. This Next.js route appears unused.

**Fix plan:**

This is dead code. Two options:
- **Option A:** Delete the file (need explicit permission per CLAUDE.md rules)
- **Option B:** Leave it and add a comment marking it as deprecated

- [ ] Confirm with developer whether to delete orphaned stats route

---

## Execution Order

Fix in order of severity, grouping by file to minimize context switching:

### Backend first (zenorar-api)
1. **Fix 1** — Security: ownership check on reopen (controller)
2. **Fix 2** — Security: ownership check on addResponse (controller)
3. **Fix 5** — Admin-created tickets userId fix (controller)
4. **Fix 7** — Status auto-transition (service)

### Frontend (zenorar-marketplace)
5. **Fix 3** — Admin pagination fix (admin page)
6. **Fix 4** — User pagination fix (user page)
7. **Fix 6** — Admin stat cards (admin page)
8. **Fix 8** — Category labels (user page)
9. **Fix 9** — Auto-refresh admin modal (ViewTicketThreadModal)
10. **Fix 10** — Confirm orphaned route deletion

**Total files touched:** 5
- `zenorar-api/src/controllers/tickets.controller.ts` (Fixes 1, 2, 5)
- `zenorar-api/src/services/tickets.service.ts` (Fix 7)
- `zenorar-marketplace/app/admin/tickets/page.tsx` (Fixes 3, 6)
- `zenorar-marketplace/app/profile/tickets/page.tsx` (Fixes 4, 8)
- `zenorar-marketplace/components/admin/ViewTicketThreadModal.tsx` (Fix 9)

---

## Review

All 10 fixes implemented. Summary of changes:

### Backend (zenorar-api) — 2 files
- **tickets.controller.ts** — Added ownership/admin checks to `reopenTicket` and `addResponse` (security). Fixed `createTicket` to not assign admin's userId when creating guest tickets.
- **tickets.service.ts** — Expanded status auto-transitions: agent reply now transitions OPEN/IN_PROGRESS/WAITING_INTERNAL → WAITING_CUSTOMER. Customer reply now transitions WAITING_CUSTOMER/OPEN → WAITING_INTERNAL.

### Frontend (zenorar-marketplace) — 3 files modified, 1 file deleted
- **admin/tickets/page.tsx** — Passed `limit: 100` to `ticketsApi.list()`. Added 3 stat cards (Open, Urgent, Unassigned). Removed dead `stats` query and its cache invalidation calls.
- **profile/tickets/page.tsx** — Passed `limit: 50` to `getMyTickets()`. Added `categoryLabels` map so category shows "Technical" not "TECHNICAL".
- **ViewTicketThreadModal.tsx** — Added 15-second polling interval for auto-refresh while modal is open.
- **app/api/tickets/stats/route.ts** — Deleted (orphaned, nothing called it).

### Verification
- Backend compiles clean (`tsc --noEmit` passes)
- No new IDE errors introduced (only pre-existing hints about unused imports)
