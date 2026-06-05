import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Loader2, LayoutGrid, List,
  X, Trash2, Tag, FileText, Instagram, Youtube, CheckCircle,
  Download, Star, MessageSquare, Filter, ArrowRight
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STAGES = [
  "Discovered", "Shortlisted", "Contacted", "Replied",
  "Negotiating", "Approved", "Product Sent", "Content Due",
  "Content Posted", "Paid", "Renewed"
];

const STAGE_COLORS = {
  "Discovered":    { bg: "bg-white/5",          text: "text-white/50",     border: "border-white/10",       dot: "bg-white/30" },
  "Shortlisted":   { bg: "bg-blue-500/10",       text: "text-blue-400",     border: "border-blue-500/20",    dot: "bg-blue-400" },
  "Contacted":     { bg: "bg-yellow-500/10",     text: "text-yellow-400",   border: "border-yellow-500/20",  dot: "bg-yellow-400" },
  "Replied":       { bg: "bg-purple-500/10",     text: "text-purple-400",   border: "border-purple-500/20",  dot: "bg-purple-400" },
  "Negotiating":   { bg: "bg-orange-500/10",     text: "text-orange-400",   border: "border-orange-500/20",  dot: "bg-orange-400" },
  "Approved":      { bg: "bg-[#00D4C8]/10",      text: "text-[#00D4C8]",    border: "border-[#00D4C8]/20",   dot: "bg-[#00D4C8]" },
  "Product Sent":  { bg: "bg-indigo-500/10",     text: "text-indigo-400",   border: "border-indigo-500/20",  dot: "bg-indigo-400" },
  "Content Due":   { bg: "bg-amber-500/10",      text: "text-amber-400",    border: "border-amber-500/20",   dot: "bg-amber-400" },
  "Content Posted":{ bg: "bg-green-500/10",      text: "text-green-400",    border: "border-green-500/20",   dot: "bg-green-400" },
  "Paid":          { bg: "bg-emerald-500/10",    text: "text-emerald-400",  border: "border-emerald-500/20", dot: "bg-emerald-400" },
  "Renewed":       { bg: "bg-cyan-500/10",       text: "text-cyan-400",     border: "border-cyan-500/20",    dot: "bg-cyan-400" },
};

const wrap = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity:0, y:16 }, visible: { opacity:1, y:0, transition: { duration:0.35, ease:"easeOut" } } };

function fmt(n) {
  if (!n && n !== 0) return "—";
  if (n >= 1000000) return `${(n/1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n/1000).toFixed(0)}K`;
  return n.toString();
}

function StageBadge({ stage }) {
  const c = STAGE_COLORS[stage] || STAGE_COLORS["Discovered"];
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {stage}
    </span>
  );
}

function PlatformIcon({ platform }) {
  const p = (platform || "").toLowerCase();
  if (p.includes("youtube")) return <Youtube className="w-3.5 h-3.5 text-red-400" />;
  if (p.includes("tiktok")) return <span className="text-xs font-bold text-white/60">TT</span>;
  return <Instagram className="w-3.5 h-3.5 text-pink-400" />;
}

function ReliabilityBar({ score }) {
  const pct = Math.min(100, Math.max(0, score || 0));
  const color = pct >= 80 ? "bg-green-400" : pct >= 60 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-white/8 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-white/30 w-6 text-right">{pct}</span>
    </div>
  );
}

// Creator card (Kanban / List)
function CreatorCard({ creator, onClick, compact = false }) {
  const [img, setImg] = useState(creator.profile_pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(creator.name)}&background=131936&color=00D4C8&bold=true&size=80`);
  return (
    <div onClick={() => onClick(creator)} data-testid={`creator-card-${creator.crm_id}`}
      className="glass-1 rounded-xl p-3 border border-white/6 hover:border-[#00D4C8]/25 cursor-pointer transition-all hover:bg-white/2 group">
      <div className="flex items-center gap-2.5">
        <img src={img} alt={creator.name} onError={() => setImg(`https://ui-avatars.com/api/?name=${encodeURIComponent(creator.name)}&background=131936&color=00D4C8&bold=true&size=80`)}
          className="w-9 h-9 rounded-full object-cover border border-white/10 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-semibold truncate">{creator.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <PlatformIcon platform={creator.platform} />
            <span className="text-white/35 text-xs">@{creator.handle}</span>
          </div>
        </div>
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowRight className="w-3.5 h-3.5 text-[#00D4C8]" />
        </div>
      </div>
      {!compact && (
        <div className="mt-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-white/25 text-xs">{fmt(creator.followers)} followers · {creator.engagement_rate}%</span>
          </div>
          <StageBadge stage={creator.stage} />
          {creator.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {creator.tags.slice(0,3).map(t => (
                <span key={t} className="text-xs px-1.5 py-0.5 bg-white/5 text-white/35 rounded-md">{t}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Creator detail panel (right side sheet)
function CreatorPanel({ creator, onClose, onUpdate, onDelete }) {
  const [stage, setStage] = useState(creator.stage);
  const [noteText, setNoteText] = useState("");
  const [notes, setNotes] = useState(creator.notes || []);
  const [addingNote, setAddingNote] = useState(false);
  const [updatingStage, setUpdatingStage] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState(creator.tags || []);
  const [img, setImg] = useState(creator.profile_pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(creator.name)}&background=131936&color=00D4C8&bold=true&size=200`);

  const updateStage = async (newStage) => {
    const prevStage = stage;
    setUpdatingStage(true);
    setStage(newStage);
    try {
      await axios.patch(`${API}/crm/creators/${creator.crm_id}`, { stage: newStage });
      onUpdate(creator.crm_id, { stage: newStage });
    } catch (err) {
      console.error("Failed to update stage:", err);
      setStage(prevStage); // revert optimistic update
    } finally {
      setUpdatingStage(false);
    }
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      const { data } = await axios.post(`${API}/crm/creators/${creator.crm_id}/notes`, { content: noteText.trim() });
      setNotes(n => [data, ...n]);
      setNoteText("");
    } catch (err) {
      console.error("Failed to add note:", err);
    } finally { setAddingNote(false); }
  };

  const updateTags = async (newTags) => {
    setTags(newTags);
    try {
      await axios.patch(`${API}/crm/creators/${creator.crm_id}`, { tags: newTags });
      onUpdate(creator.crm_id, { tags: newTags });
    } catch (err) {
      console.error("Failed to update tags:", err);
      setTags(tags); // revert optimistic update
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) updateTags([...tags, t]);
    setTagInput("");
  };

  return (
    <motion.div initial={{ opacity:0, x:40 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:40 }}
      className="w-80 glass-3 rounded-2xl flex flex-col overflow-hidden border border-white/8 flex-shrink-0"
      data-testid="creator-panel">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <p className="text-white text-sm font-semibold">Creator Profile</p>
        <button onClick={onClose} className="text-white/40 hover:text-white p-1 transition-colors"><X className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Avatar + Name */}
        <div className="flex items-center gap-3">
          <img src={img} alt={creator.name}
            onError={() => setImg(`https://ui-avatars.com/api/?name=${encodeURIComponent(creator.name)}&background=131936&color=00D4C8&bold=true&size=200`)}
            className="w-14 h-14 rounded-xl object-cover border border-white/10" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">{creator.name}</p>
            <p className="text-white/40 text-xs">@{creator.handle}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <PlatformIcon platform={creator.platform} />
              <span className="text-white/30 text-xs">{creator.platform}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="glass-1 rounded-lg p-2.5 text-center border border-white/5">
            <p className="text-white text-sm font-bold">{fmt(creator.followers)}</p>
            <p className="text-white/30 text-xs">Followers</p>
          </div>
          <div className="glass-1 rounded-lg p-2.5 text-center border border-white/5">
            <p className="text-[#00D4C8] text-sm font-bold">{creator.engagement_rate}%</p>
            <p className="text-white/30 text-xs">Engagement</p>
          </div>
        </div>

        {/* Reliability */}
        <div className="glass-1 rounded-lg p-3 border border-white/5">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-white/50 text-xs">Reliability Score</p>
            <Star className="w-3.5 h-3.5 text-yellow-400" />
          </div>
          <ReliabilityBar score={creator.reliability_score} />
        </div>

        {/* Stage selector */}
        <div>
          <p className="text-white/40 text-xs mb-2">Pipeline Stage</p>
          <select value={stage} onChange={e => updateStage(e.target.value)} disabled={updatingStage}
            className="w-full glass-input rounded-lg px-3 py-2 text-white text-xs outline-none cursor-pointer disabled:opacity-60"
            data-testid="stage-selector">
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Niche + Email */}
        {creator.niche && (
          <div className="flex gap-1.5 flex-wrap">
            <span className="text-xs px-2 py-0.5 bg-[#00D4C8]/10 text-[#00D4C8] border border-[#00D4C8]/20 rounded-full">{creator.niche}</span>
          </div>
        )}
        {creator.email && (
          <p className="text-white/30 text-xs flex items-center gap-1.5">
            <MessageSquare className="w-3 h-3" />{creator.email}
          </p>
        )}

        {/* Tags */}
        <div>
          <p className="text-white/40 text-xs mb-2 flex items-center gap-1.5"><Tag className="w-3 h-3" />Tags</p>
          <div className="flex flex-wrap gap-1 mb-2">
            {tags.map(t => (
              <span key={t} className="text-xs px-2 py-0.5 bg-white/5 text-white/50 border border-white/10 rounded-full flex items-center gap-1">
                {t}<button onClick={() => updateTags(tags.filter(x => x !== t))} className="opacity-60 hover:opacity-100">&times;</button>
              </span>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input value={tagInput} onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addTag()}
              placeholder="Add tag…"
              className="flex-1 glass-input rounded-lg px-2.5 py-1.5 text-white text-xs outline-none placeholder-white/20" />
            <button onClick={addTag} className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors text-xs">
              Add
            </button>
          </div>
        </div>

        {/* Notes */}
        <div>
          <p className="text-white/40 text-xs mb-2 flex items-center gap-1.5"><FileText className="w-3 h-3" />Notes</p>
          <div className="flex gap-1.5 mb-2">
            <input value={noteText} onChange={e => setNoteText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addNote()}
              placeholder="Add a note…"
              className="flex-1 glass-input rounded-lg px-2.5 py-1.5 text-white text-xs outline-none placeholder-white/20" />
            <button onClick={addNote} disabled={addingNote || !noteText.trim()}
              className="px-2.5 py-1.5 rounded-lg bg-[#00D4C8]/10 hover:bg-[#00D4C8]/20 text-[#00D4C8] transition-colors text-xs disabled:opacity-50">
              {addingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add"}
            </button>
          </div>
          <div className="space-y-2 max-h-36 overflow-y-auto">
            {notes.length === 0 && <p className="text-white/20 text-xs italic">No notes yet</p>}
            {notes.map(n => (
              <div key={n.note_id} className="glass-1 rounded-lg p-2.5 border border-white/5">
                <p className="text-white/70 text-xs">{n.content}</p>
                <p className="text-white/20 text-xs mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/5">
        <button onClick={() => onDelete(creator.crm_id)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/5 transition-colors text-xs"
          data-testid="delete-creator-btn">
          <Trash2 className="w-3.5 h-3.5" /> Remove from CRM
        </button>
      </div>
    </motion.div>
  );
}

export default function CreatorCRM() {
  const [view, setView] = useState("kanban");
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [selectedCreator, setSelectedCreator] = useState(null);
  const [stageFilter, setStageFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/crm/creators`);
      setCreators(data);
    } catch (err) {
      console.error("Failed to load CRM creators:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const doImport = async () => {
    setImporting(true);
    try {
      const { data } = await axios.post(`${API}/crm/import`);
      setImportResult(data);
      await load();
    } catch (err) {
      console.error("Failed to import creators:", err);
    } finally {
      setImporting(false);
      setTimeout(() => setImportResult(null), 4000);
    }
  };

  const updateCreator = (crmId, changes) => {
    setCreators(prev => prev.map(c => c.crm_id === crmId ? { ...c, ...changes } : c));
    if (selectedCreator?.crm_id === crmId) setSelectedCreator(c => ({ ...c, ...changes }));
  };

  const deleteCreator = async (crmId) => {
    try {
      await axios.delete(`${API}/crm/creators/${crmId}`);
      setCreators(prev => prev.filter(c => c.crm_id !== crmId));
      setSelectedCreator(null);
    } catch (err) {
      console.error("Failed to delete creator:", err);
    }
  };

  const filtered = creators.filter(c => {
    if (stageFilter !== "all" && c.stage !== stageFilter) return false;
    if (platformFilter !== "all" && !c.platform.toLowerCase().includes(platformFilter.toLowerCase())) return false;
    return true;
  });

  const byStage = (stage) => filtered.filter(c => c.stage === stage);

  return (
    <motion.div className="h-[calc(100vh-90px)] flex flex-col" initial="hidden" animate="visible" variants={wrap}>
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00D4C8]/10 border border-[#00D4C8]/25 flex items-center justify-center">
            <Users className="w-5 h-5 text-[#00D4C8]" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-white">Creator CRM</h1>
            <p className="text-white/40 text-sm">{creators.length} creators · {STAGES.length} pipeline stages</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Import result */}
          <AnimatePresence>
            {importResult && (
              <motion.span initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                className="flex items-center gap-1.5 text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" /> {importResult.imported} imported
              </motion.span>
            )}
          </AnimatePresence>

          <button onClick={doImport} disabled={importing} data-testid="import-creators-btn"
            className="flex items-center gap-2 px-4 py-2 rounded-xl glass-1 border border-white/10 hover:border-[#00D4C8]/30 text-white/60 hover:text-[#00D4C8] text-sm transition-all disabled:opacity-60">
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {importing ? "Importing…" : "Import Creators"}
          </button>

          {/* View toggle */}
          <div className="flex gap-1 glass-1 rounded-lg p-1 border border-white/10">
            <button onClick={() => setView("kanban")} data-testid="view-kanban"
              className={`p-1.5 rounded-md transition-all ${view === "kanban" ? "bg-[#00D4C8]/15 text-[#00D4C8]" : "text-white/30 hover:text-white"}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setView("list")} data-testid="view-list"
              className={`p-1.5 rounded-md transition-all ${view === "list" ? "bg-[#00D4C8]/15 text-[#00D4C8]" : "text-white/30 hover:text-white"}`}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={item} className="flex gap-2 mb-4 flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-white/30" />
          <span className="text-white/30 text-xs">Filter:</span>
        </div>
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
          className="glass-input rounded-lg px-2.5 py-1.5 text-white/60 text-xs outline-none cursor-pointer" data-testid="stage-filter">
          <option value="all">All Stages</option>
          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)}
          className="glass-input rounded-lg px-2.5 py-1.5 text-white/60 text-xs outline-none cursor-pointer" data-testid="platform-filter">
          <option value="all">All Platforms</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="youtube">YouTube</option>
        </select>
        {(stageFilter !== "all" || platformFilter !== "all") && (
          <button onClick={() => { setStageFilter("all"); setPlatformFilter("all"); }}
            className="text-[#00D4C8] text-xs hover:underline">Clear</button>
        )}
      </motion.div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-[#00D4C8] animate-spin" />
        </div>
      ) : creators.length === 0 ? (
        <motion.div variants={item} className="flex-1 flex flex-col items-center justify-center text-center">
          <Users className="w-12 h-12 text-white/15 mb-4" />
          <p className="text-white/40 text-lg font-heading">No creators in CRM</p>
          <p className="text-white/25 text-sm mt-1 mb-5">Import your discovered influencers to start managing the pipeline</p>
          <button onClick={doImport} disabled={importing}
            className="flex items-center gap-2 px-5 py-3 rounded-xl btn-primary text-sm font-semibold disabled:opacity-60">
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Import from Discovery
          </button>
        </motion.div>
      ) : (
        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Main content */}
          <div className="flex-1 overflow-hidden">
            {/* Empty filter result */}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <Filter className="w-6 h-6 text-white/15 mb-2" />
                <p className="text-white/30 text-sm">No creators match these filters</p>
                <button onClick={() => { setStageFilter("all"); setPlatformFilter("all"); }}
                  className="text-[#00D4C8] text-xs mt-2 hover:underline">Clear filters</button>
              </div>
            )}
            {/* KANBAN VIEW */}
            {view === "kanban" && (
              <div className="h-full overflow-x-auto">
                <div className="flex gap-3 h-full pb-2" style={{ minWidth: `${STAGES.length * 220}px` }}>
                  {STAGES.map(stage => {
                    const stageCreators = byStage(stage);
                    const c = STAGE_COLORS[stage];
                    return (
                      <div key={stage} className="w-52 flex-shrink-0 flex flex-col">
                        <div className={`flex items-center justify-between px-3 py-2 rounded-lg mb-2 border ${c.bg} ${c.border}`}>
                          <span className={`text-xs font-semibold ${c.text}`}>{stage}</span>
                          <span className={`text-xs w-5 h-5 rounded-full flex items-center justify-center bg-white/10 ${c.text}`}>
                            {stageCreators.length}
                          </span>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                          {stageCreators.map(creator => (
                            <CreatorCard key={creator.crm_id} creator={creator}
                              onClick={setSelectedCreator} compact />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* LIST VIEW */}
            {view === "list" && (
              <div className="h-full overflow-y-auto">
                <table className="w-full" data-testid="crm-list-table">
                  <thead className="sticky top-0 z-10">
                    <tr className="glass-3 text-left">
                      <th className="px-4 py-2.5 text-white/30 text-xs font-medium">Creator</th>
                      <th className="px-4 py-2.5 text-white/30 text-xs font-medium hidden sm:table-cell">Platform</th>
                      <th className="px-4 py-2.5 text-white/30 text-xs font-medium hidden md:table-cell">Followers</th>
                      <th className="px-4 py-2.5 text-white/30 text-xs font-medium">Stage</th>
                      <th className="px-4 py-2.5 text-white/30 text-xs font-medium hidden lg:table-cell">Reliability</th>
                      <th className="px-4 py-2.5 text-white/30 text-xs font-medium hidden xl:table-cell">Tags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(creator => (
                      <tr key={creator.crm_id} onClick={() => setSelectedCreator(creator)}
                        className="border-t border-white/4 hover:bg-white/2 cursor-pointer transition-colors group"
                        data-testid={`list-row-${creator.crm_id}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <img src={creator.profile_pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(creator.name)}&background=131936&color=00D4C8&bold=true&size=80`}
                              alt={creator.name} className="w-8 h-8 rounded-full object-cover border border-white/10 flex-shrink-0" />
                            <div>
                              <p className="text-white text-xs font-semibold">{creator.name}</p>
                              <p className="text-white/35 text-xs">@{creator.handle}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <div className="flex items-center gap-1.5"><PlatformIcon platform={creator.platform} />
                            <span className="text-white/40 text-xs">{creator.platform}</span></div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-white/40 text-xs">{fmt(creator.followers)}</td>
                        <td className="px-4 py-3"><StageBadge stage={creator.stage} /></td>
                        <td className="px-4 py-3 hidden lg:table-cell w-28"><ReliabilityBar score={creator.reliability_score} /></td>
                        <td className="px-4 py-3 hidden xl:table-cell">
                          <div className="flex gap-1">{creator.tags?.slice(0,2).map(t => (
                            <span key={t} className="text-xs px-1.5 py-0.5 bg-white/5 text-white/35 rounded-md">{t}</span>
                          ))}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Creator panel */}
          <AnimatePresence>
            {selectedCreator && (
              <CreatorPanel
                creator={selectedCreator}
                onClose={() => setSelectedCreator(null)}
                onUpdate={updateCreator}
                onDelete={deleteCreator}
              />
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
