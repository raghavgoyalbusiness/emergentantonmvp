# Influencer Connect — PRD
_Last updated: Feb 2026_

## Original Problem Statement
Build "Influencer Connect", a fully functional AI-powered influencer marketing platform MVP that automatically matches brands with micro/mid-tier influencers, manages campaigns from brief to payment, and delivers ROI reporting.

## User Personas
- **Brand Marketers**: Need to find influencers, create campaigns, track ROI
- **Agency Users**: Manage multiple brands, need pipeline visibility

## Core Requirements
- AI Brand Onboarding (Campaign Wizard with Claude Sonnet 4.5)
- Influencer Discovery with AI scoring (simulated Apify + Claude)
- Automated Outreach (simulated Jasper + lemlist)
- Campaign Pipeline / Kanban (Brief → Outreach → Accepted → Live → Content Review → Paid → Reported)
- Unified Inbox (Texts.com simulated)
- Stripe Payments (Test Mode, escrow model)
- ROI Analytics Dashboard

## User Explicit Choices
- Fully functional UI/UX with simulated/demo data for 3rd party APIs
- Google OAuth via Emergent-managed auth
- Realistic demo data seeded upon launch
- **Georgia** for headings (H1–H6)
- **Times New Roman** for body/small text
- Dark premium aesthetic matching landing page (#0A0F2E navy, #00D4C8 teal)
- Framer Motion stagger entrance animations across all dashboard views

---

## Architecture

```
/app
├── backend/
│   ├── .env
│   ├── requirements.txt
│   └── server.py (FastAPI app, routes, seeder)
├── frontend/
│   ├── .env
│   ├── tailwind.config.js  (Georgia + Times New Roman font families)
│   ├── src/
│   │   ├── index.css       (global font overrides)
│   │   ├── App.css         (btn-primary, animations)
│   │   ├── App.js
│   │   ├── components/
│   │   │   ├── AuthCallback.jsx
│   │   │   ├── Layout.jsx
│   │   │   └── ui/ (shadcn + splite.jsx + spotlight.jsx)
│   │   ├── context/AuthContext.jsx
│   │   └── pages/
│   │       ├── LandingPage.jsx  (3D Spline hero + Spotlight)
│   │       ├── Dashboard.jsx
│   │       ├── InfluencerDiscovery.jsx
│   │       ├── CampaignPipeline.jsx
│   │       ├── CampaignWizard.jsx
│   │       ├── Analytics.jsx
│   │       ├── Payments.jsx
│   │       ├── Inbox.jsx
│   │       └── Settings.jsx
└── memory/
    ├── PRD.md
    └── test_credentials.md
```

## Key DB Schema
- users: {email, name, role, google_id}
- influencers: {name, handle, platform, followers, engagement_rate, niche, match_score, reasoning}
- campaigns: {brand_id, name, status, budget, brief, stage, selected_influencers}
- messages: {influencer_name, platform, content, direction, is_read, timestamp}
- transactions: {campaign_id, influencer_id, amount, platform_fee, total_amount, payment_status}

## Key API Endpoints
- `GET /api/influencers`
- `GET /api/campaigns`, `POST /api/campaigns`, `PATCH /api/campaigns/:id/stage`
- `POST /api/ai/score-influencers`
- `GET /api/dashboard/stats`
- `GET /api/analytics/overview`, `GET /api/analytics/campaign/:id`
- `GET /api/messages`, `POST /api/messages`, `PATCH /api/messages/:id/read`
- `POST /api/payments/create-checkout`, `GET /api/payments/status/:session_id`
- `POST /api/auth/google`

---

## What's Been Implemented

### ✅ Session 1 (Initial Build)
- Project scaffolding and MongoDB + FastAPI backend
- Google OAuth Integration (Emergent-managed)
- Stripe Payments (Test Mode) — escrow model
- Backend data seeding: 20 realistic influencers + 8 campaigns across all stages
- Core UI pages: Dashboard, InfluencerDiscovery, CampaignPipeline, CampaignWizard, Analytics, Payments, Inbox, Settings
- Landing Page 3D Spline Hero Integration

### ✅ Session 10 (Robot Polish + Performance — 2026-04)
- **Root cause fixed**: Removed `animated-shader-background.jsx` (Three.js aurora with 35-iteration fragment loop) from LandingPage — was competing with Spline robot for GPU
- **Plasma shader capped**: 50fps (was uncapped 60fps) freeing ~17% GPU headroom for Spline
- **SplineScene rewritten**: `onLoad` callback → AnimatePresence fade-out of orbital loader, motion fade-in of robot — no more pop-in
- **Orbital loader**: Premium "Initialising Anton" spinner with dual-ring counter-rotate
- **Meteors**: Reduced from 30 → 18 (lighter DOM)
- **App.css**: `@keyframes float-gentle`, upgraded skeleton shimmer, `::selection` teal color, thinner 4px scrollbar
- **index.css**: Thinner glass-compatible 4px scrollbar
- **hero-card-glow**: Deeper shadow + subtle teal ambient glow


- Designed 3-tier glass system: `.glass-1` (subtle, blur-12), `.glass-2` (standard, blur-20), `.glass-3` (elevated sidebar/header, blur-32 saturate-155%), `.glass-input` with teal focus ring
- Updated ALL pages: Layout (sidebar+header), Dashboard, Analytics, CampaignPipeline, CampaignWizard, Payments, Settings, Inbox, BrandAgent, InfluencerDiscovery, LandingPage
- WebGL shader (z-index:-10) now visibly bleeds through every glass panel for a premium floating-in-space aesthetic
- `.card-hover` updated: hover brightens background + teal border + lifts with box-shadow
- `.btn-secondary` is now glass; modal overlays use `backdrop-blur-sm`
- Zero opaque dark (#131936, #0D1235, #0E1530, #1A2247) backgrounds remaining


- Added `shader-background.jsx` at `/components/ui/` — WebGL canvas with purple/violet plasma lines (16 animated sine-wave streams + floating circles)
- Mounted persistently in `AppRouter` at `z-index: -10` so it is always rendering
- Transition mechanic: page content fades to `opacity: 0` (0.25s exit) → shader portal fully visible → new page fades in (0.28s enter)
- Zero extra state, zero extra libraries — pure WebGL, auto-resizes on window resize, cleans up `requestAnimationFrame` on unmount


- **Page transitions**: AnimatePresence mode='wait' with fade+slide between all routes (App.js)
- **Dashboard count-up**: Stat numbers animate from 0 → final value using useCountUp/requestAnimationFrame
- **Dashboard health bar**: Fills from 0% → value over 1.2s cubic-bezier on load
- **Kanban stage move**: Loader2 spinner on 'Move to X' button while API in progress; movingId state
- **Inbox**: AnimatePresence per message (fade+scale-in), Loader2 on send button, auto-scroll to bottom
- **Landing page**: whileInView stagger reveals for Integration Bar, Meet Anton, How Anton Works sections
- **Sidebar**: Framer Motion layoutId='nav-active' spring slide between nav items
- **Global**: scroll-behavior:smooth, card-hover cubic-bezier, btn-primary active:scale(0.96), will-change:transform hints
- Fixed: duplicate layoutId='nav-active' bug caught and removed by testing agent


- **Global background**: Replaced all `#0A0F2E` (navy) with pure `#000000` (black) across all 15 files — `index.css`, `Layout.jsx`, `App.js`, `App.css`, `AuthCallback.jsx`, `LandingPage.jsx`, `Dashboard.jsx`, `Analytics.jsx`, `Settings.jsx`, `CampaignPipeline.jsx`, `Inbox.jsx`, `InfluencerDiscovery.jsx`, `BrandAgent.jsx`, `CampaignWizard.jsx`, `Payments.jsx`
- Aurora shader, meteor shower, and spotlight effects now pop against true black for a sharper, more premium aesthetic


- **Hero rewrite**: "Meet Anton." headline in teal + "The AI agent fixing influencer marketing." gradient body; badge "Introducing Anton — AI Campaign Operator"; CTAs → "Start with Anton" / "See Anton in Action"
- **Anton HUD nameplate**: Floating label on robot panel — "ANTON / AI Campaign Operator · Online" with pulsing teal indicator dot
- **New "What Anton Does" section** (5-step workflow): Find Creators → Analyze Fit → Build Shortlist → Draft Outreach → Launch Faster; CTA "Let Anton build your shortlist"
- **"How Anton Works"** replaces "How it Works" with Anton-framed 3-step copy
- **Features bento** updated: "Everything Anton Manages", cards renamed "Anton's Discovery Engine / Anton Handles Outreach / Anton Tracks Your ROI"
- **CTA banner** updated: "Ready to run campaigns with Anton?" / "Start with Anton"
- **Nav + pricing buttons** all updated to "Start with Anton"

### ✅ Session 4 (Animated Shader Background — 2026-04)
- **Three.js aurora shader background**: Replaced flat `#0A0F2E` background on LandingPage with a WebGL animated aurora shader (`/components/ui/animated-shader-background.jsx`) — `fixed inset-0 -z-10`, no layout or content changes
- Installed `three@0.184.0`

### ✅ Session 3 (Brand Agent Parser + Email Fix — 2026-04)
- **Parser rewrite (Pass 1)**: `parseInfluencers()` in `BrandAgent.jsx` now correctly handles actual Bedrock response format (`**1. Name (@handle)**` + `**Email Contact:**`)
- **Parser Pass 2**: Extracts all remaining plain email addresses (raw email lists from Bedrock) that weren't in structured profiles — all 10 emails now render as influencer cards
- **Email routing confirmed correct**: `/api/agent/send-outreach` sends to `body.to_email` (target influencer) not the SMTP sender
- Testing: 100% pass rate (iteration_3.json) — all 7 features verified including Bedrock chat, card rendering, bulk actions, OutreachModal, email sending

### ✅ Session 2 (UI/UX Overhaul — 2026-04)
- **Global Font Update**: Georgia → all H1–H6 headings; Times New Roman → body/small text
- **Framer Motion Stagger Animations**: All dashboard pages (Dashboard, Discovery, Pipeline, Analytics, Inbox, Settings, Payments, CampaignWizard) now use `motion.div` with `staggerChildren` variants for cascading entrance effects
- **Dark Theme Consistency**: All pages use pure black (#000000) background, #131936 cards, #00D4C8 teal accents
- Testing: 100% pass rate (iteration_2.json)

### ✅ Session 3 (Performance & Glitch Fixes — 2026-04)
- **Root Cause Fixed**: Two competing WebGL contexts (shader + Spline) caused GPU stalls ("ReadPixels, High" severity). `shader-background.jsx` now has an `active` prop — when `false` the RAF loop is paused, freeing GPU for Spline. `App.js` passes `active={!isLanding}`.
- **Removed persistent `will-change: transform`** from `.btn-primary`, `.btn-glass-teal`, `.btn-secondary` CSS classes to reduce GPU compositing layer overhead.
- **Removed `layoutId="nav-active"`** from `Layout.jsx` — replaced with a plain `div`. Eliminated potential cross-route layout animation glitches.
- **Reduced meteor count** from 18 → 12 on landing page to lower CSS animation load.
- **Fixed `setTimeout` memory leak** in `Dashboard.jsx` — added `clearTimeout(timer)` cleanup in useEffect return.
- Testing: 100% pass rate (iteration_8.json) — all landing page elements verified, GPU conflict resolved.

### ✅ Session 4 (BrandAgent Influencer Cards Fix — 2026-04)
- **Root Cause Found**: `parseInfluencers()` had `if (!email) continue` — Bedrock agent responses often return real influencer profiles WITHOUT email addresses. This caused 0 influencer cards to appear even when the agent text said "I found 5 influencers," leaving users confused.
- **Fix**: Removed hard email requirement from parser. Cards now show for ALL parsed handles. Cards without email show a disabled "No email" badge instead of hiding entirely. LinkTree/YouTube fallback URLs are extracted and shown as "View profile" links.
- **BulkBar**: Updated to only count/send to influencers WITH emails; never crashes on null email.
- **InfluencerDiscovery**: `runAIScoring` now shows user-facing `alert()` on 401 (session expired) and 404 (campaign not found) instead of silently swallowing errors.
- **BrandAgent error message**: Improved to "I ran into an issue fetching that data. Please try rephrasing..." instead of raw error text.

### ✅ Session 5 (Stripe Paywall — 2026-04)
- **Full Stripe subscription paywall** implemented with live keys
- **3 pricing tiers**: Starter ($299/mo), Growth ($599/mo), Scale ($1299/mo)
- **New backend endpoints**: `GET /api/payments/plans`, `POST /api/payments/subscribe`, `GET /api/payments/subscribe/status/{id}`, `GET /api/user/subscription`
- **New page**: `SubscriptionPage.jsx` — shows plans, active subscription badge, payment result banner, "Go to Dashboard" after payment
- **Landing page**: Pricing buttons now call `handlePlanCTA(planId)` → Stripe checkout (or auth first if not logged in)
- **Layout sidebar**: "Subscription" nav item added with Crown icon
- **Webhook updated**: Activates subscription in `db.subscriptions` on `checkout.session.completed`
- Live Stripe keys configured in `.env` (backend + frontend)

---

## Mocked / Simulated Integrations
- **MOCKED**: Apify, Jasper.ai, lemlist, HeyGen, Gumloop, Attio, Tidio, Fireflies.ai, Texts.com, Northbeam, OpusClip
- **FUNCTIONAL**: Core DB, UI routes, Google Auth, Stripe Test Mode, Claude Sonnet 4.5 (Emergent Key — AI scoring)

---

## P0 / P1 / P2 Backlog

### P0 (Must have — blocking)
- None (all resolved)

### P1 (High priority — upcoming)
- Verify Claude Sonnet 4.5 AI scoring strictly uses Emergent Universal Key (not just simulated delays)

### P2 (Nice to have — future)
- Deeper simulated integration UI states (Jasper edit view, lemlist sequence preview)
- "Sent Outreach" audit log page — tracks every email sent (influencer name, brand, date, status)
- White-label reporting export (PDF)
- Real-time notification system
- Fix message API multi-tenant security: `GET /api/messages` should filter by `user_id`
