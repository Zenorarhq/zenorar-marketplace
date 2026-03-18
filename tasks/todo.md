# Analytics Page Fixes — Todo

## Checklist

- [x] 1. CRITICAL — Fix Top Products reads `_count?.orderItems` instead of `sales` — always shows 0 (`analytics/page.tsx`)
- [x] 2. MEDIUM — Reset pagination when switching tabs or changing period (`analytics/page.tsx`)
- [x] 3. MEDIUM — Fix "Recent Orders" label says "last 10" but fetches 100 (`analytics/page.tsx`)
- [x] 4. LOW — Delete dead Next.js API routes that duplicate Express endpoints (`app/api/analytics/*`, `app/api/orders/stats`)
- [x] 5. LOW — Fix CSV export doesn't escape quotes in data fields (`analytics/page.tsx`)