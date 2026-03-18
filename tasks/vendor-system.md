# Vendor / Reseller Commission System — Full Build Plan

## Overview
Vendors are regular users who apply to become resellers. They buy from Zenorar like normal customers, resell off-platform however they choose, and earn commission from Zenorar's markup profit on every purchase they make. Commission has a 7-day lock to cover the refund window. Payouts are bi-weekly, manual (admin approves), paid via BTC or USDT.

---

## Commission Logic (Critical — Read First)

### Source of Commission
Commission is always calculated from **markup profit**, not the total product price.

| Product Type | Markup Amount | Formula |
|---|---|---|
| Scripts | `price - costPrice` | If no costPrice set → 0 commission |
| eSIM | `price × (esimMarkupPercent / (100 + esimMarkupPercent))` | Extract markup from final price |
| Gift Cards | `price × (giftCardMarkupPercent / (100 + giftCardMarkupPercent))` | Same |
| Virtual Cards | Uses `sudoCreationFee` / `lithicCreationFee` + top-up fee | Fee IS the markup |
| Phone Refills | `price × (reloadlyInstantMarkupPercent / (100 + reloadlyInstantMarkupPercent))` | Same |

**Vendor commission earned** = `markupAmount × vendorCommissionPercent / 100`

### 7-Day Lock
- Commission is recorded immediately on purchase with status `LOCKED`
- `unlocks_at = created_at + 7 days`
- A daily cron (or on-demand check) flips `LOCKED → AVAILABLE` when `NOW() > unlocks_at`
- If order is refunded before unlock → commission flipped to `REVERSED` (never paid out)
- Once `AVAILABLE`, commission can be included in a payout request

---

## Database Changes

### New columns on `users` table
```sql
ALTER TABLE users ADD COLUMN is_vendor BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN vendor_approved_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN vendor_suspended_at TIMESTAMPTZ;
```

### New table: `vendor_applications`
```sql
CREATE TABLE vendor_applications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  country TEXT NOT NULL,
  id_document_url TEXT NOT NULL,
  avg_order_volume TEXT NOT NULL, -- e.g. "$100-$500"
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | APPROVED | REJECTED
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT REFERENCES users(id),
  UNIQUE(user_id)
);
```

### New table: `vendor_commissions`
```sql
CREATE TABLE vendor_commissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  order_item_id TEXT,
  product_id TEXT,
  product_name TEXT NOT NULL,
  product_type TEXT NOT NULL,
  order_item_total DECIMAL(10,2) NOT NULL,
  markup_amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL, -- % at time of purchase
  commission_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'LOCKED', -- LOCKED | AVAILABLE | PAID | REVERSED
  unlocks_at TIMESTAMPTZ NOT NULL, -- created_at + 7 days
  payout_id TEXT, -- set when included in a payout
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_vendor_commissions_user ON vendor_commissions(user_id);
CREATE INDEX idx_vendor_commissions_order ON vendor_commissions(order_id);
CREATE INDEX idx_vendor_commissions_status ON vendor_commissions(status);
CREATE INDEX idx_vendor_commissions_unlocks ON vendor_commissions(unlocks_at) WHERE status = 'LOCKED';
```

### New table: `vendor_payout_methods`
```sql
CREATE TABLE vendor_payout_methods (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- BTC | USDT_TRC20 | USDT_ERC20 | USDT_BEP20
  wallet_address TEXT NOT NULL,
  label TEXT, -- user-defined nickname
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_vendor_payout_methods_user ON vendor_payout_methods(user_id);
```

### New table: `vendor_payouts`
```sql
CREATE TABLE vendor_payouts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL, -- amount requested
  payout_method_id TEXT NOT NULL REFERENCES vendor_payout_methods(id),
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | APPROVED | PAID | CANCELLED | REJECTED
  tx_hash TEXT, -- filled by admin when marking paid
  note TEXT, -- admin note
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by TEXT REFERENCES users(id)
);
CREATE INDEX idx_vendor_payouts_user ON vendor_payouts(user_id);
CREATE INDEX idx_vendor_payouts_status ON vendor_payouts(status);
```

### Settings additions (vendor group, via site_settings)
- `vendorCommissionPercent` — global commission % (e.g. 10)
- `vendorMinPayoutAmount` — minimum balance to request payout (e.g. 50)

---

## Files to Build

### Backend — zenorar-api

#### New files
- `src/services/vendor.service.ts` — all vendor business logic
- `src/controllers/vendor.controller.ts`
- `src/routes/vendor.routes.ts`
- `scripts/db/migrations/add_vendor_system.sql`

#### Modified files
- `src/services/orders.service.ts` — hook commission calculation into order completion
- `src/services/orders.service.ts` — hook commission reversal into refund flow
- `src/services/mail.service.ts` — 4 new email templates
- `src/app.ts` or routes index — register vendor routes

### Frontend — zenorar-marketplace

#### New files
- `app/become-a-vendor/page.tsx` — public landing page
- `app/become-a-vendor/apply/page.tsx` — application form (auth-gated)
- `app/profile/commissions/page.tsx` — vendor dashboard tab
- `app/admin/vendors/page.tsx` — admin vendor management

#### New API routes (Next.js → proxies to Express)
- `app/api/vendor/apply/route.ts`
- `app/api/vendor/status/route.ts`
- `app/api/vendor/commissions/route.ts`
- `app/api/vendor/payouts/route.ts`
- `app/api/vendor/payout-methods/route.ts`
- `app/api/admin/vendors/route.ts`
- `app/api/admin/vendors/[id]/route.ts`
- `app/api/admin/vendors/[id]/approve/route.ts`
- `app/api/admin/vendors/payouts/route.ts`
- `app/api/admin/vendors/payouts/[id]/route.ts`

#### Modified files
- `components/layout/Footer.tsx` — add "Become a Vendor" link to footer columns
- `app/profile/layout.tsx` or profile nav — add Commissions tab (vendor-only)
- `app/admin/settings/page.tsx` — add vendor commission % + min payout to markup tab

---

## Feature Breakdown

### 1. Vendor Landing Page (`/become-a-vendor`)
- Hero section: headline, sub-headline, CTA button
- "How it works" — 3 steps (Sign up → Buy → Earn)
- Example earnings table (based on current markup settings)
- Rules & Terms section (simplified, protective language)
- FAQ section
- Apply button — if not logged in → `/signup?redirect=/become-a-vendor/apply` → redirected back after signup
- Footer link added

### 2. Vendor Application Form (`/become-a-vendor/apply`)
- Auth-gated (redirect to login if not signed in)
- If already a vendor → show status badge (pending/approved)
- Fields: Full Name, Business Name, Country (dropdown), ID Document (file upload to R2), Average Order Volume (dropdown: $0-$100, $100-$500, $500-$2,000, $2,000+), Terms & Conditions checkbox
- On submit → POST to `/api/vendor/apply` → stored in `vendor_applications`
- Success state: "Application submitted. We'll review within 48 hours."

### 3. Commission Calculation (Order Hook)
When an order is marked `PAID` / completed:
1. Check if buyer `is_vendor = true`
2. If yes, for each order item:
   - Determine product type
   - Fetch current markup settings from site_settings
   - Calculate markup amount (see table above)
   - Fetch `vendorCommissionPercent` from settings
   - Create `vendor_commissions` record with status `LOCKED`, `unlocks_at = NOW() + 7 days`
3. If order is refunded → find all `LOCKED` commissions for this order → flip to `REVERSED`

### 4. Vendor Profile Tab — Commissions (`/profile/commissions`)
Visible only if `user.isVendor = true`. Tab shows in ProfileLayout nav.

Sections:
- **Summary cards**: Available Balance | Locked (pending) | Total Earned | Total Paid Out
- **Request Payout** button — opens modal (only shown when available balance ≥ min threshold)
  - Select payout method (dropdown of saved methods)
  - Enter amount (up to full available balance, partial allowed)
  - Shows estimated fee note for BTC/USDT networks
  - Confirm → creates `vendor_payouts` record
- **Commission History** table: Date | Product | Order | Markup | Rate | Earned | Status (Locked/Available/Paid/Reversed)
- **Payout History** table: Date | Amount | Method | Status | TX Hash
- **Payout Methods** section: list of saved methods (max 3), add/delete

### 5. Admin Vendor Page (`/admin/vendors`)
Tabs: Overview | Applications | Active Vendors | Payouts | Settings

**Overview tab:**
- Stat cards: Total Vendors | Pending Applications | Total Commission Paid | Pending Payouts | Available to Pay
- Recent activity feed

**Applications tab:**
- Table: Name | Business | Country | Avg Order Volume | Applied At | Status
- Filter by status (PENDING / ALL)
- Click row → expand details: ID document preview, full info
- Approve / Reject buttons
- On approve: sets `users.is_vendor = true`, `vendor_approved_at = NOW()`, sends approval email
- On reject: sets status REJECTED, sends rejection email

**Active Vendors tab:**
- Table: Name | Email | Vendor Since | Total Purchases | Total Earned | Available Balance | Status
- Search by name/email
- Click row → vendor detail modal:
  - Full profile
  - Commission history
  - Manual balance adjustment (ADJUSTMENT transaction)
  - Suspend / Reinstate vendor (sets `vendor_suspended_at`)

**Payouts tab:**
- Table: Vendor | Amount | Method | Network | Wallet Address | Requested At | Status
- Filter by status (PENDING / PAID / ALL)
- Click row → expand:
  - Enter TX hash field
  - Mark as Paid button (sets status PAID, fills tx_hash, sends email to vendor)
  - Reject button (with optional note)
  - Vendor can cancel their own PENDING payout before admin acts

**Settings tab:**
- Vendor Commission % (applied to all markup profits)
- Minimum Payout Amount ($)
- Save button

### 6. Email Templates (mail.service.ts)

| Event | Recipient | Content |
|---|---|---|
| Application submitted | Vendor | Confirmation + "under review within 48h" |
| Application approved | Vendor | Welcome to vendor program + badge info |
| Application rejected | Vendor | Sorry + no reason given |
| Payout paid | Vendor | Amount + TX hash + network |
| New application | Admin | Alert with applicant details |

---

## Checklist

### Phase 1 — Database
- [ ] Write `scripts/db/migrations/add_vendor_system.sql`
- [ ] Run migration on Neon DB
- [ ] Verify all tables + columns exist

### Phase 2 — Backend (zenorar-api)
- [ ] `vendor.service.ts` — applyForVendor, getApplication, approveVendor, rejectVendor
- [ ] `vendor.service.ts` — getVendorCommissions, getVendorBalance (locked + available)
- [ ] `vendor.service.ts` — unlockMatureCommissions (called on balance check)
- [ ] `vendor.service.ts` — requestPayout, cancelPayout, adminMarkPaid, adminRejectPayout
- [ ] `vendor.service.ts` — savePayout Method, deletePayout Method, getPayoutMethods
- [ ] `vendor.service.ts` — admin: listApplications, listVendors, getVendorDetail, adjustBalance, suspendVendor
- [ ] `vendor.service.ts` — admin: listPayouts, getVendorStats
- [ ] `vendor.controller.ts` — wire all service methods to HTTP handlers
- [ ] `vendor.routes.ts` — register all routes with auth middleware
- [ ] Hook commission calc into `orders.service.ts` → order completion
- [ ] Hook commission reversal into `orders.service.ts` → refund flow
- [ ] Add 5 email templates to `mail.service.ts`
- [ ] Register vendor routes in app

### Phase 3 — Frontend Admin
- [ ] `app/admin/vendors/page.tsx` — full admin page with 5 tabs
- [ ] `/api/admin/vendors/*` Next.js route handlers

### Phase 4 — Frontend User
- [ ] `app/become-a-vendor/page.tsx` — landing page
- [ ] `app/become-a-vendor/apply/page.tsx` — application form (R2 upload for ID)
- [ ] `app/profile/commissions/page.tsx` — vendor dashboard
- [ ] Add Commissions tab to profile nav (vendor-only)
- [ ] Add "Become a Vendor" to footer
- [ ] `/api/vendor/*` Next.js route handlers

### Phase 5 — Settings
- [ ] Add vendor commission % and min payout to admin markup settings tab

---

## Review
*(filled in after all tasks complete)*