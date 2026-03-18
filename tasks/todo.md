# Admin Cards Page — Pagination Bug

## Files in Scope

| File | Role |
|------|------|
| `app/admin/cards/page.tsx` | Both fixes |

---

## Checklist

- [x] Fix line 631 — pass `setCardsPage` as second arg, `'cards'` as third
- [x] Fix line 711 — pass `setTxPage` as second arg, `'transactions'` as third

---

## Review

Both `renderPagination` call sites were passing a label string as the `setPage` function argument, leaving the setter omitted entirely. Clicking Previous/Next would throw a TypeError.

- Line 631: `renderPagination(pagination, 'cards')` → `renderPagination(pagination, setCardsPage, 'cards')`
- Line 711: `renderPagination(txPagination, 'transactions')` → `renderPagination(txPagination, setTxPage, 'transactions')`

**Total files touched: 1**
