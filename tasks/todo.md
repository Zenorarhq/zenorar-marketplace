# Add 10 New Page Builder Components

## Plan

For each component: create component file, add template to `component-templates.ts`, register in `sections/index.tsx` renderer.

### Components to Add

1. **HeadingSection** — Standalone H1-H6 with full typography control
2. **IconSection** — Single emoji icon with size/color/shape controls
3. **IconBoxSection** — Icon + title + description card
4. **ImageBoxSection** — Image + title + description card
5. **IconListSection** — Bullet list with emoji icons
6. **TabsSection** — Tabbed content panels (client-side state)
7. **CountdownSection** — Countdown timer to target date (client-side state + interval)
8. **ProgressBarSection** — Horizontal progress bars with animation
9. **StarRatingSection** — Star rating display (not interactive)
10. **AlertSection** — Alert/notice box with type presets (dismissible = client state)

### Files to Modify
- `lib/cms/component-templates.ts` — Add 10 templates
- `components/cms/sections/index.tsx` — Add 10 imports + leafComponents + exports

### Files to Create (10)
- `components/cms/sections/HeadingSection.tsx`
- `components/cms/sections/IconSection.tsx`
- `components/cms/sections/IconBoxSection.tsx`
- `components/cms/sections/ImageBoxSection.tsx`
- `components/cms/sections/IconListSection.tsx`
- `components/cms/sections/TabsSection.tsx`
- `components/cms/sections/CountdownSection.tsx`
- `components/cms/sections/ProgressBarSection.tsx`
- `components/cms/sections/StarRatingSection.tsx`
- `components/cms/sections/AlertSection.tsx`

### Verification
- `npx tsc --noEmit` passes after all components
- Total leafComponents = 31 (21 existing + 10 new)
- Total templates = 34 (24 existing + 10 new)

## Progress

- [ ] Create all 10 component files
- [ ] Add all 10 templates to component-templates.ts
- [ ] Register all 10 in sections/index.tsx
- [ ] Final build verification (`npx tsc --noEmit`)
