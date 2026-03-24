import React, { useState, useEffect, useMemo, useCallback } from "react";
import confetti from "canvas-confetti";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList, PieChart, Pie, AreaChart, Area, CartesianGrid } from "recharts";
import { Vote as VoteIcon, CheckCircle2, AlertCircle, ArrowRight, Lock, LogOut, Users, UserPlus, Trash2, Award, Info, Scale, BarChart3, PieChart as PieChartIcon, Activity } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CandidateVote {
  email: string;
  name?: string;
  choice: string;
  timestamp: number;
}

interface PollConfig {
  candidates: string[];
}

type ViewState = "voter" | "admin" | "login" | "receipt" | "insights";

export default function CandidatePoll() {
  const [view, setView] = useState<ViewState>("voter");
  const [poll, setPoll] = useState<PollConfig>({ candidates: [] });
  const [votes, setVotes] = useState<CandidateVote[]>([]);
  
  const [email, setEmail] = useState("");
  const [voterName, setVoterName] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [lastVote, setLastVote] = useState<CandidateVote | null>(null);
  
  const [newOptions, setNewOptions] = useState<string[]>([]);
  const [newCandidateInput, setNewCandidateInput] = useState("");
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  const fetchPoll = useCallback(() => {
    fetch("/api/candidate/poll")
      .then((res) => res.json())
      .then((data) => {
        setPoll(data);
      });
  }, []);

  const fetchVotes = useCallback(() => {
    fetch("/api/candidate/votes")
      .then((res) => res.json())
      .then((data) => setVotes(data));
  }, []);

  useEffect(() => {
    fetchPoll();
    fetchVotes();
    const interval = setInterval(() => { fetchPoll(); fetchVotes(); }, 5000);
    return () => clearInterval(interval);
  }, [fetchPoll, fetchVotes]);

  const evaluateResults = useMemo(() => {
    if (poll.candidates.length === 0 || votes.length === 0) return { type: 'none' as const };
    
    const counts = poll.candidates.map(c => ({
      name: c,
      count: votes.filter(v => v.choice === c).length,
      percentage: ((votes.filter(v => v.choice === c).length / votes.length) * 100).toFixed(1)
    })).sort((a, b) => b.count - a.count);
    
    const maxCount = counts[0].count;
    if (maxCount === 0) return { type: 'none' as const };
    
    const leaders = counts.filter(c => c.count === maxCount);
    let comparativeInsight = "";
    
    if (counts.length >= 2) {
      if (counts[0].count > counts[1].count) {
        comparativeInsight = `${counts[0].name} is in the lead, higher than ${counts[1].name} by ${counts[0].count - counts[1].count} vote(s).`;
      } else if (counts[0].count === counts[1].count) {
        comparativeInsight = `It's a dead heat! ${counts[0].name} and ${counts[1].name} are statistically tied at ${counts[0].count} votes.`;
      }
    }
    
    if (leaders.length > 1) {
      return { 
        type: 'tie' as const, 
        names: leaders.map(l => l.name).join(' & '), 
        count: maxCount,
        percentage: leaders[0].percentage,
        insight: comparativeInsight
      };
    }
    
    return { 
      type: 'winner' as const, 
      name: leaders[0].name, 
      count: maxCount,
      percentage: leaders[0].percentage,
      insight: comparativeInsight
    };
  }, [poll.candidates, votes]);

  const handleVote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !voterName || !selectedOption) return;

    try {
      const res = await fetch("/api/candidate/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: voterName, choice: selectedOption }),
      });
      const data = await res.json();

      if (res.ok) {
        setLastVote({ email, name: voterName, choice: selectedOption, timestamp: Date.now() });
        setView("receipt");
        setEmail(""); setVoterName(""); setSelectedOption(""); setStatus(null);
        
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
          colors: ['#ffffff', '#3b82f6', '#60a5fa'], gravity: 0.8, scalar: 1.2,
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
      setNewOptions(poll.candidates || []);
      setAdminPassword("");
      setStatus(null);
    } else {
      setStatus({ type: "error", message: "Invalid admin password." });
    }
  };

  const addCandidate = () => {
    const candidate = newCandidateInput.trim();
    if (candidate && !newOptions.includes(candidate)) {
       if (newOptions.length >= 5) {
         setStatus({ type: "error", message: "Maximum 5 candidates allowed." });
         return;
       }
       setNewOptions([...newOptions, candidate]);
       setNewCandidateInput("");
       setStatus(null);
    }
  };

  const startPoll = async () => {
    if (newOptions.length < 2 || newOptions.length > 5) {
      setStatus({ type: "error", message: "Please configure between 2 and 5 candidates." });
      return;
    }

    try {
      const res = await fetch("/api/candidate/poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidates: newOptions }),
      });

      if (res.ok) {
        setStatus({ type: "success", message: "Candidate poll started successfully!" });
        fetchPoll(); fetchVotes();
      } else {
        setStatus({ type: "error", message: "Failed to update poll." });
      }
    } catch (err) {
      setStatus({ type: "error", message: "Network error." });
    }
  };

  const chartData = useMemo(() => {
    if (poll.candidates.length === 0) return [];
    const counts = poll.candidates.map(candidate => ({
      name: candidate,
      value: votes.filter((v) => v.choice === candidate).length
    }));
    const maxVotes = Math.max(...counts.map(c => c.value));
    
    return counts.map(c => ({
      ...c,
      color: (c.value === maxVotes && maxVotes > 0) ? "#3b82f6" : "#ffffff20"
    }));
  }, [poll.candidates, votes]);

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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-white/20 relative overflow-hidden">
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
                    <p className="text-[10px] uppercase tracking-[0.8em] text-white/20 font-bold mt-2">Candidate Election</p>
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
      
      {/* Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[20%] w-[40%] h-[40%] bg-blue-600/10 blur-[150px] rounded-full" />
      </div>

      {/* Navigation */}
      <motion.nav 
        initial={{ y: -100 }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="fixed top-0 w-full bg-[#0a0a0a]/60 backdrop-blur-2xl border-b border-white/5 z-50"
      >
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => { setView("voter"); setStatus(null); }}>
            <div className="w-10 h-10 border border-white/10 rounded-xl flex items-center justify-center bg-white/5">
              <Users size={20} className="text-blue-400" />
            </div>
            <span className="font-black text-xl tracking-tight leading-none text-white">Elections</span>
          </div>
          
          <div className="flex items-center gap-8">
            <button onClick={() => { setView("voter"); setStatus(null); }} className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors">
              Vote
            </button>
            <button onClick={() => { setView("insights"); setStatus(null); }} className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors">
              Results
            </button>
            {isAdminAuthenticated && view === "admin" ? (
              <button onClick={() => { setView("voter"); setIsAdminAuthenticated(false); setStatus(null); }} className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors flex items-center gap-2">
                <LogOut size={12} /> Sign out
              </button>
            ) : (
              <button onClick={() => { setView("login"); setStatus(null); }} className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors flex items-center gap-2">
                <Lock size={12} /> Admin
              </button>
            )}
          </div>
        </div>
      </motion.nav>

      <main className="relative z-10 pt-32 pb-40 px-6 max-w-5xl mx-auto min-h-screen">
        <AnimatePresence mode="wait">
          
          {view === "voter" && (
            <motion.div key="voter" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-2xl mx-auto">
              <div className="text-center space-y-4 mb-16">
                <span className="inline-block px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400">Live Election</span>
                <h1 className="text-5xl font-black tracking-tighter text-white">Select Your Candidate</h1>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 backdrop-blur-xl shadow-2xl relative">
                <form onSubmit={handleVote} className="space-y-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 ml-2">Voter Name</label>
                    <div className="relative group">
                      <input type="text" required value={voterName} onChange={(e) => setVoterName(e.target.value)} placeholder="Please enter your full name" className="w-full px-6 py-5 bg-black/40 border border-white/10 rounded-2xl focus:border-blue-500 transition-all outline-none text-lg font-medium" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 ml-2">Email Address (Authenticity)</label>
                    <div className="relative group">
                      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Please enter your email" className="w-full px-6 py-5 bg-black/40 border border-white/10 rounded-2xl focus:border-blue-500 transition-all outline-none text-lg font-medium" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 ml-2">Candidates</label>
                    <div className="space-y-3">
                      {poll.candidates.length === 0 ? (
                        <div className="p-8 text-center text-white/20 text-xs font-bold uppercase tracking-widest border border-dashed border-white/10 rounded-2xl">No Candidates Configured</div>
                      ) : (
                        poll.candidates.map((cand) => (
                          <label key={cand} onClick={() => setSelectedOption(cand)} className={cn("flex items-center gap-6 p-6 rounded-2xl border transition-all cursor-pointer", selectedOption === cand ? "border-blue-500 bg-blue-500/10" : "border-white/10 bg-black/20 hover:bg-white/5")}>
                            <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all", selectedOption === cand ? "border-blue-500" : "border-white/20")}>
                               {selectedOption === cand && <div className="w-3 h-3 rounded-full bg-blue-500" />}
                            </div>
                            <span className={cn("font-bold text-xl", selectedOption === cand ? "text-white" : "text-white/60")}>{cand}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <button type="submit" disabled={!email || !voterName || !selectedOption} className="w-full py-6 bg-blue-500 text-white hover:bg-blue-600 disabled:bg-white/5 disabled:text-white/20 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all shadow-xl">
                    Submit Vote
                  </button>
                </form>

                {status && (
                  <motion.div className={cn("mt-8 p-4 rounded-xl flex justify-center items-center gap-3 text-[10px] font-bold uppercase tracking-widest border", status.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-red-500/10 border-red-500/20 text-red-500")}>
                    {status.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <p>{status.message}</p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {view === "receipt" && lastVote && (
            <motion.div key="receipt" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md mx-auto text-center w-full">
               <div className="w-24 h-24 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/40"><CheckCircle2 size={40} /></div>
               <h2 className="text-4xl font-black tracking-tighter mb-2">Vote Registered</h2>
               <p className="text-white/60 uppercase tracking-widest font-bold text-sm mb-12">Thanks for voting!</p>
               <div className="bg-white/5 border border-white/10 rounded-[2rem] p-10 space-y-8 text-center">
                 <div><span className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">Voter</span><p className="font-mono text-xl">{lastVote.email}</p></div>
                 <div className="w-12 h-px bg-white/10 mx-auto" />
                 <div><span className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">Selected</span><div className="text-3xl font-black text-blue-400">{lastVote.choice}</div></div>
                 <button onClick={() => { setView("voter"); setLastVote(null); }} className="w-full py-5 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-[0.3em] mt-8 hover:bg-white/90">Back to Election</button>
               </div>
            </motion.div>
          )}

          {view === "login" && (
            <motion.div key="login" className="max-w-sm mx-auto w-full">
              <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-12 text-center shadow-2xl">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-8"><Lock className="text-white/60" /></div>
                <h2 className="text-3xl font-black tracking-tighter mb-8">Admin Lock</h2>
                <form onSubmit={handleAdminLogin} className="space-y-6">
                  <input type="password" required value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Enter key" className="w-full px-6 py-4 bg-black/60 border border-white/10 rounded-xl outline-none text-center font-mono placeholder:text-white/20" />
                  <button type="submit" className="w-full py-4 bg-white text-black rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-white/90">Authenticate</button>
                  <button type="button" onClick={() => setView("voter")} className="text-[10px] font-bold uppercase text-white/30 hover:text-white mt-4 block mx-auto">Cancel</button>
                </form>
                {status && <div className="mt-6 text-red-500 text-[10px] font-black uppercase">{status.message}</div>}
              </div>
            </motion.div>
          )}

          {view === "insights" && (
            <motion.div key="insights" initial={{opacity:0}} animate={{opacity:1}} className="w-full max-w-5xl space-y-12">
              <h1 className="text-5xl font-black tracking-tighter mb-12">Election Results</h1>

              {/* Top Analytical Insight */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="bg-gradient-to-r from-blue-600/20 to-transparent border border-blue-500/30 rounded-[2rem] p-8 flex items-center justify-between relative overflow-hidden">
                   <div className="relative z-10">
                     <div className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2 flex items-center gap-2"><Award size={14} /> Status Overview</div>
                     {evaluateResults.type === 'winner' && <div className="text-2xl font-bold"><span className="text-blue-400">{evaluateResults.name}</span> leads securely.</div>}
                     {evaluateResults.type === 'tie' && <div className="text-2xl font-bold text-orange-400">Deadlock Tie: {evaluateResults.names}</div>}
                     {evaluateResults.type === 'none' && <div className="text-xl font-medium text-white/40">Insufficient data context.</div>}
                     {evaluateResults.type !== 'none' && evaluateResults.insight && (
                       <p className="mt-4 text-sm font-medium text-blue-200/80 p-3 bg-black/30 border border-blue-500/20 rounded-xl leading-relaxed">{evaluateResults.insight}</p>
                     )}
                   </div>
                   {evaluateResults.type !== 'none' && (
                     <div className="text-right border-l border-blue-500/20 pl-6 relative z-10 shrink-0">
                       <div className="text-4xl font-black text-white">{evaluateResults.count} <span className="text-sm text-blue-400 opacity-60">Votes</span></div>
                       <div className="text-sm font-black mt-1 text-blue-400/80">{evaluateResults.percentage}% Stake</div>
                     </div>
                   )}
                </div>

                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 flex flex-col justify-center items-end text-right">
                   <div className="text-[10px] uppercase font-bold text-white/40 mb-2 tracking-widest">Total Ballots Cast</div>
                   <div className="text-6xl font-black font-mono tracking-tighter">{votes.length}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Pie Chart (Opinion Share) */}
                <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 h-[350px] relative">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-white/40 mb-8 flex items-center gap-2"><PieChartIcon size={16} /> Audience Share</h3>
                  <ResponsiveContainer width="100%" height="80%">
                    <PieChart>
                      <Pie data={chartData} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                        {chartData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-10">
                    <span className="text-4xl font-black">{poll.candidates.length}</span>
                    <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold mt-1">Options</span>
                  </div>
                </div>

                {/* Area Chart (Momentum) */}
                <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 h-[350px]">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-white/40 mb-8 flex items-center gap-2"><Activity size={16} /> Voting Momentum</h3>
                  <ResponsiveContainer width="100%" height="80%">
                    <AreaChart data={timeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorVotesCand" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="time" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                      <Area type="monotone" dataKey="votes" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorVotesCand)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Graph Visualization */}
                <div className="lg:col-span-7 bg-white/5 border border-white/10 rounded-[2.5rem] p-10">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-white/40 mb-10 flex items-center gap-2"><BarChart3 size={16} /> Vote Distribution Overview</h3>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical" margin={{ left: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fill: 'white', fontSize: 12, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#0a0a0a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={40}>
                          {chartData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                          <LabelList dataKey="value" position="right" fill="white" fontSize={14} fontWeight="black" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Granular Voter Grouping List */}
                <div className="lg:col-span-5 bg-white/5 border border-white/10 rounded-[2.5rem] p-10 flex flex-col">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-white/40 mb-8 flex items-center gap-2"><Users size={16} /> Demographic List</h3>
                  <div className="flex-1 overflow-y-auto max-h-[400px] space-y-6 pr-2">
                     {poll.candidates.length === 0 ? <p className="text-white/20 text-xs text-center mt-10 uppercase tracking-widest font-bold">No Data Available</p> : 
                        poll.candidates.map(candidate => {
                          const cVotes = votes.filter(v => v.choice === candidate);
                          return (
                            <div key={candidate} className="bg-black/30 border border-white/5 p-6 rounded-2xl">
                               <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                                 <h4 className="font-bold text-lg text-blue-400">{candidate}</h4>
                                 <span className="text-xs font-bold text-white/40">{cVotes.length}</span>
                               </div>
                               {cVotes.length === 0 ? <span className="text-white/20 italic text-sm">No recorded supporters.</span> : (
                                  <ul className="space-y-2">
                                     {cVotes.map(v => (
                                       <li key={v.email} className="flex flex-col gap-1 border-b border-white/5 pb-2 last:border-0">
                                         <span className="font-bold text-sm text-white/90">{v.name || 'Anonymous Voter'}</span>
                                         <span className="font-mono text-[10px] text-white/40">{v.email}</span>
                                       </li>
                                     ))}
                                  </ul>
                               )}
                            </div>
                          )
                        })
                     }
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === "admin" && isAdminAuthenticated && (
            <motion.div key="admin" className="w-full max-w-2xl mx-auto space-y-12">
              <div className="text-center space-y-4 mb-12">
                <h1 className="text-5xl font-black tracking-tighter">Candidate Setup</h1>
                <p className="text-sm text-white/40 uppercase tracking-widest font-bold">Configure Election Framework</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-12 space-y-10">
                 
                 <div className="space-y-6">
                   <div className="flex justify-between items-center">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Candidate Registrar</label>
                     <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">{newOptions.length} / 5</span>
                   </div>
                   
                   <div className="flex gap-4 items-center">
                     <input value={newCandidateInput} onChange={(e) => setNewCandidateInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCandidate()} placeholder="Candidate Name..." className="flex-1 bg-black/50 border border-white/10 rounded-xl px-5 py-4 outline-none focus:border-blue-400 text-base" />
                     <button onClick={addCandidate} className="p-4 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-xl border border-blue-500/20 transition-colors"><UserPlus size={20}/></button>
                   </div>
                 </div>

                 <div className="space-y-3">
                   {newOptions.length === 0 ? <p className="text-center text-white/20 text-xs font-bold uppercase tracking-widest py-6 border border-dashed border-white/10 rounded-xl">No Candidates Added</p> : 
                     newOptions.map((opt, idx) => (
                       <div key={idx} className="flex gap-4 items-center bg-black/30 p-4 border border-white/5 rounded-xl">
                         <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-mono font-bold text-white/40">{idx + 1}</div>
                         <span className="flex-1 font-bold">{opt}</span>
                         <button onClick={() => setNewOptions(newOptions.filter((_, i) => i !== idx))} className="text-white/20 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                       </div>
                   ))}
                 </div>

                 <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-xl flex items-start gap-4">
                    <Info size={16} className="text-blue-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-400/80 leading-relaxed font-medium">Starting a new poll requires a minimum of 2 candidates. Initializing the poll will definitively clear all existing candidate votes in memory.</p>
                 </div>

                 <button onClick={startPoll} className="w-full py-6 bg-white text-black hover:bg-white/90 rounded-2xl font-black uppercase text-xs tracking-[0.3em] transition-all shadow-xl">Start Election Poll</button>
                 {status && <div className={cn("text-[10px] font-bold uppercase tracking-widest text-center mt-6", status.type === "success" ? "text-emerald-400" : "text-red-400")}>{status.message}</div>}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
