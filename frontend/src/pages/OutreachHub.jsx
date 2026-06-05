import { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  MailOpen, Plus, Loader2, Trash2, X, Copy, Check,
  Zap, FileText, ChevronDown, ChevronUp,
  CheckCircle, Clock, Handshake
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const wrap = { hidden:{}, visible:{ transition:{ staggerChildren:0.07 } } };
const item = { hidden:{ opacity:0, y:16 }, visible:{ opacity:1, y:0, transition:{ duration:0.35, ease:"easeOut" } } };

// Module-level animation constants (avoids recreating objects on every render)
const expandAnim  = { initial:{ height:0 }, animate:{ height:"auto" }, exit:{ height:0 } };
const modalAnim   = { initial:{ opacity:0, scale:0.93 }, animate:{ opacity:1, scale:1 }, exit:{ opacity:0, scale:0.93 } };
const resultAnim  = { initial:{ opacity:0, y:10 }, animate:{ opacity:1, y:0 } };

const SEQ_TYPES = ["gifting","paid","affiliate","ambassador","ugc","event"];
const TABS = [
  { id:"sequences", label:"Follow-up Sequences", icon:MailOpen },
  { id:"negotiate", label:"AI Negotiation", icon:Handshake },
  { id:"deals",     label:"Deal Terms Generator", icon:FileText },
];

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 text-white/30 hover:text-white transition-colors text-xs p-1 rounded">
      {copied ? <><Check className="w-3.5 h-3.5 text-green-400" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
    </button>
  );
}

// ──────────────────────────────────────────────────
// TAB 1: Follow-up Sequences
// ──────────────────────────────────────────────────
function SequenceRow({ seq, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="glass-1 rounded-xl border border-white/6 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/2"
        onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${
            seq.status === "active" ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-white/5 text-white/40 border-white/10"
          }`}>{seq.status}</span>
          <div>
            <p className="text-white text-sm font-semibold">{seq.creator_name}</p>
            <p className="text-white/35 text-xs capitalize">{seq.sequence_type} · {seq.steps?.length} steps</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/25 text-xs hidden sm:block">{new Date(seq.created_at).toLocaleDateString()}</span>
          <button onClick={e => { e.stopPropagation(); onDelete(seq.sequence_id); }}
            className="text-white/20 hover:text-red-400 p-1 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div {...expandAnim} className="overflow-hidden">
            <div className="border-t border-white/5 p-4 space-y-3">
              {seq.steps?.map((step, i) => (
                <div key={`${seq.sequence_id}-step-${i}`} className="flex gap-3">
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${
                      step.status === "sent" ? "bg-green-500/15 text-green-400 border-green-500/25"
                      : "bg-white/5 text-white/40 border-white/10"
                    }`}>{i+1}</div>
                    {i < (seq.steps.length - 1) && <div className="w-px flex-1 bg-white/5 min-h-[16px]" />}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-3 h-3 text-white/25" />
                      <span className="text-white/30 text-xs">Day {step.day}</span>
                      {step.status === "sent" && (
                        <span className="text-green-400 text-xs flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Sent
                        </span>
                      )}
                    </div>
                    <p className="text-white/70 text-xs font-medium">{step.subject}</p>
                    <p className="text-white/35 text-xs mt-0.5 line-clamp-2">{step.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AddSequenceModal({ onAdd, onClose }) {
  const [form, setForm] = useState({
    creator_name: "", creator_email: "", sequence_type: "paid",
    steps: [
      { day: 0, subject: "Partnership opportunity — [Brand]", message: "Hi [Name], I'd love to discuss a collaboration..." },
      { day: 2, subject: "Following up — [Brand] x [Creator]", message: "Just following up on my last message..." },
      { day: 5, subject: "Last message — [Brand]", message: "Closing the loop — is this something you'd be interested in?" },
    ]
  });
  const [saving, setSaving] = useState(false);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const updateStep = (i, k, v) => setForm(p => ({
    ...p, steps: p.steps.map((s, idx) => idx === i ? { ...s, [k]: v } : s)
  }));

  const submit = async () => {
    if (!form.creator_name.trim()) return;
    setSaving(true);
    await onAdd(form);
    setSaving(false);
    onClose();
  };

  const inputCls = "w-full glass-input rounded-lg px-3 py-2 text-white text-sm outline-none placeholder-white/20";
  const textareaCls = `${inputCls} resize-none`;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div {...modalAnim}
        className="glass-3 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <h3 className="font-heading font-bold text-white text-lg mb-4">Create Follow-up Sequence</h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white/40 text-xs mb-1.5 block">Creator Name *</label>
              <input value={form.creator_name} onChange={e => f("creator_name", e.target.value)}
                placeholder="e.g. Emma Reynolds" className={inputCls} />
            </div>
            <div>
              <label className="text-white/40 text-xs mb-1.5 block">Creator Email</label>
              <input value={form.creator_email} onChange={e => f("creator_email", e.target.value)}
                placeholder="emma@example.com" className={inputCls} />
            </div>
          </div>

          <div>
            <label className="text-white/40 text-xs mb-1.5 block">Sequence Type</label>
            <div className="flex flex-wrap gap-1.5">
              {SEQ_TYPES.map(t => (
                <button key={t} onClick={() => f("sequence_type", t)}
                  className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-all ${
                    form.sequence_type === t ? "bg-[#00D4C8]/15 text-[#00D4C8] border border-[#00D4C8]/30"
                    : "glass-1 text-white/40 hover:text-white border border-white/8"
                  }`}>{t}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-white/40 text-xs mb-2 block">Sequence Steps</label>
            <div className="space-y-3">
              {form.steps.map((step, i) => (
                <div key={`form-step-${i}`} className="glass-1 rounded-xl p-3 border border-white/8">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-[#00D4C8]/10 text-[#00D4C8] text-xs flex items-center justify-center">{i+1}</span>
                    <span className="text-white/50 text-xs">Day</span>
                    <input type="number" value={step.day} onChange={e => updateStep(i, "day", parseInt(e.target.value) || 0)}
                      className="w-12 glass-input rounded px-2 py-1 text-white text-xs outline-none" min="0" />
                  </div>
                  <input value={step.subject} onChange={e => updateStep(i, "subject", e.target.value)}
                    placeholder="Subject line…" className={`${inputCls} mb-2 text-xs py-1.5`} />
                  <textarea value={step.message} onChange={e => updateStep(i, "message", e.target.value)}
                    rows={2} placeholder="Message body…" className={`${textareaCls} text-xs py-1.5`} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 btn-secondary py-2.5 rounded-xl text-sm">Cancel</button>
          <button onClick={submit} disabled={saving || !form.creator_name.trim()}
            className="flex-1 btn-primary py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Sequence
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ──────────────────────────────────────────────────
// TAB 2: AI Negotiation
// ──────────────────────────────────────────────────
function NegotiateTab() {
  const [form, setForm] = useState({ creator_name:"", creator_ask:"", our_budget:"", deliverables:"", campaign_context:"" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.creator_name || !form.creator_ask || !form.our_budget) { setError("Fill in required fields"); return; }
    setError(""); setLoading(true); setResult(null);
    try {
      const { data } = await axios.post(`${API}/outreach-hub/negotiate`, form);
      setResult(data);
    } catch(e) {
      setError(e?.response?.data?.detail || "Failed to generate negotiation advice");
    } finally { setLoading(false); }
  };

  const inputCls = "w-full glass-input rounded-lg px-3 py-2.5 text-white text-sm outline-none placeholder-white/20";

  const RISK_COLOR = { low:"text-green-400", medium:"text-yellow-400", high:"text-red-400" };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Form */}
      <div className="glass-2 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Handshake className="w-4 h-4 text-[#00D4C8]" />
          <p className="text-white text-sm font-semibold">Rate Negotiation Assistant</p>
        </div>
        <p className="text-white/30 text-xs">Enter the creator's quote and your budget — Anton generates a professional counter-offer strategy.</p>

        <div>
          <label className="text-white/40 text-xs mb-1.5 block">Creator Name *</label>
          <input value={form.creator_name} onChange={e => f("creator_name", e.target.value)}
            placeholder="e.g. Emma Reynolds" className={inputCls} data-testid="negotiate-creator-name" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-white/40 text-xs mb-1.5 block">Their Ask *</label>
            <input value={form.creator_ask} onChange={e => f("creator_ask", e.target.value)}
              placeholder="e.g. $8,000 per post" className={inputCls} data-testid="negotiate-ask" />
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1.5 block">Our Budget *</label>
            <input value={form.our_budget} onChange={e => f("our_budget", e.target.value)}
              placeholder="e.g. $3,000–$4,000" className={inputCls} data-testid="negotiate-budget" />
          </div>
        </div>
        <div>
          <label className="text-white/40 text-xs mb-1.5 block">Deliverables</label>
          <input value={form.deliverables} onChange={e => f("deliverables", e.target.value)}
            placeholder="e.g. 1 Instagram Reel + 2 Stories" className={inputCls} />
        </div>
        <div>
          <label className="text-white/40 text-xs mb-1.5 block">Campaign Context (optional)</label>
          <textarea value={form.campaign_context} onChange={e => f("campaign_context", e.target.value)}
            rows={2} placeholder="Any extra context about the campaign…"
            className={`${inputCls} resize-none`} />
        </div>

        {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

        <button onClick={submit} disabled={loading}
          className="w-full btn-primary py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          data-testid="negotiate-submit-btn">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating strategy…</>
            : <><Zap className="w-4 h-4" /> Generate Counter-Offer</>}
        </button>
      </div>

      {/* Result */}
      <div className="space-y-3">
        {!result && !loading && (
          <div className="glass-1 rounded-2xl p-10 text-center border border-white/5 h-full flex flex-col items-center justify-center">
            <Handshake className="w-8 h-8 text-white/15 mb-3" />
            <p className="text-white/25 text-sm">Fill in the form to get Anton's negotiation strategy</p>
          </div>
        )}
        {loading && (
          <div className="glass-1 rounded-2xl p-10 text-center border border-white/5 flex flex-col items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-[#00D4C8] animate-spin mb-3" />
            <p className="text-white/40 text-sm">Anton is crafting your counter-offer…</p>
          </div>
        )}
        {result && (
          <motion.div {...resultAnim} className="space-y-3">
            <div className="glass-2 rounded-xl p-4 border border-[#00D4C8]/15">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[#00D4C8] text-xs font-semibold">Recommended Counter-Offer</p>
                {result.risk_level && (
                  <span className={`text-xs ${RISK_COLOR[result.risk_level] || "text-white/40"}`}>
                    {result.risk_level} risk
                  </span>
                )}
              </div>
              <p className="text-white text-sm">{result.counter_offer}</p>
            </div>

            {result.talking_points?.length > 0 && (
              <div className="glass-1 rounded-xl p-4 border border-white/6">
                <p className="text-white/50 text-xs font-medium mb-2">Talking Points</p>
                <ul className="space-y-1.5">
                  {result.talking_points.map((pt, i) => (
                    <li key={`tp-${i}`} className="flex gap-2 text-xs text-white/60">
                      <span className="text-[#00D4C8] mt-0.5 flex-shrink-0">•</span>{pt}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.response_script && (
              <div className="glass-1 rounded-xl p-4 border border-white/6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white/50 text-xs font-medium">Ready-to-Send Message</p>
                  <CopyBtn text={result.response_script} />
                </div>
                <p className="text-white/70 text-xs leading-relaxed whitespace-pre-wrap">{result.response_script}</p>
              </div>
            )}

            {result.recommendation && (
              <div className="flex items-start gap-2 glass-1 rounded-xl p-3 border border-white/5">
                <CheckCircle className="w-4 h-4 text-[#00D4C8] mt-0.5 flex-shrink-0" />
                <p className="text-white/60 text-xs">{result.recommendation}</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────
// TAB 3: Deal Terms Generator
// ──────────────────────────────────────────────────
function DealsTab() {
  const [form, setForm] = useState({
    creator_name:"", campaign_name:"", deliverables:["1 Instagram Reel", "2 Stories"],
    timeline:"30 days from brief acceptance", payment_amount:"", usage_rights:"90 days organic", exclusivity:""
  });
  const [delivInput, setDelivInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const addDeliv = () => {
    const d = delivInput.trim();
    if (d && !form.deliverables.includes(d)) f("deliverables", [...form.deliverables, d]);
    setDelivInput("");
  };

  const submit = async () => {
    if (!form.creator_name || !form.campaign_name || !form.payment_amount) { setError("Fill in required fields"); return; }
    setError(""); setLoading(true); setResult(null);
    try {
      const payload = { ...form, payment_amount: parseFloat(form.payment_amount) || 0 };
      const { data } = await axios.post(`${API}/outreach-hub/deal-terms`, payload);
      setResult(data);
    } catch(e) {
      setError(e?.response?.data?.detail || "Failed to generate deal terms");
    } finally { setLoading(false); }
  };

  const inputCls = "w-full glass-input rounded-lg px-3 py-2.5 text-white text-sm outline-none placeholder-white/20";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Form */}
      <div className="glass-2 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-4 h-4 text-[#00D4C8]" />
          <p className="text-white text-sm font-semibold">Deal Terms Generator</p>
        </div>
        <p className="text-white/30 text-xs">Generate a professional partnership agreement ready to send to the creator.</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-white/40 text-xs mb-1.5 block">Creator Name *</label>
            <input value={form.creator_name} onChange={e => f("creator_name", e.target.value)}
              placeholder="e.g. Emma Reynolds" className={inputCls} data-testid="deal-creator-name" />
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1.5 block">Campaign Name *</label>
            <input value={form.campaign_name} onChange={e => f("campaign_name", e.target.value)}
              placeholder="e.g. Summer Glow Launch" className={inputCls} />
          </div>
        </div>

        <div>
          <label className="text-white/40 text-xs mb-1.5 block">Deliverables</label>
          <div className="flex flex-wrap gap-1 mb-2">
            {form.deliverables.map(d => (
              <span key={d} className="text-xs px-2 py-0.5 bg-[#00D4C8]/10 text-[#00D4C8] border border-[#00D4C8]/20 rounded-full flex items-center gap-1">
                {d}<button onClick={() => f("deliverables", form.deliverables.filter(x => x !== d))}>&times;</button>
              </span>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input value={delivInput} onChange={e => setDelivInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addDeliv()}
              placeholder="Add deliverable + Enter" className={`${inputCls} text-sm py-2`} />
            <button onClick={addDeliv} className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors text-sm">Add</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-white/40 text-xs mb-1.5 block">Payment Amount ($) *</label>
            <input type="number" value={form.payment_amount} onChange={e => f("payment_amount", e.target.value)}
              placeholder="e.g. 3000" className={inputCls} data-testid="deal-payment" />
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1.5 block">Timeline</label>
            <input value={form.timeline} onChange={e => f("timeline", e.target.value)}
              placeholder="e.g. 30 days from brief" className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-white/40 text-xs mb-1.5 block">Usage Rights</label>
            <input value={form.usage_rights} onChange={e => f("usage_rights", e.target.value)}
              placeholder="e.g. 90 days organic" className={inputCls} />
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1.5 block">Exclusivity</label>
            <input value={form.exclusivity} onChange={e => f("exclusivity", e.target.value)}
              placeholder="e.g. 30 days category" className={inputCls} />
          </div>
        </div>

        {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

        <button onClick={submit} disabled={loading}
          className="w-full btn-primary py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          data-testid="deal-submit-btn">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating agreement…</>
            : <><FileText className="w-4 h-4" /> Generate Deal Terms</>}
        </button>
      </div>

      {/* Result */}
      <div>
        {!result && !loading && (
          <div className="glass-1 rounded-2xl p-10 text-center border border-white/5 h-full flex flex-col items-center justify-center">
            <FileText className="w-8 h-8 text-white/15 mb-3" />
            <p className="text-white/25 text-sm">Fill in the form to generate a professional deal agreement</p>
          </div>
        )}
        {loading && (
          <div className="glass-1 rounded-2xl p-10 text-center border border-white/5 flex flex-col items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-[#00D4C8] animate-spin mb-3" />
            <p className="text-white/40 text-sm">Anton is drafting your deal terms…</p>
          </div>
        )}
        {result && (
          <motion.div {...resultAnim} className="glass-2 rounded-2xl p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <p className="text-white text-sm font-semibold">Generated Agreement</p>
              {result.full_agreement && <CopyBtn text={result.full_agreement} />}
            </div>

            {result.summary && (
              <div className="glass-1 rounded-xl p-3 border border-[#00D4C8]/15">
                <p className="text-white/70 text-xs leading-relaxed">{result.summary}</p>
              </div>
            )}

            {[
              { label:"Deliverables", key:"deliverables_clause" },
              { label:"Payment Terms", key:"payment_clause" },
              { label:"Usage Rights", key:"usage_rights_clause" },
              { label:"Exclusivity", key:"exclusivity_clause" },
              { label:"FTC Disclosure", key:"disclosure_requirement" },
              { label:"Revision Policy", key:"revision_policy" },
              { label:"Cancellation", key:"cancellation_policy" },
            ].map(({ label, key }) => result[key] && (
              <div key={key} className="border-t border-white/5 pt-3">
                <p className="text-white/40 text-xs font-medium mb-1">{label}</p>
                <p className="text-white/65 text-xs leading-relaxed">{result[key]}</p>
              </div>
            ))}

            {result.full_agreement && (
              <div className="border-t border-[#00D4C8]/15 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[#00D4C8] text-xs font-semibold">Full Agreement (Ready to Send)</p>
                  <CopyBtn text={result.full_agreement} />
                </div>
                <div className="glass-1 rounded-xl p-3 border border-white/5">
                  <pre className="text-white/60 text-xs leading-relaxed whitespace-pre-wrap font-body">{result.full_agreement}</pre>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────
// MAIN PAGE
// ──────────────────────────────────────────────────
export default function OutreachHub() {
  const [tab, setTab] = useState("sequences");
  const [sequences, setSequences] = useState([]);
  const [loadingSeq, setLoadingSeq] = useState(true);
  const [showAddSeq, setShowAddSeq] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get(`${API}/outreach-hub/sequences`);
        setSequences(data);
      } catch (err) {
        console.error("Failed to load sequences:", err);
      } finally {
        setLoadingSeq(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addSequence = async (form) => {
    try {
      const { data } = await axios.post(`${API}/outreach-hub/sequences`, form);
      setSequences(s => [data, ...s]);
    } catch (err) {
      console.error("Failed to create sequence:", err);
    }
  };

  const deleteSequence = async (id) => {
    try {
      await axios.delete(`${API}/outreach-hub/sequences/${id}`);
      setSequences(s => s.filter(x => x.sequence_id !== id));
    } catch (err) {
      console.error("Failed to delete sequence:", err);
    }
  };

  return (
    <motion.div className="max-w-6xl mx-auto" initial="hidden" animate="visible" variants={wrap}>
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00D4C8]/10 border border-[#00D4C8]/25 flex items-center justify-center">
            <MailOpen className="w-5 h-5 text-[#00D4C8]" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-white">Outreach Hub</h1>
            <p className="text-white/40 text-sm">Sequences · AI Negotiation · Deal Terms</p>
          </div>
        </div>
        {tab === "sequences" && (
          <button onClick={() => setShowAddSeq(true)} data-testid="add-sequence-btn"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl btn-primary text-sm font-semibold">
            <Plus className="w-4 h-4" /> New Sequence
          </button>
        )}
      </motion.div>

      {/* Tabs */}
      <motion.div variants={item} className="flex gap-1 glass-1 rounded-xl p-1 mb-6 border border-white/6">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} data-testid={`hub-tab-${id}`}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium flex-1 justify-center transition-all ${
              tab === id ? "bg-[#00D4C8]/15 text-[#00D4C8] border border-[#00D4C8]/25" : "text-white/40 hover:text-white/70"
            }`}>
            <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {tab === "sequences" && (
          <motion.div key="sequences" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
            {loadingSeq ? (
              <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 text-[#00D4C8] animate-spin" /></div>
            ) : sequences.length === 0 ? (
              <div className="glass-1 rounded-2xl p-16 text-center border border-white/5">
                <MailOpen className="w-10 h-10 text-white/15 mx-auto mb-4" />
                <p className="text-white/40 text-lg font-heading">No sequences yet</p>
                <p className="text-white/20 text-sm mt-1 mb-5">Create automated follow-up sequences to close more creator deals</p>
                <button onClick={() => setShowAddSeq(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl btn-primary text-sm">
                  <Plus className="w-4 h-4" /> Create First Sequence
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {sequences.map(seq => (
                  <SequenceRow key={seq.sequence_id} seq={seq} onDelete={deleteSequence} />
                ))}
              </div>
            )}
          </motion.div>
        )}
        {tab === "negotiate" && (
          <motion.div key="negotiate" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
            <NegotiateTab />
          </motion.div>
        )}
        {tab === "deals" && (
          <motion.div key="deals" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
            <DealsTab />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Sequence Modal */}
      <AnimatePresence>
        {showAddSeq && <AddSequenceModal onAdd={addSequence} onClose={() => setShowAddSeq(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}
