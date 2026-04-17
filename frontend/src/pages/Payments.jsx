import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { CreditCard, CheckCircle2, AlertCircle, Loader2, Shield } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusColors = {
  pending: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  paid: "text-green-400 bg-green-500/10 border-green-500/20",
  expired: "text-red-400 bg-red-500/10 border-red-500/20",
  complete: "text-green-400 bg-green-500/10 border-green-500/20",
};

const wrap = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.42, ease: "easeOut" } },
};

function PaymentModal({ campaign, influencers, onClose, onSuccess }) {
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
      window.location.href = res.data.url;
    } catch (e) {
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

export default function Payments() {
  const [searchParams] = useSearchParams();
  const [campaigns, setCampaigns] = useState([]);
  const [influencers, setInfluencers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/campaigns`, { withCredentials: true }),
      axios.get(`${API}/influencers`, { withCredentials: true }),
      axios.get(`${API}/payments`, { withCredentials: true }),
    ]).then(([campRes, infRes, txnRes]) => {
      setCampaigns(campRes.data);
      setInfluencers(infRes.data);
      setTransactions(txnRes.data);
    }).finally(() => setLoading(false));

    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      setPolling(true);
      pollStatus(sessionId);
    }
  }, []);

  const pollStatus = async (sessionId, attempt = 0) => {
    if (attempt >= 5) { setPolling(false); return; }
    try {
      const res = await axios.get(`${API}/payments/status/${sessionId}`, { withCredentials: true });
      setPaymentStatus(res.data);
      if (res.data.payment_status === "paid" || res.data.status === "expired") {
        setPolling(false);
        if (res.data.payment_status === "paid") {
          const txnRes = await axios.get(`${API}/payments`, { withCredentials: true });
          setTransactions(txnRes.data);
        }
      } else {
        setTimeout(() => pollStatus(sessionId, attempt + 1), 2000);
      }
    } catch { setPolling(false); }
  };

  const activeCampaigns = campaigns.filter(c => !["Reported", "Paid"].includes(c.stage));

  const getCampaignInfluencers = (camp) => {
    if (!camp?.selected_influencers?.length) return [];
    return influencers.filter(inf => camp.selected_influencers.includes(inf.influencer_id));
  };

  if (loading) return (
    <div>
      <div className="skeleton h-40 rounded-xl mb-4" />
      <div className="skeleton h-64 rounded-xl" />
    </div>
  );

  return (
    <motion.div className="max-w-5xl mx-auto" initial="hidden" animate="visible" variants={wrap}>
      <motion.div variants={item} className="mb-6">
        <h1 className="font-heading font-bold text-2xl md:text-3xl text-white">Payments</h1>
        <p className="text-white/40 text-sm mt-1">Escrow-based creator payments — secure and transparent</p>
      </motion.div>

      {polling && (
        <motion.div variants={item} className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-4 flex items-center gap-3">
          <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
          <p className="text-yellow-400 text-sm">Checking payment status...</p>
        </motion.div>
      )}
      {paymentStatus && !polling && (
        <motion.div
          variants={item}
          className={`rounded-xl p-4 mb-4 border flex items-center gap-3 ${paymentStatus.payment_status === "paid" ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}
          data-testid="payment-status-alert"
        >
          {paymentStatus.payment_status === "paid"
            ? <CheckCircle2 className="w-4 h-4 text-green-400" />
            : <AlertCircle className="w-4 h-4 text-red-400" />}
          <p className={`text-sm font-semibold ${paymentStatus.payment_status === "paid" ? "text-green-400" : "text-red-400"}`}>
            {paymentStatus.payment_status === "paid" ? "Payment successful! Funds held in escrow." : `Payment ${paymentStatus.status}.`}
          </p>
        </motion.div>
      )}

      {/* Active campaigns */}
      <motion.div variants={item} className="glass-2 rounded-xl p-5 mb-6">
        <h3 className="font-heading font-semibold text-white mb-4">Campaigns Ready to Fund</h3>
        {activeCampaigns.length === 0 ? (
          <p className="text-white/30 text-sm">No active campaigns found.</p>
        ) : (
          <div className="space-y-3">
            {activeCampaigns.map(c => {
              const infs = getCampaignInfluencers(c);
              return (
                <div key={c.campaign_id} className="flex items-center justify-between p-4 glass-1 rounded-xl hover:border-[#00D4C8]/20 transition-colors" data-testid={`payment-campaign-${c.campaign_id}`}>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white text-sm">{c.name}</h4>
                    <p className="text-white/40 text-xs">{c.brand_name} &bull; {infs.length} creator{infs.length !== 1 ? "s" : ""} selected</p>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <span className="text-white/40 text-xs hidden sm:block">${(c.budget_min / 1000).toFixed(0)}K–${(c.budget_max / 1000).toFixed(0)}K budget</span>
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

      {/* Transaction history */}
      <motion.div variants={item} className="glass-2 rounded-xl p-5">
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
          onSuccess={() => setSelectedCampaign(null)}
        />
      )}
    </motion.div>
  );
}
