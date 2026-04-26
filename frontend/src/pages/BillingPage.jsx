import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, CheckCircle2, AlertCircle, Loader2, Shield, Crown,
  Zap, TrendingUp, Building2, CheckCircle, ArrowRight, Star,
  ChevronDown, ChevronUp, RefreshCw,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PLAN_ICONS = { starter: Zap, growth: TrendingUp, scale: Building2 };

const statusColors = {
  pending: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  paid: "text-green-400 bg-green-500/10 border-green-500/20",
  expired: "text-red-400 bg-red-500/10 border-red-500/20",
  complete: "text-green-400 bg-green-500/10 border-green-500/20",
  active: "text-green-400 bg-green-500/10 border-green-500/20",
};

const wrap = { hidden: {}, visible: { transition: { staggerChildren: 0.09 } } };
const item = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.42, ease: "easeOut" } } };

/* ── Payment Modal ── */
function PaymentModal({ campaign, influencers, onClose }) {
  const [selectedInf, setSelectedInf] = useState("");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const calcFees = (inf) => {
    if (!inf) return null;
    const fee = inf.fee_per_post || 500;
    const platform = Math.round(fee * 0.15 * 100) / 100;
    return { fee, platform, total: fee + platform };
  };

  const handleSelect = (id) => {
    setSelectedInf(id);
    const inf = influencers.find(i => i.influencer_id === id);
    setPreview(calcFees(inf));
  };

  const handlePay = async () => {
    if (!selectedInf) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/payments/create-checkout`, {
        campaign_id: campaign.campaign_id,
        influencer_id: selectedInf,
        origin_url: window.location.origin,
      }, { withCredentials: true });
      window.open(res.data.url, "_blank", "noopener,noreferrer");
    } catch {
      alert("Payment setup failed. Please try again.");
      setLoading(false);
    }
  };

  const selInf = influencers.find(i => i.influencer_id === selectedInf);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-3 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()} data-testid="payment-modal">
        <h3 className="font-heading font-bold text-xl text-white mb-1">Fund Campaign</h3>
        <p className="text-white/40 text-sm mb-5">{campaign.name}</p>
        <div className="mb-4">
          <label className="text-white/60 text-xs mb-2 block">Select Creator</label>
          <select
            value={selectedInf}
            onChange={e => handleSelect(e.target.value)}
            className="w-full glass-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#00D4C8]"
            data-testid="select-creator-payment"
          >
            <option value="">Choose a creator...</option>
            {influencers.map(inf => (
              <option key={inf.influencer_id} value={inf.influencer_id}>
                {inf.name} (@{inf.handle}) — ${inf.fee_per_post?.toLocaleString()}/post
              </option>
            ))}
          </select>
        </div>
        {preview && selInf && (
          <div className="glass-1 rounded-xl p-4 mb-5 animate-fade-in">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/50">Creator fee ({selInf.name})</span>
              <span className="text-white font-semibold">${preview.fee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm mb-3">
              <span className="text-white/50 flex items-center gap-1.5"><Shield className="w-3 h-3" /> Platform fee (15%)</span>
              <span className="text-white">${preview.platform.toLocaleString()}</span>
            </div>
            <div className="border-t border-white/5 pt-2 flex justify-between">
              <span className="text-white font-semibold">Total</span>
              <span className="font-heading font-bold text-[#00D4C8] text-lg">${preview.total.toLocaleString()}</span>
            </div>
            <p className="text-white/30 text-xs mt-3 flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-[#00D4C8]" />
              Funds held in escrow. Released when content is approved.
            </p>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary px-4 py-3 rounded-xl text-sm">Cancel</button>
          <button
            onClick={handlePay}
            disabled={!selectedInf || loading}
            data-testid="confirm-payment-btn"
            className="flex-1 btn-primary px-4 py-3 rounded-xl text-sm flex items-center gap-2 justify-center disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            {loading ? "Redirecting..." : "Pay with Stripe"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function BillingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const plansRef = useRef(null);

  // Subscription state
  const [plans, setPlans] = useState([]);
  const [currentSub, setCurrentSub] = useState(null);
  const [paying, setPaying] = useState(null);
  const [subPolling, setSubPolling] = useState(false);
  const [subResult, setSubResult] = useState(null);
  const [showPlans, setShowPlans] = useState(false);

  // Payments state
  const [campaigns, setCampaigns] = useState([]);
  const [influencers, setInfluencers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [payPolling, setPayPolling] = useState(false);

  const [loading, setLoading] = useState(true);

  const handleSubscribe = async (planId) => {
    setPaying(planId);
    try {
      const res = await axios.post(`${API}/payments/subscribe`, {
        plan_id: planId,
        origin_url: window.location.origin,
      }, { withCredentials: true });
      window.open(res.data.url, "_blank", "noopener,noreferrer");
    } catch {
      alert("Failed to start checkout. Please try again.");
    } finally {
      setPaying(null);
    }
  };

  const pollSubStatus = async (sessionId, attempt = 0) => {
    if (attempt >= 8) { setSubPolling(false); return; }
    try {
      const res = await axios.get(`${API}/payments/subscribe/status/${sessionId}`, { withCredentials: true });
      setSubResult(res.data);
      if (res.data.payment_status === "paid" || res.data.payment_status === "active") {
        setSubPolling(false);
        const subRes = await axios.get(`${API}/user/subscription`, { withCredentials: true });
        setCurrentSub(subRes.data);
      } else if (res.data.payment_status === "expired") {
        setSubPolling(false);
      } else {
        setTimeout(() => pollSubStatus(sessionId, attempt + 1), 2000);
      }
    } catch { setSubPolling(false); }
  };

  const pollPayStatus = async (sessionId, attempt = 0) => {
    if (attempt >= 5) { setPayPolling(false); return; }
    try {
      const res = await axios.get(`${API}/payments/status/${sessionId}`, { withCredentials: true });
      setPaymentStatus(res.data);
      if (res.data.payment_status === "paid" || res.data.status === "expired") {
        setPayPolling(false);
        if (res.data.payment_status === "paid") {
          const txnRes = await axios.get(`${API}/payments`, { withCredentials: true });
          setTransactions(txnRes.data);
        }
      } else {
        setTimeout(() => pollPayStatus(sessionId, attempt + 1), 2000);
      }
    } catch { setPayPolling(false); }
  };

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/payments/plans`),
      axios.get(`${API}/user/subscription`, { withCredentials: true }),
      axios.get(`${API}/campaigns`, { withCredentials: true }),
      axios.get(`${API}/influencers`, { withCredentials: true }),
      axios.get(`${API}/payments`, { withCredentials: true }),
    ]).then(([plansRes, subRes, campRes, infRes, txnRes]) => {
      setPlans(plansRes.data);
      setCurrentSub(subRes.data);
      setCampaigns(campRes.data);
      setInfluencers(infRes.data);
      setTransactions(txnRes.data);

      // Auto-start checkout if ?plan=xxx from landing CTA
      const preselectedPlan = searchParams.get("plan");
      const sessionId = searchParams.get("session_id");
      if (preselectedPlan && !sessionId && !subRes.data?.has_subscription) {
        handleSubscribe(preselectedPlan);
      }
    }).catch(() => {}).finally(() => setLoading(false));

    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      setSubPolling(true);
      pollSubStatus(sessionId);
    }

    const paySessionId = searchParams.get("pay_session_id");
    if (paySessionId) {
      setPayPolling(true);
      pollPayStatus(paySessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdatePlan = () => {
    setShowPlans(v => !v);
    if (!showPlans) {
      setTimeout(() => plansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  };

  const activeCampaigns = campaigns.filter(c => !["Reported", "Paid"].includes(c.stage));
  const getCampaignInfluencers = (camp) => {
    if (!camp?.selected_influencers?.length) return [];
    return influencers.filter(inf => camp.selected_influencers.includes(inf.influencer_id));
  };

  if (loading) return (
    <div className="max-w-5xl mx-auto space-y-4 pt-2">
      <div className="skeleton h-36 rounded-2xl" />
      <div className="skeleton h-64 rounded-2xl" />
      <div className="skeleton h-48 rounded-2xl" />
    </div>
  );

  const activePlanData = plans.find(p => p.id === currentSub?.plan);

  return (
    <motion.div className="max-w-5xl mx-auto" initial="hidden" animate="visible" variants={wrap}>

      {/* ── Header ── */}
      <motion.div variants={item} className="mb-7">
        <h1 className="font-heading font-bold text-2xl md:text-3xl text-white">Billing & Subscription</h1>
        <p className="text-white/40 text-sm mt-1">Manage your plan, campaign payments, and transaction history</p>
      </motion.div>

      {/* ── Subscription result banner ── */}
      <AnimatePresence>
        {subPolling && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-5">
            <Loader2 className="w-4 h-4 text-yellow-400 animate-spin flex-shrink-0" />
            <p className="text-yellow-400 text-sm">Verifying your payment…</p>
          </motion.div>
        )}
        {subResult && !subPolling && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`flex items-center gap-3 rounded-xl p-4 mb-5 border ${
              subResult.payment_status === "paid" || subResult.payment_status === "active"
                ? "bg-green-500/10 border-green-500/20"
                : "bg-red-500/10 border-red-500/20"
            }`}
            data-testid="payment-result-banner"
          >
            {subResult.payment_status === "paid" || subResult.payment_status === "active"
              ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
              : <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
            <div>
              <p className={`text-sm font-semibold ${subResult.payment_status === "paid" || subResult.payment_status === "active" ? "text-green-400" : "text-red-400"}`}>
                {subResult.payment_status === "paid" || subResult.payment_status === "active"
                  ? `Welcome to ${subResult.plan_name}! Your plan is now active.`
                  : "Payment was not completed."}
              </p>
              {(subResult.payment_status === "paid" || subResult.payment_status === "active") && (
                <button onClick={() => navigate("/dashboard")}
                  className="text-green-400/70 text-xs mt-0.5 hover:text-green-400 transition-colors flex items-center gap-1">
                  Go to Dashboard <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Campaign payment status banner ── */}
      {payPolling && (
        <motion.div variants={item} className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-4 flex items-center gap-3">
          <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
          <p className="text-yellow-400 text-sm">Checking payment status...</p>
        </motion.div>
      )}
      {paymentStatus && !payPolling && (
        <motion.div variants={item}
          className={`rounded-xl p-4 mb-4 border flex items-center gap-3 ${paymentStatus.payment_status === "paid" ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}
          data-testid="payment-status-alert">
          {paymentStatus.payment_status === "paid"
            ? <CheckCircle2 className="w-4 h-4 text-green-400" />
            : <AlertCircle className="w-4 h-4 text-red-400" />}
          <p className={`text-sm font-semibold ${paymentStatus.payment_status === "paid" ? "text-green-400" : "text-red-400"}`}>
            {paymentStatus.payment_status === "paid" ? "Payment successful! Funds held in escrow." : `Payment ${paymentStatus.status}.`}
          </p>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════
          SECTION 1 — CURRENT SUBSCRIPTION
      ══════════════════════════════════════════════════ */}
      <motion.div variants={item} className="mb-6">
        <div className="glass-2 rounded-2xl p-6 border border-white/8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#00D4C8]/15 border border-[#00D4C8]/30 flex items-center justify-center flex-shrink-0">
                <Crown className="w-6 h-6 text-[#00D4C8]" />
              </div>
              <div>
                <p className="text-[#00D4C8] text-xs font-bold uppercase tracking-widest mb-1">Current Subscription</p>
                {currentSub?.has_subscription ? (
                  <>
                    <h2 className="font-heading font-bold text-white text-xl md:text-2xl">
                      {currentSub.plan_name || activePlanData?.name || "Active Plan"}
                    </h2>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="flex items-center gap-1.5 text-xs text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        Active
                      </span>
                      {activePlanData && (
                        <span className="text-white/40 text-xs">${activePlanData.price.toLocaleString()}/month</span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="font-heading font-bold text-white text-xl">No active plan</h2>
                    <p className="text-white/40 text-xs mt-1">Choose a plan below to get started</p>
                  </>
                )}
              </div>
            </div>

            {/* Update / Choose Plan button */}
            <button
              data-testid="update-plan-btn"
              onClick={handleUpdatePlan}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#00D4C8]/30 text-[#00D4C8] text-sm font-semibold hover:bg-[#00D4C8]/10 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {currentSub?.has_subscription ? "Update Plan" : "Choose Plan"}
              {showPlans ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Current plan features */}
          {currentSub?.has_subscription && activePlanData?.features?.length > 0 && (
            <div className="mt-5 pt-5 border-t border-white/5">
              <p className="text-white/30 text-xs uppercase tracking-widest mb-3">What's included</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {activePlanData.features.map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm text-white/60">
                    <CheckCircle className="w-3.5 h-3.5 text-[#00D4C8] flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════
          SECTION 2 — PLANS (collapsible / expandable)
      ══════════════════════════════════════════════════ */}
      <AnimatePresence>
        {(showPlans || !currentSub?.has_subscription) && (
          <motion.div
            ref={plansRef}
            key="plans-grid"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="overflow-hidden mb-6"
          >
            <div className="pt-1">
              <p className="text-white/30 text-xs uppercase tracking-widest mb-4">
                {currentSub?.has_subscription ? "Switch to a different plan" : "Choose your plan"}
              </p>
              <div className="grid md:grid-cols-3 gap-5">
                {plans.map((plan) => {
                  const Icon = PLAN_ICONS[plan.id] || Zap;
                  const isActive = currentSub?.plan === plan.id;
                  const isHighlight = plan.id === "growth";
                  const isBusy = paying === plan.id;

                  return (
                    <motion.div
                      key={plan.id}
                      data-testid={`plan-card-${plan.id}`}
                      whileHover={{ y: -3 }}
                      className={`relative rounded-2xl p-6 border flex flex-col transition-all duration-300 ${
                        isActive
                          ? "border-green-500/40 bg-green-500/5"
                          : isHighlight
                          ? "bg-[#00D4C8]/5 border-[#00D4C8]/30 teal-glow"
                          : "glass-2 hover:border-white/20"
                      }`}
                    >
                      {isHighlight && !isActive && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00D4C8] text-black text-xs font-bold px-3 py-0.5 rounded-full uppercase tracking-wide">
                          Most Popular
                        </div>
                      )}
                      {isActive && (
                        <div className="absolute -top-3 right-4 bg-green-500 text-white text-xs font-bold px-3 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Current Plan
                        </div>
                      )}

                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isHighlight && !isActive ? "bg-[#00D4C8]/20 border border-[#00D4C8]/40" : "glass-1"}`}>
                          <Icon className={`w-4 h-4 ${isHighlight && !isActive ? "text-[#00D4C8]" : "text-white/60"}`} />
                        </div>
                        <div>
                          <h3 className="font-heading font-bold text-white">{plan.name}</h3>
                          <p className="text-white/40 text-xs">{plan.description}</p>
                        </div>
                      </div>

                      <div className="mb-5">
                        <span className="font-heading font-black text-4xl text-white">${plan.price.toLocaleString()}</span>
                        <span className="text-white/40 text-sm">/mo</span>
                      </div>

                      <ul className="space-y-2 mb-6 flex-1">
                        {plan.features.map(f => (
                          <li key={f} className="flex items-start gap-2 text-sm text-white/60">
                            <CheckCircle className="w-3.5 h-3.5 text-[#00D4C8] flex-shrink-0 mt-0.5" />
                            {f}
                          </li>
                        ))}
                      </ul>

                      <button
                        data-testid={`subscribe-btn-${plan.id}`}
                        onClick={() => handleSubscribe(plan.id)}
                        disabled={isBusy || isActive || !!paying}
                        className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                          isActive
                            ? "bg-green-500/15 border border-green-500/30 text-green-400 cursor-default"
                            : isHighlight
                            ? "btn-primary"
                            : "btn-secondary hover:border-white/25"
                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                      >
                        {isBusy ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting…</>
                        ) : isActive ? (
                          <><CheckCircle2 className="w-4 h-4" /> Current Plan</>
                        ) : currentSub?.has_subscription ? (
                          <>Switch to {plan.name} <ArrowRight className="w-4 h-4" /></>
                        ) : (
                          <>Get Started <ArrowRight className="w-4 h-4" /></>
                        )}
                      </button>
                    </motion.div>
                  );
                })}
              </div>

              {/* Trust row */}
              <div className="flex flex-wrap items-center justify-center gap-5 mt-5 text-white/25 text-xs">
                {[
                  { Icon: Shield, text: "Secure Stripe Checkout" },
                  { Icon: CheckCircle, text: "Cancel anytime" },
                  { Icon: Star, text: "No setup fees" },
                ].map(({ Icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-[#00D4C8]/40" />
                    {text}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════
          SECTION 3 — CAMPAIGN FUNDING
      ══════════════════════════════════════════════════ */}
      <motion.div variants={item} className="glass-2 rounded-2xl p-5 mb-5">
        <h3 className="font-heading font-semibold text-white mb-1">Campaigns Ready to Fund</h3>
        <p className="text-white/30 text-xs mb-4">Escrow-based creator payments — secure and transparent</p>
        {activeCampaigns.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-4">No active campaigns found.</p>
        ) : (
          <div className="space-y-3">
            {activeCampaigns.map(c => {
              const infs = getCampaignInfluencers(c);
              return (
                <div key={c.campaign_id}
                  className="flex items-center justify-between p-4 glass-1 rounded-xl hover:border-[#00D4C8]/20 transition-colors"
                  data-testid={`payment-campaign-${c.campaign_id}`}
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white text-sm">{c.name}</h4>
                    <p className="text-white/40 text-xs">{c.brand_name} &bull; {infs.length} creator{infs.length !== 1 ? "s" : ""} selected</p>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <span className="text-white/40 text-xs hidden sm:block">
                      ${(c.budget_min / 1000).toFixed(0)}K–${(c.budget_max / 1000).toFixed(0)}K budget
                    </span>
                    <button
                      onClick={() => setSelectedCampaign(c)}
                      disabled={infs.length === 0}
                      data-testid={`fund-campaign-${c.campaign_id}`}
                      className="btn-primary px-4 py-2 rounded-lg text-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      {infs.length === 0 ? "No creators" : "Fund"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ══════════════════════════════════════════════════
          SECTION 4 — TRANSACTION HISTORY
      ══════════════════════════════════════════════════ */}
      <motion.div variants={item} className="glass-2 rounded-2xl p-5">
        <h3 className="font-heading font-semibold text-white mb-4">Transaction History</h3>
        {transactions.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-6">No transactions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" data-testid="transactions-table">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-white/30 py-2 pr-4 font-medium">Campaign</th>
                  <th className="text-left text-white/30 py-2 px-3 font-medium">Creator</th>
                  <th className="text-right text-white/30 py-2 px-3 font-medium">Amount</th>
                  <th className="text-right text-white/30 py-2 px-3 font-medium">Platform Fee</th>
                  <th className="text-right text-white/30 py-2 px-3 font-medium">Total</th>
                  <th className="text-right text-white/30 py-2 pl-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(txn => (
                  <tr key={txn.transaction_id} className="border-b border-white/3">
                    <td className="text-white py-2.5 pr-4 font-medium">{txn.campaign_name || "—"}</td>
                    <td className="text-white/60 py-2.5 px-3">{txn.influencer_name || "—"}</td>
                    <td className="text-white py-2.5 px-3 text-right">${txn.amount?.toLocaleString()}</td>
                    <td className="text-white/50 py-2.5 px-3 text-right">${txn.platform_fee?.toFixed(2)}</td>
                    <td className="text-white font-semibold py-2.5 px-3 text-right">${txn.total_amount?.toLocaleString()}</td>
                    <td className="py-2.5 pl-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full border text-xs ${statusColors[txn.payment_status] || "text-white/30"}`}>
                        {txn.payment_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {selectedCampaign && (
        <PaymentModal
          campaign={selectedCampaign}
          influencers={getCampaignInfluencers(selectedCampaign)}
          onClose={() => setSelectedCampaign(null)}
        />
      )}
    </motion.div>
  );
}
