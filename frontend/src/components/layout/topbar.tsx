"use client";

import { useAppStore } from "@/lib/store";
import { usePathname } from "next/navigation";
import { Sun, Moon, Bell, Play, Loader2, Search, Info } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

const PAGE_NAMES: Record<string, string> = {
  "/": "Main Dashboard",
  "/pipeline": "Job Kanban Pipeline",
  "/resume-studio": "AI Resume Architect",
  "/emails": "Cold Outreach Campaign",
  "/branding": "Social Branding Hub",
  "/connections": "System Integrations",
  "/onboarding": "Candidate Onboarding Wizard",
};

export function Topbar() {
  const pathname = usePathname();
  const { theme, toggleTheme, user } = useAppStore();
  const [testRunning, setTestRunning] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const currentPage = PAGE_NAMES[pathname] || "Dashboard";

  const handleTestApply = async () => {
    setTestRunning(true);
    setNotification(null);
    try {
      const result = await api.testApply();
      setNotification(`Test Run Complete: ${result.job.title} at ${result.job.company} (${result.job.status})`);
    } catch {
      setNotification("Test execution error. Check backend logs.");
    } finally {
      setTestRunning(false);
      setTimeout(() => setNotification(null), 6000);
    }
  };

  return (
    <header className="sticky top-4 z-30 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
      {/* Horizon Breadcrumbs & Page Title */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-[#a3aed0] mb-0.5">
          <span>Pages</span>
          <span>/</span>
          <span className="text-white capitalize">{currentPage}</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight capitalize">
          {currentPage}
        </h1>
      </div>

      {/* Horizon Floating Glass Control Bar */}
      <div className="flex items-center gap-3 p-2.5 rounded-[30px] bg-[#111c44]/90 border border-[#1b254b] backdrop-blur-xl shadow-2xl">
        {/* Search Bar */}
        <div className="relative flex items-center bg-[#0b1437] rounded-full border border-[#1b254b] px-3.5 py-1.5 text-xs text-slate-300 w-40 sm:w-56 focus-within:border-[#7551ff] transition-all">
          <Search className="w-3.5 h-3.5 text-[#a3aed0] mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search applications..."
            className="bg-transparent text-xs text-white placeholder-[#a3aed0] focus:outline-none w-full"
          />
        </div>

        {/* Gateway Status Badge */}
        <div className="hidden lg:flex items-center">
          <Badge variant="default" className="text-[10px] font-mono bg-[#1b254b] text-[#00f2fe] border-[#1b254b] py-1">
            <span className="relative flex h-2 w-2 mr-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#01b574] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#01b574]" />
            </span>
            AI Gateway Online
          </Badge>
        </div>

        {/* Test Run Action Button */}
        <button
          onClick={handleTestApply}
          disabled={testRunning}
          className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold bg-gradient-to-r from-[#868CFF] to-[#4318FF] text-white shadow-lg shadow-[#4318FF]/30 hover:shadow-[#4318FF]/50 transition-all disabled:opacity-50 cursor-pointer shrink-0"
        >
          {testRunning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
          {testRunning ? "Running..." : "Test Agent"}
        </button>

        {/* Notification Bell */}
        <button className="relative p-2 rounded-full text-[#a3aed0] hover:text-white hover:bg-[#1b254b] transition-colors cursor-pointer">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#01b574]" />
        </button>

        {/* Theme Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full text-[#a3aed0] hover:text-white hover:bg-[#1b254b] transition-colors cursor-pointer"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* User Avatar Pill */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#868CFF] to-[#4318FF] flex items-center justify-center text-white text-xs font-bold shadow-md cursor-pointer shrink-0">
          {user?.name ? user.name[0].toUpperCase() : "A"}
        </div>
      </div>

      {/* Test Run Notification Banner */}
      {notification && (
        <div className="w-full p-3 rounded-2xl bg-[#01b574]/15 border border-[#01b574]/30 text-[#01b574] text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>{notification}</span>
        </div>
      )}
    </header>
  );
}
