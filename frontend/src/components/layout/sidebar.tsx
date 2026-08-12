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
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Main Dashboard", icon: LayoutDashboard },
  { href: "/pipeline", label: "Job Kanban", icon: Kanban },
  { href: "/resume-studio", label: "Resume Architect", icon: FileText },
  { href: "/emails", label: "Cold Outreach", icon: Mail },
  { href: "/branding", label: "Social Branding", icon: Share2 },
  { href: "/connections", label: "Integrations", icon: Link2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, user, logout } = useAppStore();

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 76 : 270 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-[#1b254b] bg-[#111c44]/95 backdrop-blur-xl shadow-2xl"
    >
      {/* Horizon UI Logo Header */}
      <div className="flex items-center gap-3 px-5 h-20 border-b border-[#1b254b]">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#868CFF] to-[#4318FF] flex items-center justify-center shadow-lg shadow-[#4318FF]/30 shrink-0">
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
                <span className="text-base font-extrabold text-white tracking-wider">HORIZON</span>
                <span className="text-base font-extrabold text-[#7551ff]">UI</span>
              </div>
              <span className="text-[10px] font-semibold tracking-widest text-[#a3aed0] uppercase">
                AI JOB AUTOMATION
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-6 space-y-1.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "group relative flex items-center gap-3.5 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 cursor-pointer",
                  isActive
                    ? "bg-[#1b254b] text-white shadow-md shadow-[#0b1437]/50"
                    : "text-[#a3aed0] hover:text-white hover:bg-[#1b254b]/50"
                )}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5 shrink-0 transition-colors",
                    isActive ? "text-[#7551ff]" : "text-[#a3aed0] group-hover:text-white"
                  )}
                />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="overflow-hidden whitespace-nowrap text-xs font-bold"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Horizon Active Bar Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeBar"
                    className="absolute right-0 top-2 bottom-2 w-1.5 rounded-l-full bg-gradient-to-b from-[#868CFF] to-[#4318FF]"
                  />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Horizon Pro Upgrade Card */}
      {!sidebarCollapsed && (
        <div className="mx-4 mb-4 p-4 rounded-[20px] bg-gradient-to-br from-[#1b254b] to-[#0b1437] border border-[#7551ff]/20 text-center relative overflow-hidden shadow-xl">
          <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[#4318ff]/20 flex items-center justify-center text-[#7551ff]">
            <Zap className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-white mb-1">Horizon AI Agent Active</h4>
          <p className="text-[10px] text-[#a3aed0] mb-3">6-hour autonomous scheduling cycle running</p>
          <div className="w-full py-1.5 rounded-xl bg-[#4318ff] text-white text-[10px] font-bold tracking-wider uppercase shadow-md shadow-[#4318ff]/30">
            System Online
          </div>
        </div>
      )}

      {/* Collapse Toggle */}
      <button
        onClick={toggleSidebar}
        className="mx-3 mb-2 flex items-center justify-center rounded-xl p-2 text-[#a3aed0] hover:text-white hover:bg-[#1b254b] transition-colors cursor-pointer"
      >
        <ChevronLeft
          className={cn("w-4 h-4 transition-transform duration-300", sidebarCollapsed && "rotate-180")}
        />
      </button>

      {/* User Profile Footer */}
      <div className="border-t border-[#1b254b] p-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#868CFF] to-[#4318FF] flex items-center justify-center shrink-0 shadow-md">
            <User className="w-4 h-4 text-white" />
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="flex-1 overflow-hidden"
              >
                <p className="text-xs font-bold text-white truncate">{user?.name || "Alex Mercer"}</p>
                <p className="text-[10px] text-[#a3aed0] truncate">{user?.email || "alex@example.com"}</p>
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
                className="p-2 rounded-xl text-[#a3aed0] hover:text-[#ee5d50] hover:bg-[#ee5d50]/10 transition-colors cursor-pointer"
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
