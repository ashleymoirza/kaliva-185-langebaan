# Kaliva 185 Langebaan — Design Specification

## Design Philosophy

**Primary Goal**: Create the best accommodation booking UX any user has experienced — combining Airbnb's warm, photography-forward browsing with Stripe's precise, trustworthy checkout.

## Design Systems

### 1. Browsing Experience — Airbnb Design System
- **Font**: DM Sans (Google Fonts substitute for Airbnb Cereal VF)
- **Primary Accent**: Rausch Red `#ff385c` (mapped to our brand blue `#2572eb` for consistency)
- **Text**: Near Black `#222222` (warm, not cold)
- **Background**: Pure White `#ffffff`
- **Shadows**: Three-layer warm lift system
- **Border Radius**: 8px buttons, 20px cards, 32px large, 50% controls
- **Atmosphere**: Travel magazine — generous whitespace, photography-first

### 2. Checkout/Payment — Stripe Design System
- **Font**: Source Sans 3 (Google Fonts substitute for sohne-var)
- **Primary Accent**: Stripe Purple `#533afd` (mapped to our brand blue `#2572eb`)
- **Headings**: Deep Navy `#061b31` (not black)
- **Body**: Slate `#64748d`
- **Shadows**: Blue-tinted multi-layer (`rgba(50,50,93,0.25)`)
- **Border Radius**: 4px-8px (conservative, precision)
- **Atmosphere**: Financial-grade precision, controlled density

## Color Mapping (Kaliva 185 Brand → Design Systems)

| Role | Airbnb Token | Stripe Token | Kaliva Brand |
|------|-------------|--------------|--------------|
| Primary CTA | `--palette-bg-primary-core` (#ff385c) | `--hds-color-util-brand-500` (#533afd) | `#2572eb` (brand blue) |
| Primary Hover | `--palette-bg-tertiary-core` (#e00b41) | `--hds-color-button-ui-iconHover` (#4434d4) | `#1d5fd8` |
| Text Primary | `--palette-text-primary` (#222222) | `--hds-color-heading-solid` (#061b31) | `#1a1a2e` (warm dark) |
| Text Secondary | `--palette-text-secondary` (#6a6a6a) | `--hds-color-core-neutral-500` (#64748d) | `#5a5a7a` |
| Background | `#ffffff` | `#ffffff` | `#ffffff` |
| Card Shadow | Three-layer warm | Blue-tinted multi-layer | Custom warm blue-tinted |
| Border | `#c1c1c1` | `#e5edf5` | `#e0e0f0` |
| Success | — | `#15be53` | `#10b981` |
| Error | `#c13515` | — | `#ef4444` |

## Typography

### Display/Headings (Airbnb style)
- Font: DM Sans, weight 600-700
- Letter-spacing: -0.18px to -0.44px (intimate, cozy)
- Sizes: 28px, 22px, 20px, 16px

### Body/UI (Stripe style for forms, Airbnb for content)
- Font: Source Sans 3 (forms), DM Sans (content)
- Weight: 400-500 (body), 500-600 (UI emphasis)
- Line-height: 1.4-1.5

## Component Architecture

### Phase 1: Core UI Primitives (components/ui/)
- Button — Airbnb circular/primary, Stripe outlined/ghost
- Card — Airbnb 20px radius + three-layer shadow
- Input — Stripe 4px radius, blue-tinted focus
- Badge — Airbnb 14px radius pill
- Container — Max-width with responsive padding
- Modal — Stripe Deep elevation (Level 4)

### Phase 2: Layout Components
- Navbar — Airbnb white sticky, centered search, circular nav
- Footer — Stripe light/dark alternating sections
- WhatsApp Button — Airbnb circular floating

### Phase 3: Content Components
- UnitCard — Airbnb listing card (photo-first, 20px radius)
- PropertyCard — Airbnb property card
- Gallery — Airbnb carousel with circular controls
- BookingForm — Stripe precision form with Airbnb warmth

### Phase 4: Page Templates
- Home — Airbnb hero + magazine sections
- Units — Airbnb listing grid with filter pills
- Properties — Airbnb property grid
- Book — Stripe checkout flow with Airbnb progress
- Unit Detail — Airbnb listing detail page

## Waterfall Testing Plan

### Level 1: Component Unit Tests
- Each UI primitive renders correctly
- Interactive states (hover, focus, active, disabled)
- Accessibility (ARIA, keyboard nav, color contrast)
- Responsive at all breakpoints

### Level 2: Component Integration Tests
- UnitCard in grid layout
- BookingForm steps navigation
- Navbar responsive behavior
- Form validation flows

### Level 3: Page-Level Tests
- Home page: hero, sections, CTAs
- Units page: filters, grid, pagination
- Book page: 3-step flow, quote updates, payment
- Unit detail: gallery, specs, booking CTA

### Level 4: End-to-End Flow Tests
- Guest journey: Home → Units → Unit Detail → Book → Payment
- Admin journey: Login → Dashboard → Manage bookings
- API integration: quote, availability, booking creation

### Level 5: Cross-Browser/Device Tests
- Chrome, Firefox, Safari
- Mobile (375px), Tablet (768px), Desktop (1440px)
- Touch targets, scroll performance

## Implementation Order

1. **Design Tokens** — CSS custom properties in globals.css
2. **UI Primitives** — Button, Card, Input, Badge, Container, Modal
3. **Layout** — Navbar, Footer, WhatsAppButton
4. **Content Components** — UnitCard, PropertyCard, Gallery, PricingBreakdown
5. **Booking Form** — Complete redesign with Stripe precision
6. **Pages** — Home, Units, Properties, Book, Unit Detail
7. **Admin** — Dashboard, Enquiries, Properties, Rates, Builder
8. **Testing** — Waterfall execution, fix, verify
9. **Deploy** — Build, verify production build

## Success Criteria

- ✅ Build passes (TypeScript, ESLint, Next.js)
- ✅ All API endpoints functional
- ✅ Booking flow works end-to-end (demo mode)
- ✅ WCAG 2.1 AA compliance
- ✅ Lighthouse: Performance >90, Accessibility >95, Best Practices >90, SEO >90
- ✅ Visual parity with Airbnb/Stripe design systems
- ✅ Zero console errors in production build
- ✅ GitHub Actions CI passes