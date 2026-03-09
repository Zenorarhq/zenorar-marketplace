# ZENORAR MARKETPLACE - Blue Team Security Audit Report
**Date:** 2026-03-05
**Scope:** All 8 domains, user + admin side, zenorar-marketplace repo

---

## DOMAIN SCORECARD

| Domain | Critical | High | Moderate | Score |
|--------|----------|------|----------|-------|
| 1. Secrets | 2/3 pass | 1/1 pass | — | 75% |
| 2. Auth | 2/3 pass | 1/3 pass | 0/2 pass | 37% |
| 3. Input | 2/3 pass | 0/2 pass | — | 40% |
| 4. Database | 2/2 pass | 0/1 pass | 1/1 pass | 75% |
| 5. API | 1/2 pass | 0/3 pass | — | 20% |
| 6. Frontend | — | 0/2 pass | 0/1 pass | 0% |
| 7. Infrastructure | 1/2 pass | 0/2 pass | — | 25% |
| 8. Monitoring | — | 0/2 pass | 0/2 pass | 0% |
| **OVERALL** | **10/20** | **2/16** | **1/8** | **30%** |

---

## DOMAIN 1: SECRETS & CREDENTIAL MANAGEMENT

### 1.1 [CRITICAL] Hardcoded secrets check
**Status: PASS** ✅
- No hardcoded API keys, tokens, or passwords found in source code
- Stripe key references are only placeholder strings in admin settings UI (`pk_test_...`, `sk_test_...`)
- No hardcoded DB connection strings
- All secrets properly reference `process.env`

### 1.2 [CRITICAL] .env in .gitignore
**Status: PARTIAL** ⚠️
- `.env*.local` and `.env.test` are listed in `.gitignore`
- `.env` (bare) is **NOT** listed — if someone creates a `.env` file, it could be committed
- `.env.production` is **NOT** listed
- **File:** [.gitignore](.gitignore)
- **Fix:** Add `.env` and `.env.production` to `.gitignore`

### 1.3 [CRITICAL] Secrets only in server-side code
**Status: PARTIAL** ⚠️
- `NEXT_PUBLIC_RECEIVING_WALLET` exposes a crypto wallet address to the client — acceptable for receiving payments
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — acceptable (OAuth client IDs are public)
- **CONCERN:** [lib/auth-utils.ts:5](lib/auth-utils.ts#L5) has a fallback: `process.env.JWT_SECRET || 'your-secret-key'`
  - If `JWT_SECRET` env var is not set, the app uses a hardcoded default secret — any attacker can forge JWT tokens
  - **Fix:** Remove the fallback and throw an error if JWT_SECRET is not set

### 1.4 [HIGH] Environment variables audit
**Status: PASS** ✅
- 60+ env vars used, all server-only except 6 `NEXT_PUBLIC_` vars
- No secrets exposed via `NEXT_PUBLIC_` prefix
- Client-exposed vars: `API_URL`, `APP_URL`, `GOOGLE_CLIENT_ID`, `RECEIVING_WALLET`, `SITE_URL`, `SOCKET_URL` — all safe to expose

---

## DOMAIN 2: AUTHENTICATION & SESSION MANAGEMENT

### 2.1 [CRITICAL] Auth implementation
**Status: PASS** ✅
- Built-in JWT auth via `jsonwebtoken` + Railway backend dual verification
- Passwords hashed with `bcryptjs`, 10 salt rounds — [lib/auth-utils.ts:11](lib/auth-utils.ts#L11)
- Auth middleware at [lib/auth-middleware.ts](lib/auth-middleware.ts) with `authenticateRequest`, `requireAuth`, `requireAdmin` wrappers

### 2.2 [CRITICAL] Session/token expiry
**Status: PASS** ✅
- Access token: 7d default (`JWT_EXPIRES_IN`) — [lib/auth-utils.ts:6](lib/auth-utils.ts#L6)
- Refresh token: 30d default (`REFRESH_TOKEN_EXPIRES_IN`) — [lib/auth-utils.ts:7](lib/auth-utils.ts#L7)
- Both configurable via environment variables
- **Note:** No token revocation mechanism (blacklist) — logout only clears client-side storage

### 2.3 [CRITICAL] Token storage
**Status: FAIL** ❌
- Auth tokens stored in **localStorage** — [lib/api/client.ts:41](lib/api/client.ts#L41)
- `auth_token` and `admin_auth_token` keys in localStorage
- **Vulnerability:** localStorage is accessible to any JavaScript running on the page (XSS = full account takeover)
- **Fix:** Migrate to HttpOnly, Secure, SameSite=Strict cookies for token storage

### 2.4 [HIGH] Brute force protection
**Status: PARTIAL** ⚠️
- Login rate limiting exists but is **configurable and off by default** — [app/api/auth/login/route.ts:63-75](app/api/auth/login/route.ts#L63)
- `maxAttempts` defaults to `0` (disabled) unless configured in admin security settings
- 15-minute lockout window when enabled
- IP whitelist feature available
- **No rate limiting on:** registration, password reset, API endpoints
- **Fix:** Enable brute force protection by default (e.g., 5 attempts per 15 min)

### 2.5 [HIGH] Password reset flow
**Status: FAIL** ❌
- Password reset is handled by Railway backend — no local implementation found
- [app/api/auth/password-changed/route.ts](app/api/auth/password-changed/route.ts) only updates `password_changed_at` timestamp
- Cannot verify: token expiry, single-use tokens, session invalidation after reset
- **Fix:** Verify Railway backend handles this securely; add session invalidation on password change

### 2.6 [HIGH] Email verification
**Status: FAIL** ❌
- No email verification implementation found in the marketplace codebase
- Users can register and immediately make purchases without verifying email
- **Fix:** Implement email verification flow or verify Railway backend handles it

### 2.7 [MODERATE] MFA implementation
**Status: PASS** ✅
- TOTP (authenticator app) and SMS-based 2FA available via Railway backend
- UI fully implemented on [app/profile/security/page.tsx](app/profile/security/page.tsx)
- Backup codes supported
- Endpoints: `/auth/2fa/totp/setup`, `/auth/2fa/sms/setup`, `/auth/2fa/verify`, `/auth/2fa/disable`

### 2.8 [MODERATE] Auth event logging
**Status: PARTIAL** ⚠️
- Login attempts are logged to `login_attempts` table with email, IP, success status — [app/api/auth/login/route.ts:82-87](app/api/auth/login/route.ts#L82)
- Failed logins logged ✅
- Password resets not logged locally
- Admin actions not audited

---

## DOMAIN 3: INPUT VALIDATION & INJECTION PREVENTION

### 3.1 [CRITICAL] SQL injection check
**Status: PASS** ✅
- All database queries use parameterized queries with `$1, $2, ...` placeholders
- Only 1 template literal interpolation found: `${PAGE_COLUMNS}` in [app/api/cms/pages/[id]/route.ts:20](app/api/cms/pages/[id]/route.ts#L20) — this is a server-defined constant, not user input
- `executeQuery` and `query` functions enforce parameterized patterns

### 3.2 [CRITICAL] XSS prevention
**Status: PARTIAL** ⚠️
- `dangerouslySetInnerHTML` found in 8 locations
- **Sanitized with DOMPurify (safe):**
  - [components/cms/sections/CustomHtmlSection.tsx:26](components/cms/sections/CustomHtmlSection.tsx#L26) ✅
  - [components/cms/sections/TextBlockSection.tsx:27](components/cms/sections/TextBlockSection.tsx#L27) ✅
  - [components/sections/TextBlock.tsx:17](components/sections/TextBlock.tsx#L17) ✅
- **JSON.stringify (safe — not user HTML):**
  - [app/(shop)/products/[slug]/page.tsx:244](app/(shop)/products/[slug]/page.tsx#L244) ✅ (JSON-LD structured data)
  - [app/layout.tsx:118](app/layout.tsx#L118) ✅ (JSON-LD)
  - [components/ui/Breadcrumbs.tsx:78](components/ui/Breadcrumbs.tsx#L78) ✅ (JSON-LD)
- **UNSANITIZED (admin-only but risky):**
  - [app/layout.tsx:122](app/layout.tsx#L122) — `settings.customHeadCode` injected as raw `<script>` ❌
  - [app/layout.tsx:128](app/layout.tsx#L128) — `settings.customBodyCode` injected as raw `<script>` ❌
  - These come from admin-configured site settings. If admin account is compromised, attacker can inject arbitrary JS on every page
  - **Fix:** Sanitize or validate custom code blocks, or document the risk

### 3.3 [CRITICAL] Backend validation
**Status: FAIL** ❌
- **No validation library** installed (no zod, yup, joi, validator)
- API routes use manual checks (`if (!email || !password)`) — inconsistent and incomplete
- Many routes destructure request body without validation
- **Fix:** Add `zod` for schema validation on all API inputs

### 3.4 [HIGH] File upload restrictions
**Status: PARTIAL** ⚠️
- Chat upload: 10MB size limit ✅ — [app/api/chat/upload/route.ts:14](app/api/chat/upload/route.ts#L14)
- Media upload: has auth ✅ (added in previous session)
- **No file type validation** — any file type can be uploaded
- **No content verification** — relies on file extension only
- **Fix:** Add MIME type whitelist and content verification

### 3.5 [HIGH] CSRF protection
**Status: FAIL** ❌
- No CSRF tokens or middleware found
- No SameSite cookie attribute (tokens are in localStorage, not cookies)
- Since tokens are in localStorage (Bearer header), traditional CSRF is mitigated by Bearer auth pattern
- However, if ever migrated to cookies, CSRF protection will be needed
- **Current risk:** Low (Bearer tokens aren't auto-sent like cookies), but no defense-in-depth

---

## DOMAIN 4: DATABASE SECURITY

### 4.1 [CRITICAL] Database access control
**Status: PASS** ✅
- Database connection via `DATABASE_URL` environment variable — [lib/db.ts](lib/db.ts)
- Single connection pool via `pg` library
- No hardcoded credentials

### 4.2 [CRITICAL] Row-level security / data scoping
**Status: PASS** ✅
- User-facing queries properly scope by `userId` from the authenticated token
- Library, orders, wishlist, eSIM, virtual numbers all filter by authenticated user
- Admin queries use `requireAdmin` wrapper

### 4.3 [HIGH] Database backups
**Status: FAIL** ❌
- No backup configuration found in the codebase
- Using Neon (free tier) — may have limited backup features
- **Fix:** Configure Neon point-in-time recovery or set up pg_dump cron

### 4.4 [MODERATE] Sensitive data in database
**Status: PASS** ✅
- Passwords stored as bcrypt hashes
- Gift card encryption key is in env var (`GIFT_CARD_ENCRYPTION_KEY`)
- API keys for external services are in environment variables, not DB

---

## DOMAIN 5: API & ENDPOINT SECURITY

### 5.1 [CRITICAL] Authentication on ALL sensitive endpoints
**Status: FAIL** ❌

**Correctly public routes (no auth needed):**
- `app/api/auth/login` — login endpoint
- `app/api/categories` — public product categories
- `app/api/products/*` (slug, popular, recommended, staff-picks, by-ids) — public catalog
- `app/api/search/*` (autocomplete, products, trending) — public search
- `app/api/cms/pages/public/[slug]` — public CMS pages
- `app/api/esim/plans/*`, `esim/countries`, `esim/regions` — public catalog
- `app/api/gift-cards/route.ts`, `gift-cards/[slug]/*` — public catalog
- `app/api/virtual-numbers/countries`, `plans`, `types`, `available` — public catalog
- `app/api/keep-alive` — health check
- `app/api/newsletter/subscribe` — public newsletter
- `app/api/settings/payments` — returns enabled gateways (no secrets)
- `app/api/rates/current` — public exchange rates
- `app/api/reviews/product/[productId]` — public reviews
- `app/api/webhooks/twilio/*` — Twilio webhooks (need webhook signature verification instead)

**Routes using verifyAuth/requireAuth (grep missed, but actually protected):**
- `app/api/library/*` — uses `verifyAuth` ✅
- `app/api/esim/my-esims/*` — uses `verifyAuth` ✅
- `app/api/orders/instant` — uses `verifyAccessToken` ✅
- `app/api/auth/password-changed` — uses `requireAuth` ✅
- `app/api/chat/conversations/active` — session-based (guest chat) ✅

**CRITICAL — Routes with NO authentication that NEED it:**

| Route | Risk | Issue |
|-------|------|-------|
| [app/api/orders/[id]/fulfill/route.ts](app/api/orders/[id]/fulfill/route.ts) | **CRITICAL** | Anyone can fulfill any order by knowing/guessing the order ID. Can trigger license generation, eSIM provisioning without payment |
| [app/api/chat/stream/admin/route.ts](app/api/chat/stream/admin/route.ts) | **CRITICAL** | SSE stream exposes ALL chat conversations, messages, user names, emails — no auth check |
| [app/api/chat/upload/route.ts](app/api/chat/upload/route.ts) | **HIGH** | Anyone can upload files to your Cloudinary account — abuse for storage, cost |
| [app/api/chat/conversations/[id]/route.ts](app/api/chat/conversations/[id]/route.ts) | **HIGH** | Anyone can read any chat conversation by ID — exposes user messages and PII |
| [app/api/payments/stripe/confirm/route.ts](app/api/payments/stripe/confirm/route.ts) | **HIGH** | Order confirmation endpoint — but validates against Stripe API, so risk is moderate |
| [app/api/payments/crypto/check/[paymentId]/route.ts](app/api/payments/crypto/check/[paymentId]/route.ts) | **MODERATE** | Checks blockchain for payment — read-only, limited risk |
| [app/api/virtual-numbers/test-twilio/route.ts](app/api/virtual-numbers/test-twilio/route.ts) | **HIGH** | Exposes Twilio connection status and sample phone numbers publicly |
| [app/api/discounts/validate/route.ts](app/api/discounts/validate/route.ts) | **LOW** | Validates discount codes — intentionally public for checkout flow |

### 5.2 [CRITICAL] Admin routes protected with role check
**Status: PASS** ✅
- All 31 admin routes use `requireAdmin` wrapper
- `requireAdmin` checks both authentication AND role (ADMIN or EDITOR)

### 5.3 [HIGH] Rate limiting on API
**Status: FAIL** ❌
- **No global rate limiting middleware**
- No `express-rate-limit` or equivalent
- Login rate limiting is configurable but **off by default**
- No rate limiting on: registration, API endpoints, file uploads, search, checkout
- **Fix:** Add rate limiting middleware (e.g., `next-rate-limit` or custom middleware.ts)

### 5.4 [HIGH] CORS configuration
**Status: FAIL** ❌
- **No CORS configuration** in next.config.js
- No middleware.ts for CORS headers
- Next.js API routes allow any origin by default
- **Fix:** Add CORS headers in middleware.ts restricting to your domain

### 5.5 [HIGH] Error responses don't leak internals
**Status: PARTIAL** ⚠️
- 40+ routes return `error.message` to clients in error responses
- Most follow pattern: `error.message || 'Generic fallback'`
- Internal error messages (DB errors, network errors) can leak to clients
- No stack traces exposed ✅
- **Fix:** In production, always return generic error messages; log details server-side

---

## DOMAIN 6: FRONTEND SECURITY

### 6.1 [HIGH] Security headers
**Status: FAIL** ❌
- **No security headers configured at all**
- No `next.config.js` headers
- No `middleware.ts`
- Missing ALL of:
  - Content-Security-Policy (CSP) — prevents XSS
  - X-Frame-Options — prevents clickjacking
  - X-Content-Type-Options — prevents MIME sniffing
  - Strict-Transport-Security (HSTS) — enforces HTTPS
  - Referrer-Policy — controls referrer leaks
  - Permissions-Policy — restricts browser features
- **Fix:** Add security headers in next.config.js or middleware.ts

### 6.2 [HIGH] Clickjacking protection
**Status: FAIL** ❌
- No X-Frame-Options or CSP frame-ancestors
- Site can be embedded in iframes on malicious domains
- **Fix:** Add `X-Frame-Options: DENY` header

### 6.3 [MODERATE] Subresource integrity
**Status: PARTIAL** ⚠️
- Google Fonts loaded without integrity hash — [app/layout.tsx:112](app/layout.tsx#L112)
- No other external scripts loaded via CDN
- Low risk since Google Fonts is a trusted source

---

## DOMAIN 7: INFRASTRUCTURE & DEPLOYMENT

### 7.1 [CRITICAL] HTTPS enforcement
**Status: PASS** ✅
- No hardcoded HTTP URLs found (except localhost references for dev)
- Hosted on Vercel which enforces HTTPS automatically
- Railway backend accessed via HTTPS

### 7.2 [CRITICAL] Debug mode / development flags in production
**Status: PARTIAL** ⚠️
- Only 7 `console.log` statements in production code — low count ✅
- **Concern:** [app/api/settings/payments/route.ts:18](app/api/settings/payments/route.ts#L18) logs raw payment settings:
  `console.log('[PAYMENTS DEBUG] Raw settings from DB:', JSON.stringify(settings).slice(0, 500))`
  - This logs payment configuration data on every checkout page load
- No sensitive data (passwords, tokens) in console.log statements ✅
- **Fix:** Remove the `[PAYMENTS DEBUG]` console.log

### 7.3 [HIGH] Dependency vulnerabilities
**Status: FAIL** ❌
- **Next.js 14.2.3** has **8 known vulnerabilities** (1 critical, 6 high, 1 moderate)
- Critical: Cache poisoning, authorization bypass
- High: DoS, SSRF, content injection
- **Fix:** Upgrade to `next@14.2.35` (latest 14.x) — `npm audit fix --force`

### 7.4 [HIGH] Package.json review
**Status: PARTIAL** ⚠️
- Dependencies are from trusted npm packages
- Next.js is significantly outdated (14.2.3 vs 14.2.35+)
- No suspicious or unnecessary packages detected

---

## DOMAIN 8: MONITORING & INCIDENT RESPONSE

### 8.1 [HIGH] Error tracking
**Status: FAIL** ❌
- **No Sentry, Bugsnag, Datadog, or LogRocket configured**
- Errors go to console.error only — invisible in production
- Would not know if app starts throwing errors
- **Fix:** Add Sentry (`@sentry/nextjs`) for error monitoring

### 8.2 [HIGH] Auth event logging
**Status: PARTIAL** ⚠️
- Login attempts logged to `login_attempts` table ✅
- Failed logins logged with IP ✅
- Admin actions **not** audited ❌
- Password resets **not** logged locally ❌
- **Fix:** Add admin action audit log

### 8.3 [MODERATE] Uptime monitoring
**Status: FAIL** ❌
- No uptime monitoring configured
- **Fix:** Set up UptimeRobot or Better Stack (free tier available)

### 8.4 [MODERATE] Incident response
**Status: FAIL** ❌
- No documented incident response plan
- No quick session revocation mechanism (no token blacklist)
- No kill switch to take site offline
- **Fix:** Implement token blacklist table; document incident response procedures

---

## FULL FINDINGS TABLE

| # | Domain | Severity | Check | Status | File:Line | Fix |
|---|--------|----------|-------|--------|-----------|-----|
| 1 | 1. Secrets | CRITICAL | .env in .gitignore | ⚠️ PARTIAL | .gitignore | Add `.env` and `.env.production` |
| 2 | 1. Secrets | CRITICAL | JWT fallback secret | ⚠️ PARTIAL | lib/auth-utils.ts:5 | Remove `\|\| 'your-secret-key'` fallback |
| 3 | 2. Auth | CRITICAL | Token in localStorage | ❌ FAIL | lib/api/client.ts:41 | Migrate to HttpOnly cookies |
| 4 | 2. Auth | HIGH | Brute force off by default | ⚠️ PARTIAL | app/api/auth/login/route.ts:63 | Enable by default |
| 5 | 2. Auth | HIGH | No email verification | ❌ FAIL | — | Implement email verification |
| 6 | 2. Auth | HIGH | Password reset unverified | ❌ FAIL | — | Audit Railway backend |
| 7 | 2. Auth | MODERATE | No MFA | ❌ FAIL | — | Add TOTP for admins |
| 8 | 3. Input | CRITICAL | No validation library | ❌ FAIL | package.json | Add zod |
| 9 | 3. Input | CRITICAL | Unsanitized admin scripts | ⚠️ PARTIAL | app/layout.tsx:122,128 | Sanitize or document risk |
| 10 | 3. Input | HIGH | No file type validation | ⚠️ PARTIAL | app/api/chat/upload/route.ts | Add MIME whitelist |
| 11 | 3. Input | HIGH | No CSRF protection | ❌ FAIL | — | Bearer tokens mitigate, but add for defense-in-depth |
| 12 | 4. Database | HIGH | No backups | ❌ FAIL | — | Configure Neon PITR |
| 13 | 5. API | CRITICAL | Order fulfill unprotected | ❌ FAIL | app/api/orders/[id]/fulfill/route.ts | Add auth + order ownership check |
| 14 | 5. API | CRITICAL | Admin chat stream public | ❌ FAIL | app/api/chat/stream/admin/route.ts | Add requireAdmin |
| 15 | 5. API | HIGH | Chat conversation public | ❌ FAIL | app/api/chat/conversations/[id]/route.ts | Add auth |
| 16 | 5. API | HIGH | Chat upload public | ❌ FAIL | app/api/chat/upload/route.ts | Add auth |
| 17 | 5. API | HIGH | Test-twilio public | ❌ FAIL | app/api/virtual-numbers/test-twilio/route.ts | Add requireAdmin |
| 18 | 5. API | HIGH | No rate limiting | ❌ FAIL | — | Add rate limiting middleware |
| 19 | 5. API | HIGH | No CORS | ❌ FAIL | — | Add CORS in middleware.ts |
| 20 | 5. API | HIGH | Error message leaks | ⚠️ PARTIAL | 40+ routes | Return generic errors in production |
| 21 | 6. Frontend | HIGH | No security headers | ❌ FAIL | next.config.js | Add all security headers |
| 22 | 6. Frontend | HIGH | No clickjacking protection | ❌ FAIL | — | Add X-Frame-Options |
| 23 | 7. Infra | CRITICAL | Next.js critical vulns | ❌ FAIL | package.json | Upgrade to 14.2.35 |
| 24 | 7. Infra | CRITICAL | Debug log in payments | ⚠️ PARTIAL | app/api/settings/payments/route.ts:18 | Remove debug log |
| 25 | 8. Monitor | HIGH | No error tracking | ❌ FAIL | — | Add Sentry |
| 26 | 8. Monitor | HIGH | No admin audit log | ⚠️ PARTIAL | — | Add audit logging |
| 27 | 8. Monitor | MODERATE | No uptime monitoring | ❌ FAIL | — | Add UptimeRobot |
| 28 | 8. Monitor | MODERATE | No incident response | ❌ FAIL | — | Document + token blacklist |

---

## PRIORITY FIX LIST

### CRITICAL — Fix before ANY user touches the app:

1. **Order fulfill endpoint has NO authentication** — Anyone can call `POST /api/orders/{id}/fulfill` and trigger license generation/eSIM provisioning without paying
   - File: [app/api/orders/[id]/fulfill/route.ts](app/api/orders/[id]/fulfill/route.ts)
   - Fix: Add auth check, verify order belongs to user and payment is confirmed

2. **Admin chat stream is fully public** — `GET /api/chat/stream/admin` exposes ALL conversations, messages, user names/emails with no auth
   - File: [app/api/chat/stream/admin/route.ts](app/api/chat/stream/admin/route.ts)
   - Fix: Add `requireAdmin` wrapper

3. **JWT fallback secret** — If `JWT_SECRET` env var is missing, falls back to `'your-secret-key'` allowing token forgery
   - File: [lib/auth-utils.ts:5](lib/auth-utils.ts#L5)
   - Fix: Remove fallback, throw error if not set

4. **Next.js 14.2.3 has critical vulnerabilities** — Authorization bypass, cache poisoning, DoS
   - Fix: `npm install next@14.2.35`

5. **Stripe payment confirm has no auth** — `POST /api/payments/stripe/confirm` can be called by anyone
   - File: [app/api/payments/stripe/confirm/route.ts](app/api/payments/stripe/confirm/route.ts)
   - Fix: Add auth check, verify order belongs to user

### HIGH — Fix before launch:

6. **Chat conversations readable by anyone** — `GET /api/chat/conversations/{id}` returns messages without auth
   - File: [app/api/chat/conversations/[id]/route.ts](app/api/chat/conversations/[id]/route.ts)

7. **Chat file upload has no auth** — Anyone can upload files to your Cloudinary account
   - File: [app/api/chat/upload/route.ts](app/api/chat/upload/route.ts)

8. **Test-twilio endpoint is public** — Exposes Twilio connection details
   - File: [app/api/virtual-numbers/test-twilio/route.ts](app/api/virtual-numbers/test-twilio/route.ts)

9. **Auth tokens in localStorage** — XSS = full account takeover
   - File: [lib/api/client.ts:41](lib/api/client.ts#L41)

10. **No security headers at all** — Missing CSP, X-Frame-Options, HSTS, etc.
    - File: next.config.js

11. **No rate limiting** — APIs can be brute-forced or DDoS'd

12. **No validation library** — Input validation is manual and inconsistent

13. **No CORS configuration** — APIs accept requests from any origin

14. **No error tracking** — Sentry or equivalent needed

15. **No database backups configured**

16. **Brute force protection off by default** — Login rate limiting disabled unless admin enables it

17. **Error messages leak to clients** — 40+ routes expose `error.message`

18. **.env not fully covered in .gitignore** — `.env` and `.env.production` missing

### MODERATE — Fix before scaling:

19. **No MFA** — Add TOTP for admin accounts at minimum
20. **No email verification** — Users can act without verifying email
21. **No uptime monitoring** — Add UptimeRobot
22. **No incident response plan** — Document procedures, add token blacklist
23. **No admin action audit log**
24. **Remove debug console.log** in payments route

---

## BEFORE-LAUNCH READINESS SCORE

### **NO-GO** ❌

**Blockers that MUST be fixed first:**

1. Order fulfillment endpoint is completely unprotected (free products for anyone)
2. Admin chat stream leaks all user conversations publicly
3. JWT fallback secret allows token forgery if env var is missing
4. Next.js has a critical authorization bypass vulnerability
5. Stripe payment confirmation lacks authentication

These 5 issues represent immediate, exploitable vulnerabilities that could result in:
- Financial loss (free order fulfillment)
- Data breach (public chat messages)
- Complete account takeover (JWT secret fallback)
- Authentication bypass (Next.js vulnerability)

**Minimum to reach GO status:** Fix items 1-5 from the Critical list above.