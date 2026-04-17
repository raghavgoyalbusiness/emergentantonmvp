import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Plus, Bot, User, Sparkles, Copy, Check,
  Mail, X, Loader2, CheckSquare, Square, Users, ChevronDown
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const newSessionId = () => `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

// ─── Parser ───────────────────────────────────────────────────────────────────
// Handles actual Bedrock format: **1. Name (@handle)** + **Email Contact:** email
// Also extracts plain email-only lists when no structured profiles are present.

// Emails that must never be treated as influencer contacts
const SKIP_EMAILS = new Set([
  "influencerconnect3@gmail.com",
  "influencerconnectai@hotmail.com",
]);

function emailToHandle(email) {
  const local = email.split("@")[0].toLowerCase();
  const domain = email.split("@")[1] || "";
  const domainName = domain.split(".")[0];
  const GENERIC = ["business", "contact", "info", "hello", "hi", "admin", "support", "work", "mail", "team"];
  return GENERIC.includes(local) ? domainName : local.replace(/[._-]/g, "").replace(/\d+$/, "");
}

function emailToName(email) {
  const handle = emailToHandle(email);
  // Capitalise first letter only; keep the rest as-is
  return handle.charAt(0).toUpperCase() + handle.slice(1);
}

function parseInfluencers(text) {
  const results = [];
  const seenHandles = new Set();
  const seenEmails  = new Set();

  // ── PASS 1: structured profiles  ──────────────────────────────────────────
  // Supports "**1. Name" (Bedrock actual) and "### 1. **Name" (fallback)
  const sections = text
    .split(/\n(?=(?:\*{1,2}\d+[\.\)]\s|#{1,4}\s*\d+[\.\)]\s*\*{0,2}))/)
    .filter(s => s.trim());

  for (const section of sections) {
    if (!section.trim()) continue;

    const handleMatch =
      section.match(/\(@([\w.]+)\)/) ||
      section.match(/(?:^|\*|\s)@([\w.]+)(?:\*|\s|\)|\n|$)/m);
    if (!handleMatch) continue;
    const handle = handleMatch[1];

    if (["gmail","yahoo","hotmail","outlook","instagram","twitter","tiktok"].includes(handle.toLowerCase())) continue;
    if (seenHandles.has(handle)) continue;

    const labeledEmailMatch = section.match(
      /Email[^:\n]{0,25}:\s*\*{0,2}\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i
    );
    const anyEmailMatch = section.match(
      /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/
    );
    const email = labeledEmailMatch
      ? labeledEmailMatch[1].trim()
      : anyEmailMatch ? anyEmailMatch[1] : null;
    if (!email) continue;
    if (SKIP_EMAILS.has(email.toLowerCase())) continue;

    const titleLine =
      section.split("\n").find(l => l.includes(`@${handle}`)) ||
      section.split("\n")[0];
    const nameMatch = titleLine.match(/^[*#\d.\s]*([A-Z][^(@\n*]+?)(?:\s*\(@)/);
    const name = nameMatch ? nameMatch[1].trim() : handle;

    const followersMatch = section.match(/Followers?[^:\n]*:\s*\*{0,2}([0-9,]+(?:\s*[KMBkm])?)/i);
    const engMatch = section.match(/Engagement[^:\n]*:\s*\*{0,2}([0-9.]+%?)/i);
    const engVal = engMatch ? engMatch[1] : null;

    seenHandles.add(handle);
    seenEmails.add(email.toLowerCase());
    results.push({
      handle,
      name: name || handle,
      email,
      followers: followersMatch ? followersMatch[1].trim() : null,
      engagement: engVal ? (engVal.includes("%") ? engVal : `${engVal}%`) : null,
    });
  }

  // ── PASS 2: plain email addresses not captured above  ─────────────────────
  const emailRegex = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g;
  let match;
  while ((match = emailRegex.exec(text)) !== null) {
    const email = match[1];
    const emailLower = email.toLowerCase();
    if (SKIP_EMAILS.has(emailLower)) continue;
    if (seenEmails.has(emailLower)) continue;

    seenEmails.add(emailLower);
    const handle = emailToHandle(email) + "_" + emailLower.replace(/[^a-z0-9]/g, "").slice(0, 6);
    const name   = emailToName(email);
    results.push({ handle, name, email, followers: null, engagement: null });
  }

  return results;
}

// ─── Variants ─────────────────────────────────────────────────────────────────
const wrap     = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const item     = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } };
const msgItem  = { hidden: { opacity: 0, y: 12, scale: 0.98 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: "easeOut" } } };
const cardItem = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" } } };

const STARTERS = [
  "Find top 5 beauty influencers from the US for a skincare brand.",
  "Who are the best fitness micro-influencers on Instagram?",
  "Find tech reviewers from India with 1M+ followers.",
  "Suggest travel influencers for a luxury hotel campaign.",
];

// ─── Copy ─────────────────────────────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10">
      {copied ? <Check className="w-3.5 h-3.5 text-[#00D4C8]" /> : <Copy className="w-3.5 h-3.5 text-white/40" />}
    </button>
  );
}

// ─── Markdown ─────────────────────────────────────────────────────────────────
function AgentMarkdown({ content }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
      h1: ({ children }) => <h1 className="font-heading font-bold text-lg text-white mt-3 mb-2 first:mt-0">{children}</h1>,
      h2: ({ children }) => <h2 className="font-heading font-semibold text-base text-white mt-3 mb-1.5 first:mt-0">{children}</h2>,
      h3: ({ children }) => <h3 className="font-heading font-semibold text-sm text-[#00D4C8] mt-3 mb-1 first:mt-0">{children}</h3>,
      p:  ({ children }) => <p className="text-white/85 text-sm leading-relaxed mb-2 last:mb-0">{children}</p>,
      strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
      ul: ({ children }) => <ul className="space-y-1 my-2 pl-1">{children}</ul>,
      ol: ({ children }) => <ol className="space-y-1 my-2 pl-4 list-decimal">{children}</ol>,
      li: ({ children }) => <li className="text-sm text-white/80 leading-relaxed flex gap-2"><span className="text-[#00D4C8] mt-1.5 flex-shrink-0">•</span><span>{children}</span></li>,
      hr: () => <hr className="border-0 border-t border-white/10 my-3" />,
      a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#00D4C8] hover:underline underline-offset-2">{children}</a>,
      code: ({ inline, children }) => inline
        ? <code className="bg-white/10 text-[#00D4C8] text-xs px-1.5 py-0.5 rounded font-mono">{children}</code>
        : <pre className="bg-black border border-white/10 rounded-lg p-3 overflow-x-auto my-2"><code className="text-xs text-white/80 font-mono">{children}</code></pre>,
      table: ({ children }) => <div className="overflow-x-auto my-3"><table className="w-full text-xs border-collapse">{children}</table></div>,
      thead: ({ children }) => <thead className="border-b border-white/10">{children}</thead>,
      tr: ({ children }) => <tr className="border-b border-white/5">{children}</tr>,
      th: ({ children }) => <th className="text-left text-white/40 font-medium py-1.5 pr-4">{children}</th>,
      td: ({ children }) => <td className="text-white/75 py-1.5 pr-4">{children}</td>,
    }}>
      {content}
    </ReactMarkdown>
  );
}

// ─── Influencer card ──────────────────────────────────────────────────────────
function InfluencerCard({ inf, selected, onToggle, onConnect }) {
  const [imgSrc, setImgSrc] = useState(`https://unavatar.io/instagram/${inf.handle}`);
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(inf.name)}&background=131936&color=00D4C8&bold=true&size=128`;

  return (
    <motion.div
      variants={cardItem}
      className={`flex items-center gap-3 rounded-xl p-3 border transition-all cursor-pointer ${
        selected
          ? "bg-[#00D4C8]/5 border-[#00D4C8]/35"
          : "bg-black border-white/6 hover:border-white/15"
      }`}
      onClick={() => onToggle(inf.handle)}
    >
      {/* Checkbox */}
      <div className="flex-shrink-0" onClick={e => { e.stopPropagation(); onToggle(inf.handle); }}>
        {selected
          ? <CheckSquare className="w-4 h-4 text-[#00D4C8]" />
          : <Square className="w-4 h-4 text-white/20" />}
      </div>

      {/* Avatar */}
      <img
        src={imgSrc}
        alt={inf.name}
        onError={() => setImgSrc(fallback)}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-white/10"
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-semibold truncate">{inf.name}</p>
        <p className="text-white/40 text-xs">@{inf.handle}</p>
        <div className="flex gap-2 mt-0.5">
          {inf.followers  && <span className="text-white/30 text-xs">{inf.followers} followers</span>}
          {inf.engagement && <span className="text-[#00D4C8]/60 text-xs">{inf.engagement}</span>}
        </div>
        <p className="text-white/20 text-xs truncate">{inf.email}</p>
      </div>

      {/* Individual connect */}
      <button
        onClick={e => { e.stopPropagation(); onConnect([inf]); }}
        data-testid={`connect-btn-${inf.handle}`}
        className="flex items-center gap-1 px-2.5 py-1.5 bg-[#00D4C8]/10 hover:bg-[#00D4C8]/20 border border-[#00D4C8]/30 hover:border-[#00D4C8]/60 text-[#00D4C8] rounded-lg text-xs font-semibold transition-all flex-shrink-0"
      >
        <Mail className="w-3 h-3" /> Connect
      </button>
    </motion.div>
  );
}

// ─── Bulk action bar ──────────────────────────────────────────────────────────
function BulkBar({ influencers, selected, onToggleAll, onSendSelected, onSendAll }) {
  const allSelected = selected.size === influencers.length;
  const noneSelected = selected.size === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-white/5"
    >
      {/* Select toggle */}
      <button
        onClick={onToggleAll}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/8 text-white/60 hover:text-white text-xs transition-all"
        data-testid="toggle-select-all"
      >
        {allSelected ? <CheckSquare className="w-3.5 h-3.5 text-[#00D4C8]" /> : <Square className="w-3.5 h-3.5" />}
        {allSelected ? "Deselect All" : "Select All"}
      </button>

      {selected.size > 0 && (
        <span className="text-white/40 text-xs">{selected.size} selected</span>
      )}

      <div className="flex gap-2 ml-auto">
        {/* Send to selected */}
        <button
          onClick={onSendSelected}
          disabled={noneSelected}
          data-testid="send-selected-btn"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-[#00D4C8]/10 hover:border-[#00D4C8]/30 text-white/60 hover:text-[#00D4C8] text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Users className="w-3.5 h-3.5" />
          Send to Selected ({selected.size})
        </button>

        {/* Send to all */}
        <button
          onClick={onSendAll}
          data-testid="send-all-btn"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00D4C8] hover:bg-[#00bfb3] text-black text-xs font-semibold transition-all"
        >
          <Mail className="w-3.5 h-3.5" />
          Send to All ({influencers.length})
        </button>
      </div>
    </motion.div>
  );
}

// ─── Outreach modal (single or bulk) ─────────────────────────────────────────
function OutreachModal({ targets, onClose }) {
  const isBulk = targets.length > 1;
  const [form, setForm] = useState({
    brand_name: "", budget: "", target_audience: "", campaign_details: "", product_details: "",
  });
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null); // null | { sent, failed }
  const [error, setError] = useState("");

  const field = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.brand_name || !form.budget || !form.target_audience || !form.campaign_details || !form.product_details) {
      setError("Please fill in all fields."); return;
    }
    setSending(true); setError("");
    const settled = await Promise.allSettled(
      targets.map(inf =>
        axios.post(`${API}/agent/send-outreach`, {
          to_email: inf.email,
          influencer_name: inf.name,
          influencer_handle: inf.handle,
          ...form,
        })
      )
    );
    const sent   = settled.filter(r => r.status === "fulfilled").length;
    const failed = settled.filter(r => r.status === "rejected").length;
    setResults({ sent, failed });
    setSending(false);
  };

  const inputCls = "w-full bg-black border border-white/10 focus:border-[#00D4C8]/50 rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/25 focus:outline-none transition-colors";

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.22 }}
        className="bg-[#131936] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        data-testid="outreach-modal"
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-white/5">
          <div className="w-9 h-9 rounded-xl bg-[#00D4C8]/10 border border-[#00D4C8]/25 flex items-center justify-center flex-shrink-0">
            {isBulk ? <Users className="w-4 h-4 text-[#00D4C8]" /> : <Mail className="w-4 h-4 text-[#00D4C8]" />}
          </div>
          <div className="flex-1 min-w-0">
            {isBulk ? (
              <>
                <h3 className="font-heading font-semibold text-white text-base">Bulk Outreach</h3>
                <p className="text-white/40 text-xs">Sending to {targets.length} influencers</p>
              </>
            ) : (
              <>
                <h3 className="font-heading font-semibold text-white text-base">{targets[0].name}</h3>
                <p className="text-white/40 text-xs">@{targets[0].handle} · {targets[0].email}</p>
              </>
            )}
          </div>
          {/* Bulk: show avatar stack */}
          {isBulk && (
            <div className="flex -space-x-2 mr-2">
              {targets.slice(0, 4).map(inf => (
                <img key={inf.handle}
                  src={`https://unavatar.io/instagram/${inf.handle}`}
                  alt={inf.name}
                  onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(inf.name)}&background=131936&color=00D4C8&bold=true&size=64`; }}
                  className="w-7 h-7 rounded-full border-2 border-[#131936] object-cover"
                />
              ))}
              {targets.length > 4 && (
                <div className="w-7 h-7 rounded-full border-2 border-[#131936] bg-[#00D4C8]/20 flex items-center justify-center">
                  <span className="text-[#00D4C8] text-xs font-bold">+{targets.length - 4}</span>
                </div>
              )}
            </div>
          )}
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {results ? (
          /* Results screen */
          <div className="flex flex-col items-center py-10 px-8 text-center">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${results.failed === 0 ? "bg-green-500/10 border border-green-500/20" : "bg-yellow-500/10 border border-yellow-500/20"}`}>
              <Check className={`w-7 h-7 ${results.failed === 0 ? "text-green-400" : "text-yellow-400"}`} />
            </div>
            <h4 className="font-heading font-semibold text-white text-lg mb-1">
              {results.failed === 0 ? "All Emails Sent!" : "Partially Sent"}
            </h4>
            <p className="text-white/50 text-sm">
              <span className="text-green-400 font-semibold">{results.sent} sent</span>
              {results.failed > 0 && <span className="text-red-400 font-semibold ml-2">{results.failed} failed</span>}
            </p>
            <p className="text-white/30 text-xs mt-1">Sent from influencerconnect3@gmail.com · Reply-To: influencerconnectai@hotmail.com</p>
            <button onClick={onClose} className="mt-6 btn-primary px-6 py-2.5 rounded-xl text-sm">Done</button>
          </div>
        ) : (
          /* Form */
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-white/50 text-xs mb-1 block">Brand Name *</label>
                <input value={form.brand_name} onChange={e => field("brand_name", e.target.value)} placeholder="e.g. Lumina Beauty" className={inputCls} data-testid="modal-brand-name" />
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1 block">Budget *</label>
                <input value={form.budget} onChange={e => field("budget", e.target.value)} placeholder="e.g. $2,000–$5,000" className={inputCls} data-testid="modal-budget" />
              </div>
            </div>
            <div>
              <label className="text-white/50 text-xs mb-1 block">Product / Service *</label>
              <input value={form.product_details} onChange={e => field("product_details", e.target.value)} placeholder="e.g. Organic skincare serum line" className={inputCls} data-testid="modal-product" />
            </div>
            <div>
              <label className="text-white/50 text-xs mb-1 block">Campaign Details *</label>
              <textarea value={form.campaign_details} onChange={e => field("campaign_details", e.target.value)} placeholder="e.g. 2 Instagram posts + 1 story in June showcasing the product" rows={2} className={`${inputCls} resize-none`} data-testid="modal-campaign" />
            </div>
            <div>
              <label className="text-white/50 text-xs mb-1 block">Target Audience *</label>
              <input value={form.target_audience} onChange={e => field("target_audience", e.target.value)} placeholder="e.g. Women 25–35, health-conscious, skincare enthusiasts" className={inputCls} data-testid="modal-audience" />
            </div>
            {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 btn-secondary py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={submit} disabled={sending} data-testid="send-outreach-btn"
                className="flex-1 btn-primary py-2.5 rounded-xl text-sm flex items-center gap-2 justify-center disabled:opacity-60">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {sending
                  ? `Sending to ${targets.length}...`
                  : isBulk
                    ? `Send to ${targets.length} Influencers`
                    : "Send Email"}
              </button>
            </div>
            <p className="text-white/20 text-xs text-center">From influencerconnect3@gmail.com · Reply-To influencerconnectai@hotmail.com</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="flex gap-3">
      <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center bg-[#131936] border border-white/10">
        <Bot className="w-4 h-4 text-white/70" />
      </div>
      <div className="bg-[#131936] border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        <div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" />
      </div>
    </motion.div>
  );
}

// ─── Message + cards section ──────────────────────────────────────────────────
function Message({ msg, onOpenModal }) {
  const isUser = msg.role === "user";
  const [selected, setSelected] = useState(new Set());

  const toggle = (handle) =>
    setSelected(prev => {
      const next = new Set(prev);
      next.has(handle) ? next.delete(handle) : next.add(handle);
      return next;
    });

  const toggleAll = () => {
    if (selected.size === msg.influencers.length) setSelected(new Set());
    else setSelected(new Set(msg.influencers.map(i => i.handle)));
  };

  return (
    <motion.div variants={msgItem} className="space-y-3">
      <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} group`}>
        <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center mt-1 ${isUser ? "bg-[#00D4C8]/15 border border-[#00D4C8]/25" : "bg-[#131936] border border-white/10"}`}>
          {isUser ? <User className="w-4 h-4 text-[#00D4C8]" /> : <Bot className="w-4 h-4 text-white/70" />}
        </div>
        <div className={`max-w-[80%] flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
          <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${isUser ? "bg-[#00D4C8] text-black font-medium rounded-tr-sm" : "bg-[#0E1530] text-white/85 border border-white/8 rounded-tl-sm"}`}>
            {isUser ? <p className="text-black">{msg.content}</p> : <AgentMarkdown content={msg.content} />}
          </div>
          <div className={`flex items-center gap-1 ${isUser ? "flex-row-reverse" : ""}`}>
            <span className="text-white/25 text-xs">{msg.time}</span>
            {!isUser && <CopyButton text={msg.content} />}
          </div>
        </div>
      </div>

      {/* Influencer cards + bulk bar */}
      {!isUser && msg.influencers?.length > 0 && (
        <div className="ml-11">
          <p className="text-white/30 text-xs mb-2 flex items-center gap-1.5">
            <Mail className="w-3 h-3 text-[#00D4C8]" />
            {msg.influencers.length} creator{msg.influencers.length > 1 ? "s" : ""} found — select &amp; send outreach emails
          </p>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-2"
            initial="hidden" animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
          >
            {msg.influencers.map(inf => (
              <InfluencerCard
                key={inf.handle}
                inf={inf}
                selected={selected.has(inf.handle)}
                onToggle={toggle}
                onConnect={onOpenModal}
              />
            ))}
          </motion.div>

          <BulkBar
            influencers={msg.influencers}
            selected={selected}
            onToggleAll={toggleAll}
            onSendSelected={() => onOpenModal(msg.influencers.filter(i => selected.has(i.handle)))}
            onSendAll={() => onOpenModal(msg.influencers)}
          />
        </div>
      )}
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function BrandAgent() {
  const [sessionId, setSessionId] = useState(newSessionId);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalTargets, setModalTargets] = useState(null); // null | influencer[]
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async (text) => {
    const content = (text || input).trim();
    if (!content || loading) return;
    const userMsg = { role: "user", content, time: now(), id: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/agent/chat`, { message: content, session_id: sessionId });
      const response  = data.response || "I didn't receive a response. Please try again.";
      const influencers = parseInfluencers(response);
      setMessages(prev => [...prev, { role: "agent", content: response, influencers, time: now(), id: Date.now() + 1 }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "agent", content: `Error: ${e?.response?.data?.detail || e.message}`, influencers: [], time: now(), id: Date.now() + 1 }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const newChat = () => { setMessages([]); setSessionId(newSessionId()); setInput(""); };

  return (
    <motion.div className="max-w-4xl mx-auto h-[calc(100vh-90px)] flex flex-col" initial="hidden" animate="visible" variants={wrap}>
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00D4C8]/10 border border-[#00D4C8]/25 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#00D4C8]" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-white">Brand Agent</h1>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-white/40 text-xs">Powered by AWS Bedrock · Claude</span>
            </div>
          </div>
        </div>
        <button onClick={newChat} data-testid="new-chat-btn"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/8 hover:border-white/20 text-white/60 hover:text-white text-sm transition-all">
          <Plus className="w-4 h-4" /> New Chat
        </button>
      </motion.div>

      {/* Chat window */}
      <motion.div variants={item} className="flex-1 bg-[#131936] border border-white/5 rounded-2xl overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-5 space-y-4" data-testid="messages-area">
          <AnimatePresence>
            {messages.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-center py-10">
                <div className="w-16 h-16 rounded-2xl bg-[#00D4C8]/10 border border-[#00D4C8]/20 flex items-center justify-center mb-4">
                  <Sparkles className="w-7 h-7 text-[#00D4C8]" strokeWidth={1.5} />
                </div>
                <h3 className="font-heading font-semibold text-white text-lg mb-1">Ask your Brand Agent</h3>
                <p className="text-white/40 text-sm mb-8 max-w-sm">
                  Find influencers, select who to target, and send personalised outreach — all from one place.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {STARTERS.map((s, i) => (
                    <button key={i} onClick={() => send(s)} data-testid={`starter-${i}`}
                      className="text-left px-4 py-3 bg-black border border-white/5 hover:border-[#00D4C8]/25 rounded-xl text-white/60 hover:text-white text-xs leading-relaxed transition-all">
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div key="msgs" className="space-y-5" initial="hidden" animate="visible"
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}>
                {messages.map(msg => (
                  <Message key={msg.id} msg={msg} onOpenModal={setModalTargets} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>{loading && <TypingIndicator key="typing" />}</AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* Session chip */}
        <div className="px-5 py-1.5 flex items-center justify-between border-t border-white/3">
          <span className="text-white/20 text-xs font-mono truncate max-w-xs">{sessionId}</span>
          <span className="text-white/20 text-xs">{messages.filter(m => m.role === "user").length} messages</span>
        </div>

        {/* Input */}
        <div className="p-3 border-t border-white/5">
          <div className="flex gap-2 items-end bg-black border border-white/10 focus-within:border-[#00D4C8]/40 rounded-xl px-4 py-3 transition-all">
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Find influencers, ask for strategy, request outreach briefs..."
              rows={1} data-testid="chat-input"
              className="flex-1 bg-transparent text-white text-sm placeholder-white/30 focus:outline-none resize-none leading-relaxed max-h-32 overflow-y-auto"
              style={{ fieldSizing: "content" }} />
            <button onClick={() => send()} disabled={!input.trim() || loading} data-testid="send-btn"
              className="w-9 h-9 rounded-lg bg-[#00D4C8] hover:bg-[#00bfb3] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all flex-shrink-0">
              <Send className="w-4 h-4 text-black" />
            </button>
          </div>
          <p className="text-white/20 text-xs mt-1.5 pl-1">Enter to send · Shift+Enter for new line</p>
        </div>
      </motion.div>

      {/* Outreach modal */}
      <AnimatePresence>
        {modalTargets && (
          <OutreachModal
            key="modal"
            targets={modalTargets}
            onClose={() => setModalTargets(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
