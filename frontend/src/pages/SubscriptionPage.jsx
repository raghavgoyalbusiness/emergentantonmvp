import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, Zap, TrendingUp, Building2, Loader2, CheckCircle2,
  AlertCircle, ArrowRight, Shield, Star,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PLAN_ICONS = { starter: Zap, growth: TrendingUp, scale: Building2 };

const wrap  = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };
const item  = { hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } } };

export default function SubscriptionPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [currentSub, setCurrentSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);
  const [polling, setPolling] = useState(false);
  const [payResult, setPayResult] = useState(null);

  const handleSubscribe = async (planId) => {
    setPaying(planId);
    try {
      const res = await axios.post(`${API}/payments/subscribe`, {
        plan_id: planId,
        origin_url: window.location.origin,
      }, { withCredentials: true });
      // Open Stripe checkout in a new tab — works reliably from inside iframes
      window.open(res.data.url, "_blank", "noopener,noreferrer");
    } catch {
      alert("Failed to start checkout. Please try again.");
      setPaying(null);
    }
  };

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/payments/plans`),
      axios.get(`${API}/user/subscription`, { withCredentials: true }),
    ]).then(([plansRes, subRes]) => {
      setPlans(plansRes.data);
      setCurrentSub(subRes.data);

      // Auto-start checkout if ?plan=xxx came from landing page CTA after auth
      const preselectedPlan = searchParams.get("plan");
      const sessionId = searchParams.get("session_id");
      if (preselectedPlan && !sessionId && !subRes.data?.has_subscription) {
        handleSubscribe(preselectedPlan);
      }
    }).catch(() => {}).finally(() => setLoading(false));

    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      setPolling(true);
      pollStatus(sessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pollStatus = async (sessionId, attempt = 0) => {
    if (attempt >= 8) { setPolling(false); return; }
    try {
      const res = await axios.get(`${API}/payments/subscribe/status/${sessionId}`, { withCredentials: true });
      setPayResult(res.data);
      if (res.data.payment_status === "paid" || res.data.payment_status === "active") {
        setPolling(false);
        // Refresh subscription status
        const subRes = await axios.get(`${API}/user/subscription`, { withCredentials: true });
        setCurrentSub(subRes.data);
      } else if (res.data.payment_status === "expired") {
        setPolling(false);
      } else {
        setTimeout(() => pollStatus(sessionId, attempt + 1), 2000);
      }
    } catch { setPolling(false); }
  };

  if (loading) return (
    <div className="max-w-5xl mx-auto space-y-4 pt-8">
      {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-56 rounded-2xl" />)}
    </div>
  );

  return (
    <motion.div className="max-w-5xl mx-auto" initial="hidden" animate="visible" variants={wrap}>
      {/* Header */}
      <motion.div variants={item} className="mb-10 text-center">
        <p className="text-[#00D4C8] text-xs font-bold uppercase tracking-widest mb-3">Choose Your Plan</p>
        <h1 className="font-heading font-black text-4xl md:text-5xl text-white mb-3">
          Simple, predictable pricing
        </h1>
        <p className="text-white/50 text-lg">No hidden fees. Cancel anytime.</p>
      </motion.div>

      {/* Polling / Payment Result Banner */}
      <AnimatePresence>
        {polling && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6"
          >
            <Loader2 className="w-4 h-4 text-yellow-400 animate-spin flex-shrink-0" />
            <p className="text-yellow-400 text-sm">Verifying your payment…</p>
          </motion.div>
        )}
        {payResult && !polling && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`flex items-center gap-3 rounded-xl p-4 mb-6 border ${
              payResult.payment_status === "paid" || payResult.payment_status === "active"
                ? "bg-green-500/10 border-green-500/20"
                : "bg-red-500/10 border-red-500/20"
            }`}
            data-testid="payment-result-banner"
          >
            {payResult.payment_status === "paid" || payResult.payment_status === "active"
              ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
              : <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
            <div>
              <p className={`text-sm font-semibold ${payResult.payment_status === "paid" || payResult.payment_status === "active" ? "text-green-400" : "text-red-400"}`}>
                {payResult.payment_status === "paid" || payResult.payment_status === "active"
                  ? `Welcome to ${payResult.plan_name}! Your plan is now active.`
                  : "Payment was not completed."}
              </p>
              {(payResult.payment_status === "paid" || payResult.payment_status === "active") && (
                <button
                  onClick={() => navigate("/dashboard")}
                  className="text-green-400/70 text-xs mt-0.5 hover:text-green-400 transition-colors flex items-center gap-1"
                >
                  Go to Dashboard <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active subscription badge */}
      {currentSub?.has_subscription && (
        <motion.div
          variants={item}
          className="flex items-center justify-between bg-[#00D4C8]/8 border border-[#00D4C8]/25 rounded-xl px-5 py-3 mb-8"
          data-testid="active-plan-banner"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[#00D4C8] animate-pulse" />
            <span className="text-white text-sm font-semibold">Active Plan: {currentSub.plan_name}</span>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="text-[#00D4C8] text-xs font-semibold hover:text-white transition-colors flex items-center gap-1"
          >
            Go to Dashboard <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}

      {/* Plans grid */}
      <motion.div variants={item} className="grid md:grid-cols-3 gap-6 mb-12">
        {plans.map((plan) => {
          const Icon = PLAN_ICONS[plan.id] || Zap;
          const isActive = currentSub?.plan === plan.id;
          const isHighlight = plan.id === "growth";
          const isBusy = paying === plan.id;

          return (
            <motion.div
              key={plan.id}
              data-testid={`plan-card-${plan.id}`}
              whileHover={{ y: -4 }}
              className={`relative rounded-2xl p-7 border flex flex-col transition-all duration-300 ${
                isHighlight
                  ? "bg-[#00D4C8]/5 border-[#00D4C8]/35 teal-glow"
                  : "glass-2 hover:border-white/20"
              } ${isActive ? "border-green-500/40 bg-green-500/5" : ""}`}
            >
              {isHighlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#00D4C8] text-black text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wide">
                  Most Popular
                </div>
              )}
              {isActive && (
                <div className="absolute -top-3.5 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Active
                </div>
              )}

              {/* Icon + Name */}
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isHighlight ? "bg-[#00D4C8]/20 border border-[#00D4C8]/40" : "glass-1"}`}>
                  <Icon className={`w-5 h-5 ${isHighlight ? "text-[#00D4C8]" : "text-white/60"}`} />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-white text-lg">{plan.name}</h3>
                  <p className="text-white/40 text-xs">{plan.description}</p>
                </div>
              </div>

              {/* Price */}
              <div className="mb-6">
                <span className="font-heading font-black text-5xl text-white">${plan.price.toLocaleString()}</span>
                <span className="text-white/40 text-sm">/mo</span>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/70">
                    <CheckCircle className="w-3.5 h-3.5 text-[#00D4C8] flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                data-testid={`subscribe-btn-${plan.id}`}
                onClick={() => handleSubscribe(plan.id)}
                disabled={isBusy || isActive || !!paying}
                className={`w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
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
                ) : (
                  <>Get Started <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Trust row */}
      <motion.div variants={item} className="flex flex-wrap items-center justify-center gap-6 text-white/30 text-xs">
        {[
          { Icon: Shield, text: "Secure Stripe Checkout" },
          { Icon: CheckCircle, text: "Cancel anytime" },
          { Icon: Star, text: "No setup fees" },
        ].map(({ Icon, text }) => (
          <div key={text} className="flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5 text-[#00D4C8]/50" />
            {text}
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}
