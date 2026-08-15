"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { api, type EmailLog, type HRContact } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn, formatDate, formatTime } from "@/lib/utils";
import {
  Mail,
  Send,
  Inbox,
  UploadCloud,
  Sparkles,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  FileSpreadsheet,
  Loader2,
  UserCheck,
  Building,
  Calendar,
  X,
} from "lucide-react";

function ClassificationBadge({ classification }: { classification?: string }) {
  if (!classification) {
    return <Badge variant="outline" className="text-[10px]">Unclassified</Badge>;
  }

  const config = {
    Interview: { label: "Interview Scheduled", variant: "success" as const, icon: CheckCircle2 },
    Rejected: { label: "Passed", variant: "destructive" as const, icon: XCircle },
    Interested: { label: "Interested / Follow-up", variant: "purple" as const, icon: Sparkles },
    Pending: { label: "Pending Response", variant: "warning" as const, icon: Clock },
  }[classification] || { label: classification, variant: "outline" as const, icon: MessageSquare };

  return (
    <Badge variant={config.variant} className="text-[10px] gap-1">
      <config.icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

export default function EmailsPage() {
  const queryClient = useQueryClient();
  const [filterDirection, setFilterDirection] = useState<"all" | "outbound" | "inbound">("all");
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const { data: emails = [], isLoading: emailsLoading } = useQuery({
    queryKey: ["emails", filterDirection],
    queryFn: () =>
      api.emails({
        direction: filterDirection === "all" ? undefined : filterDirection,
      }),
  });

  const { data: hrContacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ["hrContacts"],
    queryFn: api.getHrContacts,
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadMessage(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.uploadHrContacts(formData);
      setUploadMessage(`Loaded ${res.count} HR recruiter contacts for position-tailored cold outreach.`);
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      queryClient.invalidateQueries({ queryKey: ["hrContacts"] });
    } catch (err: any) {
      setUploadMessage(err?.message || "Failed to upload HR contact list.");
    } finally {
      setUploading(false);
    }
  };

  const outboundCount = emails.filter((e) => e.direction === "outbound").length;
  const inboundCount = emails.filter((e) => e.direction === "inbound").length;
  const interviewCount = emails.filter((e) => e.classification === "Interview").length;

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-[24px] bg-white/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-2xl shadow-lg dark:shadow-2xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-2">
            <Send className="w-3.5 h-3.5" />
            Autonomous Outreach Engine
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Cold Outreach & Email Tracker
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automated contact ingestion, position-tailored cold emails, and AI response classification
          </p>
        </div>

        {/* Upload HR Contacts Button */}
        <label className="stellar-gradient-btn flex items-center gap-2 px-5 py-2.5 text-xs font-bold transition-all cursor-pointer shrink-0 shadow-lg shadow-indigo-500/20 w-fit">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
          <span>Upload Contacts (.csv / .xlsx)</span>
          <input
            type="file"
            accept=".csv, .xlsx"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {uploadMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
          <FileSpreadsheet className="w-4 h-4 shrink-0" />
          <span>{uploadMessage}</span>
        </div>
      )}

      {/* 3 KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          icon={Send}
          label="Outbound Sent & Drafts"
          value={outboundCount}
          iconColor="text-cyan-600 dark:text-cyan-400"
          iconBg="bg-cyan-500/10 border-cyan-500/20"
          change="AI Drafted"
          delay={0}
        />
        <StatCard
          icon={Inbox}
          label="Inbound HR Replies"
          value={inboundCount}
          iconColor="text-indigo-600 dark:text-indigo-400"
          iconBg="bg-indigo-500/10 border-indigo-500/20"
          change="Real-time"
          delay={0.08}
        />
        <StatCard
          icon={CheckCircle2}
          label="Interviews Scheduled"
          value={interviewCount}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-500/10 border-emerald-500/20"
          change="High Intent"
          delay={0.16}
        />
      </div>

      {/* Ingested HR Contacts Campaign Table */}
      {hrContacts.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Ingested Recruiter & HR Contacts ({hrContacts.length})
              </CardTitle>
              <CardDescription>Target position list & automated outreach campaign statuses</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-3 pr-4 pl-1">Contact Name</th>
                    <th className="pb-3 pr-4">Email</th>
                    <th className="pb-3 pr-4">Company</th>
                    <th className="pb-3 pr-4">Target Position</th>
                    <th className="pb-3 text-right pr-1">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {hrContacts.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 pr-4 pl-1 font-bold text-slate-900 dark:text-white">{c.contact_name}</td>
                      <td className="py-3.5 pr-4 text-slate-500 dark:text-slate-400 font-mono">{c.email}</td>
                      <td className="py-3.5 pr-4 text-slate-700 dark:text-slate-300">{c.company}</td>
                      <td className="py-3.5 pr-4 text-indigo-600 dark:text-indigo-400 font-medium">{c.position || "Hiring Manager"}</td>
                      <td className="py-3.5 text-right pr-1">
                        <Badge variant="success" className="text-[10px]">
                          {c.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Campaign Email Logs Card */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Campaign Email Logs
            </CardTitle>
            <CardDescription>Position-tailored cold outreach history and sentiment tracking</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterDirection}
              onChange={(e) => setFilterDirection(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500/50"
            >
              <option value="all">All Directions</option>
              <option value="outbound">Outbound Only</option>
              <option value="inbound">Inbound Only</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {emailsLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-slate-100 dark:bg-slate-950/40">
                  <Skeleton className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-800" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-1/3 bg-slate-200 dark:bg-slate-800" />
                    <Skeleton className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : !emails.length ? (
            <EmptyState
              icon={Mail}
              title="No email logs found"
              description="Upload an HR contact spreadsheet above or trigger a test run to populate automated cold outreach logs."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-3 pr-4 pl-1">Recipient / Sender</th>
                    <th className="pb-3 pr-4">Company</th>
                    <th className="pb-3 pr-4">Subject</th>
                    <th className="pb-3 pr-4">AI Sentiment</th>
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 text-right pr-1">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {emails.map((email) => (
                    <tr key={email.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 pr-4 pl-1 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "w-2 h-2 rounded-full",
                              email.direction === "outbound" ? "bg-cyan-500 dark:bg-cyan-400" : "bg-indigo-500 dark:bg-indigo-400"
                            )}
                          />
                          {email.recipient_name || email.recipient_email || "HR Manager"}
                        </div>
                      </td>
                      <td className="py-3.5 pr-4 text-slate-700 dark:text-slate-300">{email.company || "Company"}</td>
                      <td className="py-3.5 pr-4 text-slate-900 dark:text-white font-medium max-w-xs truncate">{email.subject}</td>
                      <td className="py-3.5 pr-4">
                        <ClassificationBadge classification={email.classification} />
                      </td>
                      <td className="py-3.5 pr-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        {formatDate(email.timestamp)}
                      </td>
                      <td className="py-3.5 text-right pr-1">
                        <button
                          onClick={() => setSelectedEmail(email)}
                          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="View Email Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Email Dialog */}
      <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
        <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-[24px] p-6 sm:p-7 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span className="truncate">{selectedEmail?.subject}</span>
            </DialogTitle>
          </DialogHeader>

          {selectedEmail && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Target Contact:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedEmail.recipient_name || selectedEmail.recipient_email}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Company:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedEmail.company || "N/A"}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 font-mono text-xs leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                {selectedEmail.body}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
