import { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Send, MessageSquare } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const platformIcons = {
  "Instagram DM": <i className="fa-brands fa-instagram text-pink-400" />,
  "Email": <i className="fa-regular fa-envelope text-blue-400" />,
  "TikTok DM": <i className="fa-brands fa-tiktok" />,
  "WhatsApp": <i className="fa-brands fa-whatsapp text-green-400" />,
  "SMS": <i className="fa-regular fa-comment-dots text-yellow-400" />,
};

const wrap = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};
const threadWrap = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};
const threadItem = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

function timeAgo(ts) {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Inbox() {
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/messages`, { withCredentials: true })
      .then(res => {
        setMessages(res.data);
        if (res.data.length > 0) setSelected(res.data[0]);
      }).finally(() => setLoading(false));
  }, []);

  const markRead = async (msg) => {
    setSelected(msg);
    if (!msg.is_read) {
      await axios.patch(`${API}/messages/${msg.message_id}/read`, {}, { withCredentials: true });
      setMessages(prev => prev.map(m => m.message_id === msg.message_id ? { ...m, is_read: true } : m));
    }
  };

  const sendReply = async () => {
    if (!reply.trim() || !selected) return;
    setSending(true);
    try {
      const res = await axios.post(`${API}/messages`, {
        influencer_name: selected.influencer_name,
        platform: selected.platform,
        content: reply,
        influencer_id: selected.influencer_id,
        campaign_id: selected.campaign_id,
      }, { withCredentials: true });
      setMessages(prev => [res.data, ...prev]);
      setReply("");
    } finally { setSending(false); }
  };

  const grouped = messages.reduce((acc, m) => {
    const key = m.influencer_name || "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const threads = Object.entries(grouped).sort(([, a], [, b]) => {
    const aTs = Math.max(...a.map(m => new Date(m.timestamp).getTime()));
    const bTs = Math.max(...b.map(m => new Date(m.timestamp).getTime()));
    return bTs - aTs;
  });

  const threadMessages = selected
    ? messages.filter(m => m.influencer_name === selected.influencer_name).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    : [];

  if (loading) return (
    <div className="flex gap-4 h-[calc(100vh-120px)]">
      <div className="skeleton w-72 flex-shrink-0 rounded-xl" />
      <div className="skeleton flex-1 rounded-xl" />
    </div>
  );

  return (
    <motion.div initial="hidden" animate="visible" variants={wrap}>
      <motion.div variants={item} className="mb-4">
        <h1 className="font-heading font-bold text-2xl md:text-3xl text-white">Unified Inbox</h1>
        <p className="text-white/40 text-sm mt-1">All creator communications in one place</p>
      </motion.div>

      <motion.div variants={item} className="flex gap-4 h-[calc(100vh-200px)] min-h-96">
        {/* Thread list */}
        <div className="w-72 flex-shrink-0 bg-[#131936] border border-white/5 rounded-xl overflow-hidden flex flex-col">
          <div className="p-3 border-b border-white/5">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-widest">Conversations</p>
          </div>
          <motion.div
            className="overflow-y-auto flex-1"
            initial="hidden"
            animate="visible"
            variants={threadWrap}
          >
            {threads.map(([name, msgs]) => {
              const lastMsg = msgs[msgs.length - 1];
              const unread = msgs.filter(m => !m.is_read).length;
              const isActive = selected?.influencer_name === name;
              return (
                <motion.button
                  key={name}
                  variants={threadItem}
                  onClick={() => markRead(lastMsg)}
                  data-testid={`thread-${name.replace(/ /g, "-")}`}
                  className={`w-full text-left p-3 border-b border-white/3 hover:bg-white/3 transition-colors ${isActive ? "bg-[#00D4C8]/5 border-l-2 border-l-[#00D4C8]" : ""}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-full bg-[#00D4C8]/15 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#00D4C8] text-xs font-bold">{name[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold truncate ${unread > 0 ? "text-white" : "text-white/70"}`}>{name}</span>
                        {unread > 0 && <span className="bg-[#00D4C8] text-black text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold flex-shrink-0 ml-1">{unread}</span>}
                      </div>
                      <span className="text-xs text-white/30">{platformIcons[lastMsg?.platform]} {lastMsg?.platform}</span>
                    </div>
                  </div>
                  <p className="text-white/40 text-xs truncate pl-9">{lastMsg?.content?.substring(0, 45)}...</p>
                  <p className="text-white/20 text-xs pl-9 mt-0.5">{timeAgo(lastMsg?.timestamp)}</p>
                </motion.button>
              );
            })}
          </motion.div>
        </div>

        {/* Message thread */}
        <div className="flex-1 bg-[#131936] border border-white/5 rounded-xl flex flex-col overflow-hidden">
          {selected ? (
            <>
              <div className="p-4 border-b border-white/5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#00D4C8]/15 flex items-center justify-center">
                  <span className="text-[#00D4C8] text-sm font-bold">{selected.influencer_name?.[0]}</span>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{selected.influencer_name}</p>
                  <p className="text-white/30 text-xs flex items-center gap-1">{platformIcons[selected.platform]} {selected.platform}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {threadMessages.map(m => (
                  <div key={m.message_id} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl text-sm ${
                      m.direction === "outbound"
                        ? "bg-[#00D4C8] text-black font-medium rounded-tr-sm"
                        : "bg-black text-white/80 border border-white/5 rounded-tl-sm"
                    }`}>
                      <p>{m.content}</p>
                      <p className={`text-xs mt-1 ${m.direction === "outbound" ? "text-black/50" : "text-white/30"}`}>{timeAgo(m.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 border-t border-white/5">
                <div className="flex gap-2">
                  <textarea
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                    placeholder={`Reply to ${selected.influencer_name}...`}
                    rows={2}
                    data-testid="reply-input"
                    className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[#00D4C8] resize-none"
                  />
                  <button
                    onClick={sendReply}
                    disabled={!reply.trim() || sending}
                    data-testid="send-reply-btn"
                    className="btn-primary w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-50 self-end"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-white/20 text-xs mt-1 pl-1">Press Enter to send, Shift+Enter for new line</p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center">
              <div>
                <MessageSquare className="w-10 h-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/30 text-sm">Select a conversation to view messages</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
