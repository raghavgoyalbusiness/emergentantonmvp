# Influencer Connect — PRD

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

### ✅ Session 3 (Brand Agent Parser + Email Fix — 2026-04)
- **Parser rewrite (Pass 1)**: `parseInfluencers()` in `BrandAgent.jsx` now correctly handles actual Bedrock response format (`**1. Name (@handle)**` + `**Email Contact:**`)
- **Parser Pass 2**: Extracts all remaining plain email addresses (raw email lists from Bedrock) that weren't in structured profiles — all 10 emails now render as influencer cards
- **Email routing confirmed correct**: `/api/agent/send-outreach` sends to `body.to_email` (target influencer) not the SMTP sender
- Testing: 100% pass rate (iteration_3.json) — all 7 features verified including Bedrock chat, card rendering, bulk actions, OutreachModal, email sending

### ✅ Session 2 (UI/UX Overhaul — 2026-04)
- **Global Font Update**: Georgia → all H1–H6 headings; Times New Roman → body/small text
- **Framer Motion Stagger Animations**: All dashboard pages (Dashboard, Discovery, Pipeline, Analytics, Inbox, Settings, Payments, CampaignWizard) now use `motion.div` with `staggerChildren` variants for cascading entrance effects
- **Dark Theme Consistency**: Verified all pages use #0A0F2E background, #131936 cards, #00D4C8 teal accents — 100% consistent with landing page
- Testing: 100% pass rate (iteration_2.json)

---

## Mocked / Simulated Integrations
- **MOCKED**: Apify, Jasper.ai, lemlist, HeyGen, Gumloop, Attio, Tidio, Fireflies.ai, Texts.com, Northbeam, OpusClip
- **FUNCTIONAL**: Core DB, UI routes, Google Auth, Stripe Test Mode, Claude Sonnet 4.5 (Emergent Key — AI scoring)

---

## P0 / P1 / P2 Backlog

### P0 (Must have — blocking)
- None (all resolved)

### P1 (High priority — upcoming)
- Verify Claude Sonnet 4.5 AI scoring is correctly using Emergent Universal Key (not just simulated delays)
- Expand Framer Motion to include exit/page-transition animations between routes

### P2 (Nice to have — future)
- Deeper simulated integration UI states (Jasper edit view, lemlist sequence preview)
- White-label reporting export (PDF)
- Real-time notification system
- Campaign approval workflow with e-signature
