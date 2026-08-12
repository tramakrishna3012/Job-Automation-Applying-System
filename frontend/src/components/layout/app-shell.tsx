"use client";

import { useAppStore } from "@/lib/store";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useAppStore();

  return (
    <div className="min-h-screen bg-[#0b1437] text-white selection:bg-[#4318ff]/40 selection:text-white">
      {/* Horizon Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#4318ff]/[0.15] blur-[180px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#7551ff]/[0.12] blur-[180px] rounded-full" />
        <div className="absolute top-1/3 left-1/3 w-[35%] h-[35%] bg-[#00f2fe]/[0.05] blur-[220px] rounded-full" />
      </div>

      <Sidebar />

      <div
        className={cn(
          "transition-all duration-300 ease-in-out min-h-screen flex flex-col px-4 md:px-8 py-4",
          sidebarCollapsed ? "ml-[76px]" : "ml-[270px]"
        )}
      >
        <Topbar />
        <main className="flex-1 relative z-10 max-w-[1600px] w-full mx-auto pb-12">{children}</main>
      </div>
    </div>
  );
}
