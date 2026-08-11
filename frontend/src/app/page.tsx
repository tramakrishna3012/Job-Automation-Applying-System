"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { cn, formatDate, formatTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase,
  CheckCircle,
  BrainCircuit,
  TrendingUp,
  Terminal,
  RefreshCw,
} from "lucide-react";

const AGENT_COLORS: Record<string, string> = {
  Scout: "text-sky-400",
  Editor: "text-indigo-400",
  Dispatcher: "text-emerald-400",
  Visibility: "text-purple-400",
  Tracker: "text-amber-400",
  System: "text-blue-400",
};

function StatCard({
  icon: Icon,
  label,
  value,
  glowClass,
  delay,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  glowClass: string;
  delay: number;
  loading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className={cn("p-5", glowClass)}>
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            {loading ? (
              <Skeleton className="h-7 w-16 mb-1" />
            ) : (
              <div className="text-2xl font-bold text-white">{value}</div>
            )}
            <div className="text-xs text-slate-500 font-medium">{label}</div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: api.stats,
  });

  const { data: applications, isLoading: appsLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: api.applications,
  });

  const {
    data: logs,
    isLoading: logsLoading,
    refetch: refetchLogs,
  } = useQuery({
    queryKey: ["logs"],
    queryFn: api.logs,
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Command Center</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Real-time overview of your autonomous job application pipeline
        </p>
      </div>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Briefcase}
          label="Jobs Discovered"
          value={stats?.discovered ?? 0}
          glowClass="stat-glow-sky"
          delay={0}
          loading={statsLoading}
        />
        <StatCard
          icon={CheckCircle}
          label="Applications Sent"
          value={stats?.applied ?? 0}
          glowClass="stat-glow-emerald"
          delay={0.1}
          loading={statsLoading}
        />
        <StatCard
          icon={BrainCircuit}
          label="Interviews Tracked"
          value={stats?.interviews ?? 0}
          glowClass="stat-glow-purple"
          delay={0.2}
          loading={statsLoading}
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Match Score"
          value={applications?.length ? Math.round(applications.reduce((s, a) => s + (a.match_score ?? 78), 0) / applications.length) : 0}
          glowClass="stat-glow-amber"
          delay={0.3}
          loading={statsLoading}
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Applications Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="lg:col-span-3"
        >
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Briefcase className="w-4 h-4 text-sky-400" />
                Recent Applications
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">
                {applications?.length ?? 0} total
              </Badge>
            </CardHeader>
            <CardContent>
              {appsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-xl" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-[60%]" />
                        <Skeleton className="h-3 w-[40%]" />
                      </div>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : !applications?.length ? (
                <div className="text-center py-12 text-slate-600">
                  <Briefcase className="w-10 h-10 mx-auto mb-2 stroke-[1.5]" />
                  <p className="text-sm">No applications yet</p>
                  <p className="text-xs mt-1">Click "Test Run" in the top bar to trigger a test application</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-slate-500 font-semibold uppercase tracking-wider">
                        <th className="pb-3 pr-4">Company</th>
                        <th className="pb-3 pr-4">Role</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {applications.slice(0, 8).map((app) => (
                        <tr key={app.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 pr-4 font-semibold text-white">{app.company}</td>
                          <td className="py-3 pr-4 text-slate-400">{app.role}</td>
                          <td className="py-3 pr-4">
                            <Badge
                              variant={
                                app.status.toLowerCase().includes("applied")
                                  ? "success"
                                  : app.status.toLowerCase().includes("interview")
                                  ? "default"
                                  : "warning"
                              }
                            >
                              {app.status}
                            </Badge>
                          </td>
                          <td className="py-3 text-slate-500 font-mono text-[11px]">
                            {formatDate(app.date_applied)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Live Agent Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card className="h-full">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <Terminal className="w-4 h-4 text-slate-500" />
                Agent Feed
              </CardTitle>
              <button
                onClick={() => refetchLogs()}
                className="text-slate-500 hover:text-white transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {logsLoading ? (
                  [...Array(6)].map((_, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-xl bg-white/[0.02]">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 flex-1" />
                    </div>
                  ))
                ) : !logs?.length ? (
                  <p className="text-center text-sm text-slate-600 py-8">No agent activity yet</p>
                ) : (
                  logs.slice(0, 15).map((log, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs font-mono"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className={cn("font-bold", AGENT_COLORS[log.agent] || "text-slate-400")}>
                            [{log.agent}]
                          </span>
                          <span className="ml-2 text-slate-300 font-sans">{log.message}</span>
                        </div>
                        <span className="text-[10px] text-slate-600 whitespace-nowrap">
                          {formatTime(log.time)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
