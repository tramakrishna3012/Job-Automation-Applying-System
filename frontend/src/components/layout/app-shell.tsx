"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, isAuthenticated, theme } = useAppStore();
  const router = useRouter();

  // Sync theme with HTML root class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
    }
  }, [theme]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth");
    }
  }, [isAuthenticated, router]);

  // Don't render protected content until authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] selection:bg-indigo-500/30 selection:text-white transition-colors duration-250 relative overflow-x-hidden stellar-grid-bg">
      {/* Cosmic Radial Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-indigo-500/[0.08] blur-[160px] rounded-full" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-purple-500/[0.06] blur-[180px] rounded-full" />
        <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-cyan-500/[0.04] blur-[200px] rounded-full" />
      </div>

      <Sidebar />

      <div
        className={cn(
          "transition-all duration-300 ease-in-out min-h-screen flex flex-col px-4 sm:px-8 py-4 relative z-10",
          sidebarCollapsed ? "ml-[76px]" : "ml-[260px]"
        )}
      >
        <Topbar />
        <main className="flex-1 max-w-[1600px] w-full mx-auto pb-14">{children}</main>
      </div>
    </div>
  );
}
