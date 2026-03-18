# Stripe Deposit — Latency Fixes

## Files in Scope

| File | Role |
|------|------|
| `app/api/deposits/stripe/route.ts` | Fix 1 — parallelize getSiteSetting + INSERT |
| `app/api/deposits/stripe/confirm/route.ts` | Fix 2 — parallelize SELECT deposit + getSiteSetting |
| `vercel.json` | Fix 3 — add keep-warm cron |
| `app/api/cron/keep-warm/route.ts` | Fix 3 — new route that pings Railway /health |

---

## Checklist

- [ ] Fix 1 — Parallelize getSiteSetting x3 + INSERT in initiation route (saves ~200ms)
- [ ] Fix 2 — Parallelize SELECT deposit + getSiteSetting x3 in confirm route (saves ~100ms)
- [ ] Fix 3 — Add Railway keep-warm cron every 5 minutes (eliminates 5-10s cold start)

---

## Review

*(To be filled in after implementation)*
