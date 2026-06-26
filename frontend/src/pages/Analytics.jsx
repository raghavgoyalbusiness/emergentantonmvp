import { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  BarChart3, TrendingUp, DollarSign, Eye, ShoppingCart
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const wrap = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};
const item = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.42, ease: "easeOut" } },
};
const cardWrap = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="glass-2 rounded-lg p-3 text-xs">
        <p className="text-white/50 mb-1">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }} className="font-semibold">
            {p.name}: {p.value?.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function MetricCard({ icon: Icon, label, value, sub, color = "teal" }) {
  const colorMap = {
    teal: "bg-[#00D4C8]/10 text-[#00D4C8]",
    blue: "bg-blue-500/10 text-blue-400",
    purple: "bg-purple-500/10 text-purple-400",
    green: "bg-green-500/10 text-green-400",
    orange: "bg-orange-500/10 text-orange-400",
  };
  return (
    <div className="glass-2 rounded-xl p-5">
      <div className={`w-9 h-9 rounded-lg ${colorMap[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-4 h-4" strokeWidth={1.5} />
      </div>
      <div className="font-heading font-black text-2xl text-white mb-0.5">{value}</div>
      <div className="text-white/50 text-xs">{label}</div>
      {sub && <div className="text-[#00D4C8] text-xs mt-1">{sub}</div>}
    </div>
  );
}

export default function Analytics() {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [data, setData] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);

  // Runs once on mount — API and axios are stable module-level constants.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    Promise.all([
      axios.get(`${API}/campaigns`, { withCredentials: true }),
      axios.get(`${API}/analytics/overview`, { withCredentials: true }),
    ]).then(([campRes, overviewRes]) => {
      setCampaigns(campRes.data);
      setOverview(overviewRes.data);
      if (campRes.data.length > 0) {
        const first = campRes.data[0].campaign_id;
        setSelectedId(first);
        return axios.get(`${API}/analytics/campaign/${first}`, { withCredentials: true });
      }
    }).then(res => { if (res) setData(res.data); });
  }, []);

  const loadCampaign = async (id) => {
    setSelectedId(id);
    if (!id) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/analytics/campaign/${id}`, { withCredentials: true });
      setData(res.data);
    } finally { setLoading(false); }
  };

  return (
    <motion.div className="max-w-7xl mx-auto" initial="hidden" animate="visible" variants={wrap}>
      <motion.div variants={item} className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading font-bold text-2xl md:text-3xl text-white">Analytics</h1>
          <p className="text-white/40 text-sm mt-1">ROI tracking across all campaigns</p>
        </div>
      </motion.div>

      {/* Overview metric cards — staggered */}
      {overview && (
        <motion.div variants={cardWrap} className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <motion.div variants={item}><MetricCard icon={BarChart3} label="Campaigns" value={overview.total_campaigns} color="teal" /></motion.div>
          <motion.div variants={item}><MetricCard icon={Eye} label="Total Reach" value={`${(overview.total_reach / 1000).toFixed(0)}K`} color="blue" /></motion.div>
          <motion.div variants={item}><MetricCard icon={ShoppingCart} label="Conversions" value={overview.total_conversions?.toLocaleString()} color="purple" /></motion.div>
          <motion.div variants={item}><MetricCard icon={DollarSign} label="Total Spend" value={`$${(overview.total_spend / 1000).toFixed(0)}K`} color="orange" /></motion.div>
          <motion.div variants={item}><MetricCard icon={TrendingUp} label="Avg ROAS" value={`${overview.avg_roas}x`} sub="Return on ad spend" color="green" /></motion.div>
        </motion.div>
      )}

      {/* Monthly trend */}
      {overview?.monthly_trend && (
        <motion.div variants={item} className="glass-2 rounded-xl p-5 mb-6">
          <h3 className="font-heading font-semibold text-white mb-4">5-Month Performance</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={overview.monthly_trend}>
              <defs>
                <linearGradient id="reachGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D4C8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00D4C8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="reach" name="Reach" stroke="#00D4C8" fill="url(#reachGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Campaign deep dive */}
      <motion.div variants={item} className="glass-2 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-white">Campaign Deep Dive</h3>
          <select
            value={selectedId}
            onChange={e => loadCampaign(e.target.value)}
            data-testid="analytics-campaign-select"
            className="glass-input rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#00D4C8]"
          >
            {campaigns.map(c => <option key={c.campaign_id} value={c.campaign_id}>{c.name}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="flex gap-2"><div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" /></div>
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              <div className="glass-1 rounded-lg p-3 text-center">
                <div className="font-heading font-bold text-xl text-white">{(data.reach / 1000).toFixed(0)}K</div>
                <div className="text-white/40 text-xs">Reach</div>
              </div>
              <div className="glass-1 rounded-lg p-3 text-center">
                <div className="font-heading font-bold text-xl text-white">{data.engagement_rate}%</div>
                <div className="text-white/40 text-xs">Engagement</div>
              </div>
              <div className="glass-1 rounded-lg p-3 text-center">
                <div className="font-heading font-bold text-xl text-white">{data.conversions?.toLocaleString()}</div>
                <div className="text-white/40 text-xs">Conversions</div>
              </div>
              <div className="glass-1 rounded-lg p-3 text-center">
                <div className="font-heading font-bold text-xl text-[#00D4C8]">{data.roas}x</div>
                <div className="text-white/40 text-xs">ROAS</div>
              </div>
            </div>

            <div className="mb-5">
              <h4 className="text-white/50 text-xs mb-3">Weekly Trend</h4>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.weekly_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="week" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="reach" name="Reach" fill="#00D4C8" opacity={0.7} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="conversions" name="Conversions" fill="#a78bfa" opacity={0.7} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {data.creator_breakdown?.length > 0 && (
              <div>
                <h4 className="text-white/50 text-xs mb-3">Creator Performance</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" data-testid="creator-breakdown-table">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left text-white/30 py-2 pr-4 font-medium">Creator</th>
                        <th className="text-right text-white/30 py-2 px-3 font-medium">Platform</th>
                        <th className="text-right text-white/30 py-2 px-3 font-medium">Reach</th>
                        <th className="text-right text-white/30 py-2 px-3 font-medium">Eng %</th>
                        <th className="text-right text-white/30 py-2 px-3 font-medium">Conversions</th>
                        <th className="text-right text-white/30 py-2 pl-3 font-medium">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.creator_breakdown.map((c) => (
                        <tr key={c.influencer_id} className="border-b border-white/3 hover:bg-white/2">
                          <td className="text-white py-2 pr-4">{c.name}</td>
                          <td className="text-white/50 py-2 px-3 text-right">{c.platform}</td>
                          <td className="text-white py-2 px-3 text-right">{(c.reach / 1000).toFixed(0)}K</td>
                          <td className="text-[#00D4C8] py-2 px-3 text-right">{c.engagement_rate}%</td>
                          <td className="text-white py-2 px-3 text-right">{c.conversions}</td>
                          <td className="text-white/50 py-2 pl-3 text-right">${c.cost?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-white/30 text-sm text-center py-8">Select a campaign to view analytics</p>
        )}
      </motion.div>
    </motion.div>
  );
}
