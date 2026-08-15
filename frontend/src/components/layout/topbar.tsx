"use client";

import { useAppStore } from "@/lib/store";
import { usePathname } from "next/navigation";
import { Sun, Moon, Bell, Play, Loader2, Search, Info, CheckCheck, Sparkles, X, Terminal, Cpu } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { api, type AgentLog } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const PAGE_NAMES: Record<string, string> = {
  "/": "AI Command Center",
  "/pipeline": "Job Kanban Pipeline",
  "/resume-studio": "Resume Architect Studio",
  "/emails": "Cold Outreach Campaign",
  "/branding": "Social Branding Hub",
  "/connections": "Integration Hub",
  "/onboarding": "Candidate Setup Wizard",
};

export function Topbar() {
  const pathname = usePathname();
  const { theme, toggleTheme, user } = useAppStore();
  const [testRunning, setTestRunning] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [bellOpen, setBellOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const popoverRef = useRef<HTMLDivElement>(null);

  const currentPage = PAGE_NAMES[pathname] || "Dashboard";

  // Fetch live logs for notification feed
  const { data: logs } = useQuery({
    queryKey: ["logs"],
    queryFn: api.logs,
    refetchInterval: 8000,
  });

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTestApply = async () => {
    setTestRunning(true);
    setNotification(null);
    try {
      const result = await api.testApply();
      setNotification(`Test Workflow Executed: ${result.job.title} at ${result.job.company} (${result.job.status})`);
      setHasUnread(true);
    } catch {
      setNotification("Test execution error. Verify backend logs and API keys.");
    } finally {
      setTestRunning(false);
      setTimeout(() => setNotification(null), 6000);
    }
  };

  const handleToggleBell = () => {
    setBellOpen(!bellOpen);
    if (!bellOpen) {
      setHasUnread(false);
    }
  };

  return (
    <header className="sticky top-4 z-30 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
      {/* Stellar Breadcrumbs & Title */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-0.5">
          <span>Platform</span>
          <span className="text-slate-600">/</span>
          <span className="text-indigo-400 capitalize">{currentPage}</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight capitalize">
          {currentPage}
        </h1>
      </div>

      {/* Stellar Floating Glass Control Capsule */}
      <div className="relative flex items-center gap-2.5 p-2 rounded-full bg-slate-900/80 border border-slate-800/80 backdrop-blur-2xl shadow-2xl">
        {/* Search Capsule */}
        <div className="relative flex items-center bg-slate-950/80 rounded-full border border-slate-800 px-3.5 py-1.5 text-xs text-slate-300 w-36 sm:w-52 focus-within:border-indigo-500/50 transition-all">
          <Search className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search jobs..."
            className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
          />
        </div>

        {/* AI Gateway Pulse Badge */}
        <div className="hidden lg:flex items-center">
          <Badge variant="cyan" className="text-[10px] font-mono py-1 px-3" dot>
            AI Gateway Online
          </Badge>
        </div>

        {/* Test Agent Action Button */}
        <button
          onClick={handleTestApply}
          disabled={testRunning}
          className="stellar-gradient-btn flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shrink-0"
        >
          {testRunning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
          {testRunning ? "Running..." : "Test Agent"}
        </button>

        {/* Notification Bell with Dropdown Popover */}
        <div className="relative" ref={popoverRef}>
          <button
            onClick={handleToggleBell}
            className={cn(
              "relative p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer",
              bellOpen && "bg-slate-800 text-white"
            )}
            title="Notifications & Agent Activity"
          >
            <Bell className="w-4 h-4" />
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
            )}
          </button>

          {/* Notification Drawer Popover */}
          <AnimatePresence>
            {bellOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-[22px] bg-slate-900/95 border border-slate-800 backdrop-blur-2xl shadow-2xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white">Live Agent Activity</span>
                  </div>
                  <button
                    onClick={() => setHasUnread(false)}
                    className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck className="w-3 h-3" /> Mark read
                  </button>
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                  {logs?.length ? (
                    logs.slice(0, 8).map((log: AgentLog, i: number) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs hover:border-indigo-500/30 transition-all"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-[11px] text-cyan-400">{log.agent} Agent</span>
                          <span className="text-[9px] text-slate-500 font-mono">
                            {new Date(log.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">{log.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-xs text-slate-500">
                      <Terminal className="w-6 h-6 mx-auto mb-2 opacity-40" />
                      No recent agent events recorded
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Theme Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-400" />
          )}
        </button>

        {/* User Avatar Pill */}
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-md cursor-pointer shrink-0">
          {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
        </div>
      </div>

      {/* Test Run Notification Banner */}
      {notification && (
        <div className="w-full p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2 shadow-lg shadow-emerald-500/5">
          <Info className="w-4 h-4 shrink-0" />
          <span>{notification}</span>
        </div>
      )}
    </header>
  );
}
