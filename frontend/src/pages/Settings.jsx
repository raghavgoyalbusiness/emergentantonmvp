import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ExternalLink, Zap, Plus, Trash2, Loader2, Instagram, MessageCircle, AlertCircle } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const integrations = [
  { name: "Apify", desc: "Creator data scraping", status: "connected", color: "text-orange-400" },
  { name: "Claude Sonnet 4.5", desc: "AI scoring & brief generation", status: "connected", color: "text-purple-400" },
  { name: "Stripe", desc: "Payment processing & escrow", status: "connected", color: "text-blue-400" },
  { name: "Gumloop", desc: "Workflow automation", status: "demo", color: "text-yellow-400" },
  { name: "Jasper.ai", desc: "Outreach copy generation", status: "demo", color: "text-green-400" },
  { name: "lemlist", desc: "Email outreach sequences", status: "demo", color: "text-cyan-400" },
  { name: "Attio", desc: "CRM & relationship management", status: "demo", color: "text-pink-400" },
  { name: "HeyGen", desc: "AI video briefs", status: "demo", color: "text-red-400" },
  { name: "Tidio", desc: "AI customer support", status: "demo", color: "text-blue-300" },
  { name: "Fireflies.ai", desc: "Call transcription & summaries", status: "demo", color: "text-[#00D4C8]" },
  { name: "Texts.com", desc: "Unified messaging hub", status: "demo", color: "text-white" },
  { name: "Northbeam", desc: "Revenue attribution & ROAS", status: "demo", color: "text-amber-400" },
  { name: "OpusClip", desc: "Video content repurposing", status: "demo", color: "text-violet-400" },
];

const PLATFORMS = [
  {
    id: "instagram",
    label: "Instagram",
    placeholder: "your_instagram_handle",
    color: "text-pink-400",
    border: "border-pink-500/30",
    bg: "bg-pink-500/8",
    dotColor: "bg-pink-400",
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-pink-400">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
  {
    id: "tiktok",
    label: "TikTok",
    placeholder: "your_tiktok_handle",
    color: "text-white",
    border: "border-white/20",
    bg: "bg-white/5",
    dotColor: "bg-white",
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-white">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.22 8.22 0 004.84 1.56V6.79a4.85 4.85 0 01-1.07-.1z"/>
      </svg>
    ),
  },
];

const wrap = { hidden: {}, visible: { transition: { staggerChildren: 0.09 } } };
const item = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.42, ease: "easeOut" } } };
const gridWrap = { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } };
const gridItem = { hidden: { opacity: 0, scale: 0.96 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: "easeOut" } } };

// ── Social Accounts Section ───────────────────────────────────────────────────
function SocialAccountsSection() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [handles, setHandles] = useState({ instagram: "", tiktok: "" });
  const [saving, setSaving] = useState({ instagram: false, tiktok: false });
  const [disconnecting, setDisconnecting] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchAccounts();
  }, []);

  const fetchAccounts = () => {
    setLoading(true);
    axios.get(`${API}/social/accounts`, { withCredentials: true })
      .then(res => setAccounts(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const getConnected = (platform) => accounts.find(a => a.platform === platform);

  const connect = async (platform) => {
    const handle = handles[platform].trim().replace(/^@/, "");
    if (!handle) return;
    setSaving(p => ({ ...p, [platform]: true }));
    try {
      await axios.post(`${API}/social/accounts`, { platform, handle }, { withCredentials: true });
      setHandles(p => ({ ...p, [platform]: "" }));
      setSuccessMsg(`${platform.charAt(0).toUpperCase() + platform.slice(1)} connected!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchAccounts();
    } catch (e) {
      alert(e?.response?.data?.detail || "Failed to connect account");
    } finally {
      setSaving(p => ({ ...p, [platform]: false }));
    }
  };

  const disconnect = async (accountId) => {
    setDisconnecting(accountId);
    try {
      await axios.delete(`${API}/social/accounts/${accountId}`, { withCredentials: true });
      fetchAccounts();
    } catch (err) {
      console.error("Failed to disconnect social account:", err);
    } finally { setDisconnecting(null); }
  };

  return (
    <div data-testid="social-accounts-section">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-heading font-semibold text-white">Social Accounts</h3>
          <p className="text-white/35 text-xs mt-0.5">Connect your accounts to send DMs directly to influencers</p>
        </div>
        <div className="flex items-center gap-1.5">
          <MessageCircle className="w-4 h-4 text-[#00D4C8]" />
          <span className="text-[#00D4C8] text-xs font-semibold">{accounts.length} connected</span>
        </div>
      </div>

      {/* Success toast */}
      <AnimatePresence>
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2.5 mb-4 text-sm text-green-400">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-white/30 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading accounts…
        </div>
      ) : (
        <div className="space-y-3">
          {PLATFORMS.map(p => {
            const connected = getConnected(p.id);
            return (
              <div key={p.id}
                className={`rounded-xl border p-4 transition-all ${connected ? `${p.border} ${p.bg}` : "border-white/8 bg-white/2"}`}
                data-testid={`social-platform-${p.id}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border flex-shrink-0 ${connected ? `${p.border} ${p.bg}` : "border-white/10 bg-white/4"}`}>
                    {p.icon()}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${connected ? p.color : "text-white/60"}`}>{p.label}</p>
                    {connected ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${p.dotColor} animate-pulse`} />
                        <span className="text-white/50 text-xs">@{connected.handle} · Connected</span>
                      </div>
                    ) : (
                      <p className="text-white/30 text-xs mt-0.5">Not connected</p>
                    )}
                  </div>
                  {connected && (
                    <button
                      onClick={() => disconnect(connected.account_id)}
                      disabled={disconnecting === connected.account_id}
                      data-testid={`disconnect-${p.id}`}
                      className="p-2 rounded-lg hover:bg-red-500/15 border border-transparent hover:border-red-500/25 text-white/30 hover:text-red-400 transition-all"
                    >
                      {disconnecting === connected.account_id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {/* Connect input */}
                {!connected && (
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-2 glass-input rounded-xl px-3 py-2.5">
                      <span className="text-white/30 text-sm">@</span>
                      <input
                        value={handles[p.id]}
                        onChange={e => setHandles(prev => ({ ...prev, [p.id]: e.target.value }))}
                        onKeyDown={e => e.key === "Enter" && connect(p.id)}
                        placeholder={p.placeholder}
                        data-testid={`handle-input-${p.id}`}
                        className="flex-1 bg-transparent text-sm text-white placeholder-white/25 focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => connect(p.id)}
                      disabled={!handles[p.id].trim() || saving[p.id]}
                      data-testid={`connect-${p.id}-btn`}
                      className="btn-primary px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {saving[p.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      Connect
                    </button>
                  </div>
                )}

                {/* Update input (reconnect with new handle) */}
                {connected && (
                  <div className="flex gap-2 mt-2">
                    <div className="flex-1 flex items-center gap-2 glass-input rounded-xl px-3 py-2">
                      <span className="text-white/20 text-xs">@</span>
                      <input
                        value={handles[p.id]}
                        onChange={e => setHandles(prev => ({ ...prev, [p.id]: e.target.value }))}
                        onKeyDown={e => e.key === "Enter" && connect(p.id)}
                        placeholder={`Update handle (current: @${connected.handle})`}
                        data-testid={`update-handle-input-${p.id}`}
                        className="flex-1 bg-transparent text-xs text-white placeholder-white/20 focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => connect(p.id)}
                      disabled={!handles[p.id].trim() || saving[p.id]}
                      data-testid={`update-${p.id}-btn`}
                      className="px-3 py-2 rounded-xl text-xs border border-white/15 hover:border-white/25 text-white/50 hover:text-white transition-all disabled:opacity-40"
                    >
                      {saving[p.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : "Update"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-white/20 text-xs mt-3 flex items-center gap-1.5">
        <AlertCircle className="w-3 h-3 flex-shrink-0" />
        DMs open directly in Instagram or TikTok — no third-party API required.
      </p>
    </div>
  );
}

// ── Main Settings Page ────────────────────────────────────────────────────────
export default function Settings() {
  const { user } = useAuth();

  return (
    <motion.div className="max-w-4xl mx-auto" initial="hidden" animate="visible" variants={wrap}>
      <motion.div variants={item} className="mb-6">
        <h1 className="font-heading font-bold text-2xl md:text-3xl text-white">Settings</h1>
        <p className="text-white/40 text-sm mt-1">Manage your account and integrations</p>
      </motion.div>

      {/* Profile */}
      <motion.div variants={item} className="glass-2 rounded-xl p-6 mb-6" data-testid="profile-section">
        <h3 className="font-heading font-semibold text-white mb-4">Profile</h3>
        <div className="flex items-center gap-4 mb-4">
          {user?.picture ? (
            <img src={user.picture} alt={user.name} className="w-16 h-16 rounded-xl object-cover border border-white/10" />
          ) : (
            <div className="w-16 h-16 rounded-xl glass-1 border border-[#00D4C8]/20 flex items-center justify-center">
              <span className="text-[#00D4C8] text-2xl font-bold">{user?.name?.[0]}</span>
            </div>
          )}
          <div>
            <h4 className="font-heading font-semibold text-white text-lg">{user?.name}</h4>
            <p className="text-white/40 text-sm">{user?.email}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00D4C8]" />
              <span className="text-[#00D4C8] text-xs">Google Account Verified</span>
            </div>
          </div>
        </div>
        <div className="glass-1 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-white/40 text-xs block mb-1">Full Name</span>
              <span className="text-white">{user?.name}</span>
            </div>
            <div>
              <span className="text-white/40 text-xs block mb-1">Email Address</span>
              <span className="text-white">{user?.email}</span>
            </div>
            <div>
              <span className="text-white/40 text-xs block mb-1">Account Type</span>
              <span className="text-[#00D4C8]">Growth Plan</span>
            </div>
            <div>
              <span className="text-white/40 text-xs block mb-1">Auth Provider</span>
              <span className="text-white flex items-center gap-1.5">
                <i className="fa-brands fa-google text-xs" /> Google OAuth
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Social Accounts */}
      <motion.div variants={item} className="glass-2 rounded-xl p-6 mb-6">
        <SocialAccountsSection />
      </motion.div>

      {/* Integrations */}
      <motion.div variants={item} className="glass-2 rounded-xl p-6 mb-6" data-testid="integrations-section">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-white">Integrations</h3>
          <span className="text-white/30 text-xs">
            {integrations.filter(i => i.status === "connected").length} active &bull; {integrations.filter(i => i.status === "demo").length} demo
          </span>
        </div>
        <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-3" initial="hidden" animate="visible" variants={gridWrap}>
          {integrations.map(int => (
            <motion.div key={int.name} variants={gridItem}
              data-testid={`integration-${int.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
              className="flex items-center justify-between p-3 glass-1 rounded-lg hover:border-white/10 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                  <Zap className={`w-3.5 h-3.5 ${int.color}`} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-white text-xs font-semibold">{int.name}</p>
                  <p className="text-white/30 text-xs">{int.desc}</p>
                </div>
              </div>
              <div>
                {int.status === "connected" ? (
                  <span className="flex items-center gap-1 text-green-400 text-xs bg-green-500/10 backdrop-blur-sm px-2 py-0.5 rounded-full border border-green-500/30">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Active
                  </span>
                ) : (
                  <span className="text-yellow-400 text-xs bg-yellow-500/8 backdrop-blur-sm px-2 py-0.5 rounded-full border border-yellow-500/25">
                    Demo
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Plan info */}
      <motion.div variants={item} className="bg-[#00D4C8]/8 backdrop-blur-xl border border-[#00D4C8]/20 rounded-xl p-6" data-testid="plan-section">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-heading font-semibold text-white mb-1">Growth Plan</h3>
            <p className="text-white/40 text-sm mb-3">$599/month • Up to 10 active campaigns</p>
            <ul className="space-y-1.5 text-sm text-white/60">
              {["Unlimited creator searches", "AI scoring & outreach generation", "Stripe escrow payments", "Full analytics & ROAS tracking"].map(f => (
                <li key={f} className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00D4C8] flex-shrink-0" /> {f}
                </li>
              ))}
            </ul>
          </div>
          <button className="btn-secondary px-4 py-2 rounded-lg text-sm flex items-center gap-1.5">
            Upgrade <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
