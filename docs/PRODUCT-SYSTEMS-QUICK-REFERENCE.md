# Zenorar Product Systems - Quick Reference

**Last Updated:** February 2026
**Full Documentation:** [Script-Licensing-System-Design.md](./Script-Licensing-System-Design.md)

---

## Product Types Overview

| Product | Storage | Delivery | Pricing | Margin | Complexity |
|---------|---------|----------|---------|--------|------------|
| **Scripts** | Cloudflare R2 | Signed URL download | One-time | 100% | Easy |
| **Gift Cards** | Database (encrypted) | Code reveal + email | One-time | 40-60% | Medium |
| **eSIMs** | Provider API (Airalo) | QR code | One-time | 40-60% | Medium |
| **Virtual Numbers** | Provider API (Twilio) | Instant access | Subscription | 300-500% | Hard |

---

## 1. Scripts (Section 6 in docs)

**Storage:** Cloudflare R2 (private bucket)
- Zero egress fees
- Signed URLs (1-hour expiry)
- File size limits by type (10MB-1GB)

**Key Files:**
- `zenorar-api/src/services/r2.service.ts`
- `migrations/027_add_product_files_metadata.sql`

**Env Vars:**
```env
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=zenorar-scripts
```

---

## 2. Gift Cards (Section 12 in docs)

**Two Types:**
1. Third-Party Cards (Steam, PlayStation, etc.) - encrypted codes
2. Store Credit Cards (Zenorar wallet balance)

**Sourcing Options:**
- **Bulk Suppliers:** Raise.com, CardCash, NGC, InComm (5-15% discount)
- **API Providers:** Tillo, Reloadly, Tremendous, Runa (on-demand)

### API Provider Comparison

| Provider | Coverage | Min Order | Best For |
|----------|----------|-----------|----------|
| **Tillo** | 2000+ brands | No minimum | Best overall |
| **Reloadly** | 800+ brands | $5 prepaid | International |
| **Tremendous** | 1000+ brands | No minimum | US market |
| **Runa** | 1500+ brands | $100/mo | Europe |

**Security:** AES-256-GCM encryption, SHA-256 hash for duplicates

**Key Files:**
- `zenorar-api/src/services/encryption.service.ts`
- `zenorar-api/src/services/giftCard/providers/tillo.service.ts`
- `zenorar-api/src/services/giftCard/providers/reloadly.service.ts`
- `migrations/028_create_gift_cards.sql`

**Env Vars:**
```env
GIFT_CARD_ENCRYPTION_KEY=<64_hex_chars>
TILLO_API_KEY=
TILLO_API_SECRET=
RELOADLY_CLIENT_ID=
RELOADLY_CLIENT_SECRET=
```

---

## 3. eSIMs (Section 13 in docs)

**Business Model:** Buy wholesale ($3-7) → Sell retail ($5-20)

### Provider Comparison

| Provider | Coverage | Min Order | Best For |
|----------|----------|-----------|----------|
| **Airalo** | 200+ countries | $500/mo | Best coverage |
| **eSIM Go** | 160+ countries | No minimum | Starting out |
| **BNESIM** | 150+ countries | $1000 | Europe |
| **RedteaGO** | 200+ countries | No minimum | Asia-Pacific |

**Flow:** User pays → API call → Get ICCID/QR → Email + Library

**Key Files:**
- `zenorar-api/src/services/esim/providers/airalo.service.ts`
- `zenorar-api/src/services/esim/esim.service.ts`
- `migrations/029_create_esim_tables.sql`

**Env Vars:**
```env
AIRALO_API_URL=https://partner-api.airalo.com/v2
AIRALO_CLIENT_ID=
AIRALO_CLIENT_SECRET=
ESIMGO_API_KEY=
DEFAULT_ESIM_PROVIDER=airalo
```

---

## 4. Virtual Numbers (Section 14 in docs)

**Business Model:** Monthly subscription + usage fees
**Margin:** 300-500% (pay $1/mo, charge $5/mo)

### Provider Comparison

| Provider | Coverage | Pricing | Best For |
|----------|----------|---------|----------|
| **Twilio** | 100+ countries | $1-2/mo + usage | Best overall |
| **Vonage** | 65+ countries | $1-3/mo + usage | Enterprise |
| **Plivo** | 65+ countries | $0.80-1.5/mo | Budget |
| **Bandwidth** | US/Canada | $0.25-1/mo | North America |

**Features:** SMS inbox, call forwarding, voicemail, webhooks

**Key Files:**
- `zenorar-api/src/services/virtualNumber/providers/twilio.service.ts`
- `zenorar-api/src/controllers/webhooks/twilio.controller.ts`
- `migrations/030_create_virtual_numbers.sql`

**Env Vars:**
```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
PLIVO_AUTH_ID=
PLIVO_AUTH_TOKEN=
DEFAULT_VN_PROVIDER=twilio
```

---

## Implementation Priority

1. **Scripts** - Foundation, easy, 100% margin
2. **Gift Cards** - Familiar product, builds traffic
3. **eSIMs** - Travel market, good margins
4. **Virtual Numbers** - Complex but best recurring revenue

---

## Database Migrations

| Migration | Purpose |
|-----------|---------|
| `027_add_product_files_metadata.sql` | Script file storage |
| `028_create_gift_cards.sql` | Gift card tables |
| `028b_gift_card_api_fields.sql` | API provider fields |
| `029_create_esim_tables.sql` | eSIM tables |
| `030_create_virtual_numbers.sql` | Virtual number tables |

---

## Security Checklist

- [ ] R2 bucket is private
- [ ] Gift card codes encrypted (AES-256-GCM)
- [ ] API keys in environment variables
- [ ] Webhooks validate signatures
- [ ] Rate limiting on all endpoints
- [ ] Audit logging for sensitive actions

---

## Full Documentation Locations

1. **Comprehensive Design:** `docs/Script-Licensing-System-Design.md`
2. **HTML Version:** `docs/Script-Licensing-System-Design.html`
3. **Plan File:** `.claude/plans/curious-beaming-wadler.md`

---

*This quick reference is for easy citation in new sessions. For implementation details, refer to the full documentation.*
