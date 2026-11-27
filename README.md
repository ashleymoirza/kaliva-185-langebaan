# Kaliva 185 Langebaan — website & booking engine

Modern, lightweight, secure marketing + booking site for **Kaliva 185**, a self-catering
apartment collection at **Club Mykonos, Langebaan, South Africa**.

Built with **Next.js 16 (App Router) + TypeScript + Tailwind CSS v4**, PostgreSQL (Prisma),
**PayFast + Stripe + Ozow** hosted payments, and a Meta Pixel.

## Quick start

```bash
npm install
cp .env.example .env.local        # then fill in values
npm run dev                       # http://localhost:3000
```

The app runs in **demo mode** with no database: apartment listings and live pricing work,
bookings are held in memory, and the admin dashboard is usable. Add `DATABASE_URL` and run
`npx prisma migrate dev` to persist bookings, blocks and pricing overrides in Postgres.

## What's included

- **Homepage** — full-screen hero, highlights, featured apartments, reviews, FAQ + JSON-LD.
- **Apartments** — filterable listings (bedrooms, view, guests, price) and detail pages with gallery.
- **Dynamic pricing engine** (`lib/pricing.ts`) — seasonal peaks/shoulder/low multipliers, special
  events, weekend surcharge, min-stay rules, last-minute discounts, ZAR formatting. Pure and testable.
- **Booking flow** — live quote + availability via `/api/quote` and `/api/availability`, server-side
  price recomputation (client prices are never trusted), T&C gate, PayFast/Stripe redirect or enquiry.
- **Payments** — PayFast signature generation (`lib/payments.ts`), Stripe Checkout via REST,
  and **Ozow** (South Africa) SHA512 hash generation + callback verification.
  All three use **hosted pages**; no card data is ever stored or processed on this server.
- **Admin dashboard** (`/admin`) — bookings + status, revenue summary, referral/UTM breakdown,
  pricing overrides, and date blocking. Protected by a signed httpOnly session cookie.
- **Meta Pixel** — renders only when `NEXT_PUBLIC_META_PIXEL_ID` is set; fires PageView,
  ViewContent, InitiateCheckout and Purchase/Lead. No other analytics or telemetry.
- **Drag-and-drop website builder** (`/admin/builder`) — reorder, add, hide, duplicate and edit
  page sections, recolour the brand and publish. See the section below.

## Multiple guest houses (multi-property)

The site markets a **portfolio of guest houses** under the "Kaliva 185 Langebaan" brand.

- **Public:** `/properties` browses every property (filter by area and guest capacity);
  `/properties/[slug]` is a property page with gallery, facilities and its bookable rooms.
  Rooms live at `/units/[slug]` and are booked through `/book`.
- **Admin:** `/admin/properties` (admin only) is the Shopify-style manager — create, edit and
  delete guest houses, set the area, tagline, description and facilities, mark "featured"/"visible",
  and manage photos.
- **Photos:** an upload button stores images under `.data/uploads/` and serves them from
  `/api/media/<file>`. Uploads are admin-only, rate-limited, capped at 5 MB, restricted to
  JPG/PNG/WebP/GIF/AVIF, and the bytes are magic-number checked (SVG is refused — it can carry script).
- **Data:** `Property` rows persist to Postgres (`Property` model) when `DATABASE_URL` is set,
  otherwise to `.data/properties.json`. The three seeded properties are the fallback defaults.

> **Scope note.** This is the multi-property foundation. Still to come: managing *room types* from
> the admin (currently the room catalogue is seeded in `lib/units.ts`) and a per-date price calendar.
> The booking, pricing, Meta Pixel and drag-and-drop builder functionality are unchanged.

## Drag-and-drop website builder

A section-based builder so the site can be restructured per client without code changes.

- **Editor:** `/admin/builder` (admin only). Drag a section by its handle to reorder, or use the
  arrow buttons. Click a section to edit its content in the inspector. Add sections from the
  palette, hide/duplicate/delete them, and set the brand colour + corner radius.
- **Pages:** Homepage (`home`) and About & Location (`about`). The selector switches pages; the
  layout is edited one page at a time.
- **Blocks:** hero, highlights, featured apartments (auto-populated from the inventory), reviews,
  text, image+text, call-to-action, FAQ, gallery, map & contact.
- **Draft → Publish:** edits are saved as a **draft** first and do **not** appear on the live site.
  `Publish` promotes the draft to live. `Reset` restores that page's default layout.
- **Preview:** the admin-only `Preview draft ↗` link opens the page with `?preview=1`, which renders
  the *unpublished* draft. Without a valid admin session, `?preview=1` is ignored (the draft never leaks).

### How the backend handles it

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/admin/site?page=home` | `GET` | Load the draft layout |
| `/api/admin/site?page=home` | `PUT` | Save the draft (Zod-validated + sanitised) |
| `/api/admin/site?page=home&action=publish` | `POST` | Promote draft → live |
| `/api/admin/site?page=home&action=reset` | `POST` | Restore the default layout |

Persistence order: **Postgres** (`SitePage`: `draft` + `published` JSON) when `DATABASE_URL` is set,
otherwise a JSON file at `.data/site.json` (gitignored), so the builder still works in demo/dev.
Public pages render the `published` layout, falling back to the built-in default until first publish.

**Security:** every write is admin-gated and rate-limited; layouts are validated with Zod and then
sanitised — string lengths capped, `href`/`src` values restricted to safe schemes (a `javascript:`
link becomes `#`), and prototype-pollution keys (`__proto__`, `constructor`, `prototype`) stripped.

**Local note:** `npm run start` runs in production mode, so the admin session cookie is `Secure` and
is only sent over HTTPS (browsers allow this on `localhost`). For local admin testing use `npm run dev`.

## Everyday admin: photos, prices, availability, deposits

Designed so a non-technical owner can run everything from three screens:

| Screen | What it does |
| --- | --- |
| `/admin` | Bookings, deposits collected, revenue, Meta referral sources |
| `/admin/rates` | **Low & high season nightly prices per room**, which months are high season, the deposit %, weekend/min-night/cleaning rules, and blocking/unblocking dates |
| `/admin/properties` | Add/edit guest houses and **upload photos** |

- **Prices:** type a Rand price per room for low and high season. Blank = use the room's built-in price.
  High-season months and special event dates automatically use the high price.
- **Availability:** mark a date range unavailable (owner stays, maintenance, booked elsewhere) and
  re-open it later. Guests cannot book blocked dates.
- **Deposit:** `depositPercent` (default **50**) charges only that share online; the balance is shown
  to the guest as "pay on arrival". The gateway only ever receives the deposit amount.
- **Persistence:** with no database, prices, blocked dates and bookings are saved to
  `.data/store.json` so they survive restarts; with `DATABASE_URL` set they go to Postgres.

### Payment security

Card details never touch this server. Checkout is a **redirect to PayFast or Stripe's hosted page**
(the only place a card number is entered). We store only: guest name, email, phone, dates, amounts
and the gateway reference. Sessions are httpOnly signed cookies; passwords are bcrypt-hashed; every
API route is rate-limited and input-validated. In production, serve over HTTPS only (see Nginx config).

## Security

- Security headers incl. a strict **CSP**, HSTS (prod), `X-Frame-Options`, `nosniff`,
  Referrer-Policy and Permissions-Policy (`next.config.ts`).
- All API routes are **rate-limited** (`lib/rate-limit.ts`) and every input is validated with **Zod**.
- Admin auth: **jose**-signed HS256 JWT in an httpOnly, SameSite=Lax, Secure cookie; bcrypt-hashed
  password; generic error messages; `proxy.ts` gate + server-side re-verification.
- Payments: hosted gateways only — **no raw card data** anywhere in the codebase or database.
- Secrets live in `.env.local` (gitignored). `.env.example` contains placeholders only.

> **On NextAuth:** the brief specified NextAuth.js. NextAuth v4 does not integrate cleanly with the
> Next 16 App Router / React 19 combination, and v5 (Auth.js) is still beta, so this build uses a
> small, dependency-light session layer (`lib/auth.ts`) that is a drop-in replacement target for
> Auth.js later. It provides the same guarantees (signed, httpOnly, expiring sessions) with a
> fraction of the bundle size.

## Database

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run seed        # loads the four apartments into the Unit table
```

Schema (`prisma/schema.prisma`): `Unit`, `Booking`, `BlockedDate`, `PricingConfig`, `ReferralHit`.
Check-in/out are stored as `YYYY-MM-DD` strings to avoid timezone drift.

## Environment variables

See `.env.example`. Highlights: `DATABASE_URL`, `ADMIN_SESSION_SECRET` (32+ chars),
`ADMIN_EMAIL`/`ADMIN_PASSWORD_HASH`, `NEXT_PUBLIC_META_PIXEL_ID`, `PAYFAST_*`, `STRIPE_SECRET_KEY`.

Generate an admin password hash:

```bash
node -e "console.log(require('bcryptjs').hashSync('your-password', 12))"
```

## Deployment

### Vercel
1. Push the repo to Git and import it on Vercel.
2. Add the environment variables from `.env.example`.
3. Set the database to a managed Postgres (Neon, Supabase, RDS) and run migrations in the build.

### Contabo / any VPS with Nginx
```bash
# build the standalone server
npm ci
npm run build
# .next/standalone is a self-contained Node server
node .next/standalone/server.js   # honours PORT env
```
Nginx reverse proxy (TLS terminated at Nginx; app on :3000):
```nginx
server {
  listen 443 ssl http2;
  server_name kaliva185.duckdns.org;
  ssl_certificate     /etc/letsencrypt/live/kaliva185.duckdns.org/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/kaliva185.duckdns.org/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
server { listen 80; server_name kaliva185.duckdns.org; return 301 https://$host$request_uri; }
```
Run it under `systemd` or PM2. Enforce HTTPS-only and HTTP→HTTPS redirect (above). The `/api`
routes need a running Node process (this is a server-rendered app, **not** a pure static export —
see note below).

### Note on "static export"
The brief asked for a possible static export *and* a database-backed booking system with auth and
payment webhooks — those are mutually exclusive. The booking engine requires a server, so this
project targets `output: "standalone"` for Vercel or a VPS/Nginx Node deployment. Marketing pages
are statically prerendered and served fast regardless.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run seed` | Seed apartments into Postgres |

## Replacing the placeholder images
Swap the SVGs in `public/images/` for real photography (JPG/WebP). Keep filenames or update
`lib/units.ts` `images[]`. `next/image` will serve WebP automatically.
