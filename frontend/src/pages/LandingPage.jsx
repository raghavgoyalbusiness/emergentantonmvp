import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ArrowRight, Zap, Search, BarChart3, CreditCard, CheckCircle, Star, Users, FileText, Rocket, ScanLine } from "lucide-react";
import { SplineScene } from "@/components/ui/splite";
import { Spotlight } from "@/components/ui/spotlight";
import { Card } from "@/components/ui/card";
import ShaderBackground from "@/components/ui/animated-shader-background";
import Meteors from "@/components/ui/meteors";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH

const integrations = [
  "Apify", "Gumloop", "Jasper.ai", "lemlist", "HeyGen",
  "OpusClip", "Northbeam", "Attio", "Tidio", "Fireflies", "Texts.com", "Stripe"
];

const antonSteps = [
  {
    icon: Search,
    num: "01",
    title: "Find Creators",
    desc: "Anton scans millions of profiles to surface the right creators for your brand and brief — in seconds.",
  },
  {
    icon: ScanLine,
    num: "02",
    title: "Analyze Fit",
    desc: "AI scoring evaluates engagement quality, audience alignment, and niche relevance before you see a single name.",
  },
  {
    icon: Users,
    num: "03",
    title: "Build Shortlist",
    desc: "A ranked, campaign-ready creator list tailored to your exact criteria. No spreadsheets. No guessing.",
  },
  {
    icon: FileText,
    num: "04",
    title: "Draft Outreach",
    desc: "Personalized briefs and emails written by Anton, deployed automatically with smart follow-up sequences.",
  },
  {
    icon: Rocket,
    num: "05",
    title: "Launch Faster",
    desc: "From brief to live campaign in minutes, not weeks. Anton manages the operational layer end-to-end.",
  },
];

const features = [
  { icon: Search, title: "Anton's Discovery Engine", desc: "Anton runs live creator searches using AI scoring to surface the exact micro and mid-tier creators your brand needs — ranked, vetted, and ready to brief." },
  { icon: Zap, title: "Anton Handles Outreach", desc: "Anton writes personalized campaign briefs, fires off email sequences, and follows up automatically — so your team never has to chase a creator again." },
  { icon: BarChart3, title: "Anton Tracks Your ROI", desc: "Real-time attribution dashboard built by Anton showing reach, conversions, and ROAS per creator and per campaign — always on, always accurate." },
  { icon: CreditCard, title: "Escrow Payments", desc: "Funds held securely until content is approved. Automatic release with full audit trail for both parties." },
];

const pricing = [
  { name: "Starter", price: 299, desc: "Perfect for small brands", features: ["Up to 3 active campaigns", "20 creator searches/mo", "Basic analytics", "Email outreach"], highlight: false },
  { name: "Growth", price: 599, desc: "Most popular", features: ["Up to 10 active campaigns", "Unlimited creator searches", "Full analytics + ROAS", "AI outreach + briefs", "Stripe escrow payments"], highlight: true },
  { name: "Scale", price: 1299, desc: "For agencies & power users", features: ["Unlimited campaigns", "White-label reports", "Priority AI processing", "Dedicated account manager", "API access"], highlight: false },
];

const steps = [
  { num: "01", title: "Tell Anton your brief", desc: "You set the product, audience, budget, and platforms. Anton takes it from there in under 2 minutes." },
  { num: "02", title: "Anton builds your shortlist", desc: "AI scores and ranks the top creators matched to your exact campaign criteria — no manual filtering required." },
  { num: "03", title: "Launch with Anton", desc: "Approve outreach, sign briefs, track content, and pay — all managed by Anton in one place." },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCTA = () => {
    if (user) {
      navigate("/dashboard");
      return;
    }
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen text-white overflow-x-hidden relative z-[2]">
      <ShaderBackground />
      <Meteors number={30} />

      {/* ── Sticky Navbar ── */}
      <header className="sticky top-0 z-50 bg-[#0A0F2E]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#00D4C8] flex items-center justify-center">
              <Zap className="w-4 h-4 text-[#0A0F2E]" strokeWidth={2.5} />
            </div>
            <span className="font-heading font-bold text-white text-lg">Influencer Connect</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-white/60">
            <a href="#meet-anton" className="hover:text-white transition-colors">Anton</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </nav>
          <button
            onClick={handleCTA}
            data-testid="nav-cta-btn"
            className="btn-primary px-5 py-2 rounded-lg text-sm"
          >
            {user ? "Go to Dashboard" : "Start with Anton"}
          </button>
        </div>
      </header>

      {/* ── HERO — Spline 3D Split Layout ── */}
      <section className="px-4 sm:px-6 pt-8 pb-6">
        <div className="max-w-7xl mx-auto">
          <Card
            className="w-full min-h-[580px] bg-[#0A0F2E] relative overflow-hidden border-[#00D4C8]/10 hero-card-glow"
            data-testid="hero-spline-card"
          >
            <Spotlight
              className="-top-40 left-0 md:left-60 md:-top-20"
              fill="#00D4C8"
            />

            <div className="flex flex-col md:flex-row h-full min-h-[580px]">

              {/* ── Left: Text Content ── */}
              <div className="flex-1 p-8 md:p-12 lg:p-16 relative z-10 flex flex-col justify-center">

                {/* Badge */}
                <div className="inline-flex items-center gap-2 bg-[#00D4C8]/10 border border-[#00D4C8]/25 rounded-full px-4 py-1.5 text-[#00D4C8] text-xs font-semibold uppercase tracking-widest mb-7 w-fit animate-fade-in">
                  <Zap className="w-3 h-3" /> Introducing Anton — AI Campaign Operator
                </div>

                {/* Headline */}
                <h1 className="font-heading font-black text-4xl md:text-5xl lg:text-6xl leading-[1.05] tracking-tighter mb-5 animate-fade-up">
                  <span className="block text-[#00D4C8] text-2xl md:text-3xl font-bold tracking-tight mb-2 opacity-90">
                    Meet Anton.
                  </span>
                  <span className="bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
                    The AI agent<br />
                    fixing influencer<br />
                    marketing.
                  </span>
                </h1>

                {/* Subheadline */}
                <p className="text-neutral-400 text-base md:text-lg max-w-md mb-8 leading-relaxed animate-fade-up stagger-2">
                  Anton replaces manual creator research, spreadsheet chaos, and slow outreach
                  with one intelligent workflow — built for brands and agencies that move fast.
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-3 mb-8 animate-fade-up stagger-3">
                  <button
                    onClick={handleCTA}
                    data-testid="hero-cta-btn"
                    className="btn-primary px-7 py-3.5 rounded-xl text-base flex items-center gap-2 justify-center"
                  >
                    Start with Anton <ArrowRight className="w-5 h-5" />
                  </button>
                  <a
                    href="#meet-anton"
                    className="btn-secondary px-7 py-3.5 rounded-xl text-base text-center"
                  >
                    See Anton in Action
                  </a>
                </div>

                {/* Social proof chips */}
                <div className="flex flex-wrap gap-3 text-xs text-white/40 animate-fade-up stagger-4">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-[#00D4C8]" /> No credit card required
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-[#00D4C8]" /> Live in 5 minutes
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-[#00D4C8]" /> 500+ creators indexed
                  </span>
                </div>
              </div>

              {/* ── Right: Spline 3D Scene + Anton nameplate ── */}
              <div className="flex-1 relative min-h-[300px] md:min-h-0">
                {/* Fade mask on left edge */}
                <div className="absolute left-0 inset-y-0 w-16 bg-gradient-to-r from-[#0A0F2E] to-transparent z-10 pointer-events-none" />
                <SplineScene
                  scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                  className="w-full h-full"
                />
                {/* Anton nameplate — HUD-style label */}
                <div className="absolute bottom-6 left-8 z-20 flex items-center gap-3 bg-[#0A0F2E]/70 backdrop-blur-md border border-[#00D4C8]/20 rounded-xl px-4 py-2.5">
                  <div className="relative flex-shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#00D4C8]" />
                    <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-[#00D4C8] animate-ping opacity-40" />
                  </div>
                  <div>
                    <p className="text-white font-heading font-bold text-sm tracking-wide leading-none">ANTON</p>
                    <p className="text-[#00D4C8] text-[10px] uppercase tracking-widest mt-0.5 leading-none">AI Campaign Operator · Online</p>
                  </div>
                </div>
              </div>

            </div>
          </Card>
        </div>
      </section>

      {/* ── Integration Bar ── */}
      <section className="py-10 border-y border-white/5 bg-[#131936]/50">
        <div className="max-w-6xl mx-auto px-4">
          <p className="text-center text-white/30 text-xs uppercase tracking-widest mb-6">
            Anton integrates with the tools you already use
          </p>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
            {integrations.map((name) => (
              <span
                key={name}
                className="text-white/40 text-sm font-semibold hover:text-white/70 transition-colors cursor-default"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Meet Anton — Workflow Section ── */}
      <section id="meet-anton" className="py-28 px-4">
        <div className="max-w-6xl mx-auto">

          {/* Section Header */}
          <div className="mb-20">
            <p className="text-[#00D4C8] text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-3">
              <span className="w-8 h-px bg-[#00D4C8]" />
              The intelligence layer
            </p>
            <div className="flex flex-col md:flex-row md:items-end gap-6 justify-between">
              <h2 className="font-heading font-black text-5xl md:text-6xl text-white tracking-tighter leading-none">
                What Anton<br />
                <span className="text-[#00D4C8]">does for you.</span>
              </h2>
              <p className="text-white/50 text-lg max-w-sm font-serif leading-relaxed">
                Anton is the campaign operator working behind the scenes — from creator discovery to outreach to launch.
                You direct the strategy. Anton executes.
              </p>
            </div>
          </div>

          {/* Anton Workflow Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {antonSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={i}
                  className="group relative bg-[#0D1235] border border-white/5 hover:border-[#00D4C8]/30 rounded-2xl p-6 transition-all duration-300 hover:bg-[#131936]"
                >
                  {/* Connector line */}
                  {i < antonSteps.length - 1 && (
                    <div className="hidden lg:block absolute top-10 left-full w-4 h-px bg-gradient-to-r from-[#00D4C8]/30 to-transparent z-0 translate-x-[-4px]" />
                  )}
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-11 h-11 rounded-xl border border-[#00D4C8]/20 bg-[#00D4C8]/5 flex items-center justify-center group-hover:bg-[#00D4C8]/10 transition-colors">
                        <Icon className="w-5 h-5 text-[#00D4C8]" />
                      </div>
                      <span className="font-heading font-black text-3xl text-white/5 group-hover:text-white/8 transition-colors">{step.num}</span>
                    </div>
                    <h3 className="font-heading font-bold text-white text-base mb-2">{step.title}</h3>
                    <p className="text-white/45 text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA under Anton section */}
          <div className="mt-12 flex justify-center">
            <button
              onClick={handleCTA}
              data-testid="anton-cta-btn"
              className="btn-primary px-8 py-3.5 rounded-xl text-base inline-flex items-center gap-2"
            >
              Let Anton build your shortlist <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* ── How Anton Works ── */}
      <section id="how-it-works" className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#00D4C8] text-xs font-bold uppercase tracking-widest mb-3">How Anton Works</p>
            <h2 className="font-heading font-bold text-4xl md:text-5xl text-white">Three steps from brief to launch</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-[#00D4C8]/30 to-transparent z-0" />
                )}
                <div className="bg-[#131936] border border-white/5 rounded-xl p-6 relative z-10 card-hover">
                  <div className="text-[#00D4C8] font-heading font-black text-4xl mb-4 opacity-60">{step.num}</div>
                  <h3 className="font-heading font-bold text-xl text-white mb-2">{step.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features - Editorial Asymmetric Bento ── */}
      <section id="features" className="py-32 px-4 bg-[#0A0F2E] relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          {/* Editorial Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-24 gap-8 border-b border-white/10 pb-12">
            <div className="max-w-3xl">
              <p className="text-[#00D4C8] text-sm font-bold uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                <span className="w-12 h-px bg-[#00D4C8]"></span>
                Everything Anton Manages
              </p>
              <h2 className="font-heading font-black text-5xl md:text-6xl lg:text-7xl text-white tracking-tighter leading-none">
                Built for brands<br />that move fast.
              </h2>
            </div>
            <p className="text-white/50 text-lg max-w-sm font-serif leading-relaxed">
              Anton handles the operational layer so your team focuses on what matters — strategy, creative, and growth.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 auto-rows-[minmax(320px,auto)]">

            {/* 01: Anton's Discovery Engine - Hero Card */}
            <div
              data-testid="feature-discovery"
              className="md:col-span-8 group relative bg-[#131936] rounded-[2rem] p-10 md:p-14 overflow-hidden border border-white/5 hover:border-[#00D4C8]/30 transition-all duration-500"
            >
              <div className="absolute -top-10 -right-10 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-700 group-hover:scale-110 transform pointer-events-none">
                <Search className="w-80 h-80 text-[#00D4C8]" />
              </div>
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="flex items-start justify-between mb-20">
                  <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center bg-[#0A0F2E]/50 backdrop-blur-md">
                    <Search className="w-7 h-7 text-[#00D4C8]" />
                  </div>
                  <span className="font-heading text-7xl text-white/5 font-black tracking-tighter">01</span>
                </div>
                <div className="max-w-xl">
                  <h3 className="font-heading text-4xl text-white mb-5">Anton's Discovery Engine</h3>
                  <p className="text-white/60 text-xl leading-relaxed font-serif">
                    Anton runs live creator searches using AI scoring to surface the exact micro and mid-tier creators your brand needs — ranked, vetted, and ready to brief.
                  </p>
                </div>
              </div>
            </div>

            {/* 02: Anton Handles Outreach - Tall Card */}
            <div
              data-testid="feature-outreach"
              className="md:col-span-4 group relative bg-gradient-to-b from-[#131936] to-[#0A0F2E] rounded-[2rem] p-10 md:p-12 overflow-hidden border border-white/5 hover:border-[#00D4C8]/30 transition-all duration-500"
            >
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="flex items-start justify-between mb-20">
                  <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center bg-[#0A0F2E]/50 backdrop-blur-md">
                    <Zap className="w-7 h-7 text-[#00D4C8]" />
                  </div>
                  <span className="font-heading text-7xl text-white/5 font-black tracking-tighter">02</span>
                </div>
                <div>
                  <h3 className="font-heading text-3xl text-white mb-5">Anton Handles Outreach</h3>
                  <p className="text-white/60 text-lg leading-relaxed font-serif">
                    Anton writes personalized campaign briefs, fires off email sequences, and follows up automatically — so your team never has to chase a creator again.
                  </p>
                </div>
              </div>
            </div>

            {/* 03: Anton Tracks ROI */}
            <div
              data-testid="feature-analytics"
              className="md:col-span-5 group relative bg-[#131936] rounded-[2rem] p-10 md:p-12 overflow-hidden border border-white/5 hover:border-[#00D4C8]/30 transition-all duration-500"
            >
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="flex items-start justify-between mb-20">
                  <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center bg-[#0A0F2E]/50 backdrop-blur-md">
                    <BarChart3 className="w-7 h-7 text-[#00D4C8]" />
                  </div>
                  <span className="font-heading text-7xl text-white/5 font-black tracking-tighter">03</span>
                </div>
                <div>
                  <h3 className="font-heading text-3xl text-white mb-5">Anton Tracks Your ROI</h3>
                  <p className="text-white/60 text-lg leading-relaxed font-serif">
                    Real-time attribution built by Anton — showing reach, conversions, and ROAS per creator and per campaign. Always on, always accurate.
                  </p>
                </div>
              </div>
            </div>

            {/* 04: Escrow Payments - Wide Card */}
            <div
              data-testid="feature-escrow"
              className="md:col-span-7 group relative bg-[#131936] rounded-[2rem] p-10 md:p-12 overflow-hidden border border-white/5 hover:border-[#00D4C8]/30 transition-all duration-500"
            >
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#00D4C811_1px,transparent_1px),linear-gradient(to_bottom,#00D4C811_1px,transparent_1px)] bg-[size:32px_32px] opacity-20 group-hover:opacity-40 transition-opacity duration-700 pointer-events-none"></div>
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="flex items-start justify-between mb-20">
                  <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center bg-[#0A0F2E]/50 backdrop-blur-md">
                    <CreditCard className="w-7 h-7 text-[#00D4C8]" />
                  </div>
                  <span className="font-heading text-7xl text-white/5 font-black tracking-tighter">04</span>
                </div>
                <div className="max-w-xl">
                  <h3 className="font-heading text-3xl text-white mb-5">Escrow Payments</h3>
                  <p className="text-white/60 text-lg leading-relaxed font-serif">
                    Funds held securely until content is approved. Automatic release with full audit trail for both parties.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#00D4C8] text-xs font-bold uppercase tracking-widest mb-3">Transparent Pricing</p>
            <h2 className="font-heading font-bold text-4xl md:text-5xl text-white">Simple, predictable pricing</h2>
            <p className="text-white/50 mt-3 text-lg">No hidden fees. Cancel anytime.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {pricing.map(({ name, price, desc, features: f, highlight }) => (
              <div
                key={name}
                data-testid={`pricing-${name.toLowerCase()}`}
                className={`rounded-xl p-6 border relative ${
                  highlight ? "bg-[#00D4C8]/5 border-[#00D4C8]/30 teal-glow" : "bg-[#131936] border-white/5"
                }`}
              >
                {highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00D4C8] text-[#0A0F2E] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    Most Popular
                  </div>
                )}
                <h3 className="font-heading font-bold text-xl text-white mb-1">{name}</h3>
                <p className="text-white/40 text-xs mb-4">{desc}</p>
                <div className="mb-6">
                  <span className="font-heading font-black text-4xl text-white">${price}</span>
                  <span className="text-white/40 text-sm">/mo</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {f.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-white/70">
                      <CheckCircle className="w-3.5 h-3.5 text-[#00D4C8] flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={handleCTA}
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${highlight ? "btn-primary" : "btn-secondary"}`}
                >
                  Start with Anton
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="bg-[#0A0F2E] border-[#00D4C8]/10 relative overflow-hidden hero-card-glow">
            <Spotlight className="-top-40 left-0 md:left-40 md:-top-20" fill="#00D4C8" />
            <div className="relative z-10 text-center p-12">
              <div className="flex justify-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-[#00D4C8] text-[#00D4C8]" />)}
              </div>
              <h2 className="font-heading font-black text-4xl md:text-5xl mb-4 bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
                Ready to run campaigns<br />with Anton?
              </h2>
              <p className="text-neutral-400 mb-8 text-lg">
                Join brands and agencies running smarter influencer campaigns. No manual work. Just results.
              </p>
              <button
                onClick={handleCTA}
                data-testid="bottom-cta-btn"
                className="btn-primary px-10 py-4 rounded-xl text-lg inline-flex items-center gap-2"
              >
                Start with Anton <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </Card>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/30">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#00D4C8] flex items-center justify-center">
              <Zap className="w-3 h-3 text-[#0A0F2E]" />
            </div>
            <span className="font-heading font-bold text-white/50">Influencer Connect</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white/60 transition-colors">Privacy</a>
            <a href="#" className="hover:text-white/60 transition-colors">Terms</a>
            <a href="#" className="hover:text-white/60 transition-colors">Contact</a>
          </div>
          <span>&copy; 2025 Influencer Connect. All rights reserved.</span>
        </div>
      </footer>

    </div>
  );
}
