import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Plus, Bot, User, Sparkles, Copy, Check } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Generate a session ID — Bedrock requires 2-100 chars
const newSessionId = () => `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const wrap = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};
const msgItem = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: "easeOut" } },
};

const STARTERS = [
  "What type of influencers should I target for a skincare brand?",
  "Help me write an outreach brief for a fitness supplement launch.",
  "How do I calculate ROAS for an influencer campaign?",
  "What's a fair fee structure for a micro-influencer on TikTok?",
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10">
      {copied ? <Check className="w-3.5 h-3.5 text-[#00D4C8]" /> : <Copy className="w-3.5 h-3.5 text-white/40" />}
    </button>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      variants={msgItem}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} group`}
    >
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center mt-1 ${
        isUser ? "bg-[#00D4C8]/15 border border-[#00D4C8]/25" : "bg-[#131936] border border-white/10"
      }`}>
        {isUser
          ? <User className="w-4 h-4 text-[#00D4C8]" />
          : <Bot className="w-4 h-4 text-white/70" />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "bg-[#00D4C8] text-[#0A0F2E] font-medium rounded-tr-sm"
            : "bg-[#131936] text-white/85 border border-white/5 rounded-tl-sm"
        }`}>
          {msg.content}
        </div>
        <div className={`flex items-center gap-1 ${isUser ? "flex-row-reverse" : ""}`}>
          <span className="text-white/25 text-xs">{msg.time}</span>
          {!isUser && <CopyButton text={msg.content} />}
        </div>
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex gap-3"
    >
      <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center bg-[#131936] border border-white/10">
        <Bot className="w-4 h-4 text-white/70" />
      </div>
      <div className="bg-[#131936] border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        <div className="ai-dot" /><div className="ai-dot" /><div className="ai-dot" />
      </div>
    </motion.div>
  );
}

export default function BrandAgent() {
  const [sessionId, setSessionId] = useState(newSessionId);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text) => {
    const content = (text || input).trim();
    if (!content || loading) return;

    const userMsg = { role: "user", content, time: now(), id: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await axios.post(`${API}/agent/chat`, {
        message: content,
        session_id: sessionId,
      });
      const agentMsg = {
        role: "agent",
        content: data.response || "I didn't get a response. Please try again.",
        time: now(),
        id: Date.now() + 1,
      };
      setMessages(prev => [...prev, agentMsg]);
    } catch (err) {
      const errMsg = {
        role: "agent",
        content: `Sorry, I ran into an issue: ${err?.response?.data?.detail || err.message}. Please try again.`,
        time: now(),
        id: Date.now() + 1,
        isError: true,
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const newChat = () => {
    setMessages([]);
    setSessionId(newSessionId());
    setInput("");
    inputRef.current?.focus();
  };

  const isEmpty = messages.length === 0;

  return (
    <motion.div
      className="max-w-4xl mx-auto h-[calc(100vh-90px)] flex flex-col"
      initial="hidden"
      animate="visible"
      variants={wrap}
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00D4C8]/10 border border-[#00D4C8]/25 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#00D4C8]" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-white">Brand Agent</h1>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-white/40 text-xs">Powered by AWS Bedrock · Claude</span>
            </div>
          </div>
        </div>
        <button
          onClick={newChat}
          data-testid="new-chat-btn"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/8 hover:border-white/20 text-white/60 hover:text-white text-sm transition-all"
        >
          <Plus className="w-4 h-4" /> New Chat
        </button>
      </motion.div>

      {/* Chat window */}
      <motion.div
        variants={item}
        className="flex-1 bg-[#131936] border border-white/5 rounded-2xl overflow-hidden flex flex-col"
      >
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4" data-testid="messages-area">
          <AnimatePresence>
            {isEmpty ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-center py-10"
              >
                <div className="w-16 h-16 rounded-2xl bg-[#00D4C8]/10 border border-[#00D4C8]/20 flex items-center justify-center mb-4">
                  <Sparkles className="w-7 h-7 text-[#00D4C8]" strokeWidth={1.5} />
                </div>
                <h3 className="font-heading font-semibold text-white text-lg mb-1">Ask your Brand Agent</h3>
                <p className="text-white/40 text-sm mb-8 max-w-xs">
                  Your AI advisor for influencer strategy, outreach briefs, and campaign insights.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {STARTERS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => send(s)}
                      data-testid={`starter-${i}`}
                      className="text-left px-4 py-3 bg-[#0A0F2E] border border-white/5 hover:border-[#00D4C8]/25 rounded-xl text-white/60 hover:text-white text-xs leading-relaxed transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="messages"
                className="space-y-4"
                initial="hidden"
                animate="visible"
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
              >
                {messages.map(msg => <Message key={msg.id} msg={msg} />)}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Typing indicator */}
          <AnimatePresence>
            {loading && <TypingIndicator key="typing" />}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>

        {/* Session chip */}
        <div className="px-5 py-1.5 flex items-center justify-between border-t border-white/3">
          <span className="text-white/20 text-xs font-mono truncate max-w-xs">{sessionId}</span>
          <span className="text-white/20 text-xs">{messages.filter(m => m.role === "user").length} messages</span>
        </div>

        {/* Input bar */}
        <div className="p-3 border-t border-white/5">
          <div className="flex gap-2 items-end bg-[#0A0F2E] border border-white/10 focus-within:border-[#00D4C8]/40 rounded-xl px-4 py-3 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask about influencer strategy, briefs, outreach..."
              rows={1}
              data-testid="chat-input"
              className="flex-1 bg-transparent text-white text-sm placeholder-white/30 focus:outline-none resize-none leading-relaxed max-h-32 overflow-y-auto"
              style={{ fieldSizing: "content" }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              data-testid="send-btn"
              className="w-9 h-9 rounded-lg bg-[#00D4C8] hover:bg-[#00bfb3] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all flex-shrink-0"
            >
              <Send className="w-4 h-4 text-[#0A0F2E]" />
            </button>
          </div>
          <p className="text-white/20 text-xs mt-1.5 pl-1">Enter to send · Shift+Enter for new line</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
