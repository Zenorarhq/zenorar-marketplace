# Zenorar Marketplace — Session Memory

---

### Session: 2026-03-18 (Page Builder + Multiple Audits)
- **What changed:** Page builder fixes pushed; full audits on finance, analytics, purchases, categories, cards, gift cards, dashboard pages
- **Why:** User requested audit passes to find and fix bugs across admin pages
- **Files:** Multiple admin pages, API routes, components — see git log commits 3222331 through 2718015

### Session: 2026-03-18 (eSIM Re-Audit)
- **What changed:** Fix 1 — replaced `alert()` with `importSuccess` state in admin/esim; Fix 2 — added inventory pagination; Fix 3 — added loading/error state to profile eSIM top-up tab
- **Why:** Follow-up audit found 3 bugs post original eSIM work
- **Files:** `app/admin/esim/page.tsx`, `app/profile/esims/[id]/page.tsx`
- **Commit:** `85a5ea9`

### Session: 2026-03-18 (2-Step Product Creation Flow)
- **What changed:** Created `/admin/products/[id]/upload/page.tsx` as dedicated step-2 upload page; new product creation now redirects to upload page instead of products list
- **Why:** Script upload was never accessible during product creation — only on edit page. Built as separate step to avoid touching the security pipeline
- **Files:** `app/admin/products/[id]/upload/page.tsx` (new), `app/admin/products/new/page.tsx`
- **Commit:** `f0688cc`

### Session: 2026-03-18 (Misc Fixes Bundled)
- **What changed:** Dashboard maxRevenue IIFE fix; negative price validation on create/edit; auth header on video URL save; staff-picks parameterized query; recommended route COUNT(DISTINCT); seller avatar null fallback; removed broken docs links
- **Why:** Found during audit passes and product creation work
- **Files:** `app/admin/page.tsx`, `app/admin/products/new/page.tsx`, `app/admin/products/[id]/edit/page.tsx`, `app/api/products/recommended/route.ts`, `app/api/products/staff-picks/route.ts`, `components/product/ProductPurchasePanel.tsx`, `components/product/ProductTabs.tsx`
- **Commit:** `f0688cc`

### Session: 2026-03-18 (API — Auto-promote primary image)
- **What changed:** `removeImage()` in products.service.ts now promotes next image to primary when the primary image is deleted
- **Why:** Deleting the primary image left product with no primary, causing display issues
- **Files:** `zenorar-api/src/services/products.service.ts`
- **Commit:** `0e2ea55` (API repo)

### Session: 2026-03-18 (Vendor System — All 5 Phases Complete)
- **What changed:** Full vendor/reseller commission system built end-to-end (DB, backend, admin UI, user UI, settings)
- **Why:** User wants vendors to earn commission from Zenorar's markup profit on their orders, with 7-day lock and manual payouts
- **Files:**
  - DB: `zenorar-api/prisma/migrations/add_vendor_system.sql`, `zenorar-api/prisma/schema.prisma`
  - API: `vendor.service.ts`, `vendor.controller.ts`, `vendor.routes.ts`, `orders.service.ts`, `mail.service.ts`
  - Admin: `app/admin/vendors/page.tsx`, `app/admin/settings/page.tsx`
  - User: `app/become-a-vendor/page.tsx`, `app/become-a-vendor/apply/page.tsx`, `app/profile/commissions/page.tsx`
  - Shared: `components/profile/ProfileLayout.tsx`, `components/layout/Footer.tsx`, `lib/api/client.ts`
- **NOTE:** `reverseCommissions()` not yet hooked into refund flow — deferred (no clear refund hook exists)
- **Vendor settings** stored in `site_settings` under group `vendor`: `vendorCommissionPercent`, `vendorMinPayoutAmount`

---

## Architecture Reminders
- Production DB (Neon) uses **camelCase** columns from Prisma: `"userId"`, `"createdAt"` etc. Always quote them in raw SQL.
- New tables added via migrations use snake_case.
- API = Express (zenorar-api), Frontend = Next.js (zenorar-marketplace)
- Wallet service uses `SELECT ... FOR UPDATE` row locks — always use `walletService.addCredit()` / `deductCredit()` for balance changes, never raw SQL updates
- Email: `mailService` in zenorar-api — lazy init, reads SMTP from DB first then .env
- Markup settings stored in `site_settings` table under group `markup`
- Co-author for all commits: `Phil Dubem <phildubem@gmail.com>` — NEVER add Claude as co-author