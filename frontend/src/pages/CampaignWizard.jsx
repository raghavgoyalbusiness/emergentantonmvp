import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, ArrowRight, Check, Loader2, Zap } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STEPS = ["Brand Details", "Audience & Goals", "Platforms & Tone", "AI Processing"];
const PLATFORMS = ["Instagram", "TikTok", "YouTube"];
const GOALS = ["Brand Awareness", "Product Launch", "Drive Sales", "App Downloads", "Event Promotion", "Content Creation"];

const processingMessages = [
  "Analyzing your brand brief...",
  "Identifying optimal creator criteria...",
  "Calculating follower range targets...",
  "Defining engagement thresholds...",
  "Setting content style parameters...",
  "Campaign ready to launch!",
];

export default function CampaignWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);
  const [form, setForm] = useState({
    name: "", brand_name: "", product_type: "",
    target_audience: "", campaign_goal: "Brand Awareness",
    budget_min: 1000, budget_max: 10000,
    platforms: ["Instagram"], brand_tone: ""
  });
  const [errors, setErrors] = useState({});

  const update = (field, value) => setForm(p => ({ ...p, [field]: value }));

  const togglePlatform = (p) => {
    setForm(prev => ({
      ...prev,
      platforms: prev.platforms.includes(p) ? prev.platforms.filter(x => x !== p) : [...prev.platforms, p]
    }));
  };

  const validate = (s) => {
    const e = {};
    if (s === 0) {
      if (!form.name.trim()) e.name = "Campaign name required";
      if (!form.brand_name.trim()) e.brand_name = "Brand name required";
      if (!form.product_type.trim()) e.product_type = "Product type required";
    }
    if (s === 1) {
      if (!form.target_audience.trim()) e.target_audience = "Target audience required";
      if (form.budget_min <= 0) e.budget_min = "Budget must be > 0";
    }
    if (s === 2) {
      if (form.platforms.length === 0) e.platforms = "Select at least one platform";
      if (!form.brand_tone.trim()) e.brand_tone = "Brand tone required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (!validate(step)) return;
    if (step === 2) createCampaign();
    else setStep(s => s + 1);
  };

  const createCampaign = async () => {
    setStep(3);
    setCreating(true);
    const interval = setInterval(() => setMsgIdx(i => (i + 1) % processingMessages.length), 900);
    try {
      const res = await axios.post(`${API}/campaigns`, form, { withCredentials: true });
      clearInterval(interval);
      setTimeout(() => navigate("/campaigns"), 1200);
    } catch (e) {
      clearInterval(interval);
      setStep(2);
      setCreating(false);
      alert("Failed to create campaign. Please try again.");
    }
  };

  const inputCls = (err) => `w-full bg-[#0A0F2E] border ${err ? "border-red-500/50" : "border-white/10"} rounded-lg px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00D4C8]/50 focus:border-[#00D4C8] transition-all`;

  return (
    <div className="page-enter max-w-2xl mx-auto">
      <button onClick={() => navigate("/campaigns")} className="flex items-center gap-2 text-white/40 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Pipeline
      </button>

      <div className="mb-8">
        <h1 className="font-heading font-bold text-2xl md:text-3xl text-white mb-2">Create New Campaign</h1>
        <p className="text-white/40 text-sm">AI will generate your influencer criteria automatically</p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i < step ? "bg-[#00D4C8] text-[#0A0F2E]" :
              i === step ? "bg-[#00D4C8]/20 border border-[#00D4C8] text-[#00D4C8]" :
              "bg-white/5 text-white/30"
            }`}>
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-xs hidden sm:block ${i === step ? "text-white" : "text-white/30"}`}>{s}</span>
          </div>
        ))}
      </div>

      <div className="bg-[#131936] border border-white/5 rounded-xl p-6">
        {/* Step 0: Brand Details */}
        {step === 0 && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="font-heading font-semibold text-xl text-white mb-4">Brand Details</h2>
            <div>
              <label className="text-white/60 text-xs mb-1 block">Campaign Name *</label>
              <input value={form.name} onChange={e => update("name", e.target.value)} placeholder="e.g., Summer Glow Collection Q3" className={inputCls(errors.name)} data-testid="input-campaign-name" />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="text-white/60 text-xs mb-1 block">Brand Name *</label>
              <input value={form.brand_name} onChange={e => update("brand_name", e.target.value)} placeholder="e.g., Lumina Beauty" className={inputCls(errors.brand_name)} data-testid="input-brand-name" />
              {errors.brand_name && <p className="text-red-400 text-xs mt-1">{errors.brand_name}</p>}
            </div>
            <div>
              <label className="text-white/60 text-xs mb-1 block">Product / Service Type *</label>
              <input value={form.product_type} onChange={e => update("product_type", e.target.value)} placeholder="e.g., Organic skincare serums" className={inputCls(errors.product_type)} data-testid="input-product-type" />
              {errors.product_type && <p className="text-red-400 text-xs mt-1">{errors.product_type}</p>}
            </div>
          </div>
        )}

        {/* Step 1: Audience & Goals */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="font-heading font-semibold text-xl text-white mb-4">Audience & Goals</h2>
            <div>
              <label className="text-white/60 text-xs mb-1 block">Target Audience *</label>
              <textarea value={form.target_audience} onChange={e => update("target_audience", e.target.value)} placeholder="e.g., Women 25-35, health-conscious, interested in clean beauty" rows={3} className={`${inputCls(errors.target_audience)} resize-none`} data-testid="input-target-audience" />
              {errors.target_audience && <p className="text-red-400 text-xs mt-1">{errors.target_audience}</p>}
            </div>
            <div>
              <label className="text-white/60 text-xs mb-1 block">Campaign Goal</label>
              <select value={form.campaign_goal} onChange={e => update("campaign_goal", e.target.value)} className={inputCls(false)} data-testid="select-campaign-goal">
                {GOALS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-white/60 text-xs mb-1 block">Budget Min ($)</label>
                <input type="number" value={form.budget_min} onChange={e => update("budget_min", +e.target.value)} className={inputCls(errors.budget_min)} data-testid="input-budget-min" />
              </div>
              <div>
                <label className="text-white/60 text-xs mb-1 block">Budget Max ($)</label>
                <input type="number" value={form.budget_max} onChange={e => update("budget_max", +e.target.value)} className={inputCls(false)} data-testid="input-budget-max" />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Platforms & Tone */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="font-heading font-semibold text-xl text-white mb-4">Platforms & Brand Tone</h2>
            <div>
              <label className="text-white/60 text-xs mb-2 block">Platforms *</label>
              <div className="flex gap-2 flex-wrap">
                {PLATFORMS.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    data-testid={`platform-${p.toLowerCase()}`}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      form.platforms.includes(p)
                        ? "bg-[#00D4C8]/10 border-[#00D4C8]/40 text-[#00D4C8]"
                        : "bg-white/3 border-white/10 text-white/50 hover:border-white/25"
                    }`}
                  >
                    {p === "Instagram" && <i className="fa-brands fa-instagram text-xs" />}
                    {p === "TikTok" && <i className="fa-brands fa-tiktok text-xs" />}
                    {p === "YouTube" && <i className="fa-brands fa-youtube text-xs" />}
                    {p}
                    {form.platforms.includes(p) && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
              {errors.platforms && <p className="text-red-400 text-xs mt-1">{errors.platforms}</p>}
            </div>
            <div>
              <label className="text-white/60 text-xs mb-1 block">Brand Tone *</label>
              <input value={form.brand_tone} onChange={e => update("brand_tone", e.target.value)} placeholder="e.g., Clean, natural, empowering, authentic" className={inputCls(errors.brand_tone)} data-testid="input-brand-tone" />
              {errors.brand_tone && <p className="text-red-400 text-xs mt-1">{errors.brand_tone}</p>}
            </div>
          </div>
        )}

        {/* Step 3: AI Processing */}
        {step === 3 && (
          <div className="text-center py-10 animate-fade-in">
            <div className="flex gap-2 justify-center mb-6">
              <div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" />
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#00D4C8]/10 flex items-center justify-center mx-auto mb-4 animate-glow-pulse">
              <Zap className="w-6 h-6 text-[#00D4C8]" />
            </div>
            <p className="font-heading font-semibold text-white text-lg mb-2">{processingMessages[msgIdx]}</p>
            <p className="text-white/40 text-sm">Claude Sonnet 4.5 is crafting your influencer strategy</p>
          </div>
        )}

        {/* Navigation */}
        {step < 3 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
            {step > 0 ? (
              <button onClick={() => setStep(s => s - 1)} className="btn-secondary px-4 py-2.5 rounded-lg text-sm flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : <div />}
            <button onClick={next} data-testid="wizard-next-btn" className="btn-primary px-6 py-2.5 rounded-lg text-sm flex items-center gap-2">
              {step === 2 ? "Create with AI" : "Continue"} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
