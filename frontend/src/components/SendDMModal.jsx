import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { X, Instagram, MessageCircle, ExternalLink, Loader2, Check, AlertCircle, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PLATFORM_CONFIG = {
  instagram: {
    label: "Instagram",
    color: "text-pink-400",
    border: "border-pink-500/30",
    bg: "bg-pink-500/8",
    hoverBorder: "hover:border-pink-500/50",
    dmUrl: (handle) => `https://ig.me/m/${handle}`,
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-pink-400">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
  tiktok: {
    label: "TikTok",
    color: "text-white",
    border: "border-white/20",
    bg: "bg-white/5",
    hoverBorder: "hover:border-white/40",
    dmUrl: (handle) => `https://www.tiktok.com/@${handle}`,
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-white">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.22 8.22 0 004.84 1.56V6.79a4.85 4.85 0 01-1.07-.1z"/>
      </svg>
    ),
  },
};

export function SendDMModal({ influencer, onClose }) {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    axios.get(`${API}/social/accounts`, { withCredentials: true })
      .then(res => {
        setAccounts(res.data);
        if (res.data.length > 0) setSelectedAccount(res.data[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Pre-fill message based on influencer
    setMessage(
      `Hey @${influencer.handle}! 👋 I love your content and think you'd be a perfect fit for an exciting brand collaboration. Would love to chat about a potential partnership! 🚀`
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSendDM = async () => {
    if (!selectedAccount) return;
    const cfg = PLATFORM_CONFIG[selectedAccount.platform];
    const dmUrl = cfg.dmUrl(influencer.handle);

    setLogging(true);
    try {
      await axios.post(`${API}/social/dm/log`, {
        platform: selectedAccount.platform,
        from_handle: selectedAccount.handle,
        to_handle: influencer.handle,
        influencer_name: influencer.name || influencer.handle,
        message,
      }, { withCredentials: true });
    } catch (err) {
      console.warn("DM log failed (non-blocking):", err?.message);
    }
    setLogging(false);

    window.open(dmUrl, "_blank", "noopener,noreferrer");
    setSent(true);
  };

  const cfg = selectedAccount ? PLATFORM_CONFIG[selectedAccount.platform] : null;

  return (
    <div
      className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.22 }}
        className="glass-3 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        data-testid="send-dm-modal"
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-white/6">
          <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/25 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-4 h-4 text-pink-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-semibold text-white text-base">Send DM</h3>
            <p className="text-white/40 text-xs">
              {influencer.name || influencer.handle} · @{influencer.handle}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/6 text-white/40 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-[#00D4C8] animate-spin" />
            </div>
          ) : sent ? (
            /* Success state */
            <div className="flex flex-col items-center py-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-3">
                <Check className="w-7 h-7 text-green-400" />
              </div>
              <h4 className="font-heading font-semibold text-white text-base mb-1">DM Opened!</h4>
              <p className="text-white/45 text-sm">
                Your {cfg?.label} DM to <span className="text-white">@{influencer.handle}</span> has been opened in a new tab. Paste your message and hit send.
              </p>
              <button onClick={onClose} className="mt-5 btn-primary px-6 py-2.5 rounded-xl text-sm">Done</button>
            </div>
          ) : accounts.length === 0 ? (
            /* No accounts connected */
            <div className="flex flex-col items-center py-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                <AlertCircle className="w-7 h-7 text-white/30" />
              </div>
              <h4 className="font-heading font-semibold text-white text-base mb-1">No accounts connected</h4>
              <p className="text-white/45 text-sm mb-5">
                Connect your Instagram or TikTok in Settings first.
              </p>
              <button
                onClick={() => { onClose(); navigate("/settings"); }}
                data-testid="go-to-settings-btn"
                className="btn-primary px-5 py-2.5 rounded-xl text-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Connect Account
              </button>
            </div>
          ) : (
            <>
              {/* Account selector */}
              <div>
                <label className="text-white/40 text-xs mb-2 block">Send from</label>
                <div className="flex gap-2">
                  {accounts.map(acc => {
                    const c = PLATFORM_CONFIG[acc.platform];
                    const isSelected = selectedAccount?.account_id === acc.account_id;
                    return (
                      <button
                        key={acc.account_id}
                        onClick={() => setSelectedAccount(acc)}
                        data-testid={`select-account-${acc.platform}`}
                        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all flex-1 ${
                          isSelected
                            ? `${c.border} ${c.bg} ${c.color}`
                            : "border-white/10 bg-white/3 text-white/40 hover:border-white/20"
                        }`}
                      >
                        {c.icon()}
                        <span>@{acc.handle}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="text-white/40 text-xs mb-2 block">Message to copy</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={4}
                  data-testid="dm-message-input"
                  className="w-full glass-input rounded-xl px-3.5 py-3 text-sm text-white/85 placeholder-white/25 focus:outline-none resize-none leading-relaxed"
                />
                <p className="text-white/25 text-xs mt-1.5 flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  This message will be copied — paste it after the DM window opens
                </p>
              </div>

              {/* Destination info */}
              {selectedAccount && (
                <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${cfg.border} ${cfg.bg}`}>
                  {cfg.icon()}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${cfg.color}`}>{cfg.label} DM</p>
                    <p className="text-white/40 text-xs truncate">
                      Opens {selectedAccount.platform === "instagram" ? `ig.me/m/${influencer.handle}` : `tiktok.com/@${influencer.handle}`}
                    </p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-white/25 flex-shrink-0" />
                </div>
              )}

              {/* Send button */}
              <button
                onClick={handleSendDM}
                disabled={!selectedAccount || logging}
                data-testid="open-dm-btn"
                className="w-full btn-primary py-3.5 rounded-xl text-sm font-semibold flex items-center gap-2 justify-center disabled:opacity-50"
              >
                {logging
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <MessageCircle className="w-4 h-4" />}
                {logging
                  ? "Opening…"
                  : `Open ${cfg?.label || ""} DM → @${influencer.handle}`}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
