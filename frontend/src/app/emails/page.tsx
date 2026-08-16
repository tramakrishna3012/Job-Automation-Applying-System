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
  Copy,
  Check,
  AlertCircle,
  Play,
  Briefcase
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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [sendingContactId, setSendingContactId] = useState<string | null>(null);
  const [sendingAll, setSendingAll] = useState(false);
  const [copied, setCopied] = useState(false);

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
    setUploadError(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.uploadHrContacts(formData);
      setUploadMessage(`Successfully ingested ${res.count} contact(s) from "${file.name}". All contact names, emails, companies, and roles are extracted.`);
      await queryClient.invalidateQueries({ queryKey: ["emails"] });
      await queryClient.invalidateQueries({ queryKey: ["hrContacts"] });
    } catch (err: any) {
      setUploadError(err?.message || "Failed to upload and parse HR contact spreadsheet.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSendSingle = async (contact: HRContact) => {
    if (!contact.email) return;
    setSendingContactId(contact.id);
    try {
      await api.sendHrEmail(contact.id);
      await queryClient.invalidateQueries({ queryKey: ["emails"] });
      await queryClient.invalidateQueries({ queryKey: ["hrContacts"] });
      setUploadMessage(`Cold outreach email dispatched / drafted for ${contact.contact_name} (${contact.email}).`);
    } catch (err: any) {
      setUploadError(err?.message || `Failed to send email to ${contact.email}`);
    } finally {
      setSendingContactId(null);
    }
  };

  const handleSendAll = async () => {
    setSendingAll(true);
    setUploadMessage(null);
    setUploadError(null);
    try {
      const res = await api.sendAllHrEmails();
      await queryClient.invalidateQueries({ queryKey: ["emails"] });
      await queryClient.invalidateQueries({ queryKey: ["hrContacts"] });
      setUploadMessage(`Dispatched tailored cold emails to ${res.count} contact(s).`);
    } catch (err: any) {
      setUploadError(err?.message || "Failed to dispatch emails to all contacts.");
    } finally {
      setSendingAll(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            accept=".csv,.xlsx,.xls"
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

      {uploadError && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
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
            <button
              onClick={handleSendAll}
              disabled={sendingAll || !hrContacts.some((c) => c.email)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {sendingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>Send Outreach to All</span>
            </button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-3 pr-4 pl-1">Contact Name</th>
                    <th className="pb-3 pr-4">Email Address</th>
                    <th className="pb-3 pr-4">Company</th>
                    <th className="pb-3 pr-4">Target Position</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 text-right pr-1">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {hrContacts.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 pr-4 pl-1 font-bold text-slate-900 dark:text-white">{c.contact_name}</td>
                      <td className="py-3.5 pr-4">
                        {c.email ? (
                          <div className="flex items-center gap-1.5 font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                            <Mail className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            <span>{c.email}</span>
                          </div>
                        ) : (
                          <span className="text-amber-500 dark:text-amber-400 italic text-[11px]">No email specified</span>
                        )}
                      </td>
                      <td className="py-3.5 pr-4 text-slate-700 dark:text-slate-300 font-medium">{c.company}</td>
                      <td className="py-3.5 pr-4 text-slate-600 dark:text-slate-400 font-medium">{c.position || "Hiring Manager"}</td>
                      <td className="py-3.5 pr-4">
                        <Badge
                          variant={c.status === "sent" ? "success" : c.status === "draft" ? "purple" : "outline"}
                          className="text-[10px] capitalize"
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 text-right pr-1">
                        <button
                          onClick={() => handleSendSingle(c)}
                          disabled={!c.email || sendingContactId === c.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 ml-auto cursor-pointer disabled:opacity-40"
                          title="Generate and Send Cold Email"
                        >
                          {sendingContactId === c.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span>Send Email</span>
                        </button>
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
              Campaign Email Logs ({emails.length})
            </CardTitle>
            <CardDescription>Position-tailored cold outreach history, email deliveries, and sentiment tracking</CardDescription>
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
                    <th className="pb-3 pr-4 pl-1">Recipient & Email</th>
                    <th className="pb-3 pr-4">Company</th>
                    <th className="pb-3 pr-4">Subject</th>
                    <th className="pb-3 pr-4">Delivery Status</th>
                    <th className="pb-3 pr-4">AI Sentiment</th>
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 text-right pr-1">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {emails.map((email) => (
                    <tr key={email.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 pr-4 pl-1 font-bold text-slate-900 dark:text-white">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "w-2 h-2 rounded-full shrink-0",
                                email.direction === "outbound" ? "bg-cyan-500 dark:bg-cyan-400" : "bg-indigo-500 dark:bg-indigo-400"
                              )}
                            />
                            <span>{email.recipient_name || "HR Manager"}</span>
                          </div>
                          {email.recipient_email && (
                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 pl-4 font-normal">
                              {email.recipient_email}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 pr-4 text-slate-700 dark:text-slate-300">{email.company || "Company"}</td>
                      <td className="py-3.5 pr-4 text-slate-900 dark:text-white font-medium max-w-xs truncate">{email.subject}</td>
                      <td className="py-3.5 pr-4">
                        <Badge
                          variant={email.status === "sent" ? "success" : email.status === "draft" ? "purple" : "outline"}
                          className="text-[10px] capitalize"
                        >
                          {email.status}
                        </Badge>
                      </td>
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Target Contact:</span>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    {selectedEmail.recipient_name || "HR Manager"}
                  </span>
                  {selectedEmail.recipient_email && (
                    <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                      {selectedEmail.recipient_email}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Company:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedEmail.company || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Status:</span>
                  <Badge
                    variant={selectedEmail.status === "sent" ? "success" : selectedEmail.status === "draft" ? "purple" : "outline"}
                    className="text-[10px] capitalize"
                  >
                    {selectedEmail.status}
                  </Badge>
                </div>
              </div>

              <div className="relative">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 font-mono text-xs leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                  {selectedEmail.body}
                </div>
                <button
                  onClick={() => copyToClipboard(selectedEmail.body || "")}
                  className="absolute top-3 right-3 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy Body"}</span>
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
