import React, { useState, useEffect, useMemo, useCallback } from "react";
import confetti from "canvas-confetti";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LabelList, AreaChart, Area
} from "recharts";
import {
  Vote as VoteIcon, LayoutDashboard, User, CheckCircle2, AlertCircle, ArrowRight,
  Lock, LogOut, Users, PieChart as PieChartIcon, BarChart3, Mail, Clock, Plus,
  Trash2, Trophy, Activity, Settings, Layout, ShieldCheck, TrendingUp, Target,
  MapPin, Globe, ChevronLeft
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import PartyInsightsModal from "./components/PartyInsightsModal";

function cn(...inputs: ClassValue[]) {

  return twMerge(clsx(inputs));
}

export const TN_DISTRICTS = [
  "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore",
  "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kanchipuram",
  "Kanyakumari", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai",
  "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai",
  "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi",
  "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli",
  "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur",
  "Vellore", "Viluppuram", "Virudhunagar"
];

interface VoteData {
  email: string;
  choice: string;
  reason?: string;
  timestamp: number;
  district: string;
}

type ViewState = "districts" | "voter" | "admin" | "login" | "receipt" | "state_insights";

export default function StateElection() {
  const [view, setView] = useState<ViewState>("districts");
  const [districtsData, setDistrictsData] = useState<Record<string, { candidates: string[] }>>({});
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [adminDistrict, setAdminDistrict] = useState<string>("Chennai");

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

  const [isInsightsModalOpen, setIsInsightsModalOpen] = useState(false);
  const [selectedPartyForInsights, setSelectedPartyForInsights] = useState<string | null>(null);


  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  // --- localStorage is the PRIMARY data source ---
  // Server is only a sync target; localStorage always wins
  const CACHE_KEY_DISTRICTS = "tn_election_districts_cache";
  const CACHE_KEY_VOTES = "tn_election_votes_cache";

  const saveToCache = (key: string, data: any) => {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch { }
  };
  const loadFromCache = (key: string): any => {
    try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : null; } catch { return null; }
  };

  // Merge server districts with cached districts - NEVER lose cached data
  const mergeDistricts = (serverData: any, cachedData: any) => {
    const result = { ...serverData };
    if (!cachedData) return result;
    for (const district of Object.keys(cachedData)) {
      // If cached has candidates, ALWAYS keep them (even if server also has data)
      if (cachedData[district]?.candidates?.length > 0) {
        result[district] = { ...result[district], candidates: cachedData[district].candidates };
      }
    }
    return result;
  };

  // Merge votes - combine server + cached, deduplicate by email+district
  const mergeVotes = (serverVotes: any[], cachedVotes: any[]) => {
    if (!cachedVotes || cachedVotes.length === 0) return serverVotes || [];
    if (!serverVotes || serverVotes.length === 0) return cachedVotes;
    const all = [...serverVotes, ...cachedVotes];
    const seen = new Set<string>();
    return all.filter(v => {
      const key = `${v.email}_${v.district}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const fetchPoll = useCallback(() => {
    const cached = loadFromCache(CACHE_KEY_DISTRICTS);

    // IMMEDIATELY show cached data (no loading flicker)
    if (cached) {
      setDistrictsData(cached);
      if (cached[adminDistrict]?.candidates) {
        setNewOptions(cached[adminDistrict].candidates);
      }
    }

    // Then try to sync with server in background
    fetch("/api/poll")
      .then(res => res.json())
      .then(serverData => {
        const merged = mergeDistricts(serverData, cached);
        setDistrictsData(merged);
        saveToCache(CACHE_KEY_DISTRICTS, merged);
        if (merged[adminDistrict]?.candidates) {
          setNewOptions(merged[adminDistrict].candidates);
        }

        // Re-post any cached districts that server doesn't have
        if (cached) {
          for (const district of Object.keys(cached)) {
            if (cached[district]?.candidates?.length > 0 &&
              (!serverData[district] || serverData[district]?.candidates?.length === 0)) {
              fetch("/api/poll", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ district, options: cached[district].candidates }),
              }).catch(() => { });
            }
          }
        }
      })
      .catch(() => { }); // Cached data already shown, no action needed on error
  }, [adminDistrict]);

  useEffect(() => {
    fetchPoll();
  }, [fetchPoll]);

  const fetchVotes = useCallback(async () => {
    const cached = loadFromCache(CACHE_KEY_VOTES) || [];

    try {
      const res = await fetch("/api/votes");
      const serverVotes = await res.json();
      const merged = mergeVotes(
        Array.isArray(serverVotes) ? serverVotes : [],
        Array.isArray(cached) ? cached : []
      );
      setVotes(merged);
      saveToCache(CACHE_KEY_VOTES, merged);
    } catch {
      // Server failed, just use cached votes
      if (cached.length > 0) setVotes(cached);
    }
  }, []);

  useEffect(() => {
    fetchVotes();
    const interval = setInterval(fetchVotes, 10000); // Slower polling to reduce cold-start hits
    return () => clearInterval(interval);
  }, [fetchVotes]);

  const updatePollOptions = async () => {
    const filteredOptions = newOptions.filter(opt => opt.trim() !== "");
    if (filteredOptions.length < 2) {
      setStatus({ type: "error", message: "At least 2 candidates are required." });
      return;
    }

    // ALWAYS save to localStorage FIRST (guaranteed persistence)
    const cached = loadFromCache(CACHE_KEY_DISTRICTS) || {};
    cached[adminDistrict] = { candidates: filteredOptions };
    saveToCache(CACHE_KEY_DISTRICTS, cached);

    // Update React state immediately
    setDistrictsData(prev => ({ ...prev, [adminDistrict]: { candidates: filteredOptions } }));

    // Then try to sync with server
    try {
      const res = await fetch("/api/poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ district: adminDistrict, options: filteredOptions }),
      });

      if (res.ok) {
        setStatus({ type: "success", message: `Candidates updated successfully for ${adminDistrict}!` });
      } else {
        setStatus({ type: "success", message: `Candidates saved for ${adminDistrict}!` });
      }
    } catch (err) {
      setStatus({ type: "success", message: `Candidates saved for ${adminDistrict}!` });
    }
  };

  const districtVotes = useMemo(() => {
    const target = view === "admin" ? adminDistrict : selectedDistrict;
    return votes.filter(v => v.district === target);
  }, [votes, selectedDistrict, adminDistrict, view]);

  const activeCandidates = useMemo(() => {
    const target = view === "admin" ? adminDistrict : selectedDistrict;
    return districtsData[target]?.candidates || [];
  }, [districtsData, selectedDistrict, adminDistrict, view]);

  const leader = useMemo(() => {
    if (districtVotes.length === 0 || activeCandidates.length === 0) return null;
    const counts = activeCandidates.map(opt => ({
      name: opt,
      count: districtVotes.filter(v => v.choice === opt).length
    }));
    const max = Math.max(...counts.map(c => c.count));
    if (max === 0) return null;
    return counts.find(c => c.count === max);
  }, [activeCandidates, districtVotes]);

  const handleVote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !selectedOption || !selectedDistrict) return;

    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, choice: selectedOption, reason, district: selectedDistrict }),
      });
      const data = await res.json();

      if (res.ok) {
        // Save vote to localStorage cache too
        const cachedVotes = loadFromCache(CACHE_KEY_VOTES) || [];
        const newVote = { email, choice: selectedOption, reason, timestamp: Date.now(), district: selectedDistrict };
        cachedVotes.push(newVote);
        saveToCache(CACHE_KEY_VOTES, cachedVotes);

        setLastVote({ email, choice: selectedOption, timestamp: Date.now(), district: selectedDistrict });
        setView("receipt");
        setEmail("");
        setReason("");
        setSelectedOption("");
        setStatus(null);

        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function () {
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

  const chartData = useMemo(() => {
    if (activeCandidates.length === 0) return [];
    const counts = activeCandidates.map(option => ({
      name: option,
      count: districtVotes.filter((v) => v.choice === option).length
    }));
    const maxVotes = Math.max(...counts.map(c => c.count));

    return activeCandidates.map((option) => {
      const voteCount = districtVotes.filter((v) => v.choice === option).length;
      const color = (voteCount === maxVotes && maxVotes > 0) ? "#1e3a8a" : "#7f1d1d";
      return { name: option, value: voteCount, color };
    });
  }, [activeCandidates, districtVotes]);

  const radarData = useMemo(() => {
    if (activeCandidates.length === 0) return [];
    return activeCandidates.map((option) => {
      const candidateVotes = districtVotes.filter((v) => v.choice === option);
      const insights = candidateVotes.filter(v => v.reason).length;
      const avgInsightLength = insights > 0
        ? candidateVotes.reduce((acc, curr) => acc + (curr.reason?.length || 0), 0) / insights : 0;

      const popularity = (candidateVotes.length / (districtVotes.length || 1)) * 100;
      const engagement = (insights / (candidateVotes.length || 1)) * 100;
      const depth = Math.min(avgInsightLength, 100);

      return {
        subject: option, Popularity: Math.round(popularity),
        Engagement: Math.round(engagement), Depth: Math.round(depth), fullMark: 100,
      };
    });
  }, [activeCandidates, districtVotes]);

  const marginOfVictory = useMemo(() => {
    if (chartData.length < 2) return null;
    const sorted = [...chartData].sort((a, b) => b.value - a.value);
    const gap = sorted[0].value - sorted[1].value;
    const percentage = districtVotes.length > 0 ? (gap / districtVotes.length) * 100 : 0;
    return { gap, percentage, runnerUp: sorted[1].name };
  }, [chartData, districtVotes.length]);

  const timeData = useMemo(() => {
    if (districtVotes.length === 0) return [];
    const sorted = [...districtVotes].sort((a, b) => a.timestamp - b.timestamp);
    let currentCount = 0;
    return sorted.map(v => {
      currentCount++;
      return {
        time: new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        votes: currentCount
      };
    });
  }, [districtVotes]);

  const radarMetrics = useMemo(() => {
    if (chartData.length === 0) return [];
    return chartData.map((cand) => {
      return {
        subject: cand.name.length > 8 ? cand.name.substring(0, 8) + '..' : cand.name,
        Popularity: cand.value * 10 + 20,
        Engagement: cand.value * 15 + 10,
        Momentum: cand.value * 5 + 35,
      };
    });
  }, [chartData]);

  const stateInsights = useMemo(() => {
    const totalVotes = votes.length;
    let overallCandidates: Record<string, number> = {};
    let districtWinners: Record<string, string> = {};
    let partyDistrictWins: Record<string, number> = {};

    const extractParty = (candidateName: string) => {
      const match = candidateName.match(/\((.*?)\)/);
      return match ? match[1].trim() : candidateName; // Default to candidate name if no party specified in ()
    };

    TN_DISTRICTS.forEach(d => {
      const dVotes = votes.filter(v => v.district === d);
      if (dVotes.length > 0) {
        const dCounts: Record<string, number> = {};
        dVotes.forEach(v => {
          dCounts[v.choice] = (dCounts[v.choice] || 0) + 1;
          overallCandidates[v.choice] = (overallCandidates[v.choice] || 0) + 1;
        });
        const dWinner = Object.keys(dCounts).reduce((a, b) => dCounts[a] > dCounts[b] ? a : b);
        districtWinners[d] = dWinner;

        const winningParty = extractParty(dWinner);
        partyDistrictWins[winningParty] = (partyDistrictWins[winningParty] || 0) + 1;
      }
    });

    const overallWinner = Object.keys(overallCandidates).length > 0
      ? Object.keys(overallCandidates).reduce((a, b) => overallCandidates[a] > overallCandidates[b] ? a : b)
      : null;

    let overallWinningParty = null;
    let fallbackPartyTie = null;

    if (Object.keys(partyDistrictWins).length > 0) {
      const sortedParties = Object.entries(partyDistrictWins).sort((a, b) => (b[1] as number) - (a[1] as number));
      if (sortedParties.length >= 2 && sortedParties[0][1] === sortedParties[1][1]) {
        fallbackPartyTie = [sortedParties[0][0], sortedParties[1][0]];
      } else {
        overallWinningParty = sortedParties[0][0];
      }
    }

    const sortedCandidates = Object.entries(overallCandidates)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    let comparativeInsight = "";

    if (Object.keys(partyDistrictWins).length > 0) {
      const sortedParties = Object.entries(partyDistrictWins).sort((a, b) => (b[1] as number) - (a[1] as number));
      if (sortedParties.length >= 2) {
        if (sortedParties[0][1] === sortedParties[1][1]) {
          comparativeInsight = `It's a district-level dead heat! ${sortedParties[0][0]} and ${sortedParties[1][0]} are perfectly tied with ${sortedParties[0][1]} district wins each. Further analysis required.`;
        } else {
          comparativeInsight = `${sortedParties[0][0]} dominates the state with majority district wins (${sortedParties[0][1]}), while ${sortedParties[1][0]} shows strong competition winning ${sortedParties[1][1]} regions.`;
        }
      } else if (sortedParties.length === 1) {
        comparativeInsight = `${sortedParties[0][0]} completely dominates, sweeping all ${sortedParties[0][1]} active districts!`;
      }
    }

    // Party-wise total votes for modal
    const partyTotalVotes: Record<string, number> = {};
    votes.forEach(v => {
      const party = extractParty(v.choice);
      partyTotalVotes[party] = (partyTotalVotes[party] || 0) + 1;
    });

    const sortedPartyVotes = Object.entries(partyTotalVotes)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const runnerUpParty = sortedPartyVotes.length > 1 ? sortedPartyVotes[1] : null;

    return {
      totalVotes,
      overallWinner,
      districtWinners,
      partyDistrictWins,
      overallWinningParty,
      fallbackPartyTie,
      comparativeInsight,
      partyTotalVotes,
      runnerUpParty
    };
  }, [votes]);


  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/20 relative overflow-hidden">
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
                    <p className="text-[10px] uppercase tracking-[0.8em] text-white/20 font-bold mt-2">TN Election System</p>
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

      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full animate-slow-glow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full animate-slow-glow" style={{ animationDelay: '-5s' }} />
        <div className="absolute inset-0 bg-grid-white opacity-20" />
      </div>

      <motion.nav
        initial={{ y: -100 }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="fixed top-0 w-full bg-black/40 backdrop-blur-2xl border-b border-white/5 z-50"
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6 cursor-pointer" onClick={() => { setView("districts"); setStatus(null); }}>
            <div className="w-10 h-10 border border-white/10 rounded-xl flex items-center justify-center text-white bg-white/5">
              <VoteIcon size={20} strokeWidth={1.5} />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-2xl tracking-tighter uppercase leading-none">Yuvabe</span>
              <span className="text-[9px] uppercase tracking-[0.4em] opacity-40 font-bold">STATE ELECTIONS</span>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <button 
              onClick={() => { setView("districts"); setStatus(null); }}
              className="hidden md:flex text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors items-center gap-2 group"
            >
              <MapPin size={12} className="group-hover:scale-110 transition-transform" /> Districts
            </button>

            {isAdminAuthenticated && (
              <>
                <button 
                  onClick={() => { setView("state_insights"); setStatus(null); }}
                  className="hidden md:flex text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors items-center gap-2 group"
                >
                  <BarChart3 size={12} className="group-hover:scale-110 transition-transform" /> Results
                </button>
                <button 
                  onClick={() => { setView("admin"); setStatus(null); }}
                  className="hidden md:flex text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors items-center gap-2 group"
                >
                  <Settings size={12} className="group-hover:scale-110 transition-transform" /> Setup
                </button>
              </>
            )}

            {isAdminAuthenticated ? (
              <button 
                onClick={() => { setView("districts"); setIsAdminAuthenticated(false); setStatus(null); }}
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors flex items-center gap-2 group"
              >
                <LogOut size={12} className="group-hover:scale-110 transition-transform" /> Sign Out
              </button>
            ) : (
              <button 
                onClick={() => { setView("login"); setStatus(null); }}
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors flex items-center gap-2 group"
              >
                <Lock size={12} className="group-hover:scale-110 transition-transform" /> Admin
              </button>
            )}
          </div>
        </div>
      </motion.nav>

      <main className="relative z-10 pt-32 pb-20 px-6 max-w-7xl mx-auto min-h-screen">
        <AnimatePresence mode="wait" initial={false}>

          {view === "districts" && (
            <motion.div
              key="districts"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.6 }} className="space-y-12"
            >
              <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-16">
                <div className="space-y-4">
                  <motion.span initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] text-white/60">
                    Select Region
                  </motion.span>
                  <h1 className="text-6xl md:text-8xl font-light tracking-tighter leading-none text-white">
                    Tamil Nadu <br /><span className="font-serif italic font-normal text-white/90">Districts.</span>
                  </h1>
                </div>
                {isAdminAuthenticated && (
                  <div className="flex flex-col items-end gap-2 text-right">
                    <div className="text-4xl font-mono font-black">{votes.length}</div>
                    <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Total State Votes</div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {TN_DISTRICTS.map((district, idx) => {
                  const dVotes = votes.filter(v => v.district === district).length;
                  const hasPoll = (districtsData[district]?.candidates?.length || 0) > 1;

                  return (
                    <motion.button
                      key={district} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.02 }}
                      onClick={() => { setSelectedDistrict(district); setView("voter"); setStatus(null); }}
                      className={cn(
                        "group relative overflow-hidden rounded-[2rem] border p-6 text-left transition-all duration-500 hover:scale-[1.02]",
                        hasPoll ? "bg-white/[0.02] border-white/10 hover:border-white/30 hover:bg-white/[0.05]" : "bg-transparent border-white/5 opacity-50 grayscale hover:opacity-100 hover:grayscale-0"
                      )}
                    >
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="space-y-8 relative z-10">
                        <div className="flex items-center justify-between">
                          <MapPin size={24} className={hasPoll ? "text-white/40 group-hover:text-white" : "text-white/10"} />
                          {hasPoll && <span className="px-2 py-1 bg-white/10 rounded-full text-[8px] uppercase tracking-widest font-black">Active</span>}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold tracking-tight mb-1">{district}</h3>
                          {isAdminAuthenticated && <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/30 font-mono">{dVotes} Votes</p>}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {view === "voter" && (
            <motion.div key="voter" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="max-w-5xl mx-auto">
              <button onClick={() => setView("districts")} className="mb-12 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors">
                <ChevronLeft size={16} /> Back to Districts
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                <div className="space-y-10">
                  <div className="space-y-4">
                    <motion.span className="inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-500">
                      {selectedDistrict} Region
                    </motion.span>
                    <motion.h1 className="text-7xl font-light tracking-tighter leading-[0.9] text-white">Cast Your <br /><span className="font-serif italic font-normal text-white/90">Ballot.</span></motion.h1>
                  </div>
                  <motion.p className="text-white/40 text-xl leading-relaxed max-w-md font-light">
                    Participate in the regional election survey. Your insights help us understand the collective vision for {selectedDistrict}.
                  </motion.p>
                  {isAdminAuthenticated && (
                    <motion.div className="flex items-center gap-6 pt-6">
                      <div className="flex flex-col">
                        <span className="text-lg font-bold font-mono leading-none">{districtVotes.length}</span>
                        <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Votes Cast Locally</span>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="bg-white/[0.02] border border-white/10 rounded-[3rem] p-12 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

                  <form onSubmit={handleVote} className="space-y-12">
                    <div className="space-y-6">
                      <label className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/30">Identity Verification</label>
                      <div className="relative group">
                        <Mail className="absolute left-0 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-white transition-colors" size={20} strokeWidth={1.5} />
                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address" className="w-full pl-10 pr-4 py-5 bg-transparent border-b border-white/5 focus:border-white transition-all outline-none text-xl font-light placeholder:text-white/10" />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <label className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/30">Survey Insight (Optional)</label>
                      <div className="relative group">
                        <Activity className="absolute left-0 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-white transition-colors" size={20} strokeWidth={1.5} />
                        <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why are you choosing this candidate?" className="w-full pl-10 pr-4 py-5 bg-transparent border-b border-white/5 focus:border-white transition-all outline-none text-xl font-light placeholder:text-white/10" />
                      </div>
                    </div>

                    <div className="space-y-8">
                      <label className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/30">Candidates</label>
                      <div className="grid grid-cols-1 gap-4">
                        {(!activeCandidates || activeCandidates.length === 0) ? (
                          <div className="p-12 border border-dashed border-white/10 rounded-3xl text-center space-y-4">
                            <Activity className="mx-auto text-white/10" size={32} />
                            <p className="text-white/20 text-xs uppercase tracking-widest font-bold">No candidates configured for this district yet.</p>
                          </div>
                        ) : (
                          activeCandidates.map((option, idx) => (
                            <motion.button
                              key={option} type="button" onClick={() => setSelectedOption(option)}
                              className={cn("group flex items-center justify-between p-6 rounded-2xl border transition-all duration-300 text-left relative overflow-hidden", selectedOption === option ? "border-white bg-white text-black" : "border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/20")}
                            >
                              <div className="flex items-center gap-6">
                                <span className={cn("text-xs font-black font-mono opacity-30", selectedOption === option && "text-black/40")}>{String.fromCharCode(65 + idx)}</span>
                                <span className="font-medium tracking-tight text-xl">{option}</span>
                              </div>
                              <div className={cn("w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-500", selectedOption === option ? "border-black bg-black text-white" : "border-white/10 group-hover:border-white/40")}>
                                {selectedOption === option && <CheckCircle2 size={14} strokeWidth={2.5} />}
                              </div>
                            </motion.button>
                          ))
                        )}
                      </div>
                    </div>

                    <button type="submit" disabled={!email || !selectedOption || activeCandidates.length === 0} className="w-full py-7 bg-white text-black hover:bg-white/90 disabled:bg-white/5 disabled:text-white/10 rounded-2xl font-black text-xs uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-4 group relative overflow-hidden shadow-xl">
                      <span className="relative z-10">Submit Ballot</span>
                      <ArrowRight size={18} className="relative z-10 group-hover:translate-x-2 transition-transform" />
                    </button>
                  </form>

                  {status && (
                    <motion.div className={cn("mt-10 p-5 rounded-2xl flex items-start gap-4 text-[10px] font-bold uppercase tracking-[0.2em] border", status.type === "success" ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500" : "bg-red-500/5 border-red-500/20 text-red-500")}>
                      {status.type === "success" ? <ShieldCheck size={18} /> : <AlertCircle size={18} />}
                      <p className="leading-relaxed">{status.message}</p>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {view === "receipt" && lastVote && (
            <motion.div key="receipt" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="max-w-2xl mx-auto text-center space-y-16">
              <div className="space-y-6">
                <div className="w-24 h-24 bg-white text-black rounded-full flex items-center justify-center mx-auto mb-10 shadow-2xl"><CheckCircle2 size={48} strokeWidth={1.5} /></div>
                <h2 className="text-7xl font-light tracking-tighter text-white">Ballot <span className="font-serif italic font-normal">Recorded.</span></h2>
              </div>
              <div className="bg-white/[0.02] border border-white/10 rounded-[3rem] p-12 space-y-10 text-left backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                <div className="flex justify-between items-start border-b border-white/5 pb-10">
                  <div className="space-y-2"><span className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/20">Voter Identity</span><p className="font-mono text-sm text-white/80">{lastVote.email}</p></div>
                  <div className="text-right space-y-2"><span className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/20">District</span><p className="font-mono text-sm text-white/80">{lastVote.district}</p></div>
                </div>
                <div className="space-y-4">
                  <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/20">Selected Candidate</span>
                  <div className="p-8 bg-white text-black rounded-[2rem] flex items-center justify-between shadow-2xl">
                    <span className="text-4xl font-black tracking-tighter uppercase">{lastVote.choice}</span>
                    <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center"><ShieldCheck size={24} /></div>
                  </div>
                </div>
                <button onClick={() => { setView("districts"); setLastVote(null); }} className="w-full px-12 py-6 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.4em] hover:bg-white hover:text-black transition-all shadow-xl">Return to Home</button>
              </div>
            </motion.div>
          )}

          {view === "login" && (
            <motion.div key="login" className="max-w-md mx-auto">
              <div className="bg-white/[0.02] border border-white/10 rounded-[3rem] p-16 text-center backdrop-blur-2xl shadow-2xl">
                <h2 className="text-4xl font-bold tracking-tighter mb-3">Admin Access</h2>
                <form onSubmit={handleAdminLogin} className="space-y-8 mt-12">
                  <input type={showPassword ? "text" : "password"} required value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Security Key" className="w-full px-8 py-6 bg-white/5 border border-white/5 rounded-2xl focus:border-white outline-none text-center text-xl font-light" />
                  <button type="submit" className="w-full py-6 bg-white text-black rounded-2xl font-black uppercase tracking-[0.4em] text-[10px] hover:bg-white/90">Authenticate</button>
                  <button type="button" onClick={() => setView("districts")} className="text-[10px] font-bold uppercase text-white/20 hover:text-white">Cancel</button>
                </form>
                {status && <div className="mt-8 text-red-500 text-[9px] font-black uppercase">{status.message}</div>}
              </div>
            </motion.div>
          )}

          {view === "admin" && isAdminAuthenticated && (
            <motion.div key="admin" className="space-y-16">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setView("state_insights")} className="px-5 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-500/20 transition-all flex items-center gap-2">
                      <Globe size={14} /> State Insights
                    </button>
                    <span className="inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">
                      Regional Control Panel
                    </span>
                  </div>
                  <h1 className="text-7xl font-light tracking-tighter leading-none">Administration.</h1>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex items-center gap-6">
                    {stateInsights.overallWinningParty ? (
                      <motion.button
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(59, 130, 246, 0.3)" }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setSelectedPartyForInsights(stateInsights.overallWinningParty);
                          setIsInsightsModalOpen(true);
                        }}
                        className="hidden md:flex flex-col text-left px-8 py-4 bg-gradient-to-br from-blue-900/40 to-black border border-blue-500/20 text-white rounded-2xl shadow-2xl relative overflow-hidden group transition-all"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[30px] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-blue-500/20 transition-colors" />
                        <div className="relative z-10 flex items-center gap-6">
                          <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><Globe size={24} /></div>
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-widest text-blue-400/60 mb-1 flex items-center gap-2">
                              State Winner <TrendingUp size={10} className="animate-pulse" />
                            </span>
                            <span className="text-xl font-black tracking-tight uppercase truncate max-w-[150px]" title={stateInsights.overallWinningParty}>{stateInsights.overallWinningParty}</span>
                            <span className="text-[10px] text-white/40 mt-1 flex items-center gap-2 group-hover:text-blue-400/60 transition-colors">
                              {stateInsights.partyDistrictWins[stateInsights.overallWinningParty]} district{stateInsights.partyDistrictWins[stateInsights.overallWinningParty] !== 1 ? 's' : ''} won
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">Explore →</span>
                            </span>
                          </div>
                        </div>
                      </motion.button>
                    ) : stateInsights.fallbackPartyTie ? (
                      <motion.button
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(249, 115, 22, 0.3)" }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setSelectedPartyForInsights(stateInsights.fallbackPartyTie![0]);
                          setIsInsightsModalOpen(true);
                        }}
                        className="hidden md:flex flex-col text-left px-8 py-4 bg-gradient-to-br from-orange-900/40 to-black border border-orange-500/20 text-white rounded-2xl shadow-2xl relative overflow-hidden group transition-all"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[30px] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-orange-500/20 transition-colors" />
                        <div className="relative z-10 flex items-center gap-6">
                          <div className="w-12 h-12 bg-orange-500/20 text-orange-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><AlertCircle size={24} /></div>
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-widest text-orange-400/60 mb-1">State Tie</span>
                            <span className="text-sm font-black tracking-tight uppercase leading-tight truncate max-w-[150px]">{stateInsights.fallbackPartyTie.join(" & ")}</span>
                            <span className="text-[10px] text-white/40 mt-1 flex items-center gap-2 group-hover:text-orange-400/60 transition-colors">
                              {stateInsights.partyDistrictWins[stateInsights.fallbackPartyTie[0]]} districts each
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">Explore →</span>
                            </span>
                          </div>
                        </div>
                      </motion.button>

                    ) : (
                      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="hidden md:flex flex-col px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl shadow-2xl">
                        <div className="flex items-center gap-6">
                          <div className="w-12 h-12 bg-white/5 text-white/20 rounded-full flex items-center justify-center"><Globe size={24} /></div>
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">State Winner</span>
                            <span className="text-sm font-bold text-white/20">No data available</span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {leader && (
                      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="hidden md:flex px-8 py-4 bg-white text-black rounded-2xl items-center gap-6 shadow-2xl">
                        <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center"><Trophy size={24} /></div>
                        <div className="flex flex-col"><span className="text-[9px] font-black uppercase tracking-widest opacity-40">{adminDistrict} Leader</span><span className="text-xl font-black tracking-tight uppercase truncate max-w-[150px]" title={leader.name}>{leader.name}</span></div>
                      </motion.div>
                    )}
                  </div>

                  <div className="px-6 py-4 bg-white/5 rounded-2xl flex flex-col gap-2 border border-white/10 shrink-0">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">Manage District</span>
                    <select
                      value={adminDistrict}
                      onChange={(e) => {
                        setAdminDistrict(e.target.value);
                        setNewOptions(districtsData[e.target.value]?.candidates || []);
                      }}
                      className="bg-transparent text-xl font-bold uppercase tracking-tighter outline-none cursor-pointer appearance-none text-white border-b border-white/20 pb-1 w-48"
                    >
                      {TN_DISTRICTS.map(d => <option key={d} value={d} className="bg-neutral-900 text-sm tracking-normal">{d}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Party Distribution Section */}
              <div className="w-full bg-white/[0.02] border border-white/10 rounded-[2rem] p-8 backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-white/40 mb-6 flex items-center gap-3">
                  <MapPin size={14} /> Party Distribution (Statewide)
                </h3>

                {Object.keys(stateInsights.partyDistrictWins).length === 0 ? (
                  <p className="text-sm font-bold text-white/20">No data available</p>
                ) : (
                  <div className="flex flex-wrap gap-4">
                    {Object.entries(stateInsights.partyDistrictWins)
                      .sort((a, b) => (b[1] as number) - (a[1] as number))
                      .map(([party, wins]) => (
                        <div key={party} className="flex items-center gap-3 px-5 py-3 bg-white/5 border border-white/5 rounded-xl">
                          <span className="text-sm font-black text-white">{party}</span>
                          <span className="w-px h-4 bg-white/10" />
                          <span className="text-xs font-bold text-emerald-400">{wins} district{wins !== 1 ? 's' : ''}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
                {/* Insights Panel */}
                <div className="xl:col-span-12 bg-white/[0.02] border border-white/10 rounded-[3rem] p-12 backdrop-blur-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />
                  <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center"><Activity className="text-white/40" size={20} /></div>
                      <h3 className="font-black text-xs uppercase tracking-[0.2em]">Voter Insights ({adminDistrict})</h3>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">Qualitative Data</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[300px] overflow-y-auto pr-4 custom-scrollbar">
                    {districtVotes.filter(v => v.reason).length === 0 ? (
                      <div className="col-span-full py-12 text-center"><p className="text-[10px] uppercase tracking-[0.4em] text-white/10 font-black">No qualitative insights.</p></div>
                    ) : (
                      districtVotes.filter(v => v.reason).map((vote, idx) => (
                        <div key={idx} className="p-6 bg-white/5 border border-white/5 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between"><span className="text-[8px] font-black uppercase tracking-widest text-white/20">{vote.choice}</span><span className="text-[8px] font-mono text-white/10">{new Date(vote.timestamp).toLocaleDateString()}</span></div>
                          <p className="text-sm text-white/80 italic font-light leading-relaxed">"{vote.reason}"</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Bar Chart */}
                <div className="xl:col-span-6 bg-white/[0.02] border border-white/10 rounded-[3rem] p-12 backdrop-blur-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
                  <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center"><BarChart3 className="text-white/40" size={20} /></div>
                      <h3 className="font-black text-xs uppercase tracking-[0.2em]">Distribution</h3>
                    </div>
                  </div>
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.1)" fontSize={10} tick={{ fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} />
                        <YAxis stroke="rgba(255,255,255,0.1)" fontSize={10} tick={{ fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }} />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]} animationDuration={1500}>
                          {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={leader?.name === entry.name ? 1 : 0.3} />)}
                          <LabelList dataKey="value" position="top" fill={leader ? "rgba(255,255,255,0.6)" : "transparent"} fontSize={10} fontWeight="bold" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Pie Chart */}
                <div className="xl:col-span-6 bg-white/[0.02] border border-white/10 rounded-[3rem] p-12 backdrop-blur-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                  <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center"><PieChartIcon className="text-white/40" size={20} /></div>
                      <h3 className="font-black text-xs uppercase tracking-[0.2em]">Market Share</h3>
                    </div>
                  </div>
                  <div className="h-[400px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={chartData} innerRadius={100} outerRadius={140} paddingAngle={8} dataKey="value" stroke="none" animationDuration={2000}>
                          {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={leader?.name === entry.name ? 1 : 0.3} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-4xl font-black font-mono tracking-tighter">{districtVotes.length}</span>
                      <span className="text-[8px] uppercase tracking-[0.4em] text-white/20 font-bold">Local Ballots</span>
                    </div>
                  </div>
                </div>

                {/* Margin of Victory */}
                <div className="xl:col-span-6 bg-white/[0.02] border border-white/10 rounded-[3rem] p-12 backdrop-blur-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />
                  <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center"><Target className="text-white/40" size={20} /></div>
                      <h3 className="font-black text-xs uppercase tracking-[0.2em]">Margin of Victory</h3>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center h-[400px] space-y-12">
                    {marginOfVictory ? (
                      <>
                        <div className="text-center space-y-4">
                          <div className="text-8xl font-black font-mono">{marginOfVictory.gap}</div>
                          <div className="text-[10px] uppercase tracking-[0.6em] text-white/20 font-bold">Vote Lead over {marginOfVictory.runnerUp}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-12 w-full max-w-md">
                          <div className="p-6 bg-white/5 border border-white/5 rounded-2xl text-center space-y-2">
                            <span className="text-[8px] uppercase tracking-widest text-white/20 font-black">Lead %</span>
                            <p className="text-2xl font-black font-mono">{marginOfVictory.percentage.toFixed(1)}%</p>
                          </div>
                          <div className="p-6 bg-white/5 border border-white/5 rounded-2xl text-center space-y-2">
                            <span className="text-[8px] uppercase tracking-widest text-white/20 font-black">Status</span>
                            <p className={cn("text-sm font-black uppercase tracking-widest", marginOfVictory.gap > 5 ? "text-emerald-500" : "text-amber-500")}>
                              {marginOfVictory.gap > 5 ? "Significant" : "Contested"}
                            </p>
                          </div>
                        </div>
                      </>
                    ) : <p className="text-[10px] uppercase tracking-[0.4em] text-white/10 font-black">Insufficient data.</p>}
                  </div>
                </div>

                {/* Radar Chart */}
                <div className="xl:col-span-6 bg-white/[0.02] border border-white/10 rounded-[3rem] p-12 backdrop-blur-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
                  <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center"><Target className="text-white/40" size={20} /></div>
                      <h3 className="font-black text-xs uppercase tracking-[0.2em]">Metrics</h3>
                    </div>
                  </div>
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid stroke="rgba(255,255,255,0.05)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                        <Radar name="Popularity" dataKey="Popularity" stroke="#ffffff" fill="#ffffff" fillOpacity={0.2} />
                        <Radar name="Engagement" dataKey="Engagement" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                        <Radar name="Depth" dataKey="Depth" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Candidate Management */}
                <div className="xl:col-span-4 bg-white/[0.02] border border-white/10 rounded-[3rem] p-12 space-y-10 backdrop-blur-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center"><Settings className="text-white/60" size={20} /></div>
                      <h3 className="font-black text-xs uppercase tracking-[0.2em]">Poll Setup</h3>
                    </div>
                    <button onClick={() => setNewOptions([...newOptions, ""])} className="text-[9px] font-black uppercase text-white/40 hover:text-white flex items-center gap-2"><Plus size={12} />Add</button>
                  </div>

                  <div className="space-y-6 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {newOptions.map((opt, idx) => {
                      const match = opt.match(/^(.*?)(?:\s*\((.*?)\))?$/);
                      const candName = match ? match[1].trim() : opt;
                      const candParty = match && match[2] ? match[2].trim() : "";

                      return (
                        <div key={idx} className="flex flex-col bg-white/5 border border-white/10 rounded-xl overflow-hidden focus-within:border-white/30 transition-colors">
                          <div className="flex items-center gap-4 px-4 border-b border-white/5 bg-black/20">
                            <input
                              value={candName}
                              onChange={(e) => {
                                const u = [...newOptions];
                                const newName = e.target.value;
                                u[idx] = candParty ? `${newName} (${candParty})` : newName;
                                setNewOptions(u);
                              }}
                              placeholder={`Candidate Name`}
                              className="flex-1 py-3 bg-transparent outline-none focus:text-emerald-400 transition-colors text-sm font-bold placeholder:font-normal"
                            />
                            <button onClick={() => setNewOptions(newOptions.filter((_, i) => i !== idx))} className="p-2 text-white/20 hover:text-red-500 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <div className="flex items-center gap-3 px-4 py-2 bg-black/40">
                            <span className="text-[9px] uppercase tracking-widest text-emerald-500 font-black">Party</span>
                            <input
                              value={candParty}
                              onChange={(e) => {
                                const u = [...newOptions];
                                const newParty = e.target.value;
                                u[idx] = newParty ? `${candName || 'Candidate'} (${newParty})` : candName;
                                setNewOptions(u);
                              }}
                              placeholder={`e.g., DMK, TVK`}
                              className="flex-1 py-2 bg-transparent outline-none focus:text-blue-400 transition-colors text-sm font-bold text-white placeholder:text-white/20"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-6 space-y-6">
                    <button onClick={updatePollOptions} className="w-full py-6 bg-white text-black rounded-2xl font-black text-[10px] uppercase">Post Candidates</button>
                    {status && <div className={cn("p-4 rounded-xl flex items-center gap-3 text-[9px] font-bold uppercase tracking-[0.1em] border", status.type === "success" ? "bg-emerald-500/5 text-emerald-500" : "bg-red-500/5 text-red-500")}>{status.message}</div>}
                  </div>
                </div>

                {/* Timeline / Area */}
                <div className="xl:col-span-6 bg-white/[0.02] border border-white/10 rounded-[3rem] p-12 backdrop-blur-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
                  <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center"><Activity className="text-white/40" size={20} /></div>
                      <h3 className="font-black text-xs uppercase tracking-[0.2em]">Regional Momentum</h3>
                    </div>
                  </div>
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorStateVotes" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="time" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }} />
                        <Area type="monotone" dataKey="votes" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorStateVotes)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Radar */}
                <div className="xl:col-span-6 bg-white/[0.02] border border-white/10 rounded-[3rem] p-12 backdrop-blur-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500/20 to-transparent" />
                  <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center"><Target className="text-white/40" size={20} /></div>
                      <h3 className="font-black text-xs uppercase tracking-[0.2em]">Engagement Map</h3>
                    </div>
                  </div>
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarMetrics}>
                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 'bold' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Popularity" dataKey="Popularity" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} />
                        <Radar name="Engagement" dataKey="Engagement" stroke="#e11d48" fill="#e11d48" fillOpacity={0.3} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Registry */}
                <div className="xl:col-span-12 bg-white/[0.02] border border-white/10 rounded-[3rem] p-10 backdrop-blur-xl">
                  <h3 className="font-black text-xs uppercase tracking-[0.2em] mb-8">Voter Registry ({adminDistrict})</h3>
                  <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                    <table className="w-full text-left">
                      <thead>
                        <tr>
                          <th className="px-6 py-4 text-[9px] font-black text-white/20 uppercase">Voter</th>
                          <th className="px-6 py-4 text-[9px] font-black text-white/20 uppercase">Selection</th>
                          <th className="px-6 py-4 text-[9px] font-black text-white/20 uppercase text-right">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {districtVotes.map((v, i) => (
                          <tr key={i} className="hover:bg-white/5">
                            <td className="px-6 py-4 font-mono text-xs">{v.email}</td>
                            <td className="px-6 py-4 text-xs font-black">{v.choice}</td>
                            <td className="px-6 py-4 text-xs text-right opacity-50">{new Date(v.timestamp).toLocaleTimeString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === "state_insights" && isAdminAuthenticated && (
            <motion.div key="state_insights" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-16">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <button onClick={() => setView("admin")} className="mb-6 flex items-center gap-2 text-[10px] font-bold uppercase text-white/40 hover:text-white transition-colors"><ChevronLeft size={16} /> Back to Controls</button>
                  <h1 className="text-7xl font-light tracking-tighter leading-none">State <span className="font-serif italic font-normal">Analytics.</span></h1>
                  <div className="mt-8">
                    <span className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400">
                      Overall Insights
                    </span>
                    {stateInsights.overallWinningParty && (
                      <p className="mt-4 text-sm text-white/60 font-medium">
                        Based on available data, <strong className="text-white">"{stateInsights.overallWinningParty}"</strong> leads overall, commanding dominance primarily in <span className="text-emerald-400">{stateInsights.partyDistrictWins[stateInsights.overallWinningParty] || 0}</span> out of {TN_DISTRICTS.length} districts.
                      </p>
                    )}
                    {stateInsights.fallbackPartyTie && (
                      <p className="mt-4 text-sm text-white/60 font-medium">
                        Based on available data, there is a <strong className="text-orange-400">Deadlock Tie</strong> between <strong className="text-white">"{stateInsights.fallbackPartyTie[0]}"</strong> and <strong className="text-white">"{stateInsights.fallbackPartyTie[1]}"</strong> with <span className="text-emerald-400">{stateInsights.partyDistrictWins[stateInsights.fallbackPartyTie[0]] || 0}</span> district wins each.
                      </p>
                    )}
                    {stateInsights.comparativeInsight && (
                      <div className="mt-4 p-4 bg-white/5 border border-white/5 rounded-2xl max-w-lg mb-4">
                        <span className="text-[9px] uppercase tracking-widest text-blue-400/60 font-black block mb-2">Comparative Insight</span>
                        <p className="text-sm font-medium text-blue-100/80 leading-relaxed">{stateInsights.comparativeInsight}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-left md:text-right bg-white/[0.02] border border-white/5 p-8 rounded-3xl">
                  <div className="text-7xl font-black font-mono tracking-tighter text-emerald-400">{stateInsights.totalVotes}</div>
                  <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mt-2">Total Statewide Votes</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                <div className="bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 rounded-[2.5rem] p-10 flex items-center gap-8 relative overflow-hidden">
                  <div className="absolute right-0 top-0 translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-blue-500/20 blur-[50px] rounded-full" />
                  <div className="w-20 h-20 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center relative z-10"><Trophy size={40} /></div>
                  <div className="relative z-10 w-full">
                    <div className="text-[10px] font-black uppercase text-blue-400/60 mb-2 tracking-[0.3em]">Projected Winner</div>
                    {stateInsights.overallWinningParty ? (
                      <div className="text-5xl font-black uppercase text-white tracking-tighter truncate" title={stateInsights.overallWinningParty}>{stateInsights.overallWinningParty}</div>
                    ) : stateInsights.fallbackPartyTie ? (
                      <div className="text-3xl font-black uppercase text-orange-400 tracking-tighter leading-tight">Tie: {stateInsights.fallbackPartyTie.join(" & ")}</div>
                    ) : (
                      <div className="text-5xl font-black uppercase text-white tracking-tighter">TBD</div>
                    )}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-[2.5rem] p-10 flex items-center gap-8 relative overflow-hidden">
                  <div className="absolute left-0 bottom-0 -translate-x-1/2 translate-y-1/2 w-48 h-48 bg-emerald-500/20 blur-[50px] rounded-full" />
                  <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center relative z-10"><Globe size={40} /></div>
                  <div className="relative z-10 w-full min-w-0">
                    <div className="text-[10px] font-black uppercase text-emerald-400/60 mb-4 tracking-[0.3em]">Party District Wins</div>
                    <div className="space-y-3 pr-4 max-h-[120px] overflow-y-auto custom-scrollbar">
                      {Object.keys(stateInsights.partyDistrictWins).length === 0 ? (
                        <div className="text-sm font-light text-emerald-400">No data available yet</div>
                      ) : (
                        Object.entries(stateInsights.partyDistrictWins)
                          .sort((a, b) => (b[1] as number) - (a[1] as number))
                          .map(([party, wins]) => (
                            <div key={party} className="flex items-center justify-between border-b border-emerald-500/10 pb-2 last:border-0 last:pb-0">
                              <span className="text-lg font-bold text-white max-w-[120px] md:max-w-[160px] truncate" title={party}>{party}</span>
                              <span className="text-sm font-black text-emerald-400 shrink-0">{wins} {wins === 1 ? 'District' : 'Districts'}</span>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/10 rounded-[3rem] p-12 backdrop-blur-xl">
                <h3 className="font-black text-xs uppercase tracking-[0.2em] mb-12 flex items-center gap-4">
                  <MapPin size={20} className="text-white/40" />
                  District Winners Breakdown
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {TN_DISTRICTS.map(d => {
                    const winner = stateInsights.districtWinners[d];
                    return (
                      <div key={d} className="p-6 border border-white/5 rounded-2xl bg-white/[0.01] hover:bg-white/5 transition-colors cursor-default">
                        <div className="text-[10px] font-bold text-white/40 uppercase mb-2 tracking-widest">{d}</div>
                        <div className={cn("text-xl font-black uppercase tracking-tight", winner ? "text-white" : "text-white/10")}>{winner || "No Votes yet"}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <PartyInsightsModal
        isOpen={isInsightsModalOpen}
        onClose={() => setIsInsightsModalOpen(false)}
        partyName={selectedPartyForInsights}
        votes={votes.filter(v => {
          const match = v.choice.match(/\((.*?)\)/);
          const party = match ? match[1].trim() : v.choice;
          return party === selectedPartyForInsights;
        })}
        totalStateVotes={votes.length}
        allVotes={votes}
        districtsData={districtsData}
        partyDistrictWins={selectedPartyForInsights ? (stateInsights.partyDistrictWins[selectedPartyForInsights] || 0) : 0}
        districtWinners={stateInsights.districtWinners}
        runnerUpParty={stateInsights.runnerUpParty as any}
        partyTotalVotes={stateInsights.partyTotalVotes}
      />


      <style dangerouslySetInnerHTML={{ __html: `.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }` }} />
    </div>

  );
}
