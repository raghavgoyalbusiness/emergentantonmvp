import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Save, Plus, Trash2, Loader2, Package, ShieldOff,
  MessageSquare, Mic2, Target, CheckCircle, AlertCircle, ChevronRight
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const wrap = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.38, ease: "easeOut" } } };

const TABS = [
  { id: "profile", label: "Brand Profile", icon: Target },
  { id: "pillars", label: "Brand Pillars", icon: Mic2 },
  { id: "rules", label: "No-Go Rules", icon: ShieldOff },
  { id: "products", label: "Product Catalog", icon: Package },
  { id: "memory", label: "Campaign Memory", icon: Brain },
];

const PRICE_POINTS = ["budget", "mid", "premium", "luxury"];
const INDUSTRIES = ["Beauty & Skincare", "Fashion & Apparel", "Fitness & Wellness", "Food & Beverage",
  "Tech & Gadgets", "Home & Lifestyle", "Travel & Hospitality", "Health & Medical",
  "Finance & Fintech", "Gaming & Entertainment", "Education", "Other"];

// Tag chip input component
function TagInput({ value = [], onChange, placeholder, color = "teal" }) {
  const [input, setInput] = useState("");
  const colorCls = color === "red"
    ? "bg-red-500/10 text-red-400 border-red-500/25"
    : "bg-[#00D4C8]/10 text-[#00D4C8] border-[#00D4C8]/25";

  const add = () => {
    const tag = input.trim().replace(/,$/,"");
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setInput("");
  };
  const onKey = (e) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
    else if (e.key === "Backspace" && !input && value.length > 0) onChange(value.slice(0,-1));
  };

  return (
    <div className="flex flex-wrap gap-1.5 glass-input rounded-lg p-2 min-h-[44px] cursor-text"
      onClick={() => document.querySelector(`[data-taginput="${placeholder}"]`)?.focus()}>
      {value.map(tag => (
        <span key={tag} className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${colorCls}`}>
          {tag}
          <button onClick={() => onChange(value.filter(t => t !== tag))}
            className="opacity-60 hover:opacity-100 ml-0.5">&times;</button>
        </span>
      ))}
      <input
        data-taginput={placeholder}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={onKey}
        onBlur={add}
        placeholder={value.length === 0 ? placeholder : "Add more…"}
        className="flex-1 min-w-[120px] bg-transparent text-white text-sm outline-none placeholder-white/25"
      />
    </div>
  );
}

function FormField({ label, children, hint }) {
  return (
    <div>
      <label className="text-white/50 text-xs font-medium block mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-white/25 text-xs mt-1">{hint}</p>}
    </div>
  );
}

function SaveBtn({ saving, onClick, label = "Save Changes" }) {
  return (
    <button onClick={onClick} disabled={saving} data-testid="save-btn"
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl btn-primary text-sm font-semibold disabled:opacity-60">
      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      {saving ? "Saving…" : label}
    </button>
  );
}

// Product card
function ProductCard({ product, onDelete }) {
  return (
    <div className="glass-1 rounded-xl p-4 border border-white/6 flex items-start justify-between gap-3"
      data-testid={`product-card-${product.product_id}`}>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold truncate">{product.name}</p>
        {product.target_customer && <p className="text-white/40 text-xs mt-0.5">{product.target_customer}</p>}
        <div className="flex gap-3 mt-1.5">
          {product.price != null && <span className="text-[#00D4C8] text-xs">${product.price}</span>}
          {product.margin_pct != null && <span className="text-white/30 text-xs">{product.margin_pct}% margin</span>}
        </div>
        {product.hero_benefits?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {product.hero_benefits.map(b => (
              <span key={b} className="text-xs px-1.5 py-0.5 bg-white/5 text-white/40 rounded-md">{b}</span>
            ))}
          </div>
        )}
      </div>
      <button onClick={() => onDelete(product.product_id)}
        className="text-white/20 hover:text-red-400 transition-colors p-1 flex-shrink-0"
        data-testid={`delete-product-${product.product_id}`}>
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// Add Product Modal
function AddProductModal({ onAdd, onClose }) {
  const [form, setForm] = useState({ name: "", price: "", margin_pct: "", target_customer: "", hero_benefits: [], image_url: "" });
  const [saving, setSaving] = useState(false);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await onAdd({
      ...form,
      price: form.price ? parseFloat(form.price) : null,
      margin_pct: form.margin_pct ? parseFloat(form.margin_pct) : null,
    });
    setSaving(false);
    onClose();
  };

  const inputCls = "w-full glass-input rounded-lg px-3 py-2 text-white text-sm outline-none placeholder-white/20";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity:0, scale:0.93, y:10 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.93 }}
        className="glass-3 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="font-heading font-bold text-white text-lg mb-4">Add Product</h3>
        <div className="space-y-3">
          <FormField label="Product Name *">
            <input value={form.name} onChange={e => f("name", e.target.value)} placeholder="e.g. Glow Serum Pro" className={inputCls} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Price ($)">
              <input type="number" value={form.price} onChange={e => f("price", e.target.value)} placeholder="49.99" className={inputCls} />
            </FormField>
            <FormField label="Margin (%)">
              <input type="number" value={form.margin_pct} onChange={e => f("margin_pct", e.target.value)} placeholder="65" className={inputCls} />
            </FormField>
          </div>
          <FormField label="Target Customer">
            <input value={form.target_customer} onChange={e => f("target_customer", e.target.value)} placeholder="e.g. Women 25-40, skincare enthusiasts" className={inputCls} />
          </FormField>
          <FormField label="Hero Benefits" hint="Press Enter to add each benefit">
            <TagInput value={form.hero_benefits} onChange={v => f("hero_benefits", v)} placeholder="e.g. Hydrating, Anti-aging..." />
          </FormField>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 btn-secondary py-2.5 rounded-xl text-sm">Cancel</button>
          <button onClick={submit} disabled={saving || !form.name.trim()} className="flex-1 btn-primary py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add Product
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function BrandBrain() {
  const [tab, setTab] = useState("profile");
  const [profile, setProfile] = useState({
    company_name: "", website_url: "", industry: "", target_audience: "",
    price_point: "mid", brand_voice: "", visual_style: "", core_messaging: "", tone_guide: "",
    words_to_use: [], words_to_avoid: [], creator_no_gos: [], topic_no_gos: [],
    competitor_brands: [], content_filters: []
  });
  const [products, setProducts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [prof, prods, camps] = await Promise.all([
          axios.get(`${API}/brand-brain/profile`),
          axios.get(`${API}/brand-brain/products`),
          axios.get(`${API}/campaigns`)
        ]);
        if (prof.data && Object.keys(prof.data).length > 0) {
          setProfile(p => ({
            ...p,
            ...prof.data,
            words_to_use: prof.data.words_to_use || [],
            words_to_avoid: prof.data.words_to_avoid || [],
            creator_no_gos: prof.data.creator_no_gos || [],
            topic_no_gos: prof.data.topic_no_gos || [],
            competitor_brands: prof.data.competitor_brands || [],
            content_filters: prof.data.content_filters || [],
          }));
        }
        setProducts(prods.data || []);
        setCampaigns(camps.data || []);
      } catch (_) {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data } = await axios.post(`${API}/brand-brain/profile`, profile);
      setProfile(p => ({ ...p, ...data }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (_) {}
    finally { setSaving(false); }
  };

  const addProduct = async (prod) => {
    const { data } = await axios.post(`${API}/brand-brain/products`, prod);
    setProducts(p => [data, ...p]);
  };

  const deleteProduct = async (id) => {
    await axios.delete(`${API}/brand-brain/products/${id}`);
    setProducts(p => p.filter(x => x.product_id !== id));
  };

  const fp = useCallback((k, v) => setProfile(p => ({ ...p, [k]: v })), []);

  const inputCls = "w-full glass-input rounded-lg px-3 py-2.5 text-white text-sm outline-none placeholder-white/20";
  const textareaCls = `${inputCls} resize-none`;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center h-60">
        <Loader2 className="w-6 h-6 text-[#00D4C8] animate-spin" />
      </div>
    );
  }

  return (
    <motion.div className="max-w-4xl mx-auto" initial="hidden" animate="visible" variants={wrap}>
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00D4C8]/10 border border-[#00D4C8]/25 flex items-center justify-center">
            <Brain className="w-5 h-5 text-[#00D4C8]" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-white">Anton Brand Brain</h1>
            <p className="text-white/40 text-sm">Your brand's memory — Anton uses this on every query</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AnimatePresence>
            {saved && (
              <motion.span initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0 }}
                className="flex items-center gap-1.5 text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" /> Saved!
              </motion.span>
            )}
          </AnimatePresence>
          {tab !== "products" && tab !== "memory" && <SaveBtn saving={saving} onClick={saveProfile} />}
        </div>
      </motion.div>

      {/* Status Banner if empty */}
      {!profile.company_name && (
        <motion.div variants={item} className="flex items-start gap-3 glass-1 rounded-xl p-4 mb-5 border border-[#00D4C8]/15">
          <AlertCircle className="w-4 h-4 text-[#00D4C8] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-white text-sm font-semibold">Brand Brain is empty</p>
            <p className="text-white/40 text-xs mt-0.5">Fill in your brand profile and Anton will use this context in all future queries — no more repeating yourself.</p>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <motion.div variants={item} className="flex gap-1 glass-1 rounded-xl p-1 mb-6 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} data-testid={`tab-${id}`}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center ${
              tab === id ? "bg-[#00D4C8]/15 text-[#00D4C8] border border-[#00D4C8]/25" : "text-white/40 hover:text-white/70"
            }`}>
            <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
            {label}
          </button>
        ))}
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {/* ── PROFILE TAB ── */}
        {tab === "profile" && (
          <motion.div key="profile" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            className="glass-2 rounded-2xl p-6 space-y-5" data-testid="tab-profile-content">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Company Name *">
                <input value={profile.company_name} onChange={e => fp("company_name", e.target.value)}
                  placeholder="e.g. Lumina Beauty" className={inputCls} data-testid="input-company-name" />
              </FormField>
              <FormField label="Website">
                <input value={profile.website_url} onChange={e => fp("website_url", e.target.value)}
                  placeholder="https://luminabeauty.com" className={inputCls} />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Industry / Category">
                <select value={profile.industry} onChange={e => fp("industry", e.target.value)}
                  className={`${inputCls} cursor-pointer`} data-testid="select-industry">
                  <option value="">Select industry…</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </FormField>
              <FormField label="Price Point">
                <div className="flex gap-2">
                  {PRICE_POINTS.map(pp => (
                    <button key={pp} onClick={() => fp("price_point", pp)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all ${
                        profile.price_point === pp
                          ? "bg-[#00D4C8]/15 text-[#00D4C8] border border-[#00D4C8]/30"
                          : "glass-1 text-white/40 hover:text-white border border-white/5"
                      }`}>{pp}</button>
                  ))}
                </div>
              </FormField>
            </div>

            <FormField label="Target Audience" hint="Who buys your product? Be specific.">
              <textarea value={profile.target_audience} onChange={e => fp("target_audience", e.target.value)}
                rows={2} placeholder="e.g. Women 25–40, health-conscious, urban, interested in clean beauty and wellness" className={textareaCls} data-testid="input-target-audience" />
            </FormField>

            <FormField label="Brand Voice" hint="How should your brand sound? 3–5 descriptive words.">
              <input value={profile.brand_voice} onChange={e => fp("brand_voice", e.target.value)}
                placeholder="e.g. Warm, empowering, educational, sophisticated but accessible" className={inputCls} data-testid="input-brand-voice" />
            </FormField>

            <FormField label="Visual Style" hint="How does your brand look? Helps Anton filter creators by aesthetic.">
              <input value={profile.visual_style} onChange={e => fp("visual_style", e.target.value)}
                placeholder="e.g. Clean, minimal, soft pastels, natural lighting, no heavy editing" className={inputCls} />
            </FormField>
          </motion.div>
        )}

        {/* ── PILLARS TAB ── */}
        {tab === "pillars" && (
          <motion.div key="pillars" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            className="glass-2 rounded-2xl p-6 space-y-5" data-testid="tab-pillars-content">
            <FormField label="Core Messaging" hint="What is the single most important message your brand communicates?">
              <textarea value={profile.core_messaging} onChange={e => fp("core_messaging", e.target.value)}
                rows={3} placeholder="e.g. Clean beauty that actually works. No compromises — effective, sustainable, honest." className={textareaCls} />
            </FormField>

            <FormField label="Tone Guide" hint="Describe the emotional tone in detail.">
              <textarea value={profile.tone_guide} onChange={e => fp("tone_guide", e.target.value)}
                rows={2} placeholder="e.g. Confident but not pushy. Aspirational but relatable. Scientific but never clinical." className={textareaCls} />
            </FormField>

            <FormField label="Words & Phrases to USE" hint="Press Enter or comma to add each one">
              <TagInput value={profile.words_to_use || []} onChange={v => fp("words_to_use", v)}
                placeholder="e.g. radiant, glow, clean, sustainable…" />
            </FormField>

            <FormField label="Words & Phrases to AVOID" hint="Words that dilute your brand or misrepresent it">
              <TagInput value={profile.words_to_avoid || []} onChange={v => fp("words_to_avoid", v)}
                placeholder="e.g. cheap, discount, basic, anti-aging…" color="red" />
            </FormField>
          </motion.div>
        )}

        {/* ── RULES TAB ── */}
        {tab === "rules" && (
          <motion.div key="rules" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            className="glass-2 rounded-2xl p-6 space-y-5" data-testid="tab-rules-content">
            <div className="text-white/40 text-xs bg-white/3 rounded-lg px-3 py-2 border border-white/5">
              Anton will respect these rules when recommending creators and evaluating content.
            </div>

            <FormField label="Creator Types to Avoid" hint="Describe creator types or personas that don't fit your brand">
              <TagInput value={profile.creator_no_gos || []} onChange={v => fp("creator_no_gos", v)}
                placeholder="e.g. political commentators, fast fashion advocates…" color="red" />
            </FormField>

            <FormField label="Topics to Avoid" hint="Subjects, trends, or content themes not appropriate for your brand">
              <TagInput value={profile.topic_no_gos || []} onChange={v => fp("topic_no_gos", v)}
                placeholder="e.g. alcohol, extreme dieting, controversial politics…" color="red" />
            </FormField>

            <FormField label="Competitor Brands" hint="Creators who work with these brands may be excluded">
              <TagInput value={profile.competitor_brands || []} onChange={v => fp("competitor_brands", v)}
                placeholder="e.g. Brand X, Competitor Co…" color="red" />
            </FormField>

            <FormField label="Content Filters" hint="Additional content quality or safety requirements">
              <TagInput value={profile.content_filters || []} onChange={v => fp("content_filters", v)}
                placeholder="e.g. no unboxing-only posts, must show product in use…" />
            </FormField>
          </motion.div>
        )}

        {/* ── PRODUCTS TAB ── */}
        {tab === "products" && (
          <motion.div key="products" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            data-testid="tab-products-content">
            <div className="flex items-center justify-between mb-4">
              <p className="text-white/40 text-sm">{products.length} product{products.length !== 1 ? "s" : ""} in catalog</p>
              <button onClick={() => setShowAddProduct(true)} data-testid="add-product-btn"
                className="flex items-center gap-2 px-4 py-2 rounded-xl btn-primary text-sm font-semibold">
                <Plus className="w-4 h-4" /> Add Product
              </button>
            </div>
            {products.length === 0 ? (
              <div className="glass-2 rounded-2xl p-12 text-center">
                <Package className="w-8 h-8 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">No products yet</p>
                <p className="text-white/20 text-xs mt-1">Add your products so Anton can tailor creator recommendations to them</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {products.map(p => (
                  <ProductCard key={p.product_id} product={p} onDelete={deleteProduct} />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── CAMPAIGN MEMORY TAB ── */}
        {tab === "memory" && (
          <motion.div key="memory" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            data-testid="tab-memory-content">
            <div className="text-white/40 text-xs bg-white/3 rounded-lg px-3 py-2 border border-white/5 mb-4">
              Anton automatically learns from your campaign history. This is a read-only view of what Anton remembers.
            </div>
            {campaigns.length === 0 ? (
              <div className="glass-2 rounded-2xl p-12 text-center">
                <Brain className="w-8 h-8 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">No campaign history yet</p>
                <p className="text-white/20 text-xs mt-1">As you run campaigns, Anton will build memory here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.map(c => (
                  <div key={c.campaign_id} className="glass-1 rounded-xl p-4 border border-white/6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white text-sm font-semibold">{c.name}</p>
                        <p className="text-white/40 text-xs mt-0.5">{c.brand_name} · {c.product_type}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        c.stage === "Paid" || c.stage === "Reported"
                          ? "bg-green-500/10 text-green-400 border-green-500/20"
                          : "bg-[#00D4C8]/10 text-[#00D4C8] border-[#00D4C8]/20"
                      }`}>{c.stage}</span>
                    </div>
                    <div className="flex gap-4 mt-2">
                      <span className="text-white/30 text-xs">Budget: ${c.budget_min?.toLocaleString()}–${c.budget_max?.toLocaleString()}</span>
                      <span className="text-white/30 text-xs">Platforms: {c.platforms?.join(", ")}</span>
                    </div>
                    {c.ai_criteria && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {c.ai_criteria.niche_keywords?.slice(0,4).map(k => (
                          <span key={k} className="text-xs px-1.5 py-0.5 bg-[#00D4C8]/8 text-[#00D4C8]/60 rounded-md border border-[#00D4C8]/15">{k}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Product Modal */}
      <AnimatePresence>
        {showAddProduct && (
          <AddProductModal onAdd={addProduct} onClose={() => setShowAddProduct(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
