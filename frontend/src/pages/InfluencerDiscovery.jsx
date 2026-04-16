import { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Search, Star, Plus, Check, Loader2 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const platformIcon = (platform) => {
  if (platform === "Instagram") return <i className="fa-brands fa-instagram text-pink-400" />;
  if (platform === "TikTok") return <i className="fa-brands fa-tiktok text-white" />;
  if (platform === "YouTube") return <i className="fa-brands fa-youtube text-red-400" />;
  return null;
};

const aiMessages = [
  "Connecting to AI engine...",
  "Analyzing 20 influencer profiles...",
  "Scoring brand alignment...",
  "Calculating engagement health...",
  "Ranking by match quality...",
  "Finalizing shortlist...",
];

const wrap = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};
const gridWrap = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};
const cardItem = {
  hidden: { opacity: 0, y: 18, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: "easeOut" } },
};

function InfluencerCard({ inf, selected, onToggle, showScore }) {
  const score = inf.match_score;
  const scoreColor = score >= 80 ? "text-[#00D4C8]" : score >= 60 ? "text-yellow-400" : "text-white/50";

  return (
    <div
      data-testid={`influencer-card-${inf.influencer_id}`}
      className={`bg-[#131936] border rounded-xl overflow-hidden card-hover transition-all ${selected ? "border-[#00D4C8]/50" : "border-white/5"}`}
    >
      <div className="relative">
        <img
          src={inf.profile_pic}
          alt={inf.name}
          className="w-full h-36 object-cover"
          onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop"; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#131936] via-transparent to-transparent" />
        {showScore && score !== undefined && (
          <div className="absolute top-2 right-2 bg-[#0A0F2E]/90 border border-[#00D4C8]/30 rounded-lg px-2 py-1">
            <span className={`font-heading font-black text-lg ${scoreColor}`}>{score}</span>
            <span className="text-white/30 text-xs ml-0.5">%</span>
          </div>
        )}
        <div className="absolute bottom-2 left-3">
          <span className="text-[#00D4C8] text-xs bg-[#0A0F2E]/80 px-2 py-0.5 rounded-full border border-[#00D4C8]/20">{inf.niche}</span>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-heading font-semibold text-white text-sm">{inf.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              {platformIcon(inf.platform)}
              <span className="text-white/40 text-xs">@{inf.handle}</span>
            </div>
          </div>
          {selected && <Check className="w-4 h-4 text-[#00D4C8] flex-shrink-0 mt-0.5" />}
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-[#0A0F2E] rounded-lg p-2 text-center">
            <div className="font-heading font-bold text-sm text-white">{(inf.followers / 1000).toFixed(0)}K</div>
            <div className="text-white/30 text-xs">Followers</div>
          </div>
          <div className="bg-[#0A0F2E] rounded-lg p-2 text-center">
            <div className="font-heading font-bold text-sm text-white">{inf.engagement_rate}%</div>
            <div className="text-white/30 text-xs">Engagement</div>
          </div>
        </div>
        {showScore && inf.match_reason && (
          <p className="text-white/40 text-xs leading-relaxed mb-3 line-clamp-2">{inf.match_reason}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-white/50 text-xs">${inf.fee_per_post?.toLocaleString()}/post</span>
          <button
            onClick={() => onToggle(inf.influencer_id)}
            data-testid={`toggle-influencer-${inf.influencer_id}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selected
                ? "bg-[#00D4C8]/10 text-[#00D4C8] border border-[#00D4C8]/30"
                : "bg-white/5 text-white/60 hover:bg-white/10 border border-white/10"
            }`}
          >
            {selected ? "Added" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InfluencerDiscovery() {
  const [influencers, setInfluencers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [scoring, setScoring] = useState(false);
  const [aiMsgIdx, setAiMsgIdx] = useState(0);
  const [scored, setScored] = useState(false);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/influencers`, { withCredentials: true }),
      axios.get(`${API}/campaigns`, { withCredentials: true }),
    ]).then(([infRes, campRes]) => {
      setInfluencers(infRes.data);
      setCampaigns(campRes.data);
      if (campRes.data.length > 0) setSelectedCampaign(campRes.data[0].campaign_id);
    }).finally(() => setLoading(false));
  }, []);

  const runAIScoring = async () => {
    if (!selectedCampaign) return;
    setScoring(true);
    setAiMsgIdx(0);
    const interval = setInterval(() => setAiMsgIdx(i => (i + 1) % aiMessages.length), 1200);
    try {
      const res = await axios.post(`${API}/ai/score-influencers`, { campaign_id: selectedCampaign }, { withCredentials: true });
      setInfluencers(res.data);
      setScored(true);
    } catch (e) {
      console.error(e);
    } finally {
      clearInterval(interval);
      setScoring(false);
    }
  };

  const toggleInfluencer = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const saveToCAampaign = async () => {
    if (!selectedCampaign || selectedIds.size === 0) return;
    try {
      await axios.patch(`${API}/campaigns/${selectedCampaign}/influencers`, { influencer_ids: [...selectedIds] }, { withCredentials: true });
      alert(`Added ${selectedIds.size} influencers to campaign!`);
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = influencers.filter(inf => {
    const matchSearch = !search || inf.name.toLowerCase().includes(search.toLowerCase()) || inf.handle.toLowerCase().includes(search.toLowerCase()) || inf.niche.toLowerCase().includes(search.toLowerCase());
    const matchPlatform = !platformFilter || inf.platform === platformFilter;
    return matchSearch && matchPlatform;
  });

  if (loading) {
    return (
      <div>
        <div className="skeleton h-16 rounded-xl mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-72 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div className="max-w-7xl mx-auto" initial="hidden" animate="visible" variants={wrap}>
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading font-bold text-2xl md:text-3xl text-white">Influencer Discovery</h1>
          <p className="text-white/40 text-sm mt-1">AI-powered creator matching for your campaigns</p>
        </div>
        {selectedIds.size > 0 && (
          <button onClick={saveToCAampaign} data-testid="save-to-campaign-btn" className="btn-primary px-4 py-2.5 rounded-lg text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add {selectedIds.size} to Campaign
          </button>
        )}
      </motion.div>

      {/* Controls */}
      <motion.div variants={item} className="bg-[#131936] border border-white/5 rounded-xl p-4 mb-6 flex flex-col md:flex-row gap-3">
        <select
          value={selectedCampaign}
          onChange={(e) => { setSelectedCampaign(e.target.value); setScored(false); }}
          data-testid="campaign-select"
          className="bg-[#0A0F2E] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#00D4C8]"
        >
          <option value="">Select a campaign...</option>
          {campaigns.map(c => <option key={c.campaign_id} value={c.campaign_id}>{c.name}</option>)}
        </select>

        <button
          onClick={runAIScoring}
          disabled={scoring || !selectedCampaign}
          data-testid="run-ai-scoring-btn"
          className={`btn-primary px-5 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${scoring ? "animate-pulse" : ""}`}
        >
          {scoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
          {scoring ? "Scoring..." : scored ? "Re-score" : "Run AI Scoring"}
        </button>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search creators..."
            data-testid="search-influencers"
            className="w-full bg-[#0A0F2E] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[#00D4C8]"
          />
        </div>

        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="bg-[#0A0F2E] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#00D4C8]"
        >
          <option value="">All Platforms</option>
          <option value="Instagram">Instagram</option>
          <option value="TikTok">TikTok</option>
          <option value="YouTube">YouTube</option>
        </select>
      </motion.div>

      {/* AI Loading */}
      {scoring && (
        <motion.div variants={item} className="bg-[#131936] border border-[#00D4C8]/20 rounded-xl p-8 mb-6 text-center">
          <div className="flex gap-2 justify-center mb-4">
            <div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" />
          </div>
          <p className="text-[#00D4C8] font-semibold text-sm">{aiMessages[aiMsgIdx]}</p>
          <p className="text-white/30 text-xs mt-1">Claude Sonnet 4.5 is analyzing {influencers.length} creator profiles</p>
        </motion.div>
      )}

      {scored && !scoring && (
        <motion.div variants={item} className="flex items-center gap-2 mb-4 text-sm text-white/50">
          <Star className="w-4 h-4 text-[#00D4C8]" />
          <span>AI scoring complete — showing top matches ranked by relevance</span>
        </motion.div>
      )}

      {/* Grid — staggered cards */}
      <motion.div
        key={`${scored}-${platformFilter}-${search}`}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
        initial="hidden"
        animate="visible"
        variants={gridWrap}
      >
        {filtered.map((inf) => (
          <motion.div key={inf.influencer_id} variants={cardItem}>
            <InfluencerCard
              inf={inf}
              selected={selectedIds.has(inf.influencer_id)}
              onToggle={toggleInfluencer}
              showScore={scored}
            />
          </motion.div>
        ))}
      </motion.div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-white/30">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No influencers match your search.</p>
        </div>
      )}
    </motion.div>
  );
}
