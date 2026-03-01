# Todo

## Tasks

### 1. Add Buyer section to Admin License Details Modal
- [ ] Add `user` include to `getLicenseDetails` in `zenorar-api/src/services/license.service.ts`
  - Currently only includes `product` and `activations` — missing `user`
- [ ] Add Buyer section to `LicenseDetailModal` in `zenorar-marketplace/app/admin/licenses/page.tsx`
  - Position: between the key/status/type/product grid and the Support Status section (between lines ~509 and ~511)
  - Show: buyer name, buyer email (with eye icon via `MaskedField`), order ID (as text)

### 2. Fix domain activation 404 in Library page
- [ ] Verify backend routes in `zenorar-api/src/routes/license.routes.ts`
  - Activate: `POST /:id/activate` → full path: `POST /licenses/:id/activate`
  - Deactivate: `POST /:id/deactivate` → full path: `POST /licenses/:id/deactivate`
- [ ] Verify/fix frontend in `zenorar-marketplace/app/profile/library/page.tsx`
  - `handleActivateDomain` currently calls `apiFetch('/licenses/${domainModal.licenseId}/activate', ...)` — matches route ✓
  - `handleDeactivateDomain` currently calls `apiFetch('/licenses/${domainModal.licenseId}/deactivate', ...)` — matches route ✓
  - Both look correct already; if there's a 404 it may be that `licenseId` is not being set or the backend isn't including `user` issue causing confusion

---

## Review

### Changes Made

**`zenorar-api/src/services/license.service.ts`**
- Added `user: { select: { id, name, email } }` to the `getLicenseDetails` Prisma include so the admin detail endpoint returns buyer info alongside the license.

**`zenorar-marketplace/app/admin/licenses/page.tsx`**
- Added a "Buyer" section to `LicenseDetailModal` between the key/status grid and the Support Status block.
- Shows buyer name, buyer email (via `MaskedField` with eye icon), and order ID.

**`zenorar-marketplace/app/profile/library/page.tsx`**
- No changes needed. `handleActivateDomain` and `handleDeactivateDomain` already call the correct routes (`POST /licenses/:id/activate` and `POST /licenses/:id/deactivate`). The backend routes match exactly.
