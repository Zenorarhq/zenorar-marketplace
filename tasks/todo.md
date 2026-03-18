# Cards Page Fixes — 5 Bugs

## Files in Scope
- `app/admin/cards/page.tsx` — Fixes 1, 2, 3
- `app/(shop)/cards/page.tsx` — Fixes 4, 5

## Checklist
- [ ] Fix 1 — MEDIUM: Reset `cardsPage` to 1 when switching to overview tab
- [ ] Fix 2 — LOW: Add error states to all three `useQuery` calls
- [ ] Fix 3 — LOW: Derive provider filter dropdowns from `providers` list dynamically
- [ ] Fix 4 — LOW: Remove dead `selectedBrand` state
- [ ] Fix 5 — LOW: Pass `provider.cardBrand` to `CardVisualPreview` instead of hardcoded `"visa"`

## Checklist

- [ ] Fix 1 — Plan modal X close: add resetPlanForm() (line 736)
- [ ] Fix 2 — Plan modal Cancel: add resetPlanForm() (line 795)
- [ ] Fix 3 — savePlanMutation.onSuccess: add resetPlanForm() (line 238)
- [ ] Fix 4 — Country modal X close: add resetCountryForm() (line 813)
- [ ] Fix 5 — Country modal Cancel: add resetCountryForm() (line 880)
- [ ] Fix 6 — saveCountryMutation.onSuccess: add resetCountryForm() (line 268)
- [ ] Fix 7 — deletePlanMutation.onError: replace alert() with setFormError() (line 252)
- [ ] Fix 8 — handleSavePlan: add duration_days > 0 and sms_included >= 0 validation (line 307)
- [ ] Fix 9 — Sync modal close buttons: add setLastSyncResult(null) (lines 898, 909)
