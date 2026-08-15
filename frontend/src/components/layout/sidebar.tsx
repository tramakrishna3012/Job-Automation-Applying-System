"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Kanban,
  FileText,
  Share2,
  Link2,
  Mail,
  LogOut,
  ChevronLeft,
  Sparkles,
  User,
  Zap,
  UserCheck,
  Cpu,
} from "lucide-react";

const NAV_GROUPS = [
  {
    title: "AUTOMATION CORE",
    items: [
      { href: "/", label: "AI Dashboard", icon: LayoutDashboard },
      { href: "/pipeline", label: "Job Kanban", icon: Kanban, badge: "Live" },
      { href: "/resume-studio", label: "Resume Studio", icon: FileText },
      { href: "/onboarding", label: "Candidate Setup", icon: UserCheck },
    ],
  },
  {
    title: "OUTREACH & VISIBILITY",
    items: [
      { href: "/emails", label: "Cold Outreach", icon: Mail },
      { href: "/branding", label: "Social Branding", icon: Share2 },
      { href: "/connections", label: "Integrations", icon: Link2 },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, user, logout } = useAppStore();

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 76 : 260 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-slate-800/80 bg-slate-950/90 backdrop-blur-2xl shadow-2xl"
    >
      {/* Stellar Brand Header */}
      <div className="flex items-center gap-3 px-5 h-20 border-b border-slate-800/80">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold text-white tracking-wider">JOBAUTO</span>
                <span className="text-base font-extrabold text-indigo-400">AI</span>
              </div>
              <span className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
                AUTONOMOUS PLATFORM
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 px-3 py-5 space-y-6 overflow-y-auto">
        {NAV_GROUPS.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 pb-1.5 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                {group.title}
              </div>
            )}
            {group.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-200 cursor-pointer",
                      isActive
                        ? "bg-gradient-to-r from-indigo-500/15 to-purple-500/10 border border-indigo-500/30 text-white shadow-md shadow-indigo-500/5"
                        : "text-slate-400 hover:text-white hover:bg-slate-900/60 border border-transparent"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "w-4 h-4 shrink-0 transition-colors",
                        isActive ? "text-indigo-400" : "text-slate-400 group-hover:text-white"
                      )}
                    />
                    <AnimatePresence>
                      {!sidebarCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          className="overflow-hidden whitespace-nowrap flex-1"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {/* Badge */}
                    {!sidebarCollapsed && item.badge && (
                      <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[9px] font-mono border border-indigo-500/30">
                        {item.badge}
                      </span>
                    )}

                    {/* Active Line */}
                    {isActive && (
                      <motion.div
                        layoutId="activeSidebarPill"
                        className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-gradient-to-b from-indigo-400 to-purple-500"
                      />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Stellar Agent Status Pulse Box */}
      {!sidebarCollapsed && (
        <div className="mx-3.5 mb-3 p-3.5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-indigo-500/20 relative overflow-hidden shadow-lg">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-bold text-white">Agent Zero Active</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-snug">
            Autonomous 6h application cycle operational via Requesty Gateway
          </p>
        </div>
      )}

      {/* Collapse Toggle */}
      <button
        onClick={toggleSidebar}
        className="mx-3 mb-2 flex items-center justify-center rounded-xl p-2 text-slate-400 hover:text-white hover:bg-slate-900/80 transition-colors cursor-pointer"
        title="Toggle Sidebar"
      >
        <ChevronLeft
          className={cn("w-4 h-4 transition-transform duration-300", sidebarCollapsed && "rotate-180")}
        />
      </button>

      {/* User Profile Footer */}
      <div className="border-t border-slate-800/80 p-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-md text-white text-xs font-bold">
            {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="flex-1 overflow-hidden"
              >
                <p className="text-xs font-bold text-white truncate">{user?.name || "Candidate"}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email || "candidate@example.com"}</p>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={logout}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}
