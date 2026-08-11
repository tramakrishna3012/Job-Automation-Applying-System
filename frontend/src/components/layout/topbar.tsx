"use client";

import { useAppStore } from "@/lib/store";
import { Sun, Moon, Bell, Play, Loader2 } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

export function Topbar() {
  const { theme, toggleTheme } = useAppStore();
  const [testRunning, setTestRunning] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const handleTestApply = async () => {
    setTestRunning(true);
    setNotification(null);
    try {
      const result = await api.testApply();
      setNotification(`Test complete: ${result.job.title} at ${result.job.company} — ${result.job.status}`);
    } catch {
      setNotification("Test run encountered an issue. Check backend logs.");
    } finally {
      setTestRunning(false);
      setTimeout(() => setNotification(null), 6000);
    }
  };

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-white/[0.06] bg-[#0a0b0f]/80 backdrop-blur-xl flex items-center justify-between px-6">
      {/* Left: Gateway Badge */}
      <div className="flex items-center gap-3">
        <Badge variant="default" className="text-[10px] font-mono">
          <span className="relative flex h-1.5 w-1.5 mr-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          Requesty Router Active
        </Badge>
        {notification && (
          <Badge variant="success" className="text-[10px] animate-in fade-in slide-in-from-left-2">
            {notification}
          </Badge>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleTestApply}
          disabled={testRunning}
          className="flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {testRunning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          {testRunning ? "Running..." : "Test Run"}
        </button>

        <button className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-sky-500" />
        </button>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
