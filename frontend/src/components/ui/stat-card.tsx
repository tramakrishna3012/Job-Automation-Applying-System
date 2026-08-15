"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  suffix?: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  iconColor?: string;
  iconBg?: string;
  loading?: boolean;
  delay?: number;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  suffix = "",
  change,
  changeType = "positive",
  iconColor = "text-indigo-500 dark:text-indigo-400",
  iconBg = "bg-indigo-500/10 border-indigo-500/20",
  loading = false,
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="p-5 rounded-[20px] bg-white/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl shadow-lg dark:shadow-xl hover:border-indigo-500/40 transition-all group relative overflow-hidden"
    >
      {/* Top Border Shine */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-start justify-between">
        <div
          className={cn(
            "w-12 h-12 rounded-2xl border flex items-center justify-center transition-all group-hover:scale-105 shadow-md",
            iconBg
          )}
        >
          <Icon className={cn("w-6 h-6", iconColor)} />
        </div>

        {change && (
          <span
            className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full border",
              changeType === "positive" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
              changeType === "negative" && "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
              changeType === "neutral" && "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
            )}
          >
            {change}
          </span>
        )}
      </div>

      <div className="mt-4">
        <div className="text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
          {label}
        </div>
        {loading ? (
          <Skeleton className="h-8 w-24 mt-1.5 bg-slate-200 dark:bg-slate-800" />
        ) : (
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1 flex items-baseline gap-1">
            <span>{value}</span>
            {suffix && <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{suffix}</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
}
