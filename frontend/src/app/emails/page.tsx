"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import { api, EmailLog } from "@/lib/api";
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
  Mail,
  Send,
  Inbox,
  Upload,
  Sparkles,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";

function ClassificationBadge({ classification }: { classification?: string }) {
  if (!classification) return <Badge variant="outline">Unclassified</Badge>;

  const config = {
    Interview: { label: "Interview", variant: "success" as const, icon: CheckCircle2 },
    Rejected: { label: "Rejected", variant: "destructive" as const, icon: XCircle },
    Interested: { label: "Interested", variant: "default" as const, icon: Sparkles },
    Pending: { label: "Pending", variant: "outline" as const, icon: Clock },
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
  const [filterClassification, setFilterClassification] = useState<string>("all");
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ["emails", filterDirection, filterClassification],
    queryFn: () =>
      api.emails({
        direction: filterDirection === "all" ? undefined : filterDirection,
        classification: filterClassification === "all" ? undefined : filterClassification,
      }),
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
      setUploadMessage(`Successfully loaded ${res.count} HR contacts for cold outreach.`);
      queryClient.invalidateQueries({ queryKey: ["emails"] });
    } catch (err: unknown) {
      setUploadMessage("Failed to upload HR contact list.");
    } finally {
      setUploading(false);
    }
  };

  const outboundCount = emails.filter((e) => e.direction === "outbound").length;
  const inboundCount = emails.filter((e) => e.direction === "inbound").length;
  const interviewCount = emails.filter((e) => e.classification === "Interview").length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Emails & Outreach Campaign</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Automated cold email outreach and AI-classified inbound reply tracker
          </p>
        </div>

        {/* Upload HR Contacts Button */}
        <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-sky-500/20 cursor-pointer w-fit">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Upload HR Contacts (.csv / .xlsx)
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
        <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4" />
          {uploadMessage}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
              <Send className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{outboundCount}</div>
              <div className="text-[10px] text-slate-500">Outbound Cold Emails</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Inbox className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{inboundCount}</div>
              <div className="text-[10px] text-slate-500">Inbound Classified Replies</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{interviewCount}</div>
              <div className="text-[10px] text-slate-500">Interview Invites</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader className="pb-3 border-b border-white/[0.06]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="w-4 h-4 text-sky-400" />
              Campaign Email Log
            </CardTitle>

            <div className="flex flex-wrap items-center gap-2">
              {/* Direction Filter */}
              <div className="flex bg-white/[0.04] p-1 rounded-lg border border-white/[0.06]">
                {(["all", "outbound", "inbound"] as const).map((dir) => (
                  <button
                    key={dir}
                    onClick={() => setFilterDirection(dir)}
                    className={cn(
                      "px-3 py-1 text-xs rounded-md font-medium transition-colors capitalize cursor-pointer",
                      filterDirection === dir ? "bg-sky-500/20 text-sky-400 font-semibold" : "text-slate-400 hover:text-white"
                    )}
                  >
                    {dir}
                  </button>
                ))}
              </div>

              {/* Intent Filter */}
              <select
                value={filterClassification}
                onChange={(e) => setFilterClassification(e.target.value)}
                className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1 text-xs text-slate-300 focus:outline-none focus:border-sky-500/50 cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-white">All Intent Classifications</option>
                <option value="Interview" className="bg-slate-900 text-white">Interview</option>
                <option value="Interested" className="bg-slate-900 text-white">Interested</option>
                <option value="Pending" className="bg-slate-900 text-white">Pending</option>
                <option value="Rejected" className="bg-slate-900 text-white">Rejected</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              <Mail className="w-10 h-10 mx-auto mb-2 opacity-40 stroke-[1.5]" />
              <p>No emails logged yet.</p>
              <p className="text-xs text-slate-600 mt-1">Upload an HR list or run a pipeline cycle to start campaign activity.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="pb-3 pl-2">Direction</th>
                    <th className="pb-3">Recipient / Sender</th>
                    <th className="pb-3">Company</th>
                    <th className="pb-3">Subject</th>
                    <th className="pb-3">Intent</th>
                    <th className="pb-3">Timestamp</th>
                    <th className="pb-3 pr-2 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {emails.map((email) => (
                    <motion.tr
                      key={email.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 pl-2">
                        <Badge
                          variant={email.direction === "outbound" ? "default" : "purple"}
                          className="text-[9px]"
                        >
                          {email.direction === "outbound" ? "Sent" : "Received"}
                        </Badge>
                      </td>
                      <td className="py-3 text-slate-200 font-medium">
                        {email.recipient_name || email.recipient_email || "Contact"}
                      </td>
                      <td className="py-3 text-slate-300">{email.company || "N/A"}</td>
                      <td className="py-3 text-slate-400 truncate max-w-[200px]">{email.subject || "No Subject"}</td>
                      <td className="py-3">
                        <ClassificationBadge classification={email.classification} />
                      </td>
                      <td className="py-3 text-slate-500 font-mono text-[10px]">
                        {formatDate(email.timestamp)} {formatTime(email.timestamp)}
                      </td>
                      <td className="py-3 pr-2 text-right">
                        <button
                          onClick={() => setSelectedEmail(email)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Body Detail Modal */}
      <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-sky-400" />
              {selectedEmail?.subject || "Email Details"}
            </DialogTitle>
            <DialogDescription>
              {selectedEmail?.direction === "outbound" ? "Sent to" : "Received from"}{" "}
              <span className="text-white font-medium">{selectedEmail?.recipient_name || selectedEmail?.recipient_email}</span> at{" "}
              <span className="text-sky-400 font-medium">{selectedEmail?.company}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="flex items-center justify-between text-xs border-b border-white/[0.06] pb-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Classification:</span>
                <ClassificationBadge classification={selectedEmail?.classification} />
              </div>
              <span className="text-slate-500 font-mono text-[11px]">{selectedEmail?.timestamp}</span>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-mono">
              {selectedEmail?.body || "No body content available."}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
