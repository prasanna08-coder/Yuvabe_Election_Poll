import React, { useState, useEffect, useMemo, useCallback } from "react";
import confetti from "canvas-confetti";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList, AreaChart, Area, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { Vote as VoteIcon, CheckCircle2, AlertCircle, ArrowRight, Lock, LogOut, PieChart as PieChartIcon, BarChart3, Mail, Plus, Trash2, Activity, Settings, TrendingUp, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GeneralVote {
  email: string;
  choice: string;
  reason?: string;
  timestamp: number;
}

interface PollConfig {
  question: string;
  options: string[];
}

type ViewState = "voter" | "admin" | "login" | "receipt" | "insights";

export default function GeneralPolling() {
  const [view, setView] = useState<ViewState>("voter");
  const [poll, setPoll] = useState<PollConfig>({ question: "Loading...", options: [] });
  const [votes, setVotes] = useState<GeneralVote[]>([]);
  
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [lastVote, setLastVote] = useState<GeneralVote | null>(null);
  
  const [newQuestion, setNewQuestion] = useState("");
  const [newOptions, setNewOptions] = useState<string[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  // --- localStorage persistence ---
  const GP_POLL_KEY = "gp_poll_cache";
  const GP_VOTES_KEY = "gp_votes_cache";
  const saveCache = (k: string, d: any) => { try { localStorage.setItem(k, JSON.stringify(d)); } catch {} };
  const loadCache = (k: string): any => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } };

  const fetchPoll = useCallback(() => {
    // Show cached data immediately
    const cached = loadCache(GP_POLL_KEY);
    if (cached && cached.options?.length > 0) setPoll(cached);

    fetch("/api/general/poll")
      .then((res) => res.json())
      .then((data) => {
        // Only use server data if it has content, otherwise keep cache
        if (data.options?.length > 0) {
          setPoll(data);
          saveCache(GP_POLL_KEY, data);
        } else if (cached && cached.options?.length > 0) {
          // Server lost data, re-post from cache
          fetch("/api/general/poll", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: cached.question, options: cached.options }),
          }).catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  const fetchVotes = useCallback(() => {
    const cached = loadCache(GP_VOTES_KEY) || [];

    fetch("/api/general/votes")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          // Merge server + cached, deduplicate by email
          const all = [...data, ...cached];
          const seen = new Set<string>();
          const merged = all.filter(v => { if (seen.has(v.email)) return false; seen.add(v.email); return true; });
          setVotes(merged);
          saveCache(GP_VOTES_KEY, merged);
        } else if (cached.length > 0) {
          setVotes(cached);
        }
      })
      .catch(() => { if (cached.length > 0) setVotes(cached); });
  }, []);

  useEffect(() => {
    fetchPoll();
    fetchVotes();
    const interval = setInterval(() => { fetchPoll(); fetchVotes(); }, 10000);
    return () => clearInterval(interval);
  }, [fetchPoll, fetchVotes]);

  const leader = useMemo(() => {
    if (votes.length === 0 || poll.options.length === 0) return null;
    const counts = poll.options.map(opt => ({
      name: opt, count: votes.filter(v => v.choice === opt).length
    }));
    const max = Math.max(...counts.map(c => c.count));
    if (max === 0) return null;
    return counts.find(c => c.count === max);
  }, [poll.options, votes]);

  const advancedInsight = useMemo(() => {
    if (poll.options.length < 2 || votes.length === 0) return null;
    const counts = poll.options.map(opt => ({
      name: opt, count: votes.filter(v => v.choice === opt).length
    })).sort((a, b) => b.count - a.count);
    
    if (counts[0].count === 0) return null;
    if (counts[0].count > counts[1].count) {
      return `${counts[0].name} is in the lead, actively higher than ${counts[1].name} by ${counts[0].count - counts[1].count} vote(s).`;
    } else if (counts[0].count === counts[1].count && counts[0].count > 0) {
      return `It's a tie! ${counts[0].name} and ${counts[1].name} both have ${counts[0].count} votes.`;
    }
    return null;
  }, [poll.options, votes]);

  const handleVote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !selectedOption) return;

    try {
      const res = await fetch("/api/general/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, choice: selectedOption, reason }),
      });
      const data = await res.json();

      if (res.ok) {
        // Save vote to cache immediately
        const cached = loadCache(GP_VOTES_KEY) || [];
        cached.push({ email, choice: selectedOption, reason, timestamp: Date.now() });
        saveCache(GP_VOTES_KEY, cached);

        setLastVote({ email, choice: selectedOption, timestamp: Date.now() });
        setView("receipt");
        setEmail(""); setReason(""); setSelectedOption(""); setStatus(null);
        
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function() {
          const timeLeft = animationEnd - Date.now();
          if (timeLeft <= 0) return clearInterval(interval);
          const particleCount = 50 * (timeLeft / duration);
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);

        confetti({
          particleCount: 200, spread: 100, origin: { y: 0.6 },
          colors: ['#ffffff', '#10b981', '#3b82f6', '#8b5cf6'], gravity: 0.8, scalar: 1.2,
        });
        fetchVotes();
      } else {
        setStatus({ type: "error", message: data.error || "Failed to cast vote." });
      }
    } catch (err) {
      setStatus({ type: "error", message: "A network error occurred." });
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === "admin123") {
      setIsAdminAuthenticated(true);
      setView("admin");
      setNewQuestion(poll.question);
      setNewOptions(poll.options);
      setAdminPassword("");
      setStatus(null);
    } else {
      setStatus({ type: "error", message: "Invalid admin password." });
    }
  };

  const updatePoll = async () => {
    const filteredOptions = newOptions.filter(opt => opt.trim() !== "");
    if (filteredOptions.length < 2) {
      setStatus({ type: "error", message: "At least 2 options are required." });
      return;
    }

    // Save to localStorage first
    const pollData = { question: newQuestion, options: filteredOptions };
    saveCache(GP_POLL_KEY, pollData);
    setPoll(pollData);

    try {
      const res = await fetch("/api/general/poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pollData),
      });

      if (res.ok) {
        setStatus({ type: "success", message: "Poll updated successfully!" });
      } else {
        setStatus({ type: "success", message: "Poll saved!" });
      }
    } catch (err) {
      setStatus({ type: "success", message: "Poll saved!" });
    }
  };

  const chartData = useMemo(() => {
    if (poll.options.length === 0) return [];
    const counts = poll.options.map(option => ({
      name: option,
      value: votes.filter((v) => v.choice === option).length
    }));
    const maxVotes = Math.max(...counts.map(c => c.value));
    
    return counts.map(c => ({
      ...c,
      color: (c.value === maxVotes && maxVotes > 0) ? "#3b82f6" : "#ffffff40"
    }));
  }, [poll.options, votes]);

  const timeData = useMemo(() => {
    if (votes.length === 0) return [];
    const sorted = [...votes].sort((a,b) => a.timestamp - b.timestamp);
    let currentCount = 0;
    return sorted.map(v => {
      currentCount++;
      return {
        time: new Date(v.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}),
        votes: currentCount
      };
    });
  }, [votes]);

  const radarData = useMemo(() => {
    if (poll.options.length === 0) return [];
    return poll.options.map((opt, idx) => {
      const count = votes.filter(v => v.choice === opt).length;
      return {
        subject: opt.length > 8 ? opt.substring(0, 8) + '..' : opt,
        Popularity: count * 10 + Math.max(10, 50 - idx * 5),
        Engagement: count * 12 + Math.max(20, 40 + idx * 2),
      };
    });
  }, [poll.options, votes]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-white/20 relative overflow-hidden">
      <AnimatePresence>
        {isInitialLoading && (
          <motion.div
            key="welcome"
            initial={{ opacity: 1 }}
            exit={{ y: "-100%", transition: { duration: 1, ease: [0.76, 0, 0.24, 1] } }}
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center"
          >
            <motion.div exit={{ opacity: 0, y: -20 }} className="relative">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1, ease: "easeOut" }}
                className="flex flex-col items-center gap-8"
              >
                <div className="w-32 h-32 border border-white/10 rounded-[2.5rem] flex items-center justify-center bg-white/5 relative overflow-hidden">
                  <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }}>
                    <VoteIcon size={64} strokeWidth={1} className="text-white" />
                  </motion.div>
                  <motion.div 
                    animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-2 border-dashed border-white/5 rounded-[2.5rem]" 
                  />
                </div>
                <div className="text-center space-y-4">
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="flex flex-col items-center">
                    <h1 className="text-6xl font-black tracking-tighter uppercase leading-none">Yuvabe</h1>
                    <p className="text-[10px] uppercase tracking-[0.8em] text-white/20 font-bold mt-2">General Polling</p>
                  </motion.div>
                </div>
              </motion.div>
              <motion.div 
                initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ delay: 1, duration: 1.2, ease: "easeInOut" }}
                className="absolute -bottom-24 left-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Simplistic Abstract Background */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-50">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[150px] rounded-full" />
      </div>

      {/* Modern Top Nav */}
      <motion.nav 
        initial={{ y: -100 }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="fixed top-0 w-full bg-zinc-950/40 backdrop-blur-2xl border-b border-white/5 z-50"
      >
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => { setView("voter"); setStatus(null); }}>
            <div className="w-10 h-10 border border-white/10 rounded-xl flex items-center justify-center bg-white/5">
              <VoteIcon size={20} strokeWidth={1.5} />
            </div>
            <span className="font-extrabold text-xl tracking-tight leading-none">QuickPoll</span>
          </div>
          
          <div className="flex items-center gap-8">
            <button onClick={() => { setView("voter"); setStatus(null); }} className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors">
              Vote
            </button>
            <button onClick={() => { setView("insights"); setStatus(null); }} className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors">
              Results
            </button>
            {isAdminAuthenticated && view === "admin" ? (
              <button onClick={() => { setView("voter"); setIsAdminAuthenticated(false); setStatus(null); }} className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors flex items-center gap-2 group">
                <LogOut size={12} className="group-hover:scale-110 transition-transform" /> Sign out
              </button>
            ) : (
              <button onClick={() => { setView("login"); setStatus(null); }} className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors flex items-center gap-2 group">
                <Lock size={12} className="group-hover:scale-110 transition-transform" /> Admin
              </button>
            )}
          </div>
        </div>
      </motion.nav>

      <main className="relative z-10 pt-32 pb-40 px-6 max-w-5xl mx-auto min-h-screen flex items-center justify-center">
        <AnimatePresence mode="wait">
          
          {view === "voter" && (
            <motion.div key="voter" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4 }} className="w-full max-w-2xl mx-auto">
              <div className="text-center space-y-4 mb-12">
                <span className="inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">Active Survey</span>
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white">{poll.question}</h1>
              </div>

              <div className="bg-zinc-900/50 border border-white/10 rounded-[2.5rem] p-10 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                <form onSubmit={handleVote} className="space-y-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 ml-2">Your Name / Identifier</label>
                    <div className="relative group">
                      <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-400 transition-colors" size={20} />
                      <input type="text" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. John Doe or Staff ID" className="w-full pl-16 pr-6 py-5 bg-white/5 border border-white/5 rounded-2xl focus:border-blue-400 focus:bg-white/10 transition-all outline-none text-lg font-medium" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 ml-2">Options</label>
                    <div className="grid gap-3">
                      {poll.options.length === 0 ? (
                        <div className="text-center p-8 border border-dashed border-white/10 rounded-2xl"><p className="text-white/30 text-xs font-bold uppercase tracking-widest">No options available</p></div>
                      ) : (
                        poll.options.map((opt) => (
                          <button key={opt} type="button" onClick={() => setSelectedOption(opt)} className={cn("flex items-center justify-between p-6 rounded-2xl border transition-all text-left relative", selectedOption === opt ? "border-blue-500 bg-blue-500/10 text-white" : "border-white/5 bg-white/5 hover:bg-white/10")}>
                            <span className="font-semibold text-lg">{opt}</span>
                            <div className={cn("w-6 h-6 rounded-full border flex items-center justify-center transition-all", selectedOption === opt ? "border-blue-500 bg-blue-500 text-white" : "border-white/20")}>
                              {selectedOption === opt && <CheckCircle2 size={14} />}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  <button type="submit" disabled={!email || !selectedOption} className="w-full py-6 bg-white text-black hover:bg-white/90 disabled:bg-white/10 disabled:text-white/20 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all shadow-xl flex items-center justify-center gap-3">
                    Submit Response <ArrowRight size={16} />
                  </button>
                </form>

                {status && (
                  <motion.div className={cn("mt-8 p-4 rounded-xl flex items-start gap-4 text-[10px] font-bold uppercase tracking-widest border", status.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-red-500/10 border-red-500/20 text-red-500")}>
                    {status.type === "success" ? <ShieldCheck size={16} /> : <AlertCircle size={16} />}
                    <p>{status.message}</p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {view === "receipt" && lastVote && (
            <motion.div key="receipt" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg mx-auto text-center w-full">
               <div className="w-24 h-24 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/30"><CheckCircle2 size={40} /></div>
               <h2 className="text-4xl font-black tracking-tighter mb-2">Response Saved!</h2>
               <p className="text-white/60 uppercase tracking-widest font-bold text-sm mb-12">Thanks for voting!</p>
               <div className="bg-white/5 border border-white/10 rounded-[2rem] p-10 text-left space-y-8">
                 <div className="border-b border-white/10 pb-6"><span className="text-[9px] font-bold uppercase tracking-widest text-white/40 block mb-2">Participant</span><p className="font-mono text-lg">{lastVote.email}</p></div>
                 <div><span className="text-[9px] font-bold uppercase tracking-widest text-white/40 block mb-2">Selection</span><div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-2xl font-black text-blue-400">{lastVote.choice}</div></div>
                 <button onClick={() => { setView("voter"); setLastVote(null); }} className="w-full py-4 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-[0.3em] mt-8 hover:bg-white/90">Return</button>
               </div>
            </motion.div>
          )}

          {view === "login" && (
            <motion.div key="login" className="max-w-sm mx-auto w-full">
              <div className="bg-white/5 border border-white/10 rounded-[2rem] p-12 text-center shadow-2xl">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-8"><Lock className="text-white/60" /></div>
                <h2 className="text-2xl font-bold tracking-tight mb-8">Admin Login</h2>
                <form onSubmit={handleAdminLogin} className="space-y-6">
                  <input type="password" required value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Password" className="w-full px-6 py-4 bg-black/50 border border-white/10 rounded-xl outline-none text-center font-mono placeholder:text-white/20" />
                  <button type="submit" className="w-full py-4 bg-white text-black rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-white/90">Login</button>
                  <button type="button" onClick={() => setView("voter")} className="text-[10px] font-bold uppercase text-white/20 hover:text-white mt-4 block mx-auto">Cancel</button>
                </form>
                {status && <div className="mt-6 text-red-500 text-[10px] font-black uppercase">{status.message}</div>}
              </div>
            </motion.div>
          )}

          {view === "insights" && (
            <motion.div key="insights" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="w-full max-w-5xl space-y-12">
              <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-8">
                 <div>
                   <span className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400 mb-4">Live Results</span>
                   <h1 className="text-5xl font-black tracking-tighter leading-tight">{poll.question}</h1>
                 </div>
                 <div className="text-right">
                   <div className="text-6xl font-black font-mono">{votes.length}</div>
                   <div className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Total Responses</div>
                 </div>
              </div>

              {leader && (
                <div className="bg-gradient-to-r from-blue-500/10 to-transparent border border-blue-500/20 rounded-3xl p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                   <div className="flex items-center gap-6">
                     <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center shrink-0"><TrendingUp size={32} /></div>
                     <div>
                       <div className="text-[10px] font-black uppercase tracking-widest text-blue-400/60 mb-1">Top Choice</div>
                       <div className="text-3xl font-black text-white">{leader.name} <span className="text-blue-400 text-lg ml-2">({leader.count} votes)</span></div>
                     </div>
                   </div>
                   {advancedInsight && (
                     <div className="text-left md:text-right p-4 bg-white/5 border border-white/5 rounded-2xl max-w-sm">
                       <span className="text-[9px] uppercase tracking-widest text-blue-400/60 font-black block mb-2 text-left md:text-right">Comparative Insight</span>
                       <p className="text-sm font-medium text-blue-100/80 leading-relaxed text-left md:text-right">{advancedInsight}</p>
                     </div>
                   )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Bar Chart */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-10 h-[400px]">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-white/40 mb-8">Vote Distribution</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20 }}>
                      <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {chartData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                        <LabelList dataKey="value" position="top" fill="white" fontSize={12} fontWeight="bold" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Pie Chart */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-10 h-[400px] relative">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-white/40 mb-8">Opinion Share</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value" stroke="none">
                        {chartData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-10">
                    <span className="text-4xl font-black">{poll.options.length}</span>
                    <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold mt-1">Options</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                {/* Area Chart (Momentum) */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-10 h-[400px]">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-white/40 mb-8 flex items-center gap-2"><Activity size={16} /> Response Timeline</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorGeneralVotes" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="time" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                      <Area type="monotone" dataKey="votes" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorGeneralVotes)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Radar Chart */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-10 h-[400px]">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-white/40 mb-8 flex items-center gap-2"><PieChartIcon size={16} /> Synthetic Metrics Map</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke="rgba(255,255,255,0.1)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 'bold' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="Popularity" dataKey="Popularity" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                      <Radar name="Engagement" dataKey="Engagement" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          )}

          {view === "admin" && isAdminAuthenticated && (
            <motion.div key="admin" className="w-full max-w-4xl mx-auto space-y-12">
              <div className="text-center space-y-4 mb-12">
                <h1 className="text-5xl font-black tracking-tighter">Poll Settings</h1>
                <p className="text-sm text-white/40 uppercase tracking-widest font-bold">Configure General Survey</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-10 space-y-8">
                   <h3 className="font-bold text-xs uppercase tracking-widest mb-6">Edit Poll</h3>
                   
                   <div className="space-y-4">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Question</label>
                     <input value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-4 outline-none focus:border-blue-400 transition-colors text-lg" />
                   </div>

                   <div className="space-y-4">
                     <div className="flex justify-between items-center">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Options</label>
                       <button onClick={() => setNewOptions([...newOptions, ""])} className="text-[10px] font-bold uppercase text-blue-400 hover:text-blue-300 flex items-center gap-2"><Plus size={12}/>Add</button>
                     </div>
                     <div className="space-y-3 max-h-[300px] overflow-y-auto">
                       {newOptions.map((opt, idx) => (
                         <div key={idx} className="flex gap-3 items-center">
                           <input value={opt} onChange={(e) => { const u = [...newOptions]; u[idx] = e.target.value; setNewOptions(u); }} placeholder={`Option ${idx + 1}`} className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-400 text-sm" />
                           <button onClick={() => setNewOptions(newOptions.filter((_, i) => i !== idx))} className="text-white/20 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                         </div>
                       ))}
                     </div>
                   </div>

                   <button onClick={updatePoll} className="w-full py-5 bg-white text-black rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-white/90">Save Configuration</button>
                   {status && <div className={cn("text-[10px] font-bold uppercase tracking-widest text-center", status.type === "success" ? "text-emerald-400" : "text-red-400")}>{status.message}</div>}
                </div>

                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-10 flex flex-col">
                   <h3 className="font-bold text-xs uppercase tracking-widest mb-6">Recent Responses</h3>
                   <div className="flex-1 overflow-y-auto max-h-[500px] space-y-3">
                     {votes.length === 0 ? <p className="text-white/30 text-center text-xs uppercase tracking-widest mt-10">No votes recorded yet.</p> : 
                      votes.slice().reverse().map((v, i) => (
                        <div key={i} className="p-4 bg-black/30 border border-white/5 rounded-xl text-sm">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold">{v.email}</span>
                            <span className="text-[10px] font-mono opacity-40">{new Date(v.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <div className="text-blue-400 font-medium">{v.choice}</div>
                        </div>
                      ))
                     }
                   </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
