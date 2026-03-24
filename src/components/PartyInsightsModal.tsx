import React, { useMemo } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell
} from "recharts";

import { motion, AnimatePresence } from "motion/react";
import { 
  Trophy as TrophyIcon, 
  Activity as ActivityIcon, 
  Target as TargetIcon, 
  TrendingUp as TrendingUpIcon, 
  MapPin as MapPinIcon, 
  X as CloseIcon, 
  Users as UsersIcon,
  PieChart as PieChartIcon,
  BarChart3,
  Globe2
} from "lucide-react";

interface VoteData {
  email: string;
  choice: string;
  reason?: string;
  timestamp: number;
  district: string;
}

interface PartyInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  partyName: string | null;
  votes: VoteData[];
  totalStateVotes: number;
  allVotes: VoteData[];
  districtsData: Record<string, {candidates: string[]}>;
  partyDistrictWins: number;
  districtWinners: Record<string, string>;
  runnerUpParty: { name: string; count: number } | null;
  partyTotalVotes: Record<string, number>;
}



export default function PartyInsightsModal({
  isOpen,
  onClose,
  partyName,
  votes,
  totalStateVotes,
  allVotes,
  districtsData,
  partyDistrictWins,
  districtWinners,
  runnerUpParty,
  partyTotalVotes
}: PartyInsightsModalProps) {

  if (!partyName) return null;

  const partyVotesCount = votes.length;
  const marketShare = totalStateVotes > 0 ? (partyVotesCount / totalStateVotes) * 100 : 0;
  
  const marginData = useMemo(() => {
    if (!runnerUpParty || runnerUpParty.name === partyName) return null;
    const diff = Math.abs(partyVotesCount - runnerUpParty.count);
    const percentageDiff = totalStateVotes > 0 ? (diff / totalStateVotes) * 100 : 0;
    return { diff, percentageDiff, runnerUpName: runnerUpParty.name };
  }, [partyVotesCount, runnerUpParty, totalStateVotes, partyName]);


  const districtPerformance = useMemo(() => {
    const TN_DISTRICTS = Object.keys(districtsData);
    return TN_DISTRICTS.map(d => {
      const dVotes = allVotes.filter(v => v.district === d);
      const partyDVotes = votes.filter(v => v.district === d).length;
      const isWinner = districtWinners[d]?.includes(`(${partyName})`) || districtWinners[d] === partyName;
      const share = dVotes.length > 0 ? (partyDVotes / dVotes.length) * 100 : 0;
      
      return {
        name: d,
        votes: partyDVotes,
        isWinner,
        share,
        totalVotes: dVotes.length
      };
    }).filter(d => d.totalVotes > 0 || d.votes > 0).sort((a,b) => b.votes - a.votes);
  }, [districtsData, allVotes, votes, districtWinners, partyName]);

  const momentum = useMemo(() => {
    if (districtPerformance.length === 0) return "No Data";
    const avgShare = districtPerformance.reduce((acc, curr) => acc + curr.share, 0) / districtPerformance.length;
    if (avgShare > 40) return { label: "Strong", color: "text-emerald-500", bg: "bg-emerald-500/10" };
    if (avgShare > 20) return { label: "Moderate", color: "text-blue-500", bg: "bg-blue-500/10" };
    return { label: "Weak", color: "text-red-500", bg: "bg-red-500/10" };
  }, [districtPerformance]);

  const engagementData = useMemo(() => {
    return districtPerformance.slice(0, 10).map(d => ({
      name: d.name,
      turnout: d.totalVotes,
      partyVotes: d.votes
    }));
  }, [districtPerformance]);

  const sortedPartiesForChart = useMemo(() => {
    return Object.entries(partyTotalVotes)
      .map(([name, count]) => ({ name, count }))
      .sort((a,b) => b.count - a.count);
  }, [partyTotalVotes]);

  const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#ffffff10"];

  const chartData = useMemo(() => {
    const top = sortedPartiesForChart.slice(0, 5);
    const othersCount = sortedPartiesForChart.slice(5).reduce((acc, curr) => acc + curr.count, 0);
    
    const data = top.map((p, i) => ({
      name: p.name,
      value: p.count,
      color: COLORS[i]
    }));

    if (othersCount > 0) {
      data.push({ name: "Others", value: othersCount, color: COLORS[5] });
    }
    return data;
  }, [sortedPartiesForChart]);


  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden bg-neutral-900 border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-3xl flex items-center justify-center">
                  <Globe2 size={32} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-1">State Insights Dashboard</span>
                  <h2 className="text-4xl font-black tracking-tighter uppercase">{partyName} - State Insights</h2>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all group"
              >
                <CloseIcon size={24} className="text-white/40 group-hover:text-white transition-colors" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto p-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {/* Stats Cards */}
                <div className="bg-white/5 border border-white/5 p-6 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Total Votes</span>
                    <UsersIcon size={16} className="text-emerald-500" />
                  </div>
                  <div className="text-4xl font-black font-mono">{partyVotesCount.toLocaleString()}</div>
                  <div className="text-[10px] font-bold text-white/20 uppercase">Across all districts</div>
                </div>

                <div className="bg-white/5 border border-white/5 p-6 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Market Share</span>
                    <PieChartIcon size={16} className="text-blue-500" />
                  </div>
                  <div className="text-4xl font-black font-mono">{marketShare.toFixed(1)}%</div>
                  <div className="text-[10px] font-bold text-white/20 uppercase">Statewide influence</div>
                </div>

                <div className="bg-white/5 border border-white/5 p-6 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/30">District Wins</span>
                    <TrophyIcon size={16} className="text-amber-500" />
                  </div>
                  <div className="text-4xl font-black font-mono">{partyDistrictWins}</div>
                  <div className="text-[10px] font-bold text-white/20 uppercase">Total majorities</div>
                </div>

                <div className="bg-white/5 border border-white/5 p-6 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Momentum</span>
                    <TrendingUpIcon size={16} className={momentum === "No Data" ? "text-white/20" : momentum.color} />
                  </div>
                  <div className={`text-4xl font-black uppercase tracking-tighter ${momentum === "No Data" ? "text-white/20" : momentum.color}`}>
                    {momentum === "No Data" ? "N/A" : momentum.label}
                  </div>
                  <div className="text-[10px] font-bold text-white/20 uppercase">Regional Performance</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                {/* Vote Distribution Chart */}
                <div className="bg-white/[0.02] border border-white/5 p-10 rounded-[3rem]">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/30 mb-10 flex items-center gap-3">
                    <BarChart3 size={16} /> Vote Distribution
                  </h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          innerRadius={80}
                          outerRadius={110}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(0,0,0,0.8)', 
                            borderRadius: '16px', 
                            border: '1px solid rgba(255,255,255,0.1)',
                            backdropFilter: 'blur(20px)'
                          }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                      <div className="text-4xl font-black font-mono tracking-tighter">{partyVotesCount}</div>
                      <div className="text-[8px] uppercase tracking-[0.4em] text-white/20 font-bold">Votes</div>
                    </div>
                  </div>
                </div>

                {/* Margin of Victory */}
                <div className="bg-white/[0.02] border border-white/5 p-10 rounded-[3rem] relative overflow-hidden flex flex-col">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/30 mb-10 flex items-center gap-3">
                    <TargetIcon size={16} /> Comparative Performance
                  </h3>
                  <div className="flex-1 w-full min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sortedPartiesForChart.slice(0, 6)} layout="vertical" margin={{ left: 40, right: 40 }}>
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          axisLine={false} 
                          tickLine={false} 
                          fontSize={10} 
                          tick={{ fill: 'rgba(255,255,255,0.4)' }}
                          width={80}
                        />
                        <Tooltip 
                          cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                          contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        />
                        <Bar 
                          dataKey="count" 
                          radius={[0, 10, 10, 0]}
                        >
                          {sortedPartiesForChart.slice(0, 6).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.name === partyName ? "#10b981" : "#ffffff10"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {marginData && (
                    <div className="mt-6 p-6 bg-white/5 rounded-2xl border border-white/5">
                       <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Lead Detail</p>
                       <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-white/80">Vs {marginData.runnerUpName}</span>
                          <span className="text-sm font-black text-emerald-500">+{marginData.diff.toLocaleString()} ({marginData.percentageDiff.toFixed(1)}%)</span>
                       </div>
                    </div>
                  )}
                </div>

              </div>

              {/* District Breakdown */}
              <div className="bg-white/[0.02] border border-white/5 p-10 rounded-[3rem]">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/30 mb-8 flex items-center gap-3">
                  <MapPinIcon size={16} /> District Performance Breakdown
                </h3>
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {districtPerformance.map((d) => (
                      <div 
                        key={d.name} 
                        className={`p-6 rounded-2xl border transition-all ${
                          d.isWinner 
                            ? "bg-emerald-500/10 border-emerald-500/20" 
                            : "bg-white/5 border-white/5 opacity-60"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-lg font-bold tracking-tight">{d.name}</span>
                          {d.isWinner && <TrophyIcon size={14} className="text-emerald-500" />}
                        </div>
                        <div className="flex items-end justify-between">
                          <div className="space-y-1">
                            <div className="text-2xl font-black font-mono leading-none">{d.votes}</div>
                            <div className="text-[8px] uppercase tracking-widest text-white/30 font-bold">Votes Received</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-emerald-500">{d.share.toFixed(1)}%</div>
                            <div className="text-[8px] uppercase tracking-widest text-white/30 font-bold">Vote Share</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
