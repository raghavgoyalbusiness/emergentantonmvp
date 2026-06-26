import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { Plus, ArrowRight, ChevronRight, Loader2 } from "lucide-react";
import SpotlightBackground from "@/components/ui/spotlight-background";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STAGES = ["Brief", "Outreach", "Accepted", "Live", "Content Review", "Paid", "Reported"];

const stageColors = {
  Brief:           { bg: "bg-yellow-500/8  backdrop-blur-sm", border: "border-yellow-500/25", text: "text-yellow-400", dot: "bg-yellow-400" },
  Outreach:        { bg: "bg-blue-500/8    backdrop-blur-sm", border: "border-blue-500/25",   text: "text-blue-400",   dot: "bg-blue-400"   },
  Accepted:        { bg: "bg-purple-500/8  backdrop-blur-sm", border: "border-purple-500/25", text: "text-purple-400", dot: "bg-purple-400" },
  Live:            { bg: "bg-[#00D4C8]/8   backdrop-blur-sm", border: "border-[#00D4C8]/25", text: "text-[#00D4C8]", dot: "bg-[#00D4C8]"  },
  "Content Review":{ bg: "bg-orange-500/8  backdrop-blur-sm", border: "border-orange-500/25", text: "text-orange-400", dot: "bg-orange-400" },
  Paid:            { bg: "bg-green-500/8   backdrop-blur-sm", border: "border-green-500/25",  text: "text-green-400",  dot: "bg-green-400"  },
  Reported:        { bg: "bg-white/4       backdrop-blur-sm", border: "border-white/10",      text: "text-white/50",   dot: "bg-white/50"   },
};

const wrap = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};
const colWrap = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
const colItem = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.38, ease: "easeOut" } },
};

function CampaignCard({ campaign, onMoveStage, moving }) {
  const stageIdx = STAGES.indexOf(campaign.stage);
  const nextStage = STAGES[stageIdx + 1];

  return (
    <motion.div
      data-testid={`kanban-card-${campaign.campaign_id}`}
      className="glass-2 rounded-lg p-3 hover:border-[#00D4C8]/25 transition-colors cursor-pointer"
      whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-heading font-semibold text-white text-sm leading-tight truncate">{campaign.name}</h4>
          <p className="text-white/40 text-xs mt-0.5 truncate">{campaign.brand_name}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 mb-2">
        {campaign.platforms?.map((p) => (
          <span key={p} className="text-xs bg-white/5 text-white/40 px-1.5 py-0.5 rounded">
            {p === "Instagram" && <i className="fa-brands fa-instagram mr-1 text-pink-400 text-xs" />}
            {p === "TikTok" && <i className="fa-brands fa-tiktok mr-1 text-xs" />}
            {p === "YouTube" && <i className="fa-brands fa-youtube mr-1 text-red-400 text-xs" />}
            {p}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/30">{campaign.selected_influencers?.length || 0} creators</span>
        <span className="text-white/30">${(campaign.budget_min / 1000).toFixed(0)}K - ${(campaign.budget_max / 1000).toFixed(0)}K</span>
      </div>
      {nextStage && (
        <button
          onClick={(e) => { e.stopPropagation(); onMoveStage(campaign.campaign_id, nextStage); }}
          data-testid={`move-stage-${campaign.campaign_id}`}
          disabled={moving}
          className="mt-2 w-full flex items-center justify-center gap-1 py-1.5 bg-[#00D4C8]/5 hover:bg-[#00D4C8]/10 border border-[#00D4C8]/15 hover:border-[#00D4C8]/30 rounded text-[#00D4C8] text-xs transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {moving
            ? <><Loader2 className="w-3 h-3 animate-spin" /> Moving...</>
            : <>Move to {nextStage} <ChevronRight className="w-3 h-3" /></>
          }
        </button>
      )}
    </motion.div>
  );
}

export default function CampaignPipeline() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState(null);
  const navigate = useNavigate();

  // Runs once on mount — API and axios are stable module-level constants.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    axios.get(`${API}/campaigns`, { withCredentials: true })
      .then(res => setCampaigns(res.data))
      .finally(() => setLoading(false));
  }, []);

  const moveStage = async (campaignId, newStage) => {
    setMovingId(campaignId);
    try {
      const res = await axios.patch(`${API}/campaigns/${campaignId}/stage`, { stage: newStage }, { withCredentials: true });
      setCampaigns(prev => prev.map(c => c.campaign_id === campaignId ? res.data : c));
    } catch (e) {
      console.error(e);
    } finally {
      setMovingId(null);
    }
  };

  const grouped = STAGES.reduce((acc, stage) => {
    acc[stage] = campaigns.filter(c => c.stage === stage);
    return acc;
  }, {});

  if (loading) {
    return (
      <div>
        <div className="skeleton h-12 rounded-xl mb-6" />
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map(s => <div key={s} className="skeleton min-w-48 h-64 rounded-xl flex-shrink-0" />)}
        </div>
      </div>
    );
  }

  return (
    <SpotlightBackground>
      <motion.div initial="hidden" animate="visible" variants={wrap}>
      <motion.div variants={item} className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading font-bold text-2xl md:text-3xl text-white">Campaign Pipeline</h1>
          <p className="text-white/40 text-sm mt-1">{campaigns.length} campaigns across all stages</p>
        </div>
        <button
          onClick={() => navigate("/campaigns/new")}
          data-testid="new-campaign-pipeline-btn"
          className="btn-primary px-4 py-2.5 rounded-lg text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </motion.div>

      <motion.div variants={item} className="overflow-x-auto pb-4 -mx-4 px-4">
        <motion.div
          className="flex gap-3 min-w-max"
          initial="hidden"
          animate="visible"
          variants={colWrap}
        >
          {STAGES.map((stage) => {
            const colors = stageColors[stage];
            const stageCampaigns = grouped[stage] || [];
            return (
              <motion.div
                key={stage}
                variants={colItem}
                data-testid={`kanban-column-${stage.toLowerCase().replace(/ /g, "-")}`}
                className="kanban-column w-52 flex-shrink-0 glass-1 rounded-xl p-2"
              >
                <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg ${colors.bg} border ${colors.border} mb-2`}>
                  <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                  <span className={`${colors.text} text-xs font-semibold font-heading flex-1`}>{stage}</span>
                  <span className="bg-white/10 text-white/50 text-xs rounded-full px-1.5 py-0.5 font-mono">
                    {stageCampaigns.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {stageCampaigns.map(c => (
                    <CampaignCard key={c.campaign_id} campaign={c} onMoveStage={moveStage} moving={movingId === c.campaign_id} />
                  ))}
                  {stageCampaigns.length === 0 && (
                    <div className="border border-dashed border-white/5 rounded-lg p-4 text-center">
                      <p className="text-white/20 text-xs">Empty</p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>

      <motion.div variants={item} className="mt-6 flex flex-wrap gap-3 text-xs text-white/30">
        <span>Pipeline flow:</span>
        {STAGES.map((s, i) => (
          <span key={s} className="flex items-center gap-1">
            <span className={stageColors[s].text}>{s}</span>
            {i < STAGES.length - 1 && <ArrowRight className="w-3 h-3" />}
          </span>
        ))}
      </motion.div>
      </motion.div>
    </SpotlightBackground>
  );
}
