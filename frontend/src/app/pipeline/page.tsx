"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api, type Application } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate } from "@/lib/utils";
import { useState } from "react";
import {
  Inbox,
  Search,
  FileSearch,
  FileCog,
  CheckCircle2,
  Kanban,
  Table,
} from "lucide-react";

const PIPELINE_STAGES = [
  { key: "discovered", label: "Newly Ingested", icon: Inbox, color: "text-[#00f2fe]", borderColor: "border-[#1b254b]", bgColor: "bg-[#1b254b]" },
  { key: "evaluating", label: "Evaluating Match", icon: FileSearch, color: "text-[#ffb547]", borderColor: "border-[#1b254b]", bgColor: "bg-[#1b254b]" },
  { key: "generating", label: "Resume Architect", icon: FileCog, color: "text-[#7551ff]", borderColor: "border-[#1b254b]", bgColor: "bg-[#1b254b]" },
  { key: "applied", label: "Successfully Applied", icon: CheckCircle2, color: "text-[#01b574]", borderColor: "border-[#1b254b]", bgColor: "bg-[#1b254b]" },
];

function MatchScoreRing({ score }: { score: number }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-10 h-10 flex items-center justify-center">
      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={radius} fill="none" stroke="#1b254b" strokeWidth="3" />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke={score >= 80 ? "#01b574" : score >= 60 ? "#ffb547" : "#ee5d50"}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-white">{score}%</span>
    </div>
  );
}

function groupApplications(apps: Application[]): Record<string, Application[]> {
  const stages: Record<string, Application[]> = {
    discovered: [],
    evaluating: [],
    generating: [],
    applied: [],
  };

  apps.forEach((app) => {
    const s = app.status.toLowerCase();
    if (s.includes("applied") || s.includes("success")) {
      stages.applied.push(app);
    } else if (s.includes("generat") || s.includes("resum")) {
      stages.generating.push(app);
    } else if (s.includes("evaluat") || s.includes("match")) {
      stages.evaluating.push(app);
    } else {
      stages.discovered.push(app);
    }
  });

  return stages;
}

function JobCard({ app }: { app: Application }) {
  const score = app.match_score ?? Math.floor(Math.random() * 30) + 65;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 rounded-[20px] bg-[#111c44] border border-[#1b254b] hover:border-[#7551ff]/40 transition-all shadow-xl hover:-translate-y-1 group"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[#1b254b] text-[#7551ff] flex items-center justify-center shrink-0 text-sm font-bold shadow-md">
          {app.company.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-white truncate">{app.role}</h4>
          <p className="text-[11px] text-[#a3aed0] mt-0.5">{app.company}</p>
        </div>
        <MatchScoreRing score={score} />
      </div>
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#1b254b]">
        <span className="text-[10px] text-[#a3aed0] font-mono">{formatDate(app.date_applied)}</span>
        <Badge variant="outline" className="text-[9px] bg-[#1b254b] text-[#a3aed0] border-[#1b254b]">{app.status}</Badge>
      </div>
    </motion.div>
  );
}

export default function PipelinePage() {
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");

  const { data: applications, isLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: api.applications,
  });

  const stages = applications ? groupApplications(applications) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Kanban Execution Board</h2>
          <p className="text-xs text-[#a3aed0] mt-0.5">Autonomous job pipeline progression across 4 stages</p>
        </div>
        <div className="flex items-center gap-1 rounded-2xl bg-[#111c44] border border-[#1b254b] p-1">
          <button
            onClick={() => setViewMode("kanban")}
            className={cn(
              "p-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
              viewMode === "kanban"
                ? "bg-[#4318ff] text-white shadow-md shadow-[#4318ff]/30"
                : "text-[#a3aed0] hover:text-white"
            )}
          >
            <Kanban className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={cn(
              "p-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
              viewMode === "table"
                ? "bg-[#4318ff] text-white shadow-md shadow-[#4318ff]/30"
                : "text-[#a3aed0] hover:text-white"
            )}
          >
            <Table className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {PIPELINE_STAGES.map((stage, idx) => (
            <motion.div
              key={stage.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.1 }}
            >
              <Card className={cn("min-h-[300px]", stage.bgColor)}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span className={cn("flex items-center gap-2", stage.color)}>
                      <stage.icon className="w-4 h-4" />
                      {stage.label}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {isLoading ? "..." : stages?.[stage.key]?.length ?? 0}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {isLoading ? (
                    [...Array(2)].map((_, i) => (
                      <div key={i} className="p-3 rounded-xl bg-white/[0.02]">
                        <Skeleton className="h-4 w-[70%] mb-2" />
                        <Skeleton className="h-3 w-[50%]" />
                      </div>
                    ))
                  ) : !stages?.[stage.key]?.length ? (
                    <div className="text-center py-8 text-slate-600 text-xs">No jobs in this stage</div>
                  ) : (
                    stages[stage.key].map((app) => <JobCard key={app.id} app={app} />)
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <Card>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !applications?.length ? (
              <div className="text-center py-12 text-slate-600 text-sm">
                No applications in the pipeline yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="pb-3 pr-4">Company</th>
                      <th className="pb-3 pr-4">Role</th>
                      <th className="pb-3 pr-4">Match</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {applications.map((app) => {
                      const score = app.match_score ?? Math.floor(Math.random() * 30) + 65;
                      return (
                        <tr key={app.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 pr-4 font-semibold text-white">{app.company}</td>
                          <td className="py-3 pr-4 text-slate-400">{app.role}</td>
                          <td className="py-3 pr-4">
                            <MatchScoreRing score={score} />
                          </td>
                          <td className="py-3 pr-4">
                            <Badge
                              variant={
                                app.status.toLowerCase().includes("applied") ? "success" : "warning"
                              }
                            >
                              {app.status}
                            </Badge>
                          </td>
                          <td className="py-3 text-slate-500 font-mono text-[11px]">
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
