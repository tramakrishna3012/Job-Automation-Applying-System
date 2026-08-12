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
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Command Center", icon: LayoutDashboard },
  { href: "/pipeline", label: "Job Pipeline", icon: Kanban },
  { href: "/resume-studio", label: "Resume Studio", icon: FileText },
  { href: "/emails", label: "Emails & Outreach", icon: Mail },
  { href: "/branding", label: "Branding Hub", icon: Share2 },
  { href: "/connections", label: "Connections", icon: Link2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, user, logout } = useAppStore();

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 72 : 260 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-white/[0.06] bg-[#0a0b0f]/95 backdrop-blur-xl"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/[0.06]">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
          <Sparkles className="w-4.5 h-4.5 text-white" />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <span className="text-sm font-bold text-white tracking-tight">JobAuto</span>
              <span className="text-sm font-bold text-sky-400">AI</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                )}
              >
                <item.icon
                  className={cn(
                    "w-[18px] h-[18px] shrink-0 transition-colors",
                    isActive ? "text-sky-400" : "text-slate-500 group-hover:text-slate-300"
                  )}
                />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={toggleSidebar}
        className="mx-2 mb-2 flex items-center justify-center rounded-xl p-2 text-slate-500 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
      >
        <ChevronLeft
          className={cn("w-4 h-4 transition-transform duration-300", sidebarCollapsed && "rotate-180")}
        />
      </button>

      {/* User Footer */}
      <div className="border-t border-white/[0.06] p-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5 text-white" />
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="flex-1 overflow-hidden"
              >
                <p className="text-xs font-semibold text-white truncate">{user?.name || "User"}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email || ""}</p>
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
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}
