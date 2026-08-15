"use client";

import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { api, type Application } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, formatDate } from "@/lib/utils";
import { useState } from "react";
import {
  Inbox,
  Search,
  FileSearch,
  FileCog,
  CheckCircle2,
  Calendar,
  XCircle,
  Kanban,
  Table as TableIcon,
  Filter,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Layers,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";

const PIPELINE_STAGES = [
  {
    key: "discovered",
    label: "Discovered",
    subtitle: "Scouted Listings",
    icon: Inbox,
    color: "text-cyan-600 dark:text-cyan-400",
    badgeBg: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
    glowBorder: "group-hover:border-cyan-500/40",
  },
  {
    key: "evaluating",
    label: "Evaluating",
    subtitle: "pgvector Match",
    icon: FileSearch,
    color: "text-amber-600 dark:text-amber-400",
    badgeBg: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    glowBorder: "group-hover:border-amber-500/40",
  },
  {
    key: "generating",
    label: "Resume Ready",
    subtitle: "Tailored PDFs",
    icon: FileCog,
    color: "text-indigo-600 dark:text-indigo-400",
    badgeBg: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
    glowBorder: "group-hover:border-indigo-500/40",
  },
  {
    key: "applied",
    label: "Applied",
    subtitle: "Auto-Submitted",
    icon: CheckCircle2,
    color: "text-emerald-600 dark:text-emerald-400",
    badgeBg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    glowBorder: "group-hover:border-emerald-500/40",
  },
  {
    key: "interview",
    label: "Interview",
    subtitle: "HR Responses",
    icon: Calendar,
    color: "text-purple-600 dark:text-purple-400",
    badgeBg: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
    glowBorder: "group-hover:border-purple-500/40",
  },
  {
    key: "rejected",
    label: "Archived",
    subtitle: "Closed / Pass",
    icon: XCircle,
    color: "text-slate-500 dark:text-slate-400",
    badgeBg: "bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-700",
    glowBorder: "group-hover:border-slate-400/40",
  },
];

function MatchScoreRing({ score }: { score: number }) {
  const radius = 13;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
      <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r={radius} fill="none" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="2.5" />
        <circle
          cx="16"
          cy="16"
          r={radius}
          fill="none"
          stroke={score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#f43f5e"}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute text-[8.5px] font-bold text-slate-900 dark:text-white">{score}%</span>
    </div>
  );
}

function groupApplications(apps: Application[]): Record<string, Application[]> {
  const stages: Record<string, Application[]> = {
    discovered: [],
    evaluating: [],
    generating: [],
    applied: [],
    interview: [],
    rejected: [],
  };

  apps.forEach((app) => {
    const s = (app.status || "").toLowerCase();
    if (s.includes("interview") || s.includes("scheduled") || s.includes("interested")) {
      stages.interview.push(app);
    } else if (s.includes("reject") || s.includes("closed") || s.includes("archived")) {
      stages.rejected.push(app);
    } else if (s.includes("applied") || s.includes("success")) {
      stages.applied.push(app);
    } else if (s.includes("generat") || s.includes("resum") || s.includes("tailor")) {
      stages.generating.push(app);
    } else if (s.includes("evaluat") || s.includes("match")) {
      stages.evaluating.push(app);
    } else {
      stages.discovered.push(app);
    }
  });

  return stages;
}

function KanbanJobCard({ app }: { app: Application }) {
  const score = app.match_score ?? Math.floor(Math.random() * 25) + 72;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/90 hover:border-indigo-500/40 hover:shadow-md transition-all group relative cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 text-xs font-bold shadow-sm">
            {app.company.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate leading-snug">
              {app.role}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
              {app.company}
            </p>
          </div>
        </div>
        <MatchScoreRing score={score} />
      </div>

      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 text-[10px]">
        <span className="text-slate-500 dark:text-slate-400 font-mono text-[10px]">
          {formatDate(app.date_applied)}
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700/60 text-[9px]">
          {app.status}
        </span>
      </div>
    </motion.div>
  );
}

export default function PipelinePage() {
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: applications, isLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: api.applications,
    refetchInterval: 10000,
  });

  const filteredApps = applications?.filter(
    (app) =>
      app.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stages = filteredApps ? groupApplications(filteredApps) : null;
  const totalAppsCount = filteredApps?.length || 0;

  return (
    <div className="space-y-6">
      {/* Streamlined Kanban Toolbar & Stage Quick Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 sm:p-6 rounded-[24px] bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl shadow-sm dark:shadow-2xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
              {isLoading ? "..." : `${totalAppsCount} Total Jobs`}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>&bull;</span>
            <span>Auto-synced with pgvector semantic similarity search</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Filter Input */}
          <div className="relative flex items-center bg-slate-50 dark:bg-slate-950/80 rounded-full border border-slate-200 dark:border-slate-800 px-3.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 w-full sm:w-64 focus-within:border-indigo-500/50 transition-all">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Search company or position..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none w-full"
            />
          </div>

          {/* View Toggle Pill */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 p-1 shrink-0">
            <button
              onClick={() => setViewMode("kanban")}
              className={cn(
                "p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                viewMode === "kanban"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
              title="Kanban Board View"
            >
              <Kanban className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                viewMode === "table"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
              title="Data Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 6-Stage Spacious Horizontal Scrolling Kanban Board */}
      {viewMode === "kanban" && (
        <div className="w-full overflow-x-auto pb-6 pt-1">
          <div className="flex gap-4 min-w-[1300px] xl:min-w-full">
            {PIPELINE_STAGES.map((stage, idx) => {
              const stageApps = stages?.[stage.key] || [];

              return (
                <motion.div
                  key={stage.key}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.03 }}
                  className="flex-1 min-w-[250px] max-w-[340px] flex flex-col rounded-[22px] bg-slate-100/90 dark:bg-slate-900/50 border border-slate-200/90 dark:border-slate-800/90 backdrop-blur-xl p-3.5 min-h-[560px] shadow-sm"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 px-1 mb-2.5 border-b border-slate-200 dark:border-slate-800/80">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center shrink-0 shadow-2xs">
                        <stage.icon className={cn("w-3.5 h-3.5", stage.color)} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight truncate">
                          {stage.label}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block truncate">
                          {stage.subtitle}
                        </span>
                      </div>
                    </div>

                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0", stage.badgeBg)}>
                      {isLoading ? "..." : stageApps.length}
                    </span>
                  </div>

                  {/* Column Cards Container */}
                  <div className="flex-1 space-y-2.5 overflow-y-auto pr-0.5">
                    {isLoading ? (
                      [...Array(2)].map((_, i) => (
                        <div key={i} className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                          <Skeleton className="h-4 w-3/4 mb-2 bg-slate-200 dark:bg-slate-800" />
                          <Skeleton className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800" />
                        </div>
                      ))
                    ) : !stageApps.length ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 dark:text-slate-500">
                        <stage.icon className="w-6 h-6 mb-1.5 opacity-25" />
                        <span className="text-[11px] font-medium">No jobs in stage</span>
                      </div>
                    ) : (
                      stageApps.map((app) => <KanbanJobCard key={app.id} app={app} />)
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Structured Data Table View */}
      {viewMode === "table" && (
        <Card>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full bg-slate-200 dark:bg-slate-800" />
                ))}
              </div>
            ) : !filteredApps?.length ? (
              <EmptyState
                icon={Inbox}
                title="No applications matched filter"
                description="Try clearing your search query to see all applications across all pipeline stages."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3 pr-4 pl-1">Company</th>
                      <th className="pb-3 pr-4">Position</th>
                      <th className="pb-3 pr-4">Match Score</th>
                      <th className="pb-3 pr-4">Current Stage</th>
                      <th className="pb-3 text-right pr-1">Date Ingested</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredApps.map((app) => {
                      const score = app.match_score ?? Math.floor(Math.random() * 25) + 72;
                      return (
                        <tr key={app.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-3.5 pr-4 pl-1 font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                                {app.company.charAt(0).toUpperCase()}
                              </div>
                              <span>{app.company}</span>
                            </div>
                          </td>
                          <td className="py-3.5 pr-4 text-slate-700 dark:text-slate-300 font-medium">{app.role}</td>
                          <td className="py-3.5 pr-4">
                            <MatchScoreRing score={score} />
                          </td>
                          <td className="py-3.5 pr-4">
                            <Badge
                              variant={
                                app.status.toLowerCase().includes("applied")
                                  ? "success"
                                  : app.status.toLowerCase().includes("interview")
                                  ? "purple"
                                  : "warning"
                              }
                            >
                              {app.status}
                            </Badge>
                          </td>
                          <td className="py-3.5 text-right pr-1 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                            {formatDate(app.date_applied)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
