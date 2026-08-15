"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn, formatDate, formatTime } from "@/lib/utils";
import {
  Share2,
  Code2,
  Globe,
  Sparkles,
  Calendar,
  Eye,
  Plus,
  Loader2,
  MessageSquare,
  Repeat2,
  Send,
  ThumbsUp,
  Copy,
  Check,
  Zap,
} from "lucide-react";

// Platform Icon aliases
const LinkedinIcon = Globe;
const GithubIcon = Code2;

export default function BrandingPage() {
  const queryClient = useQueryClient();
  const { user } = useAppStore();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: logs, isLoading } = useQuery({
    queryKey: ["logs"],
    queryFn: api.logs,
  });

  const generateMutation = useMutation({
    mutationFn: () => api.generateBrandingPost("linkedin"),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      const content = data?.post_content || data?.post;
      if (content) {
        setPreviewContent(content);
        setPreviewOpen(true);
      }
    },
  });

  // Filter branding-related logs
  const brandingLogs = logs?.filter(
    (log) =>
      log.agent === "Visibility" ||
      log.message.toLowerCase().includes("linkedin") ||
      log.message.toLowerCase().includes("github") ||
      log.message.toLowerCase().includes("branding")
  ) || [];

  const openPreview = (content: string) => {
    setPreviewContent(content);
    setPreviewOpen(true);
    setCopied(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(previewContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-[24px] bg-white/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-2xl shadow-lg dark:shadow-2xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            AI Visibility & Personal Branding
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Social Branding & Growth Studio
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automated LinkedIn technical thought leadership posts and GitHub activity streak management
          </p>
        </div>

        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="stellar-gradient-btn flex items-center gap-2 px-5 py-2.5 text-xs font-bold transition-all cursor-pointer shrink-0 disabled:opacity-50 shadow-lg shadow-indigo-500/20"
        >
          {generateMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {generateMutation.isPending ? "Generating..." : "Generate AI Post"}
        </button>
      </div>

      {/* 3 KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          icon={LinkedinIcon}
          label="LinkedIn Posts"
          value={brandingLogs.filter((l) => l.message.toLowerCase().includes("linkedin")).length}
          iconColor="text-sky-600 dark:text-sky-400"
          iconBg="bg-sky-500/10 border-sky-500/20"
          change="AI Drafted"
          delay={0}
        />
        <StatCard
          icon={GithubIcon}
          label="GitHub Streak Entries"
          value={brandingLogs.filter((l) => l.message.toLowerCase().includes("github")).length}
          iconColor="text-purple-600 dark:text-purple-400"
          iconBg="bg-purple-500/10 border-purple-500/20"
          change="Daily Pulse"
          delay={0.08}
        />
        <StatCard
          icon={Calendar}
          label="Total Activity Logs"
          value={brandingLogs.length}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-500/10 border-emerald-500/20"
          change="Visibility Agent"
          delay={0.16}
        />
      </div>

      {/* Activity Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            Branding Activity Timeline
          </CardTitle>
          <CardDescription>Generated technical articles, engineering milestones, and social broadcasts</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-4 p-3 rounded-xl bg-slate-100 dark:bg-slate-950/40">
                  <Skeleton className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3 bg-slate-200 dark:bg-slate-800" />
                    <Skeleton className="h-3 w-full bg-slate-200 dark:bg-slate-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : !brandingLogs.length ? (
            <EmptyState
              icon={Share2}
              title="No branding activities recorded"
              description="Click 'Generate AI Post' above to create an automated technical LinkedIn post based on your candidate profile."
            />
          ) : (
            <div className="space-y-3">
              {brandingLogs.map((log, idx) => {
                const isLinkedIn = log.message.toLowerCase().includes("linkedin");
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: idx * 0.04 }}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700/80 transition-all flex items-start gap-4"
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-sm",
                        isLinkedIn
                          ? "bg-sky-500/10 border-sky-500/25 text-sky-600 dark:text-sky-400"
                          : "bg-purple-500/10 border-purple-500/25 text-purple-600 dark:text-purple-400"
                      )}
                    >
                      {isLinkedIn ? <LinkedinIcon className="w-4 h-4" /> : <GithubIcon className="w-4 h-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Badge variant={isLinkedIn ? "default" : "purple"} className="text-[9px]">
                          {isLinkedIn ? "LinkedIn Post" : "GitHub Streak"}
                        </Badge>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          {formatDate(log.time)} {formatTime(log.time)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-3">{log.message}</p>
                    </div>

                    <button
                      onClick={() => openPreview(log.message)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                      title="View Post Mockup"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* LinkedIn Post Mockup Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-[24px] p-6 sm:p-7 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <LinkedinIcon className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                LinkedIn Feed Preview
              </DialogTitle>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer border border-slate-200 dark:border-slate-700/60"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied!" : "Copy Post"}</span>
              </button>
            </div>
          </DialogHeader>

          {/* High-Fidelity LinkedIn Card Mockup */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 mt-2 space-y-4">
            {/* User Info Header */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">{user?.name || "Senior Full-Stack AI Engineer"}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Autonomous AI & Systems Architect &bull; 1st</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">Just now &bull; 🌐</p>
              </div>
            </div>

            {/* Post Body Content */}
            <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
              {previewContent || "Post content will appear here..."}
            </div>

            {/* Engagement Action Bar */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
              <button className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
                <ThumbsUp className="w-3.5 h-3.5" /> Like
              </button>
              <button className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
                <MessageSquare className="w-3.5 h-3.5" /> Comment
              </button>
              <button className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
                <Repeat2 className="w-3.5 h-3.5" /> Repost
              </button>
              <button className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
                <Send className="w-3.5 h-3.5" /> Send
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
