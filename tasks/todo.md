# CMS Component Full Audit Fix

## Strategy

To minimize diff while maximizing coverage, work in layers:

**Layer 1 — Cross-cutting fixes (renderer-level, fewest files)**
Handle margin universally via SectionRenderer wrapper instead of editing 30 component files.
Add margin schema to all 30 missing templates in component-templates.ts.

**Layer 2 — Critical broken features (5 components)**
Fix features that are declared/exposed but don't actually work.

**Layer 3 — Per-component improvements (all 34 components)**
Add missing props, hover effects, accessibility, hardcoded colors -> props, etc.

---

## Layer 1 — Cross-Cutting (2 files)

### 1.1 Universal margin via SectionRenderer — `components/cms/sections/index.tsx`
- [x] Wrap every rendered component in a div that reads `section.props.margin` and applies margin classes

### 1.2 Add margin schema to all templates — `lib/cms/component-templates.ts`
- [x] Add `margin: { type: 'string', title: 'Margin', enum: ['none', 'small', 'medium', 'large'] }` to all templates

---

## Layer 2 — Critical Broken Features (5 files)

### 2.1 TestimonialsSection — implement carousel layout
- [x] Add carousel with prev/next buttons, dots, and autoplay when `layout === 'carousel'`

### 2.2 ImageGallerySection — implement lightbox
- [x] Add modal overlay when image clicked + prev/next navigation + close button + keyboard nav

### 2.3 HeaderSection — implement mobile menu drawer
- [x] Add off-canvas/slide-in mobile menu when hamburger clicked + body scroll lock

### 2.4 NewsletterSection — wire up form submission
- [x] POST to `/api/newsletter/subscribe` on submit with loading/error/success states

### 2.5 StatsCounterSection — add animated counting on scroll
- [x] Use IntersectionObserver to trigger count-up animation with ease-out cubic

---

## Layer 3 — Per-Component Improvements (34 files)

### Applied improvements:
- [x] HeroSection — button hover scale effects
- [x] FeaturesGridSection — card hover lift+shadow, lazy loading on images
- [x] CtaBannerSection — button hover scale effects
- [x] ImageSection — lazy loading
- [x] ProductShowcaseSection — card hover lift+shadow
- [x] CategoryGridSection — lazy loading, aria-label on links
- [x] PricingTableSection — card hover lift+shadow
- [x] ColumnSection — lazy loading on images
- [x] VideoEmbedSection — lazy loading on iframe
- [x] ButtonCtaSection — hover scale effect
- [x] FaqAccordionSection — aria-expanded for accessibility
- [x] SocialLinksSection — aria-label, hover scale effect
- [x] IconBoxSection — hover lift+shadow
- [x] ImageBoxSection — lazy loading, hover lift+shadow
- [x] TabsSection — role="tablist", role="tab", aria-selected, role="tabpanel"
- [x] ProgressBarSection — IntersectionObserver scroll-triggered animation
- [x] StarRatingSection — role="img" + aria-label for accessibility

### Skipped (intentionally — already solid or constraints apply):
- TextBlockSection, HeadingSection, IconSection, IconListSection (already solid)
- SpacerSection, DividerSection (simple utilities)
- SectionContainer (complex container, already comprehensive)
- CustomHtmlSection (security constraints intentional)
- MapSection (already has lazy loading)
- CountdownSection, AlertSection (already well-implemented)

---

## Review

### What changed:
- **2 cross-cutting files**: SectionRenderer margin wrapper + margin schema in all templates
- **5 critical features fixed**: carousel, lightbox, mobile menu, newsletter API, animated counting
- **17 components improved**: hover effects, lazy loading, accessibility attributes
- **Build passes**: `npx next build` clean with zero errors

### Files touched:
- `components/cms/sections/index.tsx` (margin wrapper)
- `lib/cms/component-templates.ts` (margin schema)
- 22 component .tsx files in `components/cms/sections/`