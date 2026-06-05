import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Plus, Bot, User, Sparkles, Copy, Check,
  Mail, X, Loader2, CheckSquare, Square, Users, Crown, Lock, MessageCircle, Wand2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SendDMModal } from "@/components/SendDMModal";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const newSessionId = () => `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const FREE_QUERY_LIMIT = 5;
const STORAGE_KEY = "agent_free_queries_used";

// ─── Parser ───────────────────────────────────────────────────────────────────
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
  return handle.charAt(0).toUpperCase() + handle.slice(1);
}

function parseInfluencers(text) {
  const results = [];
  const seenHandles = new Set();
  const seenEmails  = new Set();

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
    let email = labeledEmailMatch
      ? labeledEmailMatch[1].trim()
      : anyEmailMatch ? anyEmailMatch[1] : null;
    if (email && SKIP_EMAILS.has(email.toLowerCase())) email = null;

    const linktreeMatch = section.match(/(?:LinkTree|Linktree|linktree)[^:]*:\s*(https?:\/\/\S+)/i);
    const youtubeMatch  = section.match(/(?:YouTube)[^:]*:\s*(https?:\/\/\S+)/i);
    const contactUrl    = linktreeMatch ? linktreeMatch[1].trim()
                        : youtubeMatch  ? youtubeMatch[1].trim()
                        : null;

    const titleLine =
      section.split("\n").find(l => l.includes(`@${handle}`)) ||
      section.split("\n")[0];
    const nameMatch = titleLine.match(/^[*#\d.\s]*([A-Z][^(@\n*]+?)(?:\s*\(@)/);
    const name = nameMatch ? nameMatch[1].trim() : handle;

    const followersMatch = section.match(/Followers?[^:\n]*:\s*\*{0,2}([0-9,]+(?:\s*[KMBkm])?)/i);
    const engMatch = section.match(/Engagement[^:\n]*:\s*\*{0,2}([0-9.]+%?)/i);
    const countryMatch = section.match(/Country[^:\n]*:\s*\*{0,2}([^\n*]+)/i);

    seenHandles.add(handle);
    if (email) seenEmails.add(email.toLowerCase());
    results.push({
      handle, name: name || handle, email, contactUrl,
      followers: followersMatch ? followersMatch[1].trim() : null,
      engagement: engMatch ? (engMatch[1].includes("%") ? engMatch[1] : `${engMatch[1]}%`) : null,
      country: countryMatch ? countryMatch[1].trim() : null,
    });
  }

  const emailRegex = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g;
  let match;
  while ((match = emailRegex.exec(text)) !== null) {
    const email = match[1];
    const emailLower = email.toLowerCase();
    if (SKIP_EMAILS.has(emailLower) || seenEmails.has(emailLower)) continue;
    seenEmails.add(emailLower);
    const handle = emailToHandle(email) + "_" + emailLower.replace(/[^a-z0-9]/g, "").slice(0, 6);
    const name   = emailToName(email);
    results.push({ handle, name, email, contactUrl: null, followers: null, engagement: null, country: null });
  }

  return results;
}

// ─── Redact sensitive data from Claude text for non-subscribers ───────────────
function escRx(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function redactText(text, influencers) {
  // Step 0: Extract names directly from numbered-list patterns in the raw text.
  // This is more reliable than relying on the card parser (which may fail when **bold** markers
  // wrap the name, e.g. "**5. Yashika Enterprises** (@handle)").
  // Pattern matches: "1. Name (@handle)" or "**1. Name** (@handle)" or "**1. Name (@handle)**"
  const nameFromRawRegex = /\d+[.)]\s*\*{0,2}([A-Z][^(@\n*]{2,}?)\*{0,2}\s*\(@?([\w.]+)\)/g;
  const namesFromText = new Set();
  let m;
  while ((m = nameFromRawRegex.exec(text)) !== null) {
    const name = m[1].trim();
    if (name.length > 2) namesFromText.add(name);
  }

  let out = text;

  // 1. Replace every known email
  for (const inf of influencers) {
    if (inf.email) {
      out = out.replace(new RegExp(escRx(inf.email), "gi"), "[ email hidden ]");
    }
  }
  // Replace any remaining email addresses
  out = out.replace(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, "[ email hidden ]");

  // 2. Replace names from parsed influencers (longest first to avoid partial matches)
  const sortedByName = [...influencers].sort((a, b) => b.name.length - a.name.length);
  for (const inf of sortedByName) {
    if (inf.name && inf.name.length > 2 && inf.name !== inf.handle) {
      out = out.replace(new RegExp(escRx(inf.name), "g"), "[ name hidden ]");
    }
  }

  // 3. Replace names extracted directly from raw text patterns (catches parser misses)
  const sortedRawNames = [...namesFromText].sort((a, b) => b.length - a.length);
  for (const name of sortedRawNames) {
    out = out.replace(new RegExp(escRx(name), "g"), "[ name hidden ]");
  }

  // 4. Replace @handles
  for (const inf of influencers) {
    out = out.replace(new RegExp(`@${escRx(inf.handle)}`, "gi"), "@[ hidden ]");
    out = out.replace(new RegExp(`\\(${escRx(inf.handle)}\\)`, "gi"), "(@[ hidden ])");
  }

  return out;
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
        : <pre className="glass-1 rounded-lg p-3 overflow-x-auto my-2"><code className="text-xs text-white/80 font-mono">{children}</code></pre>,
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

// ─── Subscribe Paywall Modal (click on blurred field) ─────────────────────────
function SubscribeModal({ onSubscribe, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.2 }}
        className="glass-3 rounded-2xl p-8 w-full max-w-sm text-center shadow-2xl"
        onClick={e => e.stopPropagation()}
        data-testid="subscribe-paywall-modal"
      >
        <div className="w-14 h-14 rounded-2xl bg-[#00D4C8]/10 border border-[#00D4C8]/25 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6 text-[#00D4C8]" />
        </div>
        <h3 className="font-heading font-bold text-white text-xl mb-2">Premium Content</h3>
        <p className="text-white/50 text-sm mb-6 leading-relaxed">
          Influencer names, social handles, and contact details are only visible to subscribers.
          Subscribe to unlock full access.
        </p>
        <div className="space-y-3">
          <button
            onClick={onSubscribe}
            data-testid="paywall-subscribe-btn"
            className="w-full btn-primary py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Crown className="w-4 h-4" /> Subscribe to Unlock
          </button>
          <button
            onClick={onClose}
            className="w-full btn-secondary py-2.5 rounded-xl text-sm text-white/50"
          >
            Maybe later
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Persistent subscribe banner (above input) ────────────────────────────────
function SubscribeBanner({ queriesUsed, onSubscribe }) {
  const remaining = Math.max(0, FREE_QUERY_LIMIT - queriesUsed);
  const isExhausted = remaining === 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-3 rounded-xl px-4 py-2.5 mb-2 border ${
        isExhausted
          ? "bg-red-500/8 border-red-500/20"
          : "bg-[#00D4C8]/5 border-[#00D4C8]/18"
      }`}
      data-testid="subscribe-banner"
    >
      <Crown className={`w-4 h-4 flex-shrink-0 ${isExhausted ? "text-red-400" : "text-[#00D4C8]"}`} />
      <div className="flex-1 min-w-0">
        {isExhausted ? (
          <>
            <p className="text-red-400 text-xs font-semibold">Free query limit reached</p>
            <p className="text-white/35 text-xs">Subscribe to continue using Brand Agent</p>
          </>
        ) : (
          <>
            <p className="text-[#00D4C8] text-xs font-semibold">
              {remaining} free {remaining === 1 ? "query" : "queries"} remaining
            </p>
            <p className="text-white/35 text-xs">Subscribe for unlimited queries & full contact details</p>
          </>
        )}
      </div>
      <button
        onClick={onSubscribe}
        data-testid="banner-subscribe-btn"
        className="btn-primary px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 flex items-center gap-1.5"
      >
        <Crown className="w-3 h-3" /> Subscribe
      </button>
    </motion.div>
  );
}

// ─── In-message subscribe prompt (after each agent reply) ─────────────────────
function InlineSubscribePrompt({ onSubscribe }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="ml-11 mt-3 flex items-center gap-3 bg-gradient-to-r from-[#00D4C8]/8 via-[#00D4C8]/4 to-transparent border border-[#00D4C8]/15 rounded-xl px-4 py-3"
      data-testid="inline-subscribe-prompt"
    >
      <div className="w-7 h-7 rounded-lg bg-[#00D4C8]/15 border border-[#00D4C8]/30 flex items-center justify-center flex-shrink-0">
        <Crown className="w-3.5 h-3.5 text-[#00D4C8]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white/80 text-xs font-semibold">Unlock full influencer data</p>
        <p className="text-white/35 text-xs">Subscribe to reveal names, social handles &amp; contact details</p>
      </div>
      <button
        onClick={onSubscribe}
        data-testid="inline-subscribe-btn"
        className="btn-primary px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 flex items-center gap-1.5"
      >
        Subscribe <span className="opacity-70">→</span>
      </button>
    </motion.div>
  );
}

// ─── Influencer card ──────────────────────────────────────────────────────────
function InfluencerCard({ inf, selected, onToggle, onConnect, isSubscribed, onBlurClick, onDM }) {
  const [imgSrc, setImgSrc] = useState(`https://unavatar.io/instagram/${inf.handle}`);
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(inf.name)}&background=131936&color=00D4C8&bold=true&size=128`;
  const hasContact = !!inf.email;
  const blurred = !isSubscribed;

  const handleBlurClick = (e) => {
    if (blurred) { e.stopPropagation(); onBlurClick(); }
  };

  return (
    <motion.div
      variants={cardItem}
      className={`flex items-center gap-3 rounded-xl p-3 border transition-all ${
        blurred ? "cursor-default" : "cursor-pointer"
      } ${
        selected
          ? "bg-[#00D4C8]/5 border-[#00D4C8]/35"
          : "glass-1 border-white/6 hover:border-white/15"
      }`}
      onClick={() => !blurred && onToggle(inf.handle)}
      data-testid={`influencer-card-${inf.handle}`}
    >
      {/* Checkbox — hidden when blurred */}
      {!blurred && (
        <div className="flex-shrink-0" onClick={e => { e.stopPropagation(); onToggle(inf.handle); }}>
          {selected
            ? <CheckSquare className="w-4 h-4 text-[#00D4C8]" />
            : <Square className="w-4 h-4 text-white/20" />}
        </div>
      )}
      {blurred && (
        <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
          <Lock className="w-3.5 h-3.5 text-white/20" />
        </div>
      )}

      {/* Avatar */}
      <img
        src={imgSrc}
        alt="Creator"
        onError={() => setImgSrc(fallback)}
        className={`w-10 h-10 rounded-full object-cover flex-shrink-0 border border-white/10 ${blurred ? "blur-sm" : ""}`}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        {/* Name — hidden for non-subscribers */}
        <p
          className={`text-xs font-semibold truncate select-none ${
            blurred
              ? "text-white/20 italic cursor-pointer hover:text-[#00D4C8]/40 transition-colors"
              : "text-white"
          }`}
          onClick={handleBlurClick}
          data-testid={blurred ? `blurred-name-${inf.handle}` : undefined}
        >
          {blurred ? "Name hidden" : inf.name}
        </p>

        {/* Handle — hidden */}
        <p
          className={`text-xs select-none ${blurred ? "text-white/15 italic cursor-pointer" : "text-white/40"}`}
          onClick={handleBlurClick}
        >
          {blurred ? "Handle hidden" : `@${inf.handle}`}
        </p>

        <div className="flex gap-2 mt-0.5 flex-wrap">
          {inf.followers  && <span className="text-white/30 text-xs">{inf.followers} followers</span>}
          {inf.engagement && <span className="text-[#00D4C8]/60 text-xs">{inf.engagement}</span>}
          {inf.country    && <span className="text-white/20 text-xs">{inf.country}</span>}
        </div>

        {/* Email — hidden */}
        {blurred ? (
          <p
            className="text-white/15 text-xs italic truncate select-none cursor-pointer"
            onClick={handleBlurClick}
          >
            {hasContact ? "Contact hidden" : "No contact available"}
          </p>
        ) : hasContact ? (
          <p className="text-white/20 text-xs truncate">{inf.email}</p>
        ) : inf.contactUrl ? (
          <a href={inf.contactUrl} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-[#00D4C8]/40 text-xs truncate hover:text-[#00D4C8]/70 transition-colors">
            View profile
          </a>
        ) : (
          <p className="text-white/15 text-xs italic">No email available</p>
        )}
      </div>

      {/* Connect / Lock button */}
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        {blurred ? (
          <button
            onClick={handleBlurClick}
            data-testid={`locked-connect-${inf.handle}`}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white/3 border border-white/10 text-white/20 rounded-lg text-xs hover:bg-[#00D4C8]/10 hover:text-[#00D4C8] hover:border-[#00D4C8]/20 transition-all"
          >
            <Lock className="w-3 h-3" /> Locked
          </button>
        ) : hasContact ? (
          <button
            onClick={e => { e.stopPropagation(); onConnect([inf]); }}
            data-testid={`connect-btn-${inf.handle}`}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#00D4C8]/10 hover:bg-[#00D4C8]/20 border border-[#00D4C8]/30 hover:border-[#00D4C8]/60 text-[#00D4C8] rounded-lg text-xs font-semibold transition-all"
          >
            <Mail className="w-3 h-3" /> Email
          </button>
        ) : (
          <div
            data-testid={`connect-btn-${inf.handle}`}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white/3 border border-white/8 text-white/25 rounded-lg text-xs flex-shrink-0 cursor-not-allowed select-none"
          >
            <Mail className="w-3 h-3" /> No email
          </div>
        )}
        {/* DM button — always visible for subscribers */}
        {!blurred && (
          <button
            onClick={e => { e.stopPropagation(); onDM(inf); }}
            data-testid={`dm-btn-${inf.handle}`}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-pink-500/8 hover:bg-pink-500/15 border border-pink-500/20 hover:border-pink-500/40 text-pink-400/70 hover:text-pink-400 rounded-lg text-xs font-semibold transition-all"
          >
            <MessageCircle className="w-3 h-3" /> DM
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Bulk action bar ──────────────────────────────────────────────────────────
function BulkBar({ influencers, selected, onToggleAll, onSendSelected, onSendAll }) {
  const allSelected = selected.size === influencers.length;
  const withEmail   = influencers.filter(i => i.email);
  const selectedWithEmail = influencers.filter(i => selected.has(i.handle) && i.email);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-white/5"
    >
      <button onClick={onToggleAll}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/8 text-white/60 hover:text-white text-xs transition-all"
        data-testid="toggle-select-all">
        {allSelected ? <CheckSquare className="w-3.5 h-3.5 text-[#00D4C8]" /> : <Square className="w-3.5 h-3.5" />}
        {allSelected ? "Deselect All" : "Select All"}
      </button>

      {selected.size > 0 && <span className="text-white/40 text-xs">{selected.size} selected</span>}

      <div className="flex gap-2 ml-auto">
        {selectedWithEmail.length > 0 && (
          <button onClick={() => onSendSelected(selectedWithEmail)} data-testid="send-selected-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-[#00D4C8]/10 hover:border-[#00D4C8]/30 text-white/60 hover:text-[#00D4C8] text-xs transition-all">
            <Users className="w-3.5 h-3.5" />
            Send to Selected ({selectedWithEmail.length})
          </button>
        )}
        {withEmail.length > 0 && (
          <button onClick={() => onSendAll(withEmail)} data-testid="send-all-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-glass-teal text-xs font-semibold transition-all">
            <Mail className="w-3.5 h-3.5" />
            Send to All ({withEmail.length})
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Outreach modal ───────────────────────────────────────────────────────────
function OutreachModal({ targets, onClose }) {
  const isBulk = targets.length > 1;
  const firstInf = targets[0];
  const [form, setForm] = useState({ brand_name: "", budget: "", target_audience: "", campaign_details: "", product_details: "" });
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [aiDraft, setAiDraft] = useState(null);   // { subject, body }
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const field = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const generateDraft = async () => {
    if (!form.brand_name || !form.product_details) {
      setError("Please fill in Brand Name and Product/Service first."); return;
    }
    setGenerating(true); setError(""); setAiDraft(null);
    try {
      const res = await axios.post(`${API}/agent/generate-outreach`, {
        influencer_name: firstInf.name,
        influencer_handle: firstInf.handle,
        followers: firstInf.followers,
        engagement: firstInf.engagement,
        platform: "Instagram",
        ...form,
      }, { withCredentials: true });
      setAiDraft(res.data);
    } catch (e) {
      setError(e?.response?.data?.detail || "AI generation failed. Please try again.");
    } finally { setGenerating(false); }
  };

  const copyDraft = () => {
    if (!aiDraft) return;
    navigator.clipboard.writeText(`Subject: ${aiDraft.subject}\n\n${aiDraft.body}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const submit = async () => {
    if (!form.brand_name || !form.budget || !form.target_audience || !form.campaign_details || !form.product_details) {
      setError("Please fill in all fields."); return;
    }
    const emailTargets = targets.filter(inf => inf.email);
    if (emailTargets.length === 0) { setError("None of the selected influencers have contact emails."); return; }
    setSending(true); setError("");
    const settled = await Promise.allSettled(
      emailTargets.map(inf => axios.post(`${API}/agent/send-outreach`, {
        to_email: inf.email, influencer_name: inf.name, influencer_handle: inf.handle,
        email_subject: aiDraft?.subject || undefined,
        email_body: aiDraft?.body || undefined,
        ...form,
      }))
    );
    setResults({ sent: settled.filter(r => r.status === "fulfilled").length, failed: settled.filter(r => r.status === "rejected").length });
    setSending(false);
  };

  const inputCls = "w-full glass-input rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-colors";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.22 }}
        className="glass-3 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()} data-testid="outreach-modal"
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-white/5 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[#00D4C8]/10 border border-[#00D4C8]/25 flex items-center justify-center flex-shrink-0">
            {isBulk ? <Users className="w-4 h-4 text-[#00D4C8]" /> : <Mail className="w-4 h-4 text-[#00D4C8]" />}
          </div>
          <div className="flex-1 min-w-0">
            {isBulk ? (
              <><h3 className="font-heading font-semibold text-white text-base">Bulk Outreach</h3>
              <p className="text-white/40 text-xs">Sending to {targets.length} influencers</p></>
            ) : (
              <><h3 className="font-heading font-semibold text-white text-base">{firstInf.name}</h3>
              <p className="text-white/40 text-xs">@{firstInf.handle} · {firstInf.email}</p></>
            )}
          </div>
          {isBulk && (
            <div className="flex -space-x-2 mr-2">
              {targets.slice(0, 4).map(inf => (
                <img key={inf.handle} src={`https://unavatar.io/instagram/${inf.handle}`} alt={inf.name}
                  onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(inf.name)}&background=131936&color=00D4C8&bold=true&size=64`; }}
                  className="w-7 h-7 rounded-full border-2 border-[#131936] object-cover" />
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

        <div className="overflow-y-auto flex-1">
          {results ? (
            <div className="flex flex-col items-center py-10 px-8 text-center">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${results.failed === 0 ? "bg-green-500/10 border border-green-500/20" : "bg-yellow-500/10 border border-yellow-500/20"}`}>
                <Check className={`w-7 h-7 ${results.failed === 0 ? "text-green-400" : "text-yellow-400"}`} />
              </div>
              <h4 className="font-heading font-semibold text-white text-lg mb-1">{results.failed === 0 ? "All Emails Sent!" : "Partially Sent"}</h4>
              <p className="text-white/50 text-sm">
                <span className="text-green-400 font-semibold">{results.sent} sent</span>
                {results.failed > 0 && <span className="text-red-400 font-semibold ml-2">{results.failed} failed</span>}
              </p>
              <button onClick={onClose} className="mt-6 btn-primary px-6 py-2.5 rounded-xl text-sm">Done</button>
            </div>
          ) : (
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
                <textarea value={form.campaign_details} onChange={e => field("campaign_details", e.target.value)} placeholder="e.g. 2 Instagram posts + 1 story in June" rows={2} className={`${inputCls} resize-none`} data-testid="modal-campaign" />
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1 block">Target Audience *</label>
                <input value={form.target_audience} onChange={e => field("target_audience", e.target.value)} placeholder="e.g. Women 25–35, skincare enthusiasts" className={inputCls} data-testid="modal-audience" />
              </div>

              {/* AI Generate button */}
              {!isBulk && (
                <button
                  onClick={generateDraft}
                  disabled={generating}
                  data-testid="ai-generate-btn"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#00D4C8]/30 bg-[#00D4C8]/6 hover:bg-[#00D4C8]/12 text-[#00D4C8] text-sm font-semibold transition-all disabled:opacity-60"
                >
                  {generating
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating with GPT-4.1-mini…</>
                    : <><Wand2 className="w-4 h-4" /> Generate AI Email Draft</>}
                </button>
              )}

              {/* AI Draft Preview */}
              <AnimatePresence>
                {aiDraft && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-xl border border-[#00D4C8]/20 bg-[#00D4C8]/4 p-4"
                    data-testid="ai-draft-preview"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Wand2 className="w-3.5 h-3.5 text-[#00D4C8]" />
                        <span className="text-[#00D4C8] text-xs font-semibold">AI Generated Draft</span>
                      </div>
                      <button
                        onClick={copyDraft}
                        data-testid="copy-draft-btn"
                        className="flex items-center gap-1 text-white/40 hover:text-white text-xs transition-colors"
                      >
                        {copied ? <><Check className="w-3 h-3 text-green-400" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                      </button>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="text-white/35 text-xs">Subject:</span>
                        <input
                          value={aiDraft.subject}
                          onChange={e => setAiDraft(p => ({ ...p, subject: e.target.value }))}
                          className="w-full bg-transparent text-white/90 text-xs font-semibold focus:outline-none border-b border-white/10 pb-1 mt-0.5"
                          data-testid="draft-subject"
                        />
                      </div>
                      <div>
                        <span className="text-white/35 text-xs">Body:</span>
                        <textarea
                          value={aiDraft.body}
                          onChange={e => setAiDraft(p => ({ ...p, body: e.target.value }))}
                          rows={6}
                          className="w-full bg-transparent text-white/75 text-xs focus:outline-none resize-none mt-0.5 leading-relaxed"
                          data-testid="draft-body"
                        />
                      </div>
                    </div>
                    <button
                      onClick={generateDraft}
                      disabled={generating}
                      className="text-[#00D4C8]/50 hover:text-[#00D4C8] text-xs mt-1 transition-colors"
                    >
                      ↻ Regenerate
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button onClick={onClose} className="flex-1 btn-secondary py-2.5 rounded-xl text-sm">Cancel</button>
                <button onClick={submit} disabled={sending} data-testid="send-outreach-btn"
                  className="flex-1 btn-primary py-2.5 rounded-xl text-sm flex items-center gap-2 justify-center disabled:opacity-60">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  {sending ? "Sending…" : isBulk ? `Send to ${targets.length} Influencers` : "Send Email"}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="flex gap-3">
      <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center glass-1 border border-white/10">
        <Bot className="w-4 h-4 text-white/70" />
      </div>
      <div className="glass-1 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        <div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" />
      </div>
    </motion.div>
  );
}

// ─── Message + cards section ──────────────────────────────────────────────────
function Message({ msg, onOpenModal, isSubscribed, onBlurClick, onSubscribe, onDM }) {
  const isUser = msg.role === "user";
  const [selected, setSelected] = useState(new Set());

  const toggle = (handle) => setSelected(prev => {
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
        <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center mt-1 ${isUser ? "bg-[#00D4C8]/15 border border-[#00D4C8]/25" : "glass-1 border border-white/10"}`}>
          {isUser ? <User className="w-4 h-4 text-[#00D4C8]" /> : <Bot className="w-4 h-4 text-white/70" />}
        </div>
        <div className={`max-w-[80%] flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
          <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${isUser ? "bg-[#00D4C8] text-black font-medium rounded-tr-sm" : "glass-2 text-white/85 rounded-tl-sm"}`}>
            {isUser
              ? <p className="text-black">{msg.content}</p>
              : <AgentMarkdown content={
                  isSubscribed
                    ? msg.content
                    : redactText(msg.content, msg.influencers || [])
                } />
            }
          </div>
          <div className={`flex items-center gap-1 ${isUser ? "flex-row-reverse" : ""}`}>
            <span className="text-white/25 text-xs">{msg.time}</span>
            {!isUser && <CopyButton text={msg.content} />}
          </div>
        </div>
      </div>

      {/* Influencer cards */}
      {!isUser && msg.influencers?.length > 0 && (
        <div className="ml-11">
          {(() => {
            const withEmail = msg.influencers.filter(i => i.email);
            return (
              <p className="text-white/30 text-xs mb-2 flex items-center gap-1.5">
                <Mail className="w-3 h-3 text-[#00D4C8]" />
                {msg.influencers.length} creator{msg.influencers.length > 1 ? "s" : ""} found
                {!isSubscribed && <span className="text-[#00D4C8]/50 flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> contact details locked</span>}
                {isSubscribed && withEmail.length < msg.influencers.length && (
                  <span className="text-white/20">· {withEmail.length} with contact email</span>
                )}
              </p>
            );
          })()}

          <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-2"
            initial="hidden" animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}>
            {msg.influencers.map(inf => (
              <InfluencerCard
                key={inf.handle}
                inf={inf}
                selected={selected.has(inf.handle)}
                onToggle={toggle}
                onConnect={onOpenModal}
                isSubscribed={isSubscribed}
                onBlurClick={onBlurClick}
                onDM={onDM}
              />
            ))}
          </motion.div>

          {isSubscribed && (
            <BulkBar
              influencers={msg.influencers}
              selected={selected}
              onToggleAll={toggleAll}
              onSendSelected={(list) => onOpenModal(list)}
              onSendAll={(list) => onOpenModal(list)}
            />
          )}
        </div>
      )}

      {/* In-message subscribe prompt — shown after every agent reply for non-subscribers */}
      {!isUser && !isSubscribed && (
        <InlineSubscribePrompt onSubscribe={onSubscribe} />
      )}
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function BrandAgent() {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState(newSessionId);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalTargets, setModalTargets] = useState(null);
  const [dmTarget, setDmTarget] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(null); // null=checking
  const [queriesUsed, setQueriesUsed] = useState(() =>
    parseInt(sessionStorage.getItem(STORAGE_KEY) || "0", 10)
  );
  const [showPaywall, setShowPaywall] = useState(false);
  const [brandProfile, setBrandProfile] = useState(null);
  const [brandProducts, setBrandProducts] = useState([]);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // Fetch subscription status and brand profile on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // Runs once on mount. API/axios are stable module-level constants.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    axios.get(`${API}/user/subscription`, { withCredentials: true })
      .then(res => setIsSubscribed(res.data?.has_subscription === true))
      .catch(() => setIsSubscribed(false));
    // Load brand brain profile for context injection
    axios.get(`${API}/brand-brain/profile`)
      .then(r => { if (r.data && r.data.company_name) setBrandProfile(r.data); })
      .catch(err => console.warn("Brand profile not loaded:", err?.message));
    axios.get(`${API}/brand-brain/products`)
      .then(r => setBrandProducts(r.data || []))
      .catch(err => console.warn("Brand products not loaded:", err?.message));
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const goToSubscribe = useCallback(() => {
    navigate("/payments");
  }, [navigate]);

  // Build brand context string to inject into every query
  const buildBrandContext = useCallback(() => {
    if (!brandProfile?.company_name) return null;
    const parts = [
      "=== BRAND CONTEXT (use this when making recommendations) ===",
      `Company: ${brandProfile.company_name}`,
      brandProfile.industry ? `Industry: ${brandProfile.industry}` : null,
      brandProfile.price_point ? `Price point: ${brandProfile.price_point}` : null,
      brandProfile.target_audience ? `Target audience: ${brandProfile.target_audience}` : null,
      brandProfile.brand_voice ? `Brand voice: ${brandProfile.brand_voice}` : null,
      brandProfile.words_to_use?.length ? `Preferred words: ${brandProfile.words_to_use.join(", ")}` : null,
      brandProfile.words_to_avoid?.length ? `Avoid words: ${brandProfile.words_to_avoid.join(", ")}` : null,
      brandProfile.creator_no_gos?.length ? `Creator no-gos: ${brandProfile.creator_no_gos.join(", ")}` : null,
      brandProfile.topic_no_gos?.length ? `Topic no-gos: ${brandProfile.topic_no_gos.join(", ")}` : null,
      brandProfile.competitor_brands?.length ? `Competitor brands (avoid): ${brandProfile.competitor_brands.join(", ")}` : null,
      brandProducts?.length ? `Products: ${brandProducts.map(p => p.name).join(", ")}` : null,
      "===",
    ].filter(Boolean);
    return parts.join("\n");
  }, [brandProfile, brandProducts]);

  const send = async (text) => {
    const content = (text || input).trim();
    if (!content || loading) return;

    // Check query limit for non-subscribers
    if (isSubscribed === false && queriesUsed >= FREE_QUERY_LIMIT) {
      setShowPaywall(true);
      return;
    }

    const userMsg = { role: "user", content, time: now(), id: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Increment query count for non-subscribers
    if (isSubscribed === false) {
      const newCount = queriesUsed + 1;
      setQueriesUsed(newCount);
      sessionStorage.setItem(STORAGE_KEY, String(newCount));
    }

    try {
      const brandContextStr = buildBrandContext();
      const { data } = await axios.post(`${API}/agent/chat`, {
        message: content,
        session_id: sessionId,
        brand_context: brandContextStr || undefined
      });
      const response  = data.response || "I didn't receive a response. Please try again.";
      const influencers = parseInfluencers(response);
      setMessages(prev => [...prev, { role: "agent", content: response, influencers, time: now(), id: Date.now() + 1 }]);
    } catch (e) {
      const detail = e?.response?.data?.detail || e.message || "Something went wrong";
      setMessages(prev => [...prev, {
        role: "agent",
        content: `I ran into an issue fetching that data. Please try rephrasing your query or try again.\n\n_Error details: ${detail}_`,
        influencers: [],
        time: now(),
        id: Date.now() + 1
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const newChat = () => { setMessages([]); setSessionId(newSessionId()); setInput(""); };

  const isLimitReached = isSubscribed === false && queriesUsed >= FREE_QUERY_LIMIT;

  return (
    <motion.div className="max-w-4xl mx-auto h-[calc(100vh-90px)] flex flex-col" initial="hidden" animate="visible" variants={wrap}>
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00D4C8]/10 border border-[#00D4C8]/25 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#00D4C8]" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-white">Anton AI Agent</h1>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-white/40 text-xs">Powered by AWS Bedrock · Claude</span>
              {brandProfile?.company_name && (
                <span className="ml-1 text-[#00D4C8]/60 text-xs border border-[#00D4C8]/20 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#00D4C8]/60 rounded-full" />
                  {brandProfile.company_name}
                </span>
              )}
              {isSubscribed === false && (
                <span className="ml-1 text-[#00D4C8]/60 text-xs border border-[#00D4C8]/20 px-1.5 py-0.5 rounded-full">
                  Free · {Math.max(0, FREE_QUERY_LIMIT - queriesUsed)} left
                </span>
              )}
              {isSubscribed === true && (
                <span className="ml-1 text-green-400/70 text-xs border border-green-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <Crown className="w-2.5 h-2.5" /> Pro
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSubscribed === false && (
            <button onClick={goToSubscribe} data-testid="header-subscribe-btn"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#00D4C8]/10 border border-[#00D4C8]/25 hover:bg-[#00D4C8]/20 text-[#00D4C8] text-xs font-semibold transition-all">
              <Crown className="w-3.5 h-3.5" /> Upgrade
            </button>
          )}
          <button onClick={newChat} data-testid="new-chat-btn"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/8 hover:border-white/20 text-white/60 hover:text-white text-sm transition-all">
            <Plus className="w-4 h-4" /> New Chat
          </button>
        </div>
      </motion.div>

      {/* Chat window */}
      <motion.div variants={item} className="flex-1 glass-2 rounded-2xl overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-5 space-y-4" data-testid="messages-area">
          <AnimatePresence>
            {messages.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-center py-10">
                <div className="w-16 h-16 rounded-2xl bg-[#00D4C8]/10 border border-[#00D4C8]/20 flex items-center justify-center mb-4">
                  <Sparkles className="w-7 h-7 text-[#00D4C8]" strokeWidth={1.5} />
                </div>
                <h3 className="font-heading font-semibold text-white text-lg mb-1">Ask Anton AI Agent</h3>
                <p className="text-white/40 text-sm mb-2 max-w-sm">
                  Find influencers, select who to target, and send personalised outreach — all from one place.
                </p>
                {isSubscribed === false && (
                  <p className="text-white/25 text-xs mb-6">
                    Free plan: {Math.max(0, FREE_QUERY_LIMIT - queriesUsed)} of {FREE_QUERY_LIMIT} queries remaining · contact details hidden
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {STARTERS.map((s, i) => (
                    <button key={s.slice(0, 20)} onClick={() => send(s)} data-testid={`starter-${i}`}
                      disabled={isLimitReached}
                      className="text-left px-4 py-3 glass-1 hover:border-[#00D4C8]/25 rounded-xl text-white/60 hover:text-white text-xs leading-relaxed transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div key="msgs" className="space-y-5" initial="hidden" animate="visible"
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}>
                {messages.map(msg => (
                  <Message
                    key={msg.id}
                    msg={msg}
                    onOpenModal={setModalTargets}
                    isSubscribed={isSubscribed === true}
                    onBlurClick={() => setShowPaywall(true)}
                    onSubscribe={goToSubscribe}
                    onDM={setDmTarget}
                  />
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

        {/* Input area */}
        <div className="px-3 pt-2 pb-3 border-t border-white/5">
          {/* Subscribe banner — always visible for non-subscribers */}
          <AnimatePresence>
            {isSubscribed === false && (
              <SubscribeBanner
                key="sub-banner"
                queriesUsed={queriesUsed}
                onSubscribe={goToSubscribe}
              />
            )}
          </AnimatePresence>

          {isLimitReached ? (
            <div className="flex items-center gap-3 glass-1 rounded-xl px-4 py-3.5 opacity-60 cursor-not-allowed">
              <Lock className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-white/40 text-sm flex-1">Free query limit reached — subscribe to continue</span>
              <button onClick={goToSubscribe} data-testid="input-subscribe-btn"
                className="btn-primary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                <Crown className="w-3 h-3" /> Subscribe
              </button>
            </div>
          ) : (
            <div className="flex gap-2 items-end glass-1 focus-within:border-[#00D4C8]/40 rounded-xl px-4 py-3 transition-all">
              <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={isSubscribed === false
                  ? `Ask anything... (${Math.max(0, FREE_QUERY_LIMIT - queriesUsed)} free queries left)`
                  : "Find influencers, ask for strategy, request outreach briefs..."}
                rows={1} data-testid="chat-input"
                className="flex-1 bg-transparent text-white text-sm placeholder-white/30 focus:outline-none resize-none leading-relaxed max-h-32 overflow-y-auto"
                style={{ fieldSizing: "content" }} />
              <button onClick={() => send()} disabled={!input.trim() || loading} data-testid="send-btn"
                className="w-9 h-9 rounded-lg btn-glass-teal disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0">
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}
          <p className="text-white/20 text-xs mt-1.5 pl-1">Enter to send · Shift+Enter for new line</p>
        </div>
      </motion.div>

      {/* Outreach modal */}
      <AnimatePresence>
        {modalTargets && (
          <OutreachModal key="modal" targets={modalTargets} onClose={() => setModalTargets(null)} />
        )}
      </AnimatePresence>

      {/* Send DM modal */}
      <AnimatePresence>
        {dmTarget && (
          <SendDMModal key="dm-modal" influencer={dmTarget} onClose={() => setDmTarget(null)} />
        )}
      </AnimatePresence>

      {/* Subscribe paywall modal */}
      <AnimatePresence>
        {showPaywall && (
          <SubscribeModal
            key="paywall"
            onSubscribe={() => { setShowPaywall(false); goToSubscribe(); }}
            onClose={() => setShowPaywall(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
