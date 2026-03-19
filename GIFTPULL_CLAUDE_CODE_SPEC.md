# GIFT CARD MARKETPLACE — CLAUDE CODE BUILD SPEC

## Project: GiftPull (working title)
## Type: Development Release Prototype (dev environment, testable in browser)
## Target: Fully functional local/deployed web app for internal QA and demo

---

## TABLE OF CONTENTS

1. [Project Overview & Objective](#1-project-overview--objective)
2. [Tech Stack & Scaffolding](#2-tech-stack--scaffolding)
3. [Project Structure](#3-project-structure)
4. [Environment Setup & Dev Server](#4-environment-setup--dev-server)
5. [Database Schema (Prisma)](#5-database-schema-prisma)
6. [Seed Data & Test Fixtures](#6-seed-data--test-fixtures)
7. [Feature 1: Auth & User System](#7-feature-1-auth--user-system)
8. [Feature 2: Gift Card Storefront (WS1)](#8-feature-2-gift-card-storefront-ws1)
9. [Feature 3: Gacha Pack System (WS2)](#9-feature-3-gacha-pack-system-ws2)
10. [Feature 4: Buyback System (WS2)](#10-feature-4-buyback-system-ws2)
11. [Feature 5: Points Economy](#11-feature-5-points-economy)
12. [Feature 6: P2P Marketplace (WS3)](#12-feature-6-p2p-marketplace-ws3)
13. [Feature 7: Payments — Stripe + USDC on Base](#13-feature-7-payments--stripe--usdc-on-base)
14. [Feature 8: Admin Dashboard](#14-feature-8-admin-dashboard)
15. [Feature 9: Leaderboard & Rankings](#15-feature-9-leaderboard--rankings)
16. [UI/UX Design Direction](#16-uiux-design-direction)
17. [Page Routes & Navigation](#17-page-routes--navigation)
18. [API Route Specification](#18-api-route-specification)
19. [Gacha Engine — Full Implementation Logic](#19-gacha-engine--full-implementation-logic)
20. [Testing Checklist & Acceptance Criteria](#20-testing-checklist--acceptance-criteria)
21. [Build Order (Recommended Sequence)](#21-build-order-recommended-sequence)

---

## 1. PROJECT OVERVIEW & OBJECTIVE

Build a **fully functional development prototype** of a gift card marketplace with three core workstreams:

- **WS1 — Storefront**: Buy gift cards at FMV, discounted, or bundled rates
- **WS2 — Gacha Packs**: Randomized gift card packs with transparent odds, positive EV, and a 95% buyback system
- **WS3 — P2P Marketplace**: Users sell verified gift cards to each other

Cross-cutting systems: **Points economy** (earn on every purchase, redeem for cards/packs), **dual payment rails** (Stripe for fiat, USDC on Base for crypto).

### What "dev prototype" means

- Runs locally via `npm run dev` on `localhost:3000`
- Uses a local or hosted PostgreSQL database (SQLite fallback acceptable for initial scaffold)
- Stripe in **test mode** (test API keys, test card numbers)
- USDC/Base payments **mocked** with a simulated wallet flow (no real on-chain transactions in prototype; UI and flow must be complete)
- All gift card codes are **fake/test codes** — no real inventory needed
- Admin dashboard functional with seed data
- Every user-facing flow is clickable end-to-end in a browser

### Brands supported (seed data)

Xbox, Steam, Nintendo eShop, PlayStation Store, Google Play, Amazon, Apple/iTunes, Roblox, Spotify, Netflix

---

## 2. TECH STACK & SCAFFOLDING

```
Framework:       Next.js 14+ (App Router)
Language:        TypeScript (strict mode)
Styling:         Tailwind CSS v3+
Animations:      Framer Motion
Database:        PostgreSQL (via Supabase, Neon, or local Docker container)
ORM:             Prisma
Auth:            NextAuth.js (email/password + Google OAuth for prototype)
Payments (fiat): Stripe (Checkout + Webhooks, TEST MODE)
Payments (crypto): Mocked USDC on Base (UI complete, transactions simulated)
State:           React Context + server actions (no Redux needed)
Cache:           In-memory for prototype (note: production would use Redis)
Package manager: pnpm (preferred) or npm
```

### Initial scaffold command

```bash
npx create-next-app@latest giftpull --typescript --tailwind --app --src-dir --import-alias "@/*"
cd giftpull
pnpm add prisma @prisma/client next-auth @auth/prisma-adapter stripe @stripe/stripe-js framer-motion lucide-react clsx tailwind-merge
pnpm add -D @types/node prisma
npx prisma init
```

---

## 3. PROJECT STRUCTURE

```
giftpull/
├── prisma/
│   ├── schema.prisma          # Full database schema
│   └── seed.ts                # Seed data (brands, cards, packs, test users)
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout (nav, providers, toasts)
│   │   ├── page.tsx           # Landing / home page
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── storefront/
│   │   │   ├── page.tsx       # Browse gift cards
│   │   │   └── [brand]/page.tsx # Filter by brand
│   │   ├── gacha/
│   │   │   ├── page.tsx       # Pack selection screen
│   │   │   ├── [packTier]/page.tsx     # Pack detail + pull flow
│   │   │   └── history/page.tsx        # Pull history
│   │   ├── marketplace/
│   │   │   ├── page.tsx       # Browse P2P listings
│   │   │   ├── sell/page.tsx  # Create a listing
│   │   │   └── [listingId]/page.tsx    # Listing detail
│   │   ├── leaderboard/
│   │   │   └── page.tsx       # Weekly/monthly leaderboard with prizes
│   │   ├── wallet/
│   │   │   └── page.tsx       # USDC balance, points, transaction history
│   │   ├── admin/
│   │   │   ├── page.tsx       # Admin dashboard overview
│   │   │   ├── inventory/page.tsx      # Gift card inventory management
│   │   │   ├── gacha/page.tsx          # Pack config, odds, EV monitor
│   │   │   └── users/page.tsx          # User management
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── storefront/
│   │       │   ├── cards/route.ts      # GET: list, POST: purchase
│   │       │   └── bundles/route.ts    # GET: list, POST: purchase
│   │       ├── gacha/
│   │       │   ├── packs/route.ts      # GET: list pack tiers
│   │       │   ├── pull/route.ts       # POST: execute pull
│   │       │   └── buyback/route.ts    # POST: execute buyback
│   │       ├── marketplace/
│   │       │   ├── listings/route.ts   # GET: browse, POST: create
│   │       │   ├── buy/route.ts        # POST: purchase listing
│   │       │   └── dispute/route.ts    # POST: open dispute
│   │       ├── leaderboard/
│   │       │   ├── route.ts            # GET: ranked leaderboard
│   │       │   └── prizes/route.ts     # GET: prizes by period
│   │       ├── points/
│   │       │   ├── balance/route.ts    # GET: balance + ledger
│   │       │   └── redeem/route.ts     # POST: redeem points
│   │       ├── wallet/
│   │       │   ├── balance/route.ts    # GET: USDC balance
│   │       │   └── withdraw/route.ts   # POST: withdraw (mocked)
│   │       └── webhooks/
│   │           └── stripe/route.ts     # Stripe webhook handler
│   ├── components/
│   │   ├── ui/                # Reusable primitives (Button, Card, Badge, Modal, Input, etc.)
│   │   ├── storefront/        # StorefrontCard, BundleCard, BrandFilter
│   │   ├── gacha/             # PackCard, PullAnimation, RevealScreen, BuybackPrompt
│   │   ├── marketplace/       # ListingCard, SellForm, DisputeModal
│   │   ├── wallet/            # BalanceDisplay, TransactionList, PointsDisplay
│   │   ├── admin/             # DataTable, StatsCard, OddsEditor
│   │   └── layout/            # Navbar, Footer, Sidebar, MobileNav
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client singleton
│   │   ├── auth.ts            # NextAuth config
│   │   ├── stripe.ts          # Stripe client + helpers
│   │   ├── gacha-engine.ts    # Core gacha pull logic (THE key file)
│   │   ├── points.ts          # Points earn/redeem logic + leaderboard tracking
│   │   ├── leaderboard.ts    # Leaderboard computation, period bounds, ranking
│   │   ├── buyback.ts         # Buyback calculation + execution
│   │   └── utils.ts           # Formatting, currency, shared helpers
│   ├── types/
│   │   └── index.ts           # Shared TypeScript types/enums
│   └── styles/
│       └── globals.css        # Tailwind base + custom animations
├── .env.local                 # Environment variables (see Section 4)
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 4. ENVIRONMENT SETUP & DEV SERVER

### `.env.local` template

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/giftpull?schema=public"

# NextAuth
NEXTAUTH_SECRET="generate-a-random-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Stripe (TEST MODE)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# USDC / Base (mocked in prototype)
USDC_CONTRACT_ADDRESS="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
BASE_RPC_URL="https://mainnet.base.org"
MOCK_CRYPTO_PAYMENTS="true"

# Admin
ADMIN_EMAILS="admin@giftpull.test"
```

### Dev startup sequence

```bash
# 1. Install dependencies
pnpm install

# 2. Start database (if using Docker)
docker run --name giftpull-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=giftpull -p 5432:5432 -d postgres:16

# 3. Push schema + seed
npx prisma db push
npx prisma db seed

# 4. Start Stripe webhook listener (separate terminal)
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# 5. Start dev server
pnpm dev
```

The app should be fully testable at `http://localhost:3000` after these steps.

---

## 5. DATABASE SCHEMA (PRISMA)

Implement the following schema in `prisma/schema.prisma`. This is the **exact schema** to use.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── ENUMS ────────────────────────────────────────────────

enum GiftCardBrand {
  XBOX
  STEAM
  NINTENDO
  PLAYSTATION
  GOOGLE_PLAY
  AMAZON
  APPLE
  ROBLOX
  SPOTIFY
  NETFLIX
}

enum GiftCardStatus {
  AVAILABLE        // In inventory, ready for sale or gacha pool
  RESERVED         // Assigned to a user after purchase/pull, not yet redeemed
  SOLD             // Purchased via storefront or marketplace
  REDEEMED         // Code revealed/used by owner
  BUYBACK          // Bought back by platform, awaiting recycle
  LISTED           // Listed on P2P marketplace
}

enum GiftCardSource {
  BULK_IMPORT      // Admin uploaded via CSV
  API              // Sourced via gift card API (future)
  USER_LISTED      // Listed by a user on P2P marketplace
  BUYBACK_RECYCLE  // Recycled from buyback into pool
}

enum PackTier {
  COMMON
  RARE
  EPIC
}

enum RarityTier {
  COMMON
  UNCOMMON
  RARE
  EPIC
  LEGENDARY
}

enum TransactionType {
  STOREFRONT_PURCHASE
  BUNDLE_PURCHASE
  GACHA_PULL
  BUYBACK
  P2P_PURCHASE
  P2P_SALE
  POINTS_REDEMPTION
  POINTS_PACK_REDEMPTION
}

enum PaymentMethod {
  STRIPE
  USDC_BASE
  POINTS
  FREE       // For promotional/test
}

enum TransactionStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

enum PointsType {
  PURCHASE_EARN
  GACHA_EARN
  DAILY_LOGIN
  STREAK_BONUS
  REFERRAL
  REDEMPTION
  EXPIRY
  ADMIN_ADJUST
}

enum LeaderboardPeriod {
  WEEKLY
  MONTHLY
}

enum SellerTier {
  NEW
  VERIFIED
  POWER
}

enum ListingStatus {
  ACTIVE
  SOLD
  CANCELLED
  EXPIRED
}

enum DisputeStatus {
  NONE
  OPEN
  RESOLVED_BUYER
  RESOLVED_SELLER
}

enum VerificationStatus {
  PENDING
  VERIFIED
  FAILED
}

// ─── MODELS ───────────────────────────────────────────────

model User {
  id              String    @id @default(cuid())
  email           String    @unique
  name            String?
  passwordHash    String?
  image           String?
  walletAddress   String?   @unique
  pointsBalance   Int       @default(0)
  usdcBalance     Float     @default(0)
  sellerTier      SellerTier @default(NEW)
  sellerRating    Float?
  totalSales      Int       @default(0)
  referralCode    String    @unique @default(cuid())
  referredById    String?
  referredBy      User?     @relation("Referrals", fields: [referredById], references: [id])
  referrals       User[]    @relation("Referrals")
  isAdmin         Boolean   @default(false)
  lastLoginAt     DateTime?
  loginStreak     Int       @default(0)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  giftCards       GiftCard[]    @relation("Owner")
  transactions    Transaction[]
  pointsLedger    PointsLedger[]
  sellerListings  P2PListing[]  @relation("Seller")
  buyerListings   P2PListing[]  @relation("Buyer")
  pullHistory          GachaPull[]
  packUnlocks          UserPackUnlock[]
  leaderboardEntries   LeaderboardEntry[]
  accounts             Account[]
  sessions             Session[]
}

// NextAuth models
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model GiftCard {
  id                 String            @id @default(cuid())
  brand              GiftCardBrand
  denomination       Float             // Face value in USD
  code               String            // In production: encrypted. In prototype: plaintext test codes
  status             GiftCardStatus    @default(AVAILABLE)
  source             GiftCardSource    @default(BULK_IMPORT)
  fmv                Float             // Fair market value (usually = denomination for gift cards)
  currentOwnerId     String?
  currentOwner       User?             @relation("Owner", fields: [currentOwnerId], references: [id])
  listedPrice        Float?            // If on storefront at a specific price
  discountPercent    Float?            // If sold at discount
  rarityTier         RarityTier?       // Assigned when placed in gacha pool
  verificationStatus VerificationStatus @default(VERIFIED) // Default verified for platform inventory
  createdAt          DateTime          @default(now())
  updatedAt          DateTime          @updatedAt

  transactions       Transaction[]
  listings           P2PListing[]
  gachaPulls         GachaPull[]
}

model GachaPack {
  id          String    @id @default(cuid())
  tier        PackTier  @unique
  name        String    // Display name, e.g. "Standard Pack"
  description String?
  price       Float     // Cost in USD
  pointsCost  Int?      // Alternative cost in points (null = not available for points)
  dailyLimit  Int       @default(5)
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  odds        GachaOdds[]
  pulls       GachaPull[]
}

model GachaOdds {
  id          String     @id @default(cuid())
  packId      String
  pack        GachaPack  @relation(fields: [packId], references: [id])
  rarityTier  RarityTier
  cardValue   Float      // The denomination of cards in this tier
  weight      Float      // Probability weight (all weights in a pack should sum to 1.0)
  createdAt   DateTime   @default(now())

  @@unique([packId, rarityTier])
}

model GachaPull {
  id            String      @id @default(cuid())
  userId        String
  user          User        @relation(fields: [userId], references: [id])
  packId        String
  pack          GachaPack   @relation(fields: [packId], references: [id])
  giftCardId    String
  giftCard      GiftCard    @relation(fields: [giftCardId], references: [id])
  rarityTier    RarityTier
  cardValue     Float
  buybackOffer  Float       // 95% of FMV at time of pull
  wasBoughtBack Boolean     @default(false)
  randomSeed    String?     // For audit trail
  createdAt     DateTime    @default(now())
}

model UserPackUnlock {
  id         String   @id @default(cuid())
  userId     String
  packTier   PackTier
  unlockedAt DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id])

  @@unique([userId, packTier])
}

model Transaction {
  id                   String            @id @default(cuid())
  type                 TransactionType
  userId               String
  user                 User              @relation(fields: [userId], references: [id])
  giftCardId           String?
  giftCard             GiftCard?         @relation(fields: [giftCardId], references: [id])
  amount               Float             // Total amount in USD
  currency             String            @default("USD") // "USD" or "USDC"
  paymentMethod        PaymentMethod
  stripePaymentIntentId String?
  baseTxHash           String?
  pointsEarned         Int               @default(0)
  status               TransactionStatus @default(PENDING)
  metadata             Json?             // Flexible field for extra data
  createdAt            DateTime          @default(now())
}

model PointsLedger {
  id            String     @id @default(cuid())
  userId        String
  user          User       @relation(fields: [userId], references: [id])
  amount        Int        // Positive = earn, Negative = spend
  type          PointsType
  multiplier    Float      @default(1.0)
  description   String?
  transactionId String?    // Link to originating transaction
  createdAt     DateTime   @default(now())
}

model P2PListing {
  id              String           @id @default(cuid())
  sellerId        String
  seller          User             @relation("Seller", fields: [sellerId], references: [id])
  giftCardId      String
  giftCard        GiftCard         @relation(fields: [giftCardId], references: [id])
  askingPrice     Float
  suggestedPrice  Float            // Platform-suggested price
  status          ListingStatus    @default(ACTIVE)
  buyerId         String?
  buyer           User?            @relation("Buyer", fields: [buyerId], references: [id])
  escrowTxHash    String?
  disputeStatus   DisputeStatus    @default(NONE)
  disputeReason   String?
  createdAt       DateTime         @default(now())
  expiresAt       DateTime
}

model Bundle {
  id              String          @id @default(cuid())
  name            String          // e.g., "Gaming Starter Pack"
  description     String?
  price           Float           // Bundle price
  faceValue       Float           // Total face value of included cards
  discountPercent Float           // Calculated discount
  isActive        Boolean         @default(true)
  createdAt       DateTime        @default(now())

  items           BundleItem[]
}

model BundleItem {
  id           String        @id @default(cuid())
  bundleId     String
  bundle       Bundle        @relation(fields: [bundleId], references: [id])
  brand        GiftCardBrand
  denomination Float
  quantity     Int           @default(1)
}

// ─── LEADERBOARD ──────────────────────────────────────────

model LeaderboardEntry {
  id           String            @id @default(cuid())
  userId       String
  user         User              @relation(fields: [userId], references: [id])
  period       LeaderboardPeriod
  periodStart  DateTime
  periodEnd    DateTime
  pointsEarned Int               @default(0)
  rank         Int?
  prizeAwarded Boolean           @default(false)
  prizeDetails Json?
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt

  @@unique([userId, period, periodStart])
}

model LeaderboardPrize {
  id         String            @id @default(cuid())
  period     LeaderboardPeriod
  rankMin    Int
  rankMax    Int
  prizeType  String            // "GIFT_CARD" or "POINTS"
  prizeValue Float
  prizeLabel String
  isActive   Boolean           @default(true)
  createdAt  DateTime          @default(now())
}
```

---

## 6. SEED DATA & TEST FIXTURES

Create `prisma/seed.ts` that populates the database with enough data to test all flows. This file must be runnable via `npx prisma db seed`.

### Required seed data

**Test users (3):**
- `admin@giftpull.test` — admin user, isAdmin: true, 10,000 points, $500 USDC balance
- `alice@test.com` — regular user, 2,500 points, $50 USDC balance, VERIFIED seller
- `bob@test.com` — new user, 100 points, $0 USDC balance

**Gift card inventory (100+ cards):**
- Distribute across all 10 brands
- Denominations: $5, $10, $15, $25, $50, $100
- Generate fake codes in format: `XXXX-XXXX-XXXX-XXXX` (random alphanumeric)
- Mix of statuses: ~70 AVAILABLE, ~15 RESERVED, ~10 SOLD, ~5 BUYBACK
- Assign rarityTier to AVAILABLE cards based on denomination ($5=COMMON, $10=UNCOMMON, $25=RARE, $50=EPIC, $100=LEGENDARY)

**Gacha packs (3 tiers):**

| Tier | Price | Points Cost | Daily Limit | EV |
|------|-------|-------------|-------------|-----|
| COMMON | $10 | 800 | 20 | +7% |
| RARE | $25 | 2000 | 10 | +10% |
| EPIC | $75 | 6000 | 5 | +15% |

**CC Unlock Gate:** First pull per tier MUST use points. After first points pull, credit card (Stripe) is unlocked for that tier. The `UserPackUnlock` model tracks which tiers each user has unlocked.

**Gacha odds (per pack — seed all 3):**

Common pack ($10) odds:
| Rarity | Card Value | Weight |
|--------|-----------|--------|
| COMMON | $5 | 0.60 |
| UNCOMMON | $10 | 0.25 |
| RARE | $15 | 0.10 |
| EPIC | $25 | 0.04 |
| LEGENDARY | $50 | 0.01 |

Rare pack ($25) odds:
| Rarity | Card Value | Weight |
|--------|-----------|--------|
| COMMON | $10 | 0.40 |
| UNCOMMON | $15 | 0.30 |
| RARE | $25 | 0.18 |
| EPIC | $50 | 0.09 |
| LEGENDARY | $100 | 0.03 |

Epic pack ($75) odds:
| Rarity | Card Value | Weight |
|--------|-----------|--------|
| COMMON | $25 | 0.20 |
| UNCOMMON | $50 | 0.25 |
| RARE | $75 | 0.25 |
| EPIC | $100 | 0.20 |
| LEGENDARY | $200 | 0.10 |

**Bundles (3):**
- Gaming Starter Pack: $25 Steam + $25 Xbox + $10 Nintendo = $50 (face $60)
- Entertainment Bundle: $25 Netflix + $25 Spotify + $10 Google Play = $48 (face $60)
- Mega Mix: 5x random $10 cards = $40 (face $50)

**Sample transactions (20+):** Pre-populate pull history, storefront purchases, and a few P2P sales for alice@test.com so the dashboard and history pages have data to render.

**Sample P2P listings (5):** Create active listings from alice@test.com at various prices.

**Fake leaderboard users (30):** Create 30 additional users with randomized names (e.g., CryptoKing, GachaQueen, LuckyDraw7, etc.) for populating the leaderboard with realistic data.

**Leaderboard prizes (13):**

| Period | Rank Range | Prize Type | Prize |
|--------|-----------|------------|-------|
| WEEKLY | #1 | GIFT_CARD | $100 Gift Card |
| WEEKLY | #2 | GIFT_CARD | $50 Gift Card |
| WEEKLY | #3 | GIFT_CARD | $25 Gift Card |
| WEEKLY | #4-5 | POINTS | 5,000 Points |
| WEEKLY | #6-10 | POINTS | 2,500 Points |
| WEEKLY | #11-25 | POINTS | 1,000 Points |
| MONTHLY | #1 | GIFT_CARD | $500 Gift Card |
| MONTHLY | #2 | GIFT_CARD | $250 Gift Card |
| MONTHLY | #3 | GIFT_CARD | $100 Gift Card |
| MONTHLY | #4-5 | GIFT_CARD | $50 Gift Card |
| MONTHLY | #6-10 | POINTS | 10,000 Points |
| MONTHLY | #11-25 | POINTS | 5,000 Points |
| MONTHLY | #26-50 | POINTS | 2,000 Points |

**Sample leaderboard entries (66):** Create WEEKLY and MONTHLY entries for all 33 users (3 core + 30 fake) with varying point totals to create a natural distribution for the current period.

---

## 7. FEATURE 1: AUTH & USER SYSTEM

### Implementation

Use NextAuth.js with the Prisma adapter. For the prototype, support:
- **Email/password** registration and login (use `bcrypt` for hashing)
- **Google OAuth** (optional, include if straightforward)
- **Session management** via JWT strategy

### Pages

**`/login`** — Email + password form. Link to register. Clean, minimal.
**`/register`** — Email, display name, password, confirm password. Auto-login on success.

### Auth middleware

Create a `getServerSession` helper in `src/lib/auth.ts`. Protect all non-public routes. Admin routes additionally check `user.isAdmin === true`.

### User profile data

After login, the navbar should display: user's display name, points balance (with coin icon), and USDC balance (with dollar icon). Clicking the balance area navigates to `/wallet`.

---

## 8. FEATURE 2: GIFT CARD STOREFRONT (WS1)

### Page: `/storefront`

**Layout:** Grid of gift card products. Top bar with brand filter pills (All, Xbox, Steam, Nintendo, etc.). Sort by: price low-high, price high-low, discount %. Search bar for brand name.

**Each card displays:**
- Brand logo/icon (use colored brand badges if no logos available)
- Denomination (e.g., "$25 Steam Gift Card")
- Original price (strikethrough if discounted)
- Sale price
- Discount badge (e.g., "12% OFF")
- "Buy Now" button

**Purchase flow:**
1. User clicks "Buy Now"
2. Modal opens: confirm card details, select payment method (Stripe / USDC / Points)
3. If Stripe: redirect to Stripe Checkout (test mode) or inline card element
4. If USDC: show mocked wallet flow (button says "Confirm USDC Payment", simulates success after 2 seconds)
5. If Points: deduct from balance if sufficient
6. On success: show gift card code in a reveal animation, add to user's wallet, credit points
7. Confirmation page with: card code (copyable), points earned, "Buy Another" button

### Bundle section

Below individual cards, show a "Bundles" section with bundle cards. Each shows included cards, total face value, bundle price, and savings percentage. Same purchase flow.

### Points earned

Storefront purchases earn **1 point per $1 spent**. Bundles earn **1.5 points per $1**. USDC payments earn **1.25x multiplier**. Display points earned on the confirmation screen.

---

## 9. FEATURE 3: GACHA PACK SYSTEM (WS2)

**This is the hero feature. The UX must feel exciting and polished.**

### Page: `/gacha`

**Layout:** 3 large pack tier cards displayed horizontally (responsive: stack on mobile). Each card shows:
- Pack name and tier badge (color-coded: Common=green, Rare=blue, Epic=purple)
- Price in USD
- Points cost alternative (smaller text below price)
- CC lock/unlock indicator (locked until first points pull)
- "View Odds" expandable section showing the full probability table
- Expected value displayed prominently (e.g., "Avg. value: $27.50")
- Daily limit and remaining pulls today
- Large "PULL" button → navigates to `/gacha/common`, `/gacha/rare`, or `/gacha/epic`

### Pack Detail Page: `/gacha/[packTier]`

**This page is the most important UX in the entire app.** Build it with Framer Motion. Slug-based route (`/gacha/common`, `/gacha/rare`, `/gacha/epic`).

**Hero section:** Pack name, price, EV badge, tier-themed gradient background.
**Odds table:** Visual breakdown of rarity probabilities with progress bars.
**Top hits:** Notable recent legendary/epic pulls.
**Recent pulls:** Live feed of last 10-20 pulls.
**Pool composition:** Card count by rarity.
**Pull button:** Inline on this page (no separate pull page).
- If CC locked: Points-only payment, button says "Pull with Points to Unlock"
- If CC unlocked: Toggle between Points / Stripe / USDC
- After reveal: show RevealScreen with optional ccJustUnlocked celebration banner

**Step 1 — Payment selection:**
Inline payment method selector with CC lock indicator. Points always available, Stripe/USDC locked until first points pull. Confirm button.

**Step 2 — Animation sequence (2-4 seconds):**
- Screen dims, pack appears center-screen
- Pack shakes/glows with increasing intensity
- Pack "opens" — light burst effect
- Rarity tier is revealed first (flash of color: gray=Common, green=Uncommon, blue=Rare, purple=Epic, gold=Legendary with screen shake)
- Then the actual card slides/flies in: brand logo, denomination, rarity badge

The animation intensity should scale with rarity. Common = simple flip. Legendary = full-screen particle effects, screen shake, sound (optional), and a distinct color explosion.

**Step 3 — Result screen:**
After animation, show:
- The pulled gift card: brand, denomination, rarity tier with color
- Buyback offer prominently displayed: "Sell back for $X.XX (95% of value)"
- Three action buttons:
  - **"Keep Card"** → adds to wallet, shows code
  - **"Sell Back"** → executes buyback immediately, credits USDC, shows "Pull Again?" prompt
  - **"List on Marketplace"** → redirects to sell flow with card pre-populated
- Points earned from this pull (displayed with a +animation)
- "Pull Again" button (if daily limit not reached)

### Pull History: `/gacha/history`

Table/list view showing all past pulls: date, pack tier, rarity, card brand, denomination, whether it was bought back, and points earned. Summary stats at top: total spent, total value pulled, best pull ever, current streak.

---

## 10. FEATURE 4: BUYBACK SYSTEM (WS2)

### Buyback rate: 95% of face value

### Buyback flow (triggered from gacha result screen OR from wallet)

1. User clicks "Sell Back" on a card they own
2. Confirmation modal: "Sell back your $25 Steam card for $23.75 USDC?"
3. On confirm:
   - Card status changes to BUYBACK
   - Card ownership transfers to platform
   - User's USDC balance increases by buyback amount
   - Transaction recorded
   - Card is recycled into the gacha pool (status → AVAILABLE, source → BUYBACK_RECYCLE)
4. Success screen: shows USDC credited, new balance, and a prominent "Pull Again?" CTA

### Buyback from wallet

Users can also sell back any RESERVED card from their wallet page. Same flow as above.

---

## 11. FEATURE 5: POINTS ECONOMY

### Earning rates

| Action | Base Rate | Multiplier Conditions |
|--------|-----------|----------------------|
| Storefront purchase | 1 pt / $1 | 1.5x bundles, 1.25x USDC |
| Gacha pull | 2 pts / $1 | 2.5x during promos |
| P2P purchase | 1 pt / $1 | — |
| P2P sale | 0.5 pts / $1 earned | 1x for Power Sellers |
| Daily login | 5 pts | +2 pts/day streak, max 7 days |
| Referral | 100 pts | Both parties |

### Redemption

| Redemption | Cost | Notes |
|------------|------|-------|
| $5 gift card | 500 pts | Any brand |
| $10 gift card | 1000 pts | Any brand |
| $25 gift card | 2500 pts | Any brand |
| Starter pack pull | 400 pts | 20% discount vs cash equiv |
| Standard pack pull | 1200 pts | 20% discount vs cash equiv |
| Premium pack pull | 4000 pts | 20% discount vs cash equiv |
| Ultra pack pull | 8000 pts | 20% discount vs cash equiv |

### Points display

Show points balance in the navbar (always visible). On the wallet page, show a full points ledger with earn/spend history.

### Implementation notes

- Points are integers (no decimals)
- Every points change is recorded in PointsLedger with type, amount, multiplier, and linked transaction
- User.pointsBalance is the denormalized running total (updated atomically with ledger insert)
- Points cannot go negative — validate before redemption
- For the prototype, skip expiry logic (note: production adds 12-month inactivity expiry)
- Every `earnPoints()` call automatically records points for the leaderboard via `recordPointsForLeaderboard()` (fire-and-forget, non-blocking)

---

## 12. FEATURE 6: P2P MARKETPLACE (WS3)

### Browse: `/marketplace`

Grid of active listings. Each card shows: brand, denomination, asking price, discount vs. face value, seller name, seller tier badge, seller rating, and listing age. Filter by brand, price range, denomination. Sort by: newest, price, discount.

### Sell: `/marketplace/sell`

Form:
1. Select brand (dropdown)
2. Enter denomination (number input)
3. Enter gift card code (text input, masked by default)
4. Platform suggests a price (90% of face value as starting suggestion)
5. Seller sets asking price
6. Submit → automated verification runs (for prototype: always passes after 1-second simulated delay)
7. Listing goes live with "Verified" badge

### Buy flow

1. User clicks "Buy" on a listing
2. Confirmation modal with payment method selection
3. Payment processed (Stripe test or mocked USDC)
4. Card code revealed to buyer
5. 24-hour confirmation window (for prototype: show a "Confirm card works" button and a "Dispute" button)
6. Auto-confirm after 24 hours if no dispute

### Dispute flow (simplified for prototype)

- Buyer clicks "Dispute" → enters reason → status changes to OPEN
- Admin can resolve in admin dashboard → mark RESOLVED_BUYER (refund) or RESOLVED_SELLER (release payment)

### Seller tiers

| Tier | Commission | Requirements |
|------|-----------|-------------|
| NEW | 10% | Default |
| VERIFIED | 7% | 10+ sales, 95%+ rating |
| POWER | 5% | 50+ sales, 98%+ rating |

For the prototype, set alice@test.com as VERIFIED. Commission is deducted from the asking price on sale.

---

## 13. FEATURE 7: PAYMENTS — STRIPE + USDC ON BASE

### Stripe (test mode)

**Use Stripe Checkout for simplicity in the prototype.**

1. When user selects Stripe payment, create a Checkout Session via `POST /api/storefront/purchase` or `POST /api/gacha/pull`
2. Redirect to Stripe Checkout (test mode)
3. On success, Stripe redirects back to a success page with session_id
4. Stripe webhook (`/api/webhooks/stripe`) handles `checkout.session.completed` event:
   - Look up the pending transaction by session ID
   - Mark transaction COMPLETED
   - Fulfill the order (assign card, credit points, etc.)

**Test card:** `4242 4242 4242 4242`, any future expiry, any CVC.

### USDC on Base (mocked)

**For the prototype, crypto payments are simulated.** The UI must be complete:

1. User selects "Pay with USDC"
2. UI shows: "Connect Wallet" button (mocked — clicking sets a fake wallet address on the user)
3. After "connecting," show: "Confirm payment of X USDC" button
4. Clicking confirms → 2-second loading spinner → simulated success
5. User's USDC balance is deducted (or: for new purchases, treat it as an external payment; for buybacks, credit the balance)

**The mocked flow must match the real flow structurally** so that swapping in real wallet connect (wagmi/viem) later requires only replacing the mock functions, not the UI or state management.

### Wallet page: `/wallet`

Display:
- USDC balance (large number)
- Points balance (large number)
- "Withdraw USDC" button (mocked: shows a form for wallet address + amount, simulates success)
- Transaction history table: date, type, amount, currency, status
- Points ledger tab: date, type, amount, description

---

## 14. FEATURE 8: ADMIN DASHBOARD

### Access: `/admin` (protected, isAdmin check)

### Overview page: `/admin`

Stats cards at top:
- Total users
- Total revenue (sum of completed transactions)
- Total gacha pulls today
- Active P2P listings
- Points in circulation

Charts (use Recharts or simple stat displays):
- Revenue by day (last 30 days)
- Pulls by pack tier (last 7 days)
- Top brands by volume

### Inventory: `/admin/inventory`

- Table of all gift cards: brand, denomination, status, source, owner, created date
- Filters by brand, status, source
- "Add Cards" button: form to bulk-add cards (brand, denomination, quantity — auto-generates test codes)
- Edit card status

### Gacha Config: `/admin/gacha`

- View/edit pack tiers: price, daily limit, active toggle
- View/edit odds per pack: rarity tier, card value, weight (with real-time EV calculation)
- EV monitor: show actual EV over last 100/1000/all pulls vs. target EV
- Kill switch: big red "Pause All Gacha" button

### Users: `/admin/users`

- User table: name, email, points, USDC balance, seller tier, created date
- Click to view user detail: transaction history, pull history, points ledger
- Adjust points balance (admin action, logged in ledger)

---

## 15. FEATURE 9: LEADERBOARD & RANKINGS

### Overview

A competitive leaderboard system that tracks points earned per user across weekly and monthly periods. Top-ranked players win prizes (gift cards or bonus points). All points earned anywhere in the app automatically feed into leaderboard tracking.

### Core logic: `src/lib/leaderboard.ts`

**Period bounds:**
- Weekly: Monday 00:00 UTC → Sunday 23:59 UTC
- Monthly: 1st 00:00 UTC → last day 23:59 UTC

**Key functions:**
- `getWeekBounds(date)` / `getMonthBounds(date)` — calculate period start/end
- `getPeriodBounds(period, date)` — dispatcher for WEEKLY/MONTHLY
- `getSecondsUntilPeriodEnd(period, date)` — countdown helper
- `recordPointsForLeaderboard(userId, points)` — upserts WEEKLY + MONTHLY entries atomically
- `getLeaderboard(period, date, limit, offset)` — ranked list with user data
- `getUserRank(userId, period, date)` — user's current rank and points
- `getPrizeForRank(rank, period)` — prize lookup by rank
- `getPrizes(period)` — all active prizes for a period

### Integration with points system

The `earnPoints()` function in `src/lib/points.ts` automatically calls `recordPointsForLeaderboard()` as a fire-and-forget operation after every point award. This means all points sources feed into the leaderboard:
- Storefront purchases (1 pt/$1)
- Gacha pulls (2 pts/$1)
- P2P marketplace sales (0.5 pts/$1)
- Daily login (5 pts)
- Referrals (100 pts)
- USDC multiplier (1.25x)
- Bundle multiplier (1.5x)

### Page: `/leaderboard`

**Hero banner:** Gradient background with trophy icon, title, description. If authenticated, shows the user's current rank and points earned in a highlighted card.

**Period tabs:** Toggle between Weekly and Monthly views. Active tab is highlighted with primary color.

**Countdown timer:** Shows time remaining until the current period ends. Ticks every second. Format: `Xd Xh Xm` or `Xh Xm Xs`.

**Prize table (left sidebar):** Lists all prizes for the selected period. Each row shows rank range, prize type icon, and prize label badge. Crown icon for #1, gift icon for gift card prizes, star icon for points prizes.

**Points explainer (left sidebar):** Lists all ways to earn points with icons and values:
- Storefront Purchase: 1 pt / $1
- Gacha Pull: 2 pts / $1
- P2P Sale: 0.5 pts / $1
- Daily Login: 5 pts
- Referral: 100 pts
- USDC Bonus: 1.25x

**Ranked leaderboard table (right, 2/3 width):**
- Column headers: Rank, Player, Points
- Top 3 rows have special styling (gold/silver/bronze gradients, crown/medal icons)
- Current user's row highlighted with primary color border
- Rank change indicators: chevron up (green), chevron down (red), dash (no change)
- Player avatars with initial letter, truncated names
- Framer Motion `AnimatePresence` for smooth row reordering on refresh
- Shows total player count in header

**Auto-refresh:** Polls `/api/leaderboard` every 60 seconds to update rankings. No WebSocket needed.

### Navigation

The Navbar includes a "Leaderboard" link with a trophy icon (lucide-react `Trophy`), positioned after "Marketplace" in the nav links array.

---

## 16. UI/UX DESIGN DIRECTION

### Aesthetic: "Neon Arcade meets Clean Commerce"

The visual identity should feel like a premium, modern gaming storefront — think Steam Store meets a polished gacha mobile game. Not cartoon-ish, not crypto-bro. Sophisticated but fun.

**Color palette:**
- Background: deep dark navy/charcoal (`#0A0E1A` or `#111827`)
- Surface/cards: slightly lighter dark (`#1A1F2E`)
- Primary accent: electric blue (`#3B82F6`) or vibrant cyan (`#06B6D4`)
- Success/money: bright green (`#10B981`)
- Warning/rare: amber/gold (`#F59E0B`)
- Epic: purple (`#8B5CF6`)
- Legendary: gold gradient (`#F59E0B` → `#EF4444`)
- Text primary: white (`#F9FAFB`)
- Text secondary: muted gray (`#9CA3AF`)

**Typography:**
- Headings: bold, modern sans-serif (Satoshi, Cabinet Grotesk, or General Sans from Google Fonts / Fontshare)
- Body: clean sans (the same family at regular weight, or a complementary one)
- Monospace for card codes: JetBrains Mono or similar

**Card design language:**
- Rounded corners (12-16px radius)
- Subtle border (1px, semi-transparent white or brand-colored)
- Hover: slight lift (translateY -2px) + glow shadow in brand color
- Rarity borders: Common=gray, Uncommon=green, Rare=blue, Epic=purple, Legendary=animated gold gradient border

**Animations (Framer Motion):**
- Page transitions: fade + slight slide
- Card hover: scale(1.02) + shadow
- Gacha pull: elaborate multi-stage animation (see Section 9)
- Points earned: number count-up animation
- Buyback credit: slide-in notification

**Responsive:** Mobile-first. All flows must work on 375px width. Gacha pull animation should adapt (simpler on mobile if needed, but still exciting).

---

## 17. PAGE ROUTES & NAVIGATION

### Main navigation (always visible)

```
Logo (home) | Storefront | Gacha Packs | Marketplace | 🏆 Leaderboard | [Wallet: 💰 2,500 pts | $50.00] | [Avatar dropdown: Profile, Admin*, Logout]
```

*Admin link only visible if user.isAdmin

### Route map

| Route | Auth | Description |
|-------|------|-------------|
| `/` | Public | Landing page — hero section, feature highlights, CTA to sign up |
| `/login` | Public | Login form |
| `/register` | Public | Registration form |
| `/storefront` | Public (buy requires auth) | Browse and purchase gift cards |
| `/storefront/[brand]` | Public | Brand-filtered view |
| `/gacha` | Auth required | Pack selection screen |
| `/gacha/[packTier]` | Auth required | Pack detail page with pull flow |
| `/gacha/history` | Auth required | User's pull history |
| `/marketplace` | Public (buy/sell requires auth) | Browse P2P listings |
| `/marketplace/sell` | Auth required | Create a listing |
| `/marketplace/[listingId]` | Public | Listing detail |
| `/wallet` | Auth required | Balances, transactions, points ledger |
| `/leaderboard` | Public (rank badge requires auth) | Weekly/monthly leaderboard with prizes |
| `/admin` | Admin only | Dashboard overview |
| `/admin/inventory` | Admin only | Gift card management |
| `/admin/gacha` | Admin only | Pack and odds configuration |
| `/admin/users` | Admin only | User management |

---

## 18. API ROUTE SPECIFICATION

All routes are Next.js App Router API routes (`src/app/api/...`). Return JSON. Use proper HTTP status codes. Authenticate via `getServerSession`.

### Storefront

```
GET  /api/storefront/cards?brand=STEAM&minPrice=5&maxPrice=50&sort=price_asc
  → { cards: GiftCard[], total: number }

POST /api/storefront/cards/purchase
  Body: { cardId: string, paymentMethod: "STRIPE" | "USDC_BASE" | "POINTS" }
  → { transaction: Transaction, card: GiftCard, pointsEarned: number }
  → If STRIPE: { checkoutUrl: string } (redirect to Stripe)

GET  /api/storefront/bundles
  → { bundles: Bundle[] }

POST /api/storefront/bundles/purchase
  Body: { bundleId: string, paymentMethod: ... }
  → { transaction: Transaction, cards: GiftCard[], pointsEarned: number }
```

### Gacha

```
GET  /api/gacha/packs
  → { packs: (GachaPack & { odds, expectedValue, pullsToday, ccUnlocked, poolStats, recentPulls, topHits })[] }

POST /api/gacha/pull
  Body: { packTier: "COMMON" | "RARE" | "EPIC", paymentMethod: "STRIPE" | "USDC_BASE" | "POINTS" }
  → { pull, card, rarityTier, buybackOffer, pointsEarned, ccJustUnlocked: boolean }
  → If STRIPE: { checkoutUrl: string }
  → If CC locked: 403 { error: "CC_LOCKED", message: "..." }

GET  /api/gacha/unlock-status
  → { COMMON: boolean, RARE: boolean, EPIC: boolean }

POST /api/gacha/buyback
  Body: { giftCardId: string }
  → { buybackAmount: number, newUsdcBalance: number, cardRecycled: boolean }

GET  /api/gacha/history?page=1&limit=20
  → { pulls: GachaPull[], stats: { totalSpent, totalValue, bestPull, totalPulls } }
```

### Marketplace

```
GET  /api/marketplace/listings?brand=XBOX&minPrice=5&maxPrice=100&sort=newest
  → { listings: (P2PListing & { seller: User })[], total: number }

POST /api/marketplace/listings
  Body: { brand: GiftCardBrand, denomination: number, code: string, askingPrice: number }
  → { listing: P2PListing }

POST /api/marketplace/buy
  Body: { listingId: string, paymentMethod: ... }
  → { transaction: Transaction, card: GiftCard, pointsEarned: number }

POST /api/marketplace/dispute
  Body: { listingId: string, reason: string }
  → { listing: P2PListing }

POST /api/marketplace/confirm
  Body: { listingId: string }
  → { listing: P2PListing }
```

### Points

```
GET  /api/points/balance
  → { balance: number, recentLedger: PointsLedger[] }

POST /api/points/redeem
  Body: { type: "GIFT_CARD" | "GACHA_PACK", targetId?: string, brand?: GiftCardBrand, denomination?: number }
  → { transaction: Transaction, pointsSpent: number, newBalance: number }
```

### Wallet

```
GET  /api/wallet/balance
  → { usdcBalance: number, pointsBalance: number, recentTransactions: Transaction[] }

POST /api/wallet/withdraw
  Body: { toAddress: string, amount: number }
  → { success: boolean, newBalance: number } // Mocked in prototype
```

### Webhooks

```
POST /api/webhooks/stripe
  → Handles checkout.session.completed, payment_intent.succeeded, etc.
  → Verifies webhook signature
  → Fulfills pending transactions
```

### Leaderboard

```
GET  /api/leaderboard?period=WEEKLY|MONTHLY&limit=50&offset=0
  → { period, periodStart, periodEnd, secondsRemaining, total, rows: LeaderboardRow[], myRank: { rank, pointsEarned } | null }
  → LeaderboardRow: { rank, userId, userName, userImage, pointsEarned }
  → If authenticated, includes myRank for the current user

GET  /api/leaderboard/prizes?period=WEEKLY|MONTHLY
  → { period, prizes: LeaderboardPrize[] }
  → LeaderboardPrize: { id, period, rankMin, rankMax, prizeType, prizeValue, prizeLabel, isActive }
```

---

## 19. GACHA ENGINE — FULL IMPLEMENTATION LOGIC

**File: `src/lib/gacha-engine.ts`**

This is the most critical business logic file. Implement it exactly as specified.

```typescript
// PSEUDOCODE — implement with proper Prisma transactions and error handling

interface PullResult {
  giftCard: GiftCard;
  rarityTier: RarityTier;
  buybackOffer: number;
  pointsEarned: number;
  pull: GachaPull;
}

async function executeGachaPull(
  userId: string,
  packTier: PackTier,
  paymentMethod: PaymentMethod
): Promise<PullResult> {

  // 1. VALIDATE
  const pack = await prisma.gachaPack.findUnique({
    where: { tier: packTier },
    include: { odds: true }
  });
  if (!pack || !pack.isActive) throw new Error("Pack not available");

  const todayPulls = await countTodayPulls(userId, pack.id);
  if (todayPulls >= pack.dailyLimit) throw new Error("Daily limit reached");

  // 1b. CC UNLOCK GATE
  if (paymentMethod === "STRIPE") {
    const unlock = await prisma.userPackUnlock.findUnique({
      where: { userId_packTier: { userId, packTier } }
    });
    if (!unlock) throw new CCLockedError(packTier);
  }

  // 2. PROCESS PAYMENT
  if (paymentMethod === "STRIPE") {
    // Create Stripe Checkout session and return URL
    // Actual fulfillment happens in webhook
    throw new StripeRedirectNeeded(checkoutUrl);
  } else if (paymentMethod === "USDC_BASE") {
    // Deduct from user's platform USDC balance (mocked)
    await deductUsdcBalance(userId, pack.price);
  } else if (paymentMethod === "POINTS") {
    if (!pack.pointsCost) throw new Error("Pack not available for points");
    await deductPoints(userId, pack.pointsCost);
  }

  // 3. DETERMINE RARITY (CSPRNG)
  const random = crypto.randomFloat(); // Use Node crypto.getRandomValues
  let cumulative = 0;
  let selectedOdds: GachaOdds | null = null;

  // Sort by weight descending for efficiency
  const sortedOdds = [...pack.odds].sort((a, b) => b.weight - a.weight);

  for (const odds of sortedOdds) {
    cumulative += odds.weight;
    if (random < cumulative) {
      selectedOdds = odds;
      break;
    }
  }

  if (!selectedOdds) {
    // Fallback to last tier (rounding edge case)
    selectedOdds = sortedOdds[sortedOdds.length - 1];
  }

  // 4. SELECT SPECIFIC CARD FROM POOL
  const availableCard = await prisma.giftCard.findFirst({
    where: {
      status: "AVAILABLE",
      denomination: selectedOdds.cardValue,
      rarityTier: selectedOdds.rarityTier
    },
    orderBy: { createdAt: "asc" } // FIFO
  });

  if (!availableCard) {
    // No card available at this tier — fall back to next available tier
    // or refund. For prototype: try any AVAILABLE card at the value.
    throw new Error("No cards available at this tier. Please try again.");
  }

  // 5. EXECUTE IN TRANSACTION
  const result = await prisma.$transaction(async (tx) => {
    // Reserve the card
    const card = await tx.giftCard.update({
      where: { id: availableCard.id },
      data: { status: "RESERVED", currentOwnerId: userId }
    });

    // Create pull record
    const pull = await tx.gachaPull.create({
      data: {
        userId,
        packId,
        giftCardId: card.id,
        rarityTier: selectedOdds!.rarityTier,
        cardValue: selectedOdds!.cardValue,
        buybackOffer: card.fmv * 0.95,
        randomSeed: random.toString()
      }
    });

    // Create transaction record
    const pointsMultiplier = paymentMethod === "USDC_BASE" ? 2.5 : 2;
    const pointsEarned = Math.floor(pack.price * pointsMultiplier);

    const transaction = await tx.transaction.create({
      data: {
        type: "GACHA_PULL",
        userId,
        giftCardId: card.id,
        amount: pack.price,
        currency: paymentMethod === "USDC_BASE" ? "USDC" : "USD",
        paymentMethod,
        pointsEarned,
        status: "COMPLETED"
      }
    });

    // Credit points
    await tx.pointsLedger.create({
      data: {
        userId,
        amount: pointsEarned,
        type: "GACHA_EARN",
        multiplier: pointsMultiplier,
        description: `Gacha pull: ${pack.name}`,
        transactionId: transaction.id
      }
    });

    await tx.user.update({
      where: { id: userId },
      data: { pointsBalance: { increment: pointsEarned } }
    });

    return { card, pull, pointsEarned };
  });

  return {
    giftCard: result.card,
    rarityTier: selectedOdds.rarityTier,
    buybackOffer: result.card.fmv * 0.95,
    pointsEarned: result.pointsEarned,
    pull: result.pull
  };
}

async function executeBuyback(userId: string, giftCardId: string) {
  const card = await prisma.giftCard.findUnique({ where: { id: giftCardId } });

  if (!card || card.currentOwnerId !== userId) throw new Error("Not your card");
  if (card.status !== "RESERVED") throw new Error("Card not eligible for buyback");

  const buybackAmount = card.fmv * 0.95;

  await prisma.$transaction(async (tx) => {
    // Update card
    await tx.giftCard.update({
      where: { id: giftCardId },
      data: {
        status: "AVAILABLE", // Recycle back to pool
        source: "BUYBACK_RECYCLE",
        currentOwnerId: null
      }
    });

    // Credit user USDC
    await tx.user.update({
      where: { id: userId },
      data: { usdcBalance: { increment: buybackAmount } }
    });

    // Record transaction
    await tx.transaction.create({
      data: {
        type: "BUYBACK",
        userId,
        giftCardId,
        amount: buybackAmount,
        currency: "USDC",
        paymentMethod: "USDC_BASE",
        status: "COMPLETED"
      }
    });

    // Update pull record
    await tx.gachaPull.updateMany({
      where: { giftCardId, userId },
      data: { wasBoughtBack: true }
    });
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  return { buybackAmount, newUsdcBalance: user!.usdcBalance };
}
```

---

## 20. TESTING CHECKLIST & ACCEPTANCE CRITERIA

**Every item below must be manually testable in the browser at `localhost:3000`.**

### Auth
- [ ] Can register a new account with email/password
- [ ] Can log in with registered credentials
- [ ] Navbar shows user name, points, and USDC balance after login
- [ ] Unauthenticated users are redirected from protected routes
- [ ] Admin routes only accessible by admin users

### Storefront (WS1)
- [ ] `/storefront` displays gift cards from seed data
- [ ] Brand filter pills work (clicking "Steam" shows only Steam cards)
- [ ] Sort by price works
- [ ] Can purchase a card via Stripe test checkout (use test card 4242...)
- [ ] After purchase: card code is displayed, points are credited, card status changes to SOLD
- [ ] Can purchase a bundle
- [ ] USDC payment flow works (mocked: click confirm, see success)
- [ ] Points payment flow works (deducts points, gives card)

### Gacha (WS2)
- [ ] `/gacha` shows all 3 pack tiers (COMMON, RARE, EPIC) with correct prices and odds
- [ ] First pull with points → CC unlocked celebration → Stripe now available
- [ ] Attempting Stripe before points unlock → 403 CC_LOCKED error
- [ ] Expected value is calculated and displayed correctly
- [ ] Daily pull counter shows remaining pulls
- [ ] Clicking "Pull" initiates the purchase flow
- [ ] Pull animation plays and reveals a card with correct rarity visual treatment
- [ ] Common pulls show simple animation; Legendary pulls show elaborate animation
- [ ] Result screen shows card details, buyback offer, and action buttons
- [ ] "Keep Card" adds card to wallet
- [ ] "Sell Back" executes buyback (see buyback tests)
- [ ] "List on Marketplace" redirects to sell form with card pre-populated
- [ ] Pull history page shows past pulls with stats
- [ ] Daily limit prevents additional pulls when reached
- [ ] Points can be used to pay for pulls at the discounted rate

### Buyback (WS2)
- [ ] Buyback from gacha result screen works: USDC credited, card recycled
- [ ] Buyback from wallet page works for any RESERVED card
- [ ] Buyback amount is exactly 95% of face value
- [ ] After buyback, "Pull Again?" CTA is prominently displayed
- [ ] Bought-back card re-enters the AVAILABLE pool

### Points
- [ ] Points earned on every storefront purchase (1 pt/$1)
- [ ] Points earned on every gacha pull (2 pts/$1)
- [ ] Multipliers apply correctly (bundles = 1.5x, USDC = 1.25x)
- [ ] Points balance updates in real-time in navbar
- [ ] Points ledger shows full history on wallet page
- [ ] Can redeem points for a gift card (500 pts = $5 card)
- [ ] Can redeem points for a gacha pull
- [ ] Cannot redeem more points than balance

### P2P Marketplace (WS3)
- [ ] `/marketplace` shows active listings from seed data
- [ ] Filters and sort work
- [ ] Can create a new listing (submit code, set price)
- [ ] Verification runs (simulated delay, then "Verified" badge)
- [ ] Can purchase a listing — code revealed to buyer
- [ ] Seller receives payment minus commission
- [ ] Buyer can confirm or dispute within the 24-hour window
- [ ] Dispute changes listing status to OPEN
- [ ] Commission rates match seller tier (10% / 7% / 5%)

### Payments
- [ ] Stripe Checkout works in test mode (redirect, complete, webhook fulfills)
- [ ] Mocked USDC flow: connect wallet → confirm → success (no real blockchain)
- [ ] All transactions recorded correctly in the database

### Wallet
- [ ] `/wallet` shows USDC balance, points balance
- [ ] Transaction history displays all transactions
- [ ] Points ledger tab shows all points activity
- [ ] "Withdraw USDC" form works (mocked success)

### Admin
- [ ] `/admin` shows overview stats from real database
- [ ] Can view and filter gift card inventory
- [ ] Can bulk-add new cards
- [ ] Can view and edit gacha pack odds
- [ ] EV monitor shows actual vs. target EV
- [ ] Can pause gacha (kill switch)
- [ ] Can view users and adjust points

### Leaderboard
- [ ] `/leaderboard` displays ranked players with points from seed data
- [ ] Weekly/Monthly tab switching works and loads different data
- [ ] Countdown timer ticks down and displays correct time remaining
- [ ] Prize table shows correct prizes for each period
- [ ] Authenticated user's rank is highlighted in the table
- [ ] Hero banner shows user's current rank and points when logged in
- [ ] Auto-refresh updates rankings every 60 seconds
- [ ] Points explainer shows all earning methods with correct values
- [ ] Navbar shows "Leaderboard" link with trophy icon
- [ ] Points earned from purchases/gacha/etc. automatically update leaderboard entries

### Responsive
- [ ] All pages render correctly at 375px width (mobile)
- [ ] All pages render correctly at 768px width (tablet)
- [ ] All pages render correctly at 1440px width (desktop)
- [ ] Gacha pull animation works on mobile

---

## 21. BUILD ORDER (RECOMMENDED SEQUENCE)

Follow this order. Each step should result in a testable increment.

```
PHASE 1: FOUNDATION (get something running)
──────────────────────────────────────────
Step 1:  Scaffold Next.js project, install dependencies, configure Tailwind
Step 2:  Set up Prisma schema, connect to database, run migrations
Step 3:  Create seed file, run seed, verify data in Prisma Studio
Step 4:  Implement NextAuth (email/password), login/register pages
Step 5:  Create root layout with navbar (logo, nav links, auth state)
         ✅ CHECKPOINT: Can register, log in, see nav with user info

PHASE 2: STOREFRONT (WS1)
──────────────────────────
Step 6:  Build /storefront page — card grid, brand filters, sorting
Step 7:  Build purchase flow — Stripe Checkout integration (test mode)
Step 8:  Build mocked USDC payment flow
Step 9:  Build points payment flow
Step 10: Add points earning on purchase (+ ledger entries)
Step 11: Build bundle listing and bundle purchase
         ✅ CHECKPOINT: Can browse and buy gift cards via 3 payment methods

PHASE 3: GACHA ENGINE (WS2)
────────────────────────────
Step 12: Implement gacha-engine.ts (pull logic, randomness, card selection)
Step 13: Build /gacha page — pack tier cards with odds display
Step 14: Build /gacha/[packTier] — pack detail page with inline pull flow (Framer Motion)
Step 15: Build result screen with Keep/Sellback/List actions
Step 16: Implement buyback logic and flow
Step 17: Build pull history page
Step 18: Add daily pull limits
Step 19: Add points-for-packs redemption
         ✅ CHECKPOINT: Full gacha flow working — pull, reveal, buyback, re-pull

PHASE 4: MARKETPLACE (WS3)
───────────────────────────
Step 20: Build /marketplace — listing grid with filters
Step 21: Build /marketplace/sell — listing creation with verification
Step 22: Build marketplace purchase flow with escrow simulation
Step 23: Build confirmation and dispute flows
Step 24: Implement seller tiers and commission rates
         ✅ CHECKPOINT: Can list, buy, and dispute gift cards P2P

PHASE 5: WALLET & ADMIN
────────────────────────
Step 25: Build /wallet — balances, transaction history, points ledger
Step 26: Build USDC withdrawal flow (mocked)
Step 27: Build /admin overview with stats
Step 28: Build /admin/inventory — card management, bulk add
Step 29: Build /admin/gacha — odds editor, EV monitor, kill switch
Step 30: Build /admin/users — user table, points adjustment
         ✅ CHECKPOINT: Full prototype complete, all flows testable

PHASE 6: LEADERBOARD & RANKINGS
─────────────────────────────────
Step 31: Add LeaderboardEntry, LeaderboardPrize models to schema
Step 32: Create leaderboard computation logic (src/lib/leaderboard.ts)
Step 33: Create API routes: GET /api/leaderboard, GET /api/leaderboard/prizes
Step 34: Build /leaderboard page — hero, tabs, countdown, prizes, ranked table
Step 35: Wire recordPointsForLeaderboard into earnPoints (fire-and-forget)
Step 36: Seed 30 fake users, prize tables, sample leaderboard entries
Step 37: Add Leaderboard link + trophy icon to Navbar
         ✅ CHECKPOINT: Leaderboard shows rankings, auto-refreshes, prizes visible

PHASE 7: POLISH
───────────────
Step 38: Responsive pass on all pages (mobile, tablet, desktop)
Step 39: Animation polish — page transitions, hover states, micro-interactions
Step 40: Error handling — loading states, empty states, error boundaries
Step 41: Final seed data check — ensure enough data for realistic testing
         ✅ FINAL: Dev prototype ready for QA and demo
```

---

## NOTES FOR CLAUDE CODE

1. **This is a prototype, not production.** Prioritize getting flows working end-to-end over perfect security, performance, or edge case handling. Use `console.log` for debugging. Skip input sanitization beyond basic type checks.

2. **Test data is king.** The seed file is critical — without it, there's nothing to test. Make sure it runs cleanly and populates enough data for every page to look real.

3. **Stripe test mode only.** Never use real API keys. The webhook handler must verify signatures even in test mode.

4. **USDC is fully mocked.** There is no blockchain interaction in this prototype. The UI should look real (wallet connect button, confirmation flow) but all state changes happen in the database.

5. **The gacha pull animation is the single most important UX element.** Spend time on it. Use Framer Motion. Make it feel like opening a Pokémon card pack. The rarity tier should dictate the intensity of the animation.

6. **Every purchase earns points.** Don't forget to wire up points earning in every single transaction handler.

7. **The buyback "Pull Again?" CTA is the retention loop.** Make it prominent, make it one click. The whole point of the 95% buyback is to keep users in the gacha cycle.

8. **When in doubt about design, reference:** Courtyard.io for clean commerce UX, Collector Crypt's Gacha Machine for pull excitement, and Steam Store for storefront layout.

---

*End of spec. This document is the single source of truth for building the GiftPull dev prototype.*
