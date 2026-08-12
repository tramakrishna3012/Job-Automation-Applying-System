"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { cn, formatDate, formatTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase,
  CheckCircle,
  BrainCircuit,
  TrendingUp,
  Terminal,
  RefreshCw,
  Sparkles,
  Zap,
  ArrowUpRight,
} from "lucide-react";

const AGENT_COLORS: Record<string, string> = {
  Scout: "text-[#00f2fe]",
  Editor: "text-[#868CFF]",
  Dispatcher: "text-[#01b574]",
  Visibility: "text-[#7551ff]",
  Tracker: "text-[#ffb547]",
  Jobcode: "text-[#ee5d50]",
  System: "text-[#4318ff]",
};

function HorizonStatCard({
  icon: Icon,
  label,
  value,
  iconBg,
  iconColor,
  delay,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  iconBg: string;
  iconColor: string;
  delay: number;
  loading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <div className="rounded-[20px] border border-[#1b254b] bg-[#111c44] p-5 shadow-2xl transition-all duration-200 hover:border-[#7551ff]/40 hover:-translate-y-1">
        <div className="flex items-center gap-4">
          <div className={cn("w-14 h-14 rounded-full flex items-center justify-center shrink-0", iconBg)}>
            <Icon className={cn("w-6 h-6", iconColor)} />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider text-[#a3aed0] uppercase">{label}</div>
            {loading ? (
              <Skeleton className="h-8 w-20 mt-1 bg-[#1b254b]" />
            ) : (
              <div className="text-2xl font-extrabold text-white tracking-tight mt-0.5">{value}</div>
            )}
          </div>
        </div>
      </div>
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

  const avgMatchScore = applications?.length
    ? Math.round(applications.reduce((s, a) => s + (a.match_score ?? 84), 0) / applications.length)
    : 84;

  return (
    <div className="space-y-6">
      {/* Horizon 4-Card Top Stat Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <HorizonStatCard
          icon={Briefcase}
          label="Jobs Scraped"
          value={stats?.discovered ?? 0}
          iconBg="bg-[#1b254b]"
          iconColor="text-[#00f2fe]"
          delay={0}
          loading={statsLoading}
        />
        <HorizonStatCard
          icon={CheckCircle}
          label="Applications Submitted"
          value={stats?.applied ?? 0}
          iconBg="bg-[#1b254b]"
          iconColor="text-[#01b574]"
          delay={0.1}
          loading={statsLoading}
        />
        <HorizonStatCard
          icon={BrainCircuit}
          label="Interviews Tracked"
          value={stats?.interviews ?? 0}
          iconBg="bg-[#1b254b]"
          iconColor="text-[#7551ff]"
          delay={0.2}
          loading={statsLoading}
        />
        <HorizonStatCard
          icon={TrendingUp}
          label="Avg AI Match Score"
          value={avgMatchScore}
          iconBg="bg-[#1b254b]"
          iconColor="text-[#ffb547]"
          delay={0.3}
          loading={statsLoading}
        />
      </div>

      {/* Main Grid: Recent Applications & Agent Feed */}
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
              <div>
                <CardTitle className="flex items-center gap-2 text-base text-white">
                  <Briefcase className="w-4 h-4 text-[#7551ff]" />
                  Recent Job Applications
                </CardTitle>
                <CardDescription>
                  Automated submissions and status tracking
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] bg-[#1b254b] text-[#a3aed0] border-[#1b254b]">
                {applications?.length ?? 0} Applications Total
              </Badge>
            </CardHeader>
            <CardContent>
              {appsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-2xl bg-[#1b254b]" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-[60%] bg-[#1b254b]" />
                        <Skeleton className="h-3 w-[40%] bg-[#1b254b]" />
                      </div>
                      <Skeleton className="h-5 w-16 rounded-full bg-[#1b254b]" />
                    </div>
                  ))}
                </div>
              ) : !applications?.length ? (
                <div className="text-center py-14 text-[#a3aed0]">
                  <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-40 stroke-[1.5]" />
                  <p className="text-sm font-semibold text-white">No job applications recorded</p>
                  <p className="text-xs text-[#a3aed0] mt-1">
                    Click "Test Agent" in top bar to run an autonomous test pipeline cycle.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#1b254b] text-[#a3aed0] font-bold uppercase tracking-wider text-[10px]">
                        <th className="pb-3 pr-4 pl-2">Company</th>
                        <th className="pb-3 pr-4">Role</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3 text-right pr-2">Date Applied</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1b254b]/50">
                      {applications.slice(0, 8).map((app) => (
                        <tr key={app.id} className="hover:bg-[#1b254b]/40 transition-colors">
                          <td className="py-3.5 pr-4 pl-2 font-bold text-white flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-[#1b254b] text-[#7551ff] flex items-center justify-center font-bold text-xs">
                              {app.company[0]}
                            </div>
                            {app.company}
                          </td>
                          <td className="py-3.5 pr-4 text-[#a3aed0] font-medium">{app.role}</td>
                          <td className="py-3.5 pr-4">
                            <Badge
                              variant={
                                app.status.toLowerCase().includes("applied")
                                  ? "success"
                                  : app.status.toLowerCase().includes("interview")
                                  ? "default"
                                  : "warning"
                              }
                              className="text-[10px]"
                            >
                              {app.status}
                            </Badge>
                          </td>
                          <td className="py-3.5 pr-2 text-right text-[#a3aed0] font-mono text-[11px]">
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

        {/* Live Agent Feed Widget */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card className="h-full">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-base text-white">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#01b574] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#01b574]" />
                  </span>
                  <Terminal className="w-4 h-4 text-[#7551ff]" />
                  Agent Live Telemetry
                </CardTitle>
                <CardDescription>Real-time graph execution logs</CardDescription>
              </div>
              <button
                onClick={() => refetchLogs()}
                className="p-2 rounded-xl text-[#a3aed0] hover:text-white hover:bg-[#1b254b] transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {logsLoading ? (
                  [...Array(6)].map((_, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-2xl bg-[#1b254b]">
                      <Skeleton className="h-3 w-16 bg-[#0b1437]" />
                      <Skeleton className="h-3 flex-1 bg-[#0b1437]" />
                    </div>
                  ))
                ) : !logs?.length ? (
                  <p className="text-center text-xs text-[#a3aed0] py-12">No agent telemetry logged yet</p>
                ) : (
                  logs.map((log, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-2xl bg-[#0b1437] border border-[#1b254b] text-xs font-mono transition-all hover:border-[#7551ff]/30"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={cn(
                            "font-bold text-[10px] uppercase tracking-wider",
                            AGENT_COLORS[log.agent] || "text-[#7551ff]"
                          )}
                        >
                          [{log.agent}]
                        </span>
                        <span className="text-[10px] text-[#a3aed0]">{formatTime(log.time)}</span>
                      </div>
                      <p className="text-[#a3aed0] leading-relaxed break-words">{log.message}</p>
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
