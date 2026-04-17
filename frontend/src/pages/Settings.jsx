import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { CheckCircle2, ExternalLink, Zap } from "lucide-react";

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

const wrap = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.42, ease: "easeOut" } },
};
const gridWrap = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};
const gridItem = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: "easeOut" } },
};

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
            <div className="w-16 h-16 rounded-xl bg-[#00D4C8]/15 flex items-center justify-center">
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

      {/* Integrations */}
      <motion.div variants={item} className="glass-2 rounded-xl p-6 mb-6" data-testid="integrations-section">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-white">Integrations</h3>
          <span className="text-white/30 text-xs">{integrations.filter(i => i.status === "connected").length} active • {integrations.filter(i => i.status === "demo").length} demo</span>
        </div>
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
          initial="hidden"
          animate="visible"
          variants={gridWrap}
        >
          {integrations.map(int => (
            <motion.div
              key={int.name}
              variants={gridItem}
              data-testid={`integration-${int.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
              className="flex items-center justify-between p-3 glass-1 rounded-lg hover:border-white/10 transition-colors"
            >
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
                  <span className="flex items-center gap-1 text-green-400 text-xs bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Active
                  </span>
                ) : (
                  <span className="text-yellow-400 text-xs bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">
                    Demo
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Plan info */}
      <motion.div variants={item} className="bg-[#00D4C8]/5 border border-[#00D4C8]/20 rounded-xl p-6" data-testid="plan-section">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-heading font-semibold text-white mb-1">Growth Plan</h3>
            <p className="text-white/40 text-sm mb-3">$599/month • Up to 10 active campaigns</p>
            <ul className="space-y-1.5 text-sm text-white/60">
              {["Unlimited creator searches", "AI scoring & outreach generation", "Stripe escrow payments", "Full analytics & ROAS tracking"].map(f => (
                <li key={f} className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00D4C8] flex-shrink-0" />
                  {f}
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
