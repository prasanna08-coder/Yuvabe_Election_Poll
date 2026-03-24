import React, { useState } from "react";
import StateElection from "./StateElection";
import GeneralPolling from "./GeneralPolling";
import CandidatePoll from "./CandidatePoll";
import { Layers, MapPin, Users } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [activeApp, setActiveApp] = useState<"state" | "general" | "candidate">("candidate");
  // Track which tabs have been visited — mount on first visit, keep alive after
  const [visited, setVisited] = useState<Set<string>>(new Set(["candidate"]));

  const switchTab = (tab: "state" | "general" | "candidate") => {
    setActiveApp(tab);
    setVisited(prev => new Set(prev).add(tab));
  };

  return (
    <>
      {/* Global Application Switcher Overlay */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] bg-black/80 backdrop-blur-3xl border border-white/20 p-2 rounded-full shadow-2xl flex items-center gap-2">
        <button
          onClick={() => switchTab("general")}
          className={cn(
            "px-6 py-3 rounded-full flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300",
            activeApp === "general" ? "bg-white text-black shadow-lg scale-105" : "text-white/50 hover:text-white hover:bg-white/10"
          )}
        >
          <Layers size={14} /> General Polling
        </button>

        <button
          onClick={() => switchTab("candidate")}
          className={cn(
            "px-6 py-3 rounded-full flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300",
            activeApp === "candidate" ? "bg-blue-500 text-white shadow-lg scale-105" : "text-white/50 hover:text-white hover:bg-white/10"
          )}
        >
          <Users size={14} /> Candidate Poll
        </button>

        <button
          onClick={() => switchTab("state")}
          className={cn(
            "px-6 py-3 rounded-full flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300",
            activeApp === "state" ? "bg-emerald-500 text-black shadow-lg scale-105" : "text-white/50 hover:text-white hover:bg-white/10"
          )}
        >
          <MapPin size={14} /> State Election
        </button>
      </div>

      <div className="w-full h-full min-h-screen">
        {/* Mount on first visit, then keep alive with display:none */}
        {visited.has("general") && <div style={{ display: activeApp === "general" ? "block" : "none" }}><GeneralPolling /></div>}
        {visited.has("candidate") && <div style={{ display: activeApp === "candidate" ? "block" : "none" }}><CandidatePoll /></div>}
        {visited.has("state") && <div style={{ display: activeApp === "state" ? "block" : "none" }}><StateElection /></div>}
      </div>
    </>
  );
}
