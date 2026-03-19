# Script Commission Tiers — Fix Plan

## Problems to Fix

### Problem 1 — Dead component: `ScriptCommissionTiersSection.tsx` never rendered
**Root cause:** The component was built and wired to the correct dedicated API (`GET/PUT /settings/script-commission-tiers`) but was never imported or rendered in `settings/page.tsx`. The page uses its own inline duplicate instead.
**Fix:** Remove the inline duplicate from `settings/page.tsx` and import/render `<ScriptCommissionTiersSection />` in its place.
**Files:** `zenorar-marketplace/app/admin/settings/page.tsx`, `zenorar-marketplace/components/admin/ScriptCommissionTiersSection.tsx`

---

### Problem 2 — Silent $0 commission when `costPrice` is not set on a script product (CRITICAL)
**Root cause:** `vendor.service.ts` gates commission recording on `markupAmount > 0`. If `costPrice` is null/0 on a script product, `markupAmount = 0` and the commission is skipped silently. No warning exists anywhere — not on the product edit form, not in the vendor dashboard.
**Fix (two parts):**
- **2a (backend):** Option B chosen — keep current behaviour (no commission if no costPrice), add visible warning on the product edit form instead.
- **2b (frontend):** Add a visible warning on the product edit form (`/admin/products/[id]/edit`) when `product_type` is `script`/`digital`/`tool` and `costPrice` is empty — e.g. "Cost price required for vendor commission calculation"
**Files:** `zenorar-marketplace/app/admin/products/[id]/edit/page.tsx`

---

### Problem 3 — `tool` product type excluded from commission branch
**Root cause:** `vendor.service.ts` line 167 only checks `productType === 'digital' || productType === 'script'`. Products with type `tool` are fulfilled identically to scripts (via `processDigitalDownload`) but never enter the commission branch.
**Fix:** Add `'tool'` to the commission condition: `productType === 'digital' || productType === 'script' || productType === 'tool'`
**Files:** `zenorar-api/src/services/vendor.service.ts`

---

### Problem 4 — No activity log when commission tiers are saved
**Root cause:** `settings.controller.ts`:`updateScriptCommissionTiersHandler` calls `updateScriptCommissionTiers()` and returns — no call to `adminActivityService.logAction()`. All other settings handlers log this.
**Fix:** Add `adminActivityService.logAction(...)` after the save in the handler.
**Files:** `zenorar-api/src/controllers/settings.controller.ts`

---

## Checklist

- [x] **1.** Replace inline tiers duplicate in `settings/page.tsx` with `<ScriptCommissionTiersSection />`
- [x] **2a.** Confirm intended behaviour for scripts with no `costPrice` — Option B chosen (keep behaviour, add warning)
- [x] **2b.** Add `costPrice` warning on product edit form for script/digital/tool products
- [x] **3.** Add `'tool'` to commission product type check in `vendor.service.ts`
- [x] **4.** Add `adminActivityService.logAction()` to `updateScriptCommissionTiersHandler`

---

## Review Section

All 4 problems fixed in one session.

**Task 1 — Settings page now uses the real component**
- Imported `ScriptCommissionTiersSection` into `settings/page.tsx`
- Removed the 62-line inline JSX duplicate
- Removed the `scriptTiers` state (5 lines)
- Removed `setScriptTiers(...)` from `loadSettings` (5 lines)
- Removed 9 stale entries from the bulk save payload
- The component now saves via its own dedicated `PUT /settings/script-commission-tiers` endpoint with its own Save button — no longer entangled with the bulk "Save Changes" flow. Both approaches write to identical DB keys so no data migration needed.

**Task 2b — costPrice warning on product edit form**
- Added a conditional `<p>` warning in amber after the costPrice `<input>` in `products/[id]/edit/page.tsx`
- Only shows when `product.productType` is `digital`, `script`, or `tool` AND `formData.costPrice` is empty
- Zero impact when costPrice is filled in

**Task 3 — `tool` added to commission branch**
- One-character change: `|| productType === 'tool'` added to the `if` condition in `vendor.service.ts:167`

**Task 4 — Activity log on tier save**
- Added `adminActivityService.logAction(...)` call inside `updateScriptCommissionTiersHandler` before `res.json()`
- Matches the exact pattern used by all other settings handlers (R2, protection levels, etc.)
