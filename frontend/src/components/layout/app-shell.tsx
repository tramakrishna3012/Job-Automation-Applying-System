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
      root.style.colorScheme = "light";
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
      root.style.colorScheme = "dark";
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
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] selection:bg-indigo-500/30 selection:text-white relative overflow-x-hidden stellar-grid-bg">
      <Sidebar />

      <div
        className={cn(
          "transition-all duration-250 ease-in-out min-h-screen flex flex-col px-4 sm:px-8 py-4 relative z-10",
          sidebarCollapsed ? "ml-[76px]" : "ml-[260px]"
        )}
      >
        <Topbar />
        <main className="flex-1 max-w-[1600px] w-full mx-auto pb-14">{children}</main>
      </div>
    </div>
  );
}
