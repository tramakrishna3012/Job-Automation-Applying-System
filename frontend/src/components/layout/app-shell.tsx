"use client";

import { useAppStore } from "@/lib/store";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useAppStore();

  return (
    <div className="min-h-screen bg-[#06070b] text-slate-100">
      {/* Background ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-[-8%] w-[40%] h-[40%] bg-sky-600/[0.07] blur-[160px] rounded-full" />
        <div className="absolute bottom-[-15%] right-[-8%] w-[40%] h-[40%] bg-indigo-600/[0.06] blur-[160px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30%] h-[30%] bg-purple-600/[0.03] blur-[200px] rounded-full" />
      </div>

      <Sidebar />

      <div
        className={cn(
          "transition-all duration-300 ease-in-out min-h-screen flex flex-col",
          sidebarCollapsed ? "ml-[72px]" : "ml-[260px]"
        )}
      >
        <Topbar />
        <main className="flex-1 p-6 relative z-10">{children}</main>
      </div>
    </div>
  );
}
