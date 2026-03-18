# Discounts Security & Bug Fixes

## Files in Scope

| File | Role |
|------|------|
| `zenorar-api/src/routes/discounts.routes.ts` | Fix 1 — add requireAdmin to apply-to-order; Fix 2 — add authenticate to /use |
| `zenorar-marketplace/app/admin/discounts/page.tsx` | Fix 3 — clearing usageLimit/minOrderValue/maxDiscountValue on edit |

---

## Checklist

- [ ] Fix 1 — SECURITY HIGH: Add `requireAdmin` to `POST /apply-to-order`
- [ ] Fix 2 — SECURITY MEDIUM: Add `authenticate` to `POST /use`
- [ ] Fix 3 — BUG MEDIUM: Clearing `usageLimit`, `minOrderValue`, `maxDiscountValue` on edit sends `undefined` instead of `null`

---

## Fix Detail

### Fix 1 — SECURITY HIGH: `/apply-to-order` missing `requireAdmin`

**Root cause:** `discounts.routes.ts:61` — route has `authenticate` but not `requireAdmin`.
Any logged-in customer can call `POST /discounts/apply-to-order` with any
`orderId`, any `discountCode`, and a self-invented `discountAmount`. There is no
server-side recalculation — the amount comes entirely from the request body.

```typescript
// Before (line 61)
router.post('/apply-to-order', authenticate, validateBody(applyDiscountSchema), discountsController.applyDiscountToOrder)

// After
router.post('/apply-to-order', authenticate, requireAdmin, validateBody(applyDiscountSchema), discountsController.applyDiscountToOrder)
```

---

### Fix 2 — SECURITY MEDIUM: `POST /use` has no authentication

**Root cause:** `discounts.routes.ts:51` — `/use` has no middleware at all. Anyone
(not just logged-in users) can call `POST /discounts/use` with any code and
increment its `usageCount`, exhausting a code's `usageLimit` without purchasing.

Fixing this properly would require moving usage increment server-side inside order
creation (architectural change). The minimal safe fix is to require authentication,
so at minimum a valid session token is needed to call this endpoint.

```typescript
// Before (line 51)
router.post('/use', validateBody(useDiscountSchema), discountsController.useDiscount)

// After
router.post('/use', authenticate, validateBody(useDiscountSchema), discountsController.useDiscount)
```

---

### Fix 3 — BUG MEDIUM: Clearing numeric optional fields on edit is broken

**Root cause:** `page.tsx:149–151` — when an admin clears `usageLimit`,
`minOrderValue`, or `maxDiscountValue` on an edit, the form sends `undefined`
because of the `? parseFloat(...) : undefined` ternary. The service's update()
skips `if (data.field !== undefined)` and the old value persists in the DB.
Same pattern as the `startsAt`/`expiresAt` fix already shipped.

Fix: send `null` on the update path (same solution as Fix 1 from discounts-reaudit-fixes.md).

```typescript
// Before (lines 149-151)
usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : undefined,
minOrderValue: formData.minOrderValue ? parseFloat(formData.minOrderValue) : undefined,
maxDiscountValue: formData.maxDiscountValue ? parseFloat(formData.maxDiscountValue) : undefined,

// After
usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : (editingDiscount ? null : undefined),
minOrderValue: formData.minOrderValue ? parseFloat(formData.minOrderValue) : (editingDiscount ? null : undefined),
maxDiscountValue: formData.maxDiscountValue ? parseFloat(formData.maxDiscountValue) : (editingDiscount ? null : undefined),
```

- Create path: empty → `undefined` → Zod `z.number().positive().optional()` passes ✅
- Update path: empty → `null` → service sets field to null in DB ✅

---

## Execution Order

### zenorar-api (Railway deploy)
1. **Fix 1** — Add `requireAdmin` to `/apply-to-order`
2. **Fix 2** — Add `authenticate` to `/use`

### zenorar-marketplace (Vercel deploy)
3. **Fix 3** — Fix clearing of numeric optional fields on edit

**Total files touched: 2**
- `zenorar-api/src/routes/discounts.routes.ts`
- `zenorar-marketplace/app/admin/discounts/page.tsx`