# Sandbox Mode v2 — Real User Flow with Mock Backend Data

## Root Cause
Current sandbox creates test products via shortcut buttons. The user wants to walk through the **real purchase flow** (browse → select → pay → receive) but with mock backend data when `globalTestMode` is ON. No real provider API calls.

## Approach
When `globalTestMode` is enabled, existing API endpoints detect it and return mock data instead of calling real providers. The frontend UI stays untouched — the user experiences the exact same journey a real buyer would.

### What changes per product:

---

### Virtual Numbers
**Endpoints to modify:**
- [ ] `GET /api/virtual-numbers/available` — when test mode ON, return mock phone numbers instead of querying Twilio/providers
- [ ] `POST /api/orders/instant` (virtual_number flow) — when test mode ON, skip real provisioning, create mock user_virtual_number with provider='test'
- [ ] `lib/order-fulfillment.ts` processVirtualNumberItem — when provider='test' or test mode ON, skip real provider purchase, create mock record directly

**User flow (unchanged):**
1. Select country → see mock available numbers
2. Select number → choose plan (Basic/Business, 1/7/30 days)
3. Pay with wallet → order created → mock number provisioned
4. Redirected to /profile/numbers/[id] with working inbox/settings

---

### eSIMs
**Endpoints to modify:**
- [ ] `GET /api/esim/plans` — already returns real plans from DB (no provider call needed), so no change
- [ ] `POST /api/orders/instant` (esim flow) — when test mode ON, skip real eSIM provisioning, create mock user_esims with source_type='test'
- [ ] `lib/order-fulfillment.ts` processEsimItem — when test mode ON, skip provider API, insert mock QR/ICCID

**User flow (unchanged):**
1. Browse Local/Regional eSIMs → see real plans from DB
2. Select plan → pay with wallet
3. Order created → mock eSIM provisioned with fake QR code
4. Appears in /profile/library with mock data

---

### Gift Cards
**Endpoints to modify:**
- [ ] `GET /api/gift-cards` — already returns real gift cards from DB, no change needed
- [ ] `POST /api/gift-cards/purchase` — when test mode ON, skip real code provisioning (Reloadly/bulk), create mock user_gift_cards with source='test' and fake code/PIN
- [ ] `lib/gift-cards/provisioning.ts` — when test mode ON, return mock code instead of calling provider

**User flow (unchanged):**
1. Browse gift cards → select brand → pick denomination
2. Pay with wallet
3. Mock gift card delivered with fake code TEST-XXXX-XXXX
4. Appears in /profile/library

---

### Cards (Virtual + Instant)
**Endpoints to modify:**
- [ ] `GET /api/cards/providers` — already returns configs from DB, no change needed
- [ ] `POST /api/cards/purchase` — when test mode ON, skip real provider (Sudo/Lithic/Reloadly), create mock user_cards with provider='test' and fake card number
- [ ] `lib/cards/service.ts` or relevant provider code — when test mode ON, return mock card data

**User flow (unchanged):**
1. Browse Virtual/Instant cards → select provider or denomination
2. Pay with wallet
3. Mock card created with test number 4111...1111
4. Appears in /profile/library, can reveal mock card details

---

### Cleanup
- [ ] Remove shortcut "Create Test" buttons from all pages (replace with just the banner indicator)
- [ ] Remove test-purchase endpoints (no longer needed)
- [ ] Keep `TestModeBanner` component but change it to just show "Sandbox Mode Active" info, no button
- [ ] Keep cleanup logic in `lib/test-mode.ts` — still needed for purging test data on toggle OFF

---

## Review
*(To be filled after implementation)*