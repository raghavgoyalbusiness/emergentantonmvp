# Influencer Connect — PRD

## Original Problem Statement
Build a fully functional AI-powered influencer marketing platform called "Influencer Connect" that automatically matches brands with micro and mid-tier influencers, manages the entire campaign workflow from brief to payment, and delivers measurable ROI reporting — all through an intelligent, conversational AI agent interface.

## Architecture
- **Frontend**: React (with Tailwind CSS, Recharts, shadcn/ui)
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (influencer_connect)
- **AI**: Claude Sonnet 4.5 via Emergent Universal Key (emergentintegrations)
- **Payments**: Stripe via emergentintegrations
- **Auth**: Emergent-managed Google OAuth

## User Choices
- AI: Claude Sonnet 4.5 (Emergent Universal Key)
- External integrations: Option A (simulated/demo)
- Stripe: Yes (test key)
- Auth: Google OAuth
- Demo data: Yes (pre-seeded)

## What's Been Implemented (Phase 1 - Feb 2025)

### Backend (server.py)
- Google OAuth session exchange + cookie-based auth
- Dashboard stats endpoint
- Campaign CRUD + pipeline stage updates
- 20 pre-seeded influencer profiles (Instagram, TikTok, YouTube)
- AI influencer scoring (Claude Sonnet 4.5)
- AI outreach copy generation (email + DM)
- AI campaign brief generation
- Stripe escrow payment flow (create checkout, poll status, webhook)
- Analytics (simulated with random seed per campaign)
- Unified inbox/messages
- Auto-seed on startup

### Frontend Pages
1. **Landing Page** - Hero, how it works, features, integration bar, pricing (3 tiers), footer
2. **Dashboard** - Stats cards, health score bar, active campaigns list, pending actions, recent messages
3. **Influencer Discovery** - 20 creator cards with AI match scoring, campaign selector, search/filter
4. **Campaign Pipeline** - 7-stage Kanban board (Brief→Outreach→Accepted→Live→Content Review→Paid→Reported)
5. **Campaign Wizard** - 4-step AI-powered creation form
6. **Analytics** - Overview metrics, 5-month trend chart, per-campaign deep dive with creator breakdown
7. **Payments** - Escrow payment flow with fee breakdown, Stripe checkout, transaction history
8. **Inbox** - Unified messaging threads with reply
9. **Settings** - Profile, integrations status grid (3 active + 10 demo), plan info

### Design System
- Deep navy (#0A0F2E) + Electric teal (#00D4C8) + Clean white (#FFFFFF)
- Outfit font (headings) + Inter font (body)
- Card hover animations, AI loading dots, skeleton loaders

## Integrations Status
| Integration | Status |
|---|---|
| Claude Sonnet 4.5 | ACTIVE (real AI calls) |
| Stripe | ACTIVE (test key) |
| Google OAuth | ACTIVE |
| Apify, Jasper, lemlist, HeyGen, Gumloop, Attio, Tidio, Fireflies, Texts.com, Northbeam, OpusClip | DEMO (shown as connected, simulated data) |

## Prioritized Backlog

### P0 (Critical - must have before production)
- Real-time outreach sending (lemlist API integration)
- Live Apify scraping for fresh creator discovery
- Real analytics from Northbeam/pixel tracking

### P1 (High priority next features)
- Campaign brief PDF export
- Outreach sequence editor (multi-step follow-ups)
- Creator profile pages with full history
- Mobile app view improvements
- Email notifications (SendGrid)

### P2 (Nice to have)
- HeyGen AI video brief generation
- OpusClip content repurposing
- Gumloop workflow automation
- Attio CRM integration
- Fireflies.ai call transcription
- White-label reporting

## Next Tasks
1. Connect real Apify API key for live creator scraping
2. Integrate lemlist for actual outreach sending
3. Add Northbeam pixel for ROAS tracking
4. Build outreach approval workflow UI
5. Add email notifications via Resend/SendGrid
