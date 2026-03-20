import React, { useState, useEffect, useMemo, useCallback } from "react";
import confetti from "canvas-confetti";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LabelList
} from "recharts";
import { 
  Vote as VoteIcon, 
  LayoutDashboard, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Lock, 
  LogOut, 
  Users, 
  PieChart as PieChartIcon, 
  BarChart3,
  Mail,
  Clock,
  Plus,
  Trash2,
  Trophy,
  Activity,
  Settings,
  Layout,
  ShieldCheck,
  TrendingUp,
  Target
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Poll {
  id: string;
  question: string;
  options: string[];
}

interface VoteData {
  email: string;
  choice: string;
  reason?: string;
  timestamp: number;
}

export default function App() {
  const [view, setView] = useState<"voter" | "admin" | "login" | "receipt">("voter");
  const [poll, setPoll] = useState<Poll | null>(null);
  const [votes, setVotes] = useState<VoteData[]>([]);
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [lastVote, setLastVote] = useState<VoteData | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [newOptions, setNewOptions] = useState<string[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Calculate leader
  const leader = useMemo(() => {
    if (votes.length === 0 || !poll) return null;
    const counts = poll.options.map(opt => ({
      name: opt,
      count: votes.filter(v => v.choice === opt).length
    }));
    const max = Math.max(...counts.map(c => c.count));
    if (max === 0) return null;
    return counts.find(c => c.count === max);
  }, [poll, votes]);

  // Fetch poll data
  const fetchPoll = useCallback(() => {
    fetch("/api/poll")
      .then((res) => res.json())
      .then((data) => {
        setPoll(data);
        setNewOptions(data.options);
      });
  }, []);

  useEffect(() => {
    fetchPoll();
  }, [fetchPoll]);

  // Fetch votes (for admin)
  const fetchVotes = useCallback(async () => {
    try {
      const res = await fetch("/api/votes");
      const data = await res.json();
      setVotes(data);
    } catch (err) {
      console.error("Failed to fetch votes", err);
    }
  }, []);

  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchVotes();
      const interval = setInterval(fetchVotes, 5000); // Poll for updates
      return () => clearInterval(interval);
    }
  }, [isAdminAuthenticated, fetchVotes]);

  const handleVote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !selectedOption) return;

    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, choice: selectedOption, reason }),
      });

      const data = await res.json();

      if (res.ok) {
        const voteReceipt = { email, choice: selectedOption, timestamp: Date.now() };
        setLastVote(voteReceipt);
        setView("receipt");
        setEmail("");
        setReason("");
        setSelectedOption("");
        setStatus(null);
        
        // Trigger beautiful success animation
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function() {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          const particleCount = 50 * (timeLeft / duration);
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);

        confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#ffffff', '#10b981', '#3b82f6', '#8b5cf6'],
          gravity: 0.8,
          scalar: 1.2,
        });
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
      setAdminPassword("");
      setStatus(null);
    } else {
      setStatus({ type: "error", message: "Invalid admin password." });
    }
  };

  const updatePollOptions = async () => {
    const filteredOptions = newOptions.filter(opt => opt.trim() !== "");
    if (filteredOptions.length < 2) {
      setStatus({ type: "error", message: "At least 2 candidates are required." });
      return;
    }

    try {
      const res = await fetch("/api/poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ options: filteredOptions }),
      });

      if (res.ok) {
        setStatus({ type: "success", message: "Election candidates updated successfully!" });
        fetchPoll();
        fetchVotes(); // Reset votes in UI since backend clears them
      } else {
        setStatus({ type: "error", message: "Failed to update candidates." });
      }
    } catch (err) {
      setStatus({ type: "error", message: "Network error." });
    }
  };

  const chartData = useMemo(() => {
    if (!poll) return [];
    
    const counts = poll.options.map(option => ({
      name: option,
      count: votes.filter((v) => v.choice === option).length
    }));
    
    const maxVotes = Math.max(...counts.map(c => c.count));
    
    return poll.options.map((option) => {
      const voteCount = votes.filter((v) => v.choice === option).length;
      // Dynamic color based on lead status: dark blue for leader, dark red for others
      const color = (voteCount === maxVotes && maxVotes > 0) ? "#1e3a8a" : "#7f1d1d";
      
      return {
        name: option,
        value: voteCount,
        color: color
      };
    });
  }, [poll, votes]);

  const radarData = useMemo(() => {
    if (!poll) return [];
    return poll.options.map((option) => {
      const candidateVotes = votes.filter((v) => v.choice === option);
      const insights = candidateVotes.filter(v => v.reason).length;
      const avgInsightLength = insights > 0 
        ? candidateVotes.reduce((acc, curr) => acc + (curr.reason?.length || 0), 0) / insights 
        : 0;
      
      // Proper metrics for evaluation
      const popularity = (candidateVotes.length / (votes.length || 1)) * 100;
      const engagement = (insights / (candidateVotes.length || 1)) * 100;
      const depth = Math.min(avgInsightLength, 100);

      return {
        subject: option,
        Popularity: Math.round(popularity),
        Engagement: Math.round(engagement),
        Depth: Math.round(depth),
        fullMark: 100,
      };
    });
  }, [poll, votes]);

  const totalVotes = votes.length;

  const marginOfVictory = useMemo(() => {
    if (chartData.length < 2) return null;
    const sorted = [...chartData].sort((a, b) => b.value - a.value);
    const gap = sorted[0].value - sorted[1].value;
    const percentage = totalVotes > 0 ? (gap / totalVotes) * 100 : 0;
    return { gap, percentage, runnerUp: sorted[1].name };
  }, [chartData, totalVotes]);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/20 relative overflow-hidden">
      <AnimatePresence>
        {isInitialLoading && (
          <motion.div
            key="welcome"
            initial={{ opacity: 1 }}
            exit={{ 
              y: "-100%",
              transition: { duration: 1, ease: [0.76, 0, 0.24, 1] }
            }}
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center"
          >
            <motion.div 
              exit={{ opacity: 0, y: -20 }}
              className="relative"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="flex flex-col items-center gap-8"
              >
                <div className="w-32 h-32 border border-white/10 rounded-[2.5rem] flex items-center justify-center bg-white/5 relative overflow-hidden">
                  <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                  >
                    <VoteIcon size={64} strokeWidth={1} className="text-white" />
                  </motion.div>
                  <motion.div 
                    animate={{ 
                      rotate: 360,
                    }}
                    transition={{ 
                      duration: 8, 
                      repeat: Infinity, 
                      ease: "linear" 
                    }}
                    className="absolute inset-0 border-2 border-dashed border-white/5 rounded-[2.5rem]" 
                  />
                </div>
                
                <div className="text-center space-y-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="flex flex-col items-center"
                  >
                    <h1 className="text-6xl font-black tracking-tighter uppercase leading-none">Yuvabe</h1>
                    <p className="text-[10px] uppercase tracking-[0.8em] text-white/20 font-bold mt-2">Election Survey System</p>
                  </motion.div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 1, duration: 1.2, ease: "easeInOut" }}
                className="absolute -bottom-24 left-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Atmospheric Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full animate-slow-glow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full animate-slow-glow" style={{ animationDelay: '-5s' }} />
        <div className="absolute inset-0 bg-grid-white opacity-20" />
      </div>

      {/* Navigation */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="fixed top-0 w-full bg-black/40 backdrop-blur-2xl border-b border-white/5 z-50"
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 border border-white/10 rounded-xl flex items-center justify-center text-white bg-white/5">
              <VoteIcon size={20} strokeWidth={1.5} />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-2xl tracking-tighter uppercase leading-none">Yuvabe</span>
              <span className="text-[9px] uppercase tracking-[0.4em] opacity-40 font-bold">Election Survey</span>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            {view === "voter" || view === "receipt" ? (
              <button 
                onClick={() => {
                  setView("login");
                  setStatus(null);
                }}
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors flex items-center gap-2 group"
              >
                <Lock size={12} className="group-hover:scale-110 transition-transform" />
                Admin Portal
              </button>
            ) : (
              <button 
                onClick={() => {
                  setView("voter");
                  setIsAdminAuthenticated(false);
                  setStatus(null);
                }}
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors flex items-center gap-2 group"
              >
                <LogOut size={12} className="group-hover:scale-110 transition-transform" />
                Exit Admin
              </button>
            )}
          </div>
        </div>
      </motion.nav>

      <main className="relative z-10 pt-32 pb-20 px-6 max-w-7xl mx-auto">
        <AnimatePresence mode="wait" initial={false}>
          {view === "voter" && (
            <motion.div
              key="voter"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-5xl mx-auto"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                <div className="space-y-10">
                  <div className="space-y-4">
                    <motion.span 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] text-white/60"
                    >
                      Official Election Survey
                    </motion.span>
                    <motion.h1 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.8 }}
                      className="text-8xl font-light tracking-tighter leading-[0.9] text-white"
                    >
                      Shape the <br />
                      <span className="font-serif italic font-normal text-white/90">Future.</span>
                    </motion.h1>
                  </div>
                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                    className="text-white/40 text-xl leading-relaxed max-w-md font-light"
                  >
                    Participate in the national election survey. Your insights help us understand the collective vision for our community.
                  </motion.p>
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className="flex items-center gap-6 pt-6"
                  >
                    <div className="flex -space-x-4">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="w-12 h-12 rounded-full border-4 border-black bg-white/10 flex items-center justify-center overflow-hidden grayscale hover:grayscale-0 transition-all duration-500">
                          <img src={`https://picsum.photos/seed/voter${i}/100/100`} alt="voter" referrerPolicy="no-referrer" />
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-lg font-bold font-mono leading-none">{totalVotes}</span>
                      <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Votes Cast</span>
                    </div>
                  </motion.div>
                </div>

                <div className="bg-white/[0.02] border border-white/10 rounded-[3rem] p-12 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  
                  <form onSubmit={handleVote} className="space-y-12">
                    <div className="space-y-6">
                      <label className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/30">
                        Identity Verification
                      </label>
                      <div className="relative group">
                        <Mail className="absolute left-0 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-white transition-colors" size={20} strokeWidth={1.5} />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email address"
                          className="w-full pl-10 pr-4 py-5 bg-transparent border-b border-white/5 focus:border-white transition-all outline-none text-xl font-light placeholder:text-white/10"
                        />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <label className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/30">
                        Survey Insight (Optional)
                      </label>
                      <div className="relative group">
                        <Activity className="absolute left-0 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-white transition-colors" size={20} strokeWidth={1.5} />
                        <input
                          type="text"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Why are you choosing this candidate?"
                          className="w-full pl-10 pr-4 py-5 bg-transparent border-b border-white/5 focus:border-white transition-all outline-none text-xl font-light placeholder:text-white/10"
                        />
                      </div>
                    </div>

                    <div className="space-y-8">
                      <label className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/30">
                        Candidates
                      </label>
                      <div className="grid grid-cols-1 gap-4">
                        {(!poll || poll.options.length === 0) ? (
                          <div className="p-12 border border-dashed border-white/10 rounded-3xl text-center space-y-4">
                            <Activity className="mx-auto text-white/10" size={32} />
                            <p className="text-white/20 text-xs uppercase tracking-widest font-bold">Waiting for poll configuration...</p>
                          </div>
                        ) : (
                          poll.options.map((option, idx) => (
                            <motion.button
                              key={option}
                              type="button"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.3 + idx * 0.1 }}
                              onClick={() => setSelectedOption(option)}
                              className={cn(
                                "group flex items-center justify-between p-6 rounded-2xl border transition-all duration-300 text-left relative overflow-hidden",
                                selectedOption === option
                                  ? "border-white bg-white text-black"
                                  : "border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/20"
                              )}
                            >
                              <div className="flex items-center gap-6">
                                <span className={cn(
                                  "text-xs font-black font-mono opacity-30",
                                  selectedOption === option && "text-black/40"
                                )}>
                                  {String.fromCharCode(65 + idx)}
                                </span>
                                <span className="font-medium tracking-tight text-xl">
                                  {option}
                                </span>
                              </div>
                              <div className={cn(
                                "w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-500",
                                selectedOption === option
                                  ? "border-black bg-black text-white"
                                  : "border-white/10 group-hover:border-white/40"
                              )}>
                                {selectedOption === option && <CheckCircle2 size={14} strokeWidth={2.5} />}
                              </div>
                            </motion.button>
                          ))
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!email || !selectedOption || !poll || poll.options.length === 0}
                      className="w-full py-7 bg-white text-black hover:bg-white/90 disabled:bg-white/5 disabled:text-white/10 rounded-2xl font-black text-xs uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-4 group relative overflow-hidden shadow-xl"
                    >
                      <span className="relative z-10">Submit Ballot</span>
                      <ArrowRight size={18} className="relative z-10 group-hover:translate-x-2 transition-transform" />
                    </button>
                  </form>

                  {status && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "mt-10 p-5 rounded-2xl flex items-start gap-4 text-[10px] font-bold uppercase tracking-[0.2em] border",
                        status.type === "success" 
                          ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500" 
                          : "bg-red-500/5 border-red-500/20 text-red-500"
                      )}
                    >
                      {status.type === "success" ? <ShieldCheck size={18} /> : <AlertCircle size={18} />}
                      <p className="leading-relaxed">{status.message}</p>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {view === "receipt" && lastVote && (
            <motion.div
              key="receipt"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto text-center space-y-16"
            >
              <div className="space-y-6">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="w-24 h-24 bg-white text-black rounded-full flex items-center justify-center mx-auto mb-10 shadow-2xl"
                >
                  <CheckCircle2 size={48} strokeWidth={1.5} />
                </motion.div>
                <h2 className="text-7xl font-light tracking-tighter text-white">
                  Ballot <span className="font-serif italic font-normal">Recorded.</span>
                </h2>
                <div className="space-y-2">
                  <motion.p 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ 
                      type: "spring",
                      stiffness: 260,
                      damping: 20,
                      delay: 0.2
                    }}
                    className="text-emerald-500 font-black text-xs uppercase tracking-[0.5em] animate-pulse"
                  >
                    Thanks for voting!
                  </motion.p>
                  <p className="text-white/30 uppercase tracking-[0.4em] text-[10px] font-bold">Official Yuvabe Election Survey Receipt</p>
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/10 rounded-[3rem] p-12 space-y-10 text-left backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                
                <div className="flex justify-between items-start border-b border-white/5 pb-10">
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/20">Voter Identity</span>
                    <p className="font-mono text-sm text-white/80">{lastVote.email}</p>
                  </div>
                  <div className="text-right space-y-2">
                    <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/20">Timestamp</span>
                    <p className="font-mono text-sm text-white/60">{new Date(lastVote.timestamp).toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/20">Selected Candidate</span>
                  <div className="p-8 bg-white text-black rounded-[2rem] flex items-center justify-between shadow-2xl">
                    <span className="text-4xl font-black tracking-tighter uppercase">{lastVote.choice}</span>
                    <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center">
                      <ShieldCheck size={24} />
                    </div>
                  </div>
                </div>

                {lastVote.reason && (
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/20">Survey Insight</span>
                    <p className="text-sm text-white/60 italic">"{lastVote.reason}"</p>
                  </div>
                )}

                <div className="pt-6 flex items-center justify-center gap-4 opacity-20">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-[8px] uppercase tracking-[0.5em] font-black">Encrypted & Verified</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
              </div>

              <button 
                onClick={() => {
                  setView("voter");
                  setLastVote(null);
                }}
                className="px-12 py-6 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.4em] hover:bg-white hover:text-black transition-all duration-500 shadow-xl"
              >
                Return to Home
              </button>
            </motion.div>
          )}

          {view === "login" && (
            <motion.div
              key="login"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="max-w-md mx-auto"
            >
              <div className="bg-white/[0.02] border border-white/10 rounded-[3rem] p-16 text-center backdrop-blur-2xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                
                <div className="w-20 h-20 border border-white/10 rounded-3xl flex items-center justify-center mx-auto mb-10 bg-white/5">
                  <Lock size={32} strokeWidth={1.5} className="text-white/40" />
                </div>
                <h2 className="text-4xl font-bold tracking-tighter mb-3">Admin Access</h2>
                <p className="text-white/20 text-[10px] mb-12 uppercase tracking-[0.4em] font-black">Secure Authentication Required</p>
                
                <motion.form 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  onSubmit={handleAdminLogin} 
                  className="space-y-8"
                >
                  <div className="relative group">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Security Key"
                      className="w-full px-8 py-6 bg-white/5 border border-white/5 rounded-2xl focus:border-white outline-none transition-all text-center text-xl font-light placeholder:text-white/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-6 top-1/2 -translate-y-1/2 text-white/10 hover:text-white transition-colors"
                    >
                      <Layout size={16} />
                    </button>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-6 bg-white text-black rounded-2xl font-black uppercase tracking-[0.4em] text-[10px] hover:bg-white/90 transition-all shadow-xl"
                  >
                    Authenticate
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("voter")}
                    className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20 hover:text-white transition-all"
                  >
                    Return to Voter View
                  </button>
                </motion.form>

                {status && status.type === "error" && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-8 text-red-500 text-[9px] font-black uppercase tracking-[0.3em]"
                  >
                    {status.message}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {view === "admin" && isAdminAuthenticated && (
            <motion.div
              key="admin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-16"
            >
              {/* Header */}
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12">
                <div className="space-y-4">
                  <span className="inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">
                    Election Dashboard
                  </span>
                  <h1 className="text-7xl font-light tracking-tighter leading-none">
                    Real-time <span className="font-serif italic font-normal">Insights.</span>
                  </h1>
                </div>
                
                <div className="flex items-center gap-6">
                  {leader && (
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="px-8 py-4 bg-white text-black rounded-2xl flex items-center gap-6 shadow-2xl"
                    >
                      <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center">
                        <Trophy size={24} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Current Leader</span>
                        <span className="text-xl font-black tracking-tight uppercase">{leader.name}</span>
                      </div>
                    </motion.div>
                  )}
                  
                  <div className="px-10 py-6 bg-white/[0.02] border border-white/10 rounded-[2rem] flex items-center gap-10 backdrop-blur-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500/60">Live Feed</span>
                    </div>
                    <div className="w-px h-12 bg-white/10" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/20">Total Ballots</span>
                      <span className="text-4xl font-black font-mono tracking-tighter">{totalVotes}</span>
                    </div>
                    <div className="w-px h-12 bg-white/10" />
                    {votes.length > 0 && votes[votes.length - 1].reason && (
                      <div className="hidden md:flex flex-col max-w-[200px]">
                        <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/20">Latest Insight</span>
                        <span className="text-[10px] text-white/60 italic truncate">"{votes[votes.length - 1].reason}"</span>
                      </div>
                    )}
                    <div className="w-px h-12 bg-white/10" />
                    <button 
                      onClick={fetchVotes} 
                      className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-all group"
                      title="Refresh Data"
                    >
                      <Clock size={20} className="text-white/40 group-hover:text-white transition-colors" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Main Dashboard Layout */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
                
                {/* Insights Panel */}
                <div className="xl:col-span-12 bg-white/[0.02] border border-white/10 rounded-[3rem] p-12 backdrop-blur-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />
                  <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                        <Activity className="text-white/40" size={20} />
                      </div>
                      <h3 className="font-black text-xs uppercase tracking-[0.2em]">Voter Insights</h3>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">Qualitative Data</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[300px] overflow-y-auto pr-4 custom-scrollbar">
                    {votes.filter(v => v.reason).length === 0 ? (
                      <div className="col-span-full py-12 text-center">
                        <p className="text-[10px] uppercase tracking-[0.4em] text-white/10 font-black">No qualitative insights recorded yet.</p>
                      </div>
                    ) : (
                      votes.filter(v => v.reason).map((vote, idx) => (
                        <motion.div 
                          key={idx}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          className="p-6 bg-white/5 border border-white/5 rounded-2xl space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black uppercase tracking-widest text-white/20">{vote.choice}</span>
                            <span className="text-[8px] font-mono text-white/10">{new Date(vote.timestamp).toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm text-white/80 italic font-light leading-relaxed">"{vote.reason}"</p>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>

                {/* Left: Histogram (Bar Chart) */}
                <div className="xl:col-span-6 bg-white/[0.02] border border-white/10 rounded-[3rem] p-12 backdrop-blur-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
                  <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                        <BarChart3 className="text-white/40" size={20} />
                      </div>
                      <h3 className="font-black text-xs uppercase tracking-[0.2em]">Vote Distribution</h3>
                    </div>
                    {leader && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-white text-black rounded-full">
                        <Trophy size={10} />
                        <span className="text-[8px] font-black uppercase tracking-widest">{leader.name} Leading</span>
                      </div>
                    )}
                    <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">Histogram View</span>
                  </div>
                  
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <XAxis 
                          dataKey="name" 
                          stroke="rgba(255,255,255,0.1)" 
                          fontSize={10} 
                          tick={{ fill: 'rgba(255,255,255,0.3)' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis 
                          stroke="rgba(255,255,255,0.1)" 
                          fontSize={10} 
                          tick={{ fill: 'rgba(255,255,255,0.3)' }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip 
                          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                          contentStyle={{ 
                            backgroundColor: 'rgba(0,0,0,0.8)', 
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255,255,255,0.1)', 
                            borderRadius: '16px',
                            padding: '12px 16px'
                          }}
                          itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}
                          formatter={(val: number) => [Math.floor(val), "Votes"]}
                        />
                        <Bar 
                          dataKey="value" 
                          radius={[8, 8, 0, 0]}
                          animationBegin={300}
                          animationDuration={1500}
                          animationEasing="ease-out"
                        >
                          {chartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.color} 
                              fillOpacity={leader?.name === entry.name ? 1 : 0.3}
                              stroke={leader?.name === entry.name ? entry.color : "transparent"}
                              strokeWidth={leader?.name === entry.name ? 2 : 0}
                            />
                          ))}
                          <LabelList 
                            dataKey="value" 
                            position="top" 
                            fill={leader ? "rgba(255,255,255,0.6)" : "transparent"} 
                            fontSize={10} 
                            fontWeight="bold"
                            formatter={(val: number) => `${val} ${val === 1 ? 'Vote' : 'Votes'}`}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Right: Pie Chart */}
                <div className="xl:col-span-6 bg-white/[0.02] border border-white/10 rounded-[3rem] p-12 backdrop-blur-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                  <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                        <PieChartIcon className="text-white/40" size={20} />
                      </div>
                      <h3 className="font-black text-xs uppercase tracking-[0.2em]">Market Share</h3>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">Proportional View</span>
                  </div>

                  <div className="h-[400px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          innerRadius={100}
                          outerRadius={140}
                          paddingAngle={8}
                          dataKey="value"
                          stroke="none"
                          animationBegin={500}
                          animationDuration={2000}
                        >
                          {chartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.color} 
                              fillOpacity={leader?.name === entry.name ? 1 : 0.3}
                              stroke={leader?.name === entry.name ? entry.color : "transparent"}
                              strokeWidth={leader?.name === entry.name ? 4 : 0}
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(0,0,0,0.8)', 
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255,255,255,0.1)', 
                            borderRadius: '16px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-4xl font-black font-mono tracking-tighter">{totalVotes}</span>
                      <span className="text-[8px] uppercase tracking-[0.4em] text-white/20 font-bold">Total Ballots</span>
                    </div>
                  </div>
                </div>

                {/* Down Left: Margin of Victory (New Section) */}
                <div className="xl:col-span-6 bg-white/[0.02] border border-white/10 rounded-[3rem] p-12 backdrop-blur-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />
                  <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                        <Target className="text-white/40" size={20} />
                      </div>
                      <h3 className="font-black text-xs uppercase tracking-[0.2em]">Margin of Victory</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">Competitive Gap</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center h-[400px] space-y-12">
                    {marginOfVictory ? (
                      <>
                        <div className="text-center space-y-4">
                          <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-8xl font-black font-mono tracking-tighter text-white"
                          >
                            {marginOfVictory.gap}
                          </motion.div>
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-[0.6em] text-white/20 font-bold">Vote Lead over {marginOfVictory.runnerUp}</span>
                            <div className="mt-6 h-2 w-64 bg-white/5 rounded-full overflow-hidden mx-auto">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(marginOfVictory.percentage * 2, 100)}%` }}
                                className="h-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-12 w-full max-w-md">
                          <div className="p-6 bg-white/5 border border-white/5 rounded-2xl text-center space-y-2">
                            <span className="text-[8px] uppercase tracking-widest text-white/20 font-black">Lead %</span>
                            <p className="text-2xl font-black font-mono">{marginOfVictory.percentage.toFixed(1)}%</p>
                          </div>
                          <div className="p-6 bg-white/5 border border-white/5 rounded-2xl text-center space-y-2">
                            <span className="text-[8px] uppercase tracking-widest text-white/20 font-black">Status</span>
                            <p className={cn(
                              "text-sm font-black uppercase tracking-widest",
                              marginOfVictory.gap > 5 ? "text-emerald-500" : "text-amber-500"
                            )}>
                              {marginOfVictory.gap > 5 ? "Significant" : "Contested"}
                            </p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-[10px] uppercase tracking-[0.4em] text-white/10 font-black">Insufficient data for comparison.</p>
                    )}
                  </div>
                </div>

                {/* Down Right: Candidate Metrics (Radar Chart) */}
                <div className="xl:col-span-6 bg-white/[0.02] border border-white/10 rounded-[3rem] p-12 backdrop-blur-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
                  <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                        <Target className="text-white/40" size={20} />
                      </div>
                      <h3 className="font-black text-xs uppercase tracking-[0.2em]">Candidate Metrics</h3>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">Multi-Dimensional</span>
                  </div>

                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid stroke="rgba(255,255,255,0.05)" />
                        <PolarAngleAxis 
                          dataKey="subject" 
                          tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} 
                        />
                        <PolarRadiusAxis 
                          angle={30} 
                          domain={[0, 'auto']} 
                          tick={false} 
                          axisLine={false} 
                        />
                        <Radar
                          name="Popularity"
                          dataKey="Popularity"
                          stroke="#ffffff"
                          fill="#ffffff"
                          fillOpacity={0.2}
                          animationBegin={900}
                          animationDuration={2000}
                        />
                        <Radar
                          name="Engagement"
                          dataKey="Engagement"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.2}
                          animationBegin={1100}
                          animationDuration={2000}
                        />
                        <Radar
                          name="Depth"
                          dataKey="Depth"
                          stroke="#10b981"
                          fill="#10b981"
                          fillOpacity={0.2}
                          animationBegin={1300}
                          animationDuration={2000}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(0,0,0,0.8)', 
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255,255,255,0.1)', 
                            borderRadius: '16px'
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Candidate Management (Bottom Left) */}
                <div className="xl:col-span-4 bg-white/[0.02] border border-white/10 rounded-[3rem] p-12 space-y-10 backdrop-blur-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                        <Settings className="text-white/60" size={20} />
                      </div>
                      <h3 className="font-black text-xs uppercase tracking-[0.2em]">Poll Setup</h3>
                    </div>
                    <button 
                      onClick={() => setNewOptions([...newOptions, ""])}
                      className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors flex items-center gap-2"
                    >
                      <Plus size={12} />
                      Add Candidate
                    </button>
                  </div>
                  
                  <div className="space-y-6 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                    {newOptions.length === 0 && (
                      <p className="text-white/10 text-[10px] uppercase tracking-widest text-center py-12">No candidates added yet.</p>
                    )}
                    {newOptions.map((opt, idx) => (
                      <motion.div 
                        key={idx} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="relative group flex items-center gap-4"
                      >
                        <span className="text-[10px] font-black font-mono text-white/10 w-6">{String.fromCharCode(65 + idx)}</span>
                        <div className="flex-1 relative">
                          <input
                            value={opt}
                            onChange={(e) => {
                              const updated = [...newOptions];
                              updated[idx] = e.target.value;
                              setNewOptions(updated);
                            }}
                            placeholder={`Enter Candidate Name`}
                            className="w-full py-4 bg-transparent border-b border-white/5 focus:border-white transition-all outline-none text-sm font-medium placeholder:text-white/5"
                          />
                        </div>
                        <button 
                          onClick={() => {
                            const updated = newOptions.filter((_, i) => i !== idx);
                            setNewOptions(updated);
                          }}
                          className="p-2 text-white/10 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </motion.div>
                    ))}
                  </div>

                  <div className="pt-6 space-y-6">
                    <button 
                      onClick={updatePollOptions}
                      className="w-full py-6 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.4em] hover:bg-white/90 transition-all shadow-xl"
                    >
                      Post Election Poll
                    </button>
                    
                    {status && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "p-4 rounded-xl flex items-center gap-3 text-[9px] font-bold uppercase tracking-[0.1em] border",
                          status.type === "success" 
                            ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500" 
                            : "bg-red-500/5 border-red-500/20 text-red-500"
                        )}
                      >
                        {status.type === "success" ? <ShieldCheck size={14} /> : <AlertCircle size={14} />}
                        <p>{status.message}</p>
                      </motion.div>
                    )}

                    <div className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/10 rounded-xl">
                      <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                      <p className="text-[9px] text-red-500/60 font-bold uppercase tracking-[0.1em] leading-relaxed">
                        Note: Updating candidates will manually reset all current votes.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Audit Log (Bottom Right) */}
                <div className="xl:col-span-8 bg-white/[0.02] border border-white/10 rounded-[3rem] overflow-hidden backdrop-blur-xl relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                  <div className="p-10 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                        <Users className="text-white/40" size={20} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.3em]">Voter Registry</span>
                    </div>
                    <div className="px-4 py-2 bg-white/5 rounded-full text-[8px] font-black uppercase tracking-[0.2em] text-white/40">
                      Live Audit Feed
                    </div>
                  </div>
                  <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/[0.01]">
                          <th className="px-10 py-6 text-[9px] font-black text-white/20 uppercase tracking-[0.4em]">Voter Identity</th>
                          <th className="px-10 py-6 text-[9px] font-black text-white/20 uppercase tracking-[0.4em]">Selection</th>
                          <th className="px-10 py-6 text-[9px] font-black text-white/20 uppercase tracking-[0.4em]">Insight</th>
                          <th className="px-10 py-6 text-[9px] font-black text-white/20 uppercase tracking-[0.4em] text-right">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {votes.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-10 py-24 text-center">
                              <p className="text-[10px] uppercase tracking-[0.4em] text-white/10 font-black">No votes recorded yet.</p>
                            </td>
                          </tr>
                        ) : (
                          votes.map((vote, idx) => (
                            <motion.tr 
                              key={idx} 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="hover:bg-white/[0.02] transition-colors group"
                            >
                              <td className="px-10 py-6">
                                <span className="font-mono text-xs text-white/50 group-hover:text-white transition-colors">{vote.email}</span>
                              </td>
                              <td className="px-10 py-6">
                                <span className="text-xs font-black uppercase tracking-[0.2em]">{vote.choice}</span>
                              </td>
                              <td className="px-10 py-6">
                                <span className="text-[10px] text-white/30 italic truncate max-w-[200px] block">{vote.reason || "—"}</span>
                              </td>
                              <td className="px-10 py-6 text-right">
                                <span className="text-[10px] font-mono text-white/20">{new Date(vote.timestamp).toLocaleTimeString()}</span>
                              </td>
                            </motion.tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
      <footer className="relative z-10 py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="font-black text-2xl tracking-tighter uppercase leading-none">Yuvabe</span>
            <span className="text-[9px] uppercase tracking-[0.5em] opacity-20 font-bold">Engineering Excellence</span>
          </div>
          <div className="flex flex-col items-center md:items-end gap-4">
            <p className="text-white/10 text-[9px] uppercase tracking-[0.3em] text-center md:text-right font-bold leading-relaxed">
              &copy; 2026 Yuvabe Technologies. <br />
              Proprietary Election System v4.0.2
            </p>
            <div className="flex items-center gap-6 opacity-20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[8px] font-black uppercase tracking-[0.4em]">System Operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

