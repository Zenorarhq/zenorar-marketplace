# eSIM Re-Audit — Follow-up Fixes

## Files in Scope
- `app/admin/esim/page.tsx` — Fix 1, Fix 2
- `app/profile/esims/[id]/page.tsx` — Fix 3

## Confirmed Bugs

### Fix 1 — alert() in eSIM import onSuccess (MEDIUM)
**File:** `app/admin/esim/page.tsx`
**Root cause:** Line 278 uses `alert()` (blocking native dialog) after a successful bulk eSIM import. Identical anti-pattern to the gift cards Fix 3 already resolved. The `importError` state exists for errors; there is no `importSuccess` state yet.
**Fix:**
1. Add `const [importSuccess, setImportSuccess] = useState('')` alongside `importError`
2. Replace `alert(...)` in `importMutation.onSuccess` with `setImportSuccess(\`Import complete: ${data.imported} imported, ${data.duplicates} duplicates skipped\`)`
3. Clear `importSuccess` inside `closeImportModal()`
4. Add green success banner in the modal UI below the existing `importError` banner

### Fix 2 — Inventory tab has no pagination UI (LOW)
**File:** `app/admin/esim/page.tsx`
**Root cause:** The `/api/admin/esim/inventory` route accepts `page` + `limit` params and returns `pagination.total`, but the Inventory tab only renders a count line — no Previous/Next buttons. With > 50 items there is no way to navigate. The Overview tab already has a working pagination component to reference.
**Fix:**
1. Add `inventoryPage` state (separate from `currentPage` which belongs to Overview)
2. Wire `inventoryPage` into the inventory query params (`page=inventoryPage`)
3. Reset `inventoryPage` to 1 when `selectedPlan` or `statusFilter` changes
4. Add Previous/Next pagination UI below the inventory table (mirror the Overview tab pattern)

### Fix 3 — Top-up tab has no loading or error state (LOW)
**File:** `app/profile/esims/[id]/page.tsx`
**Root cause:** The `topupData` query destructures only `data`. While fetching, the tab renders blank. On a network error, the "No top-up options available" fallback shows — misleading the user into thinking no plans exist.
**Fix:**
1. Destructure `isLoading: topupLoading, isError: topupError` from the `topupData` query
2. In the Top-up tab render: check `topupLoading` first (spinner), then `topupError` (error message), then existing empty/data branches

## Checklist
- [x] Fix 1 — Replace alert() with importSuccess state in admin/esim/page.tsx
- [x] Fix 2 — Add inventory pagination UI in admin/esim/page.tsx
- [x] Fix 3 — Add loading/error state to top-up tab in profile/esims/[id]/page.tsx

## Review

### Fix 1 — alert() → importSuccess state (admin/esim/page.tsx)
- Added `importSuccess` state (line 115)
- `closeImportModal()` now clears `importSuccess` (line 122)
- `importMutation.onSuccess`: removed `closeImportModal()` + `alert()`, reset fields individually, call `setImportSuccess(...)` — modal stays open so user sees green banner
- Added green success banner in modal UI below error banner (line ~830)

### Fix 2 — Inventory pagination (admin/esim/page.tsx)
- Added `inventoryPage` + `inventoryPageSize = 50` state
- Query key includes `inventoryPage`; API params now send `page` + `limit`
- Both filter selects reset `inventoryPage` to 1 on change
- Footer replaced: count-only → Previous / Page X of Y / Next (only shown when total > pageSize)

### Fix 3 — Top-up loading/error state (profile/esims/[id]/page.tsx)
- Destructured `isLoading: topupLoading, isError: topupError` from the query
- Top-up tab now: spinner while loading, error message on failure, data/empty as before
