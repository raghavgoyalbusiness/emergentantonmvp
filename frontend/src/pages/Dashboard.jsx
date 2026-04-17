import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { motion } from "framer-motion";
import {
  Zap, Users, DollarSign, Activity, ArrowRight,
  Clock, AlertCircle, Plus
} from "lucide-react";
import SpotlightBackground from "@/components/ui/spotlight-background";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const stageColors = {
  Brief: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  Outreach: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  Accepted: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  Live: "bg-[#00D4C8]/15 text-[#00D4C8] border-[#00D4C8]/20",
  "Content Review": "bg-orange-500/15 text-orange-400 border-orange-500/20",
  Paid: "bg-green-500/15 text-green-400 border-green-500/20",
  Reported: "bg-gray-500/15 text-gray-400 border-gray-500/20",
};

const wrap = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.42, ease: "easeOut" } },
};
const cardWrap = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

function StatCard({ icon: Icon, label, value, sub, color = "teal", testid }) {
  const colorMap = {
    teal: "bg-[#00D4C8]/10 text-[#00D4C8]",
    blue: "bg-blue-500/10 text-blue-400",
    purple: "bg-purple-500/10 text-purple-400",
    green: "bg-green-500/10 text-green-400",
  };
  return (
    <div data-testid={testid} className="bg-[#131936] border border-white/5 rounded-xl p-5 card-hover">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg ${colorMap[color]} flex items-center justify-center`}>
          <Icon className="w-4 h-4" strokeWidth={1.5} />
        </div>
      </div>
      <div className="font-heading font-black text-3xl text-white mb-1">{value}</div>
      <div className="text-white/50 text-sm">{label}</div>
      {sub && <div className="text-[#00D4C8] text-xs mt-1">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, campaignsRes, messagesRes] = await Promise.all([
          axios.get(`${API}/dashboard/stats`, { withCredentials: true }),
          axios.get(`${API}/campaigns`, { withCredentials: true }),
          axios.get(`${API}/messages`, { withCredentials: true }),
        ]);
        setStats(statsRes.data);
        setCampaigns(campaignsRes.data);
        setMessages(messagesRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const pendingCampaigns = campaigns.filter(c => ["Brief", "Content Review"].includes(c.stage));
  const activeCampaigns = campaigns.filter(c => ["Live", "Outreach", "Accepted"].includes(c.stage));
  const unreadMessages = messages.filter(m => !m.is_read);

  if (loading) {
    return (
      <div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="skeleton lg:col-span-2 h-64 rounded-xl" />
          <div className="skeleton h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <SpotlightBackground>
      <motion.div
        className="max-w-7xl mx-auto"
        initial="hidden"
        animate="visible"
        variants={wrap}
      >
      {/* Welcome */}
      <motion.div variants={item} className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading font-bold text-2xl md:text-3xl text-white">
            Good morning, {user?.name?.split(" ")[0] || "there"}
          </h1>
          <p className="text-white/40 text-sm mt-1">Here's what's happening with your campaigns today.</p>
        </div>
        <button
          onClick={() => navigate("/campaigns/new")}
          data-testid="new-campaign-btn"
          className="btn-primary px-4 py-2.5 rounded-lg text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Campaign</span>
        </button>
      </motion.div>

      {/* Stats — each card staggers in */}
      <motion.div variants={cardWrap} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div variants={item}><StatCard icon={Activity} label="Total Campaigns" value={stats?.total_campaigns || 0} color="teal" testid="stat-total-campaigns" /></motion.div>
        <motion.div variants={item}><StatCard icon={Zap} label="Active Campaigns" value={stats?.active_campaigns || 0} sub="Currently running" color="blue" testid="stat-active-campaigns" /></motion.div>
        <motion.div variants={item}><StatCard icon={Users} label="Influencers" value={stats?.total_influencers || 0} sub="In your pipeline" color="purple" testid="stat-influencers" /></motion.div>
        <motion.div variants={item}><StatCard icon={DollarSign} label="Total Spend" value={`$${(stats?.total_spend || 0).toLocaleString()}`} sub={`${stats?.total_influencers || 0} creators`} color="green" testid="stat-spend" /></motion.div>
      </motion.div>

      {/* Campaign health bar */}
      <motion.div variants={item} className="bg-[#131936] border border-white/5 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-heading font-semibold text-white">Campaign Health Score</h3>
            <p className="text-white/40 text-xs mt-0.5">Based on engagement, responses, and content delivery</p>
          </div>
          <div className="font-heading font-black text-4xl text-[#00D4C8]">{stats?.campaign_health_score || 0}</div>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#00D4C8] to-[#00a8ff] rounded-full transition-all duration-1000"
            style={{ width: `${stats?.campaign_health_score || 0}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-white/30 mt-1">
          <span>0</span><span>50</span><span>100</span>
        </div>
      </motion.div>

      {/* Bottom grid */}
      <motion.div variants={item} className="grid lg:grid-cols-3 gap-6">
        {/* Active campaigns */}
        <div className="lg:col-span-2 bg-[#131936] border border-white/5 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-white">Active Campaigns</h3>
            <Link to="/campaigns" className="text-[#00D4C8] text-xs hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {activeCampaigns.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-white/30 text-sm mb-3">No active campaigns yet</p>
              <button onClick={() => navigate("/campaigns/new")} className="btn-primary px-4 py-2 rounded-lg text-sm">
                Create your first campaign
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeCampaigns.slice(0, 4).map((c) => (
                <div
                  key={c.campaign_id}
                  data-testid={`campaign-card-${c.campaign_id}`}
                  className="flex items-center justify-between p-3 bg-[#0A0F2E] rounded-lg border border-white/5 hover:border-[#00D4C8]/20 transition-colors cursor-pointer"
                  onClick={() => navigate("/campaigns")}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-white truncate">{c.name}</p>
                    <p className="text-white/40 text-xs">{c.brand_name} &bull; {c.platforms?.join(", ")}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <span className="text-white/40 text-xs">{c.selected_influencers?.length || 0} creators</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${stageColors[c.stage] || "bg-white/5 text-white/50"}`}>
                      {c.stage}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          <div className="bg-[#131936] border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-orange-400" strokeWidth={1.5} />
              <h3 className="font-heading font-semibold text-white text-sm">Needs Action</h3>
              {pendingCampaigns.length > 0 && (
                <span className="ml-auto bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded-full">{pendingCampaigns.length}</span>
              )}
            </div>
            {pendingCampaigns.length === 0 ? (
              <p className="text-white/30 text-xs py-2">All caught up!</p>
            ) : (
              <div className="space-y-2">
                {pendingCampaigns.slice(0, 3).map((c) => (
                  <div key={c.campaign_id} className="flex items-center gap-2 text-xs">
                    <Clock className="w-3 h-3 text-orange-400 flex-shrink-0" />
                    <span className="text-white/70 truncate">{c.name}</span>
                    <span className={`ml-auto text-xs px-1.5 py-0.5 rounded border ${stageColors[c.stage]}`}>{c.stage}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#131936] border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-semibold text-white text-sm">Recent Messages</h3>
              <Link to="/inbox" className="text-[#00D4C8] text-xs hover:underline">View all</Link>
            </div>
            {unreadMessages.length === 0 ? (
              <p className="text-white/30 text-xs py-2">No new messages</p>
            ) : (
              <div className="space-y-2">
                {unreadMessages.slice(0, 3).map((m) => (
                  <div key={m.message_id} className="flex items-start gap-2 text-xs">
                    <div className="w-6 h-6 rounded-full bg-[#00D4C8]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[#00D4C8] text-xs font-bold">{m.influencer_name?.[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{m.influencer_name}</p>
                      <p className="text-white/40 truncate">{m.content?.substring(0, 50)}...</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
      </motion.div>
    </SpotlightBackground>
  );
}
