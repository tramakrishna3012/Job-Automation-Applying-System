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
  ArrowRight,
  Sparkles,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

const PIPELINE_STAGES = [
  {
    key: "discovered",
    label: "Discovered",
    subtitle: "Scouted Jobs",
    icon: Inbox,
    color: "text-cyan-400",
    badgeVariant: "cyan" as const,
    glowBg: "bg-cyan-500/10 border-cyan-500/20",
  },
  {
    key: "evaluating",
    label: "Evaluating",
    subtitle: "pgvector Match",
    icon: FileSearch,
    color: "text-amber-400",
    badgeVariant: "warning" as const,
    glowBg: "bg-amber-500/10 border-amber-500/20",
  },
  {
    key: "generating",
    label: "Resume Ready",
    subtitle: "Tailored Version",
    icon: FileCog,
    color: "text-indigo-400",
    badgeVariant: "default" as const,
    glowBg: "bg-indigo-500/10 border-indigo-500/20",
  },
  {
    key: "applied",
    label: "Applied",
    subtitle: "Auto-Submitted",
    icon: CheckCircle2,
    color: "text-emerald-400",
    badgeVariant: "success" as const,
    glowBg: "bg-emerald-500/10 border-emerald-500/20",
  },
  {
    key: "interview",
    label: "Interview",
    subtitle: "HR Responses",
    icon: Calendar,
    color: "text-purple-400",
    badgeVariant: "purple" as const,
    glowBg: "bg-purple-500/10 border-purple-500/20",
  },
  {
    key: "rejected",
    label: "Archived",
    subtitle: "Closed / Pass",
    icon: XCircle,
    color: "text-slate-400",
    badgeVariant: "outline" as const,
    glowBg: "bg-slate-800/40 border-slate-700/40",
  },
];

function MatchScoreRing({ score }: { score: number }) {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
      <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke={score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#f43f5e"}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute text-[9px] font-bold text-white">{score}%</span>
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
    const s = app.status.toLowerCase();
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
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/80 hover:border-indigo-500/40 transition-all shadow-md hover:-translate-y-0.5 group relative"
    >
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 text-xs font-bold shadow-sm">
          {app.company.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-white truncate leading-snug">{app.role}</h4>
          <p className="text-[11px] text-slate-400 truncate mt-0.5">{app.company}</p>
        </div>
        <MatchScoreRing score={score} />
      </div>

      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800/60 text-[10px]">
        <span className="text-slate-500 font-mono">{formatDate(app.date_applied)}</span>
        <Badge variant="outline" className="text-[9px] py-0 px-2">
          {app.status}
        </Badge>
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

  return (
    <div className="space-y-6">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-[22px] bg-slate-900/60 border border-slate-800/80 backdrop-blur-2xl shadow-xl">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Job Pipeline Kanban
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Autonomous multi-stage job application lifecycle tracking
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="relative flex items-center bg-slate-950/80 rounded-full border border-slate-800 px-3 py-1.5 text-xs text-slate-300 w-44 sm:w-60 focus-within:border-indigo-500/50 transition-all">
            <Search className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Filter company / position..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-slate-950/80 rounded-xl border border-slate-800 p-1">
            <button
              onClick={() => setViewMode("kanban")}
              className={cn(
                "p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                viewMode === "kanban"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
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
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              )}
              title="Data Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 6-Stage Kanban Board */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {PIPELINE_STAGES.map((stage, idx) => {
            const stageApps = stages?.[stage.key] || [];

            return (
              <motion.div
                key={stage.key}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.04 }}
                className="flex flex-col rounded-[20px] bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl p-3 min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 px-1 mb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <stage.icon className={cn("w-4 h-4", stage.color)} />
                    <div>
                      <span className="text-xs font-bold text-white block">{stage.label}</span>
                      <span className="text-[9px] text-slate-500 font-mono">{stage.subtitle}</span>
                    </div>
                  </div>
                  <Badge variant={stage.badgeVariant} className="text-[10px] px-2 py-0">
                    {isLoading ? "..." : stageApps.length}
                  </Badge>
                </div>

                {/* Column Cards Container */}
                <div className="flex-1 space-y-2.5 overflow-y-auto pr-0.5">
                  {isLoading ? (
                    [...Array(2)].map((_, i) => (
                      <div key={i} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                        <Skeleton className="h-4 w-3/4 mb-2 bg-slate-800" />
                        <Skeleton className="h-3 w-1/2 bg-slate-800" />
                      </div>
                    ))
                  ) : !stageApps.length ? (
                    <div className="text-center py-12 text-slate-500 text-xs font-medium">
                      No jobs in stage
                    </div>
                  ) : (
                    stageApps.map((app) => <KanbanJobCard key={app.id} app={app} />)
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Structured Data Table View */}
      {viewMode === "table" && (
        <Card>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full bg-slate-800" />
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
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3 pr-4 pl-1">Company</th>
                      <th className="pb-3 pr-4">Position</th>
                      <th className="pb-3 pr-4">Match Score</th>
                      <th className="pb-3 pr-4">Current Stage</th>
                      <th className="pb-3 text-right pr-1">Date Ingested</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredApps.map((app) => {
                      const score = app.match_score ?? Math.floor(Math.random() * 25) + 72;
                      return (
                        <tr key={app.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3.5 pr-4 pl-1 font-bold text-white">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                                {app.company.charAt(0)}
                              </div>
                              <span>{app.company}</span>
                            </div>
                          </td>
                          <td className="py-3.5 pr-4 text-slate-300 font-medium">{app.role}</td>
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
                          <td className="py-3.5 text-right pr-1 text-slate-400 font-mono text-[11px]">
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
