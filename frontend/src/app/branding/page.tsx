"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Heart,
  Repeat2,
  Send,
  ThumbsUp,
} from "lucide-react";

// Icon aliases for platform branding
const LinkedinIcon = Globe;
const GithubIcon = Code2;

export default function BrandingPage() {
  const queryClient = useQueryClient();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState("");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["logs"],
    queryFn: api.logs,
  });

  const generateMutation = useMutation({
    mutationFn: () => api.generateBrandingPost("linkedin"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logs"] });
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
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Social Branding Hub</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            AI-generated LinkedIn posts and GitHub streak management
          </p>
        </div>
        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-sky-500/20 disabled:opacity-50 cursor-pointer"
        >
          {generateMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Generate Post
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
              <LinkedinIcon className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{brandingLogs.filter((l) => l.message.toLowerCase().includes("linkedin")).length}</div>
              <div className="text-[10px] text-slate-500">LinkedIn Posts</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <GithubIcon className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{brandingLogs.filter((l) => l.message.toLowerCase().includes("github")).length}</div>
              <div className="text-[10px] text-slate-500">GitHub Entries</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{brandingLogs.length}</div>
              <div className="text-[10px] text-slate-500">Total Activities</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-purple-400" />
            Branding Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-[60%]" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : !brandingLogs.length ? (
            <div className="text-center py-12 text-slate-600 text-sm">
              <Share2 className="w-10 h-10 mx-auto mb-2 stroke-[1.5]" />
              <p>No branding activities yet</p>
              <p className="text-xs mt-1">Click "Generate Post" or run a test to create AI-generated content</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-px bg-white/[0.06]" />

              <div className="space-y-4">
                {brandingLogs.map((log, idx) => {
                  const isLinkedIn = log.message.toLowerCase().includes("linkedin");
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.05 }}
                      className="flex gap-4 relative"
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 z-10",
                          isLinkedIn
                            ? "bg-sky-500/10 border-sky-500/20"
                            : "bg-purple-500/10 border-purple-500/20"
                        )}
                      >
                        {isLinkedIn ? (
                          <LinkedinIcon className="w-4 h-4 text-sky-400" />
                        ) : (
                          <GithubIcon className="w-4 h-4 text-purple-400" />
                        )}
                      </div>

                      <div className="flex-1 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={isLinkedIn ? "default" : "purple"} className="text-[9px]">
                                {isLinkedIn ? "LinkedIn" : "GitHub"}
                              </Badge>
                              <span className="text-[10px] text-slate-600 font-mono">{formatDate(log.time)} {formatTime(log.time)}</span>
                            </div>
                            <p className="text-xs text-slate-300">{log.message}</p>
                          </div>
                          <button
                            onClick={() => openPreview(log.message)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 transition-colors cursor-pointer shrink-0"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* LinkedIn Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinkedinIcon className="w-4 h-4 text-sky-400" />
              LinkedIn Feed Preview
            </DialogTitle>
            <DialogDescription>How this post will appear on your LinkedIn feed</DialogDescription>
          </DialogHeader>

          {/* Mock LinkedIn Card */}
          <div className="linkedin-card p-4 mt-2">
            {/* User Info */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">AM</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Alex Mercer</p>
                <p className="text-[10px] text-slate-500">Senior Full-Stack AI Engineer | 1st</p>
                <p className="text-[10px] text-slate-600">Just now • <span className="text-slate-500">🌐</span></p>
              </div>
            </div>

            {/* Post Content */}
            <div className="text-sm text-slate-300 leading-relaxed mb-4 whitespace-pre-wrap">
              {previewContent || "Preview content will appear here..."}
            </div>

            {/* Engagement Bar */}
            <div className="border-t border-white/[0.06] pt-2 flex items-center justify-between text-slate-500">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/[0.04] text-xs transition-colors cursor-pointer">
                <ThumbsUp className="w-4 h-4" /> Like
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/[0.04] text-xs transition-colors cursor-pointer">
                <MessageSquare className="w-4 h-4" /> Comment
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/[0.04] text-xs transition-colors cursor-pointer">
                <Repeat2 className="w-4 h-4" /> Repost
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/[0.04] text-xs transition-colors cursor-pointer">
                <Send className="w-4 h-4" /> Send
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
