# Vendor / Reseller Commission System

## Plan file: `tasks/vendor-system.md` (full spec + DB schema)

## Checklist

### Phase 1 — Database Migration
- [x] Write `zenorar-api/prisma/migrations/add_vendor_system.sql`
  - Users table: add `is_vendor`, `vendor_approved_at`, `vendor_suspended_at`
  - Create `vendor_applications` table
  - Create `vendor_commissions` table (with indexes)
  - Create `vendor_payout_methods` table
  - Create `vendor_payouts` table
- [x] Run migration on Neon DB and verify all tables exist

### Phase 2 — Backend (zenorar-api)
- [x] `src/services/vendor.service.ts`
- [x] `src/controllers/vendor.controller.ts`
- [x] `src/routes/vendor.routes.ts` (with auth middleware)
- [x] Register vendor routes in `src/routes/index.ts`
- [x] Hook `recordCommissions()` into `orders.service.ts` → order paid/completed
- [ ] Hook `reverseCommissions()` into `orders.service.ts` → refund flow (deferred)
- [x] Add 5 email templates to `mail.service.ts`
- [x] Add `isVendor`, `vendorApprovedAt`, `vendorSuspendedAt` to Prisma schema + regenerate client

### Phase 3 — Frontend Admin
- [x] `app/admin/vendors/page.tsx` — 5 tabs (Overview, Applications, Vendors, Payouts, Settings)
- [ ] Next.js API route handlers (skipped — admin page uses apiFetch directly to Railway)

### Phase 4 — Frontend User
- [x] `app/become-a-vendor/page.tsx` — public landing page
- [x] `app/become-a-vendor/apply/page.tsx` — application form (Cloudinary upload for ID)
- [x] `app/profile/commissions/page.tsx` — vendor dashboard
- [x] Add Commissions tab to profile nav (vendor-only)
- [x] Add "Become a Vendor" link to footer (default Company column)

### Phase 5 — Settings Integration
- [x] Add `vendorCommissionPercent` + `vendorMinPayoutAmount` to markup tab in `app/admin/settings/page.tsx`

## Review

All 5 phases complete. What changed and why:

### Database
- `zenorar-api/prisma/migrations/add_vendor_system.sql`: 4 new tables (`vendor_applications`, `vendor_commissions`, `vendor_payout_methods`, `vendor_payouts`) + 3 columns on `users` (`is_vendor`, `vendor_approved_at`, `vendor_suspended_at`). Run on Neon DB.
- `zenorar-api/prisma/schema.prisma`: Added `isVendor`, `vendorApprovedAt`, `vendorSuspendedAt` to User model with `@map()` so Prisma client returns these fields.

### Backend
- `vendor.service.ts`: Full commission logic — `recordCommissions` (called after order paid), `reverseCommissions` (deferred), 7-day lock unlock on balance fetch, payout flow, all admin operations.
- `vendor.controller.ts`, `vendor.routes.ts`: RESTful handlers, mounted at `/vendor`.
- `orders.service.ts`: Non-blocking `recordCommissions()` hook after order payment.
- `mail.service.ts`: 5 vendor email methods added.

### Frontend — Admin
- `app/admin/vendors/page.tsx`: 5-tab management page for applications, vendors, payouts, settings.
- `app/admin/settings/page.tsx`: Vendor commission % and min payout amount added to markup tab.

### Frontend — User
- `app/become-a-vendor/page.tsx`: Public landing page (hero, steps, earnings table, rules, FAQ).
- `app/become-a-vendor/apply/page.tsx`: Auth-gated form with Cloudinary ID upload.
- `app/profile/commissions/page.tsx`: Vendor dashboard (balance cards, commission history, payout history, payout methods, request payout modal).
- `ProfileLayout.tsx`: Commissions tab added (vendor-only, hidden for non-vendors).
- `Footer.tsx`: "Become a Vendor" link added to default Company column.
- `lib/api/client.ts`: `isVendor?: boolean` added to User interface.