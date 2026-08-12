"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import { api, EmailLog, HRContact } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  UserCheck,
} from "lucide-react";

function ClassificationBadge({ classification }: { classification?: string }) {
  if (!classification) return <Badge variant="outline" className="text-[9px] bg-[#1b254b] text-[#a3aed0] border-[#1b254b]">Unclassified</Badge>;

  const config = {
    Interview: { label: "Interview", variant: "success" as const, icon: CheckCircle2 },
    Rejected: { label: "Rejected", variant: "destructive" as const, icon: XCircle },
    Interested: { label: "Interested", variant: "default" as const, icon: Sparkles },
    Pending: { label: "Pending", variant: "outline" as const, icon: Clock },
  }[classification] || { label: classification, variant: "outline" as const, icon: MessageSquare };

  return (
    <Badge variant={config.variant} className="text-[9px] gap-1">
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

  const { data: emails = [], isLoading: emailsLoading } = useQuery({
    queryKey: ["emails", filterDirection, filterClassification],
    queryFn: () =>
      api.emails({
        direction: filterDirection === "all" ? undefined : filterDirection,
        classification: filterClassification === "all" ? undefined : filterClassification,
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
      setUploadMessage(`Successfully loaded ${res.count} HR contacts for position outreach.`);
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
      {/* Horizon Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Emails & Cold Outreach Hub</h2>
          <p className="text-xs text-[#a3aed0] mt-0.5">
            Automated contact ingestion, position-tailored cold emails, and AI response tracking
          </p>
        </div>

        {/* Upload HR Contacts Button */}
        <label className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#868CFF] to-[#4318FF] text-white font-bold text-xs shadow-lg shadow-[#4318FF]/30 hover:shadow-[#4318FF]/50 transition-all cursor-pointer w-fit">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Upload Contact List (.csv / .xlsx)
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
        <div className="p-3.5 rounded-2xl bg-[#01b574]/15 border border-[#01b574]/30 text-[#01b574] text-xs flex items-center gap-2 animate-in fade-in">
          <FileSpreadsheet className="w-4 h-4 shrink-0" />
          <span>{uploadMessage}</span>
        </div>
      )}

      {/* Horizon Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 rounded-[20px] bg-[#111c44] border border-[#1b254b] shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#1b254b] text-[#00f2fe] flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-white">{outboundCount}</div>
              <div className="text-[10px] font-bold text-[#a3aed0] uppercase tracking-wider">Outbound Drafts & Sent</div>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-[20px] bg-[#111c44] border border-[#1b254b] shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#1b254b] text-[#7551ff] flex items-center justify-center">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-white">{inboundCount}</div>
              <div className="text-[10px] font-bold text-[#a3aed0] uppercase tracking-wider">Inbound Replies</div>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-[20px] bg-[#111c44] border border-[#1b254b] shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#1b254b] text-[#01b574] flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-white">{interviewCount}</div>
              <div className="text-[10px] font-bold text-[#a3aed0] uppercase tracking-wider">Interviews Scheduled</div>
            </div>
          </div>
        </div>
      </div>

      {/* HR Ingested Contacts Campaign Table */}
      {hrContacts.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#7551ff]" />
                Ingested Outreach Contacts ({hrContacts.length})
              </CardTitle>
              <CardDescription>Target position list & tailored email statuses</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1b254b] text-[#a3aed0] font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-3 pr-4">Contact</th>
                    <th className="pb-3 pr-4">Email</th>
                    <th className="pb-3 pr-4">Company</th>
                    <th className="pb-3 pr-4">Target Position</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1b254b]/50">
                  {hrContacts.map((c) => (
                    <tr key={c.id} className="hover:bg-[#1b254b]/30 transition-colors">
                      <td className="py-3 pr-4 font-bold text-white">{c.contact_name}</td>
                      <td className="py-3 pr-4 text-[#a3aed0] font-mono">{c.email}</td>
                      <td className="py-3 pr-4 text-[#a3aed0]">{c.company}</td>
                      <td className="py-3 pr-4 text-white font-medium">{c.position || "Hiring Manager"}</td>
                      <td className="py-3 text-right">
                        <Badge variant="outline" className="text-[10px] bg-[#1b254b] text-[#01b574] border-[#1b254b]">
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

      {/* Main Email Logs Card */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Mail className="w-4 h-4 text-[#7551ff]" />
              Campaign Email Logs
            </CardTitle>
            <CardDescription>Filter outbound cold emails and inbound HR replies</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterDirection}
              onChange={(e) => setFilterDirection(e.target.value as any)}
              className="bg-[#0b1437] border border-[#1b254b] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
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
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full bg-[#1b254b]" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3.5 w-1/3 bg-[#1b254b]" />
                    <Skeleton className="h-3 w-1/2 bg-[#1b254b]" />
                  </div>
                </div>
              ))}
            </div>
          ) : !emails.length ? (
            <div className="text-center py-14 text-[#a3aed0]">
              <Mail className="w-12 h-12 mx-auto mb-3 opacity-30 stroke-[1.5]" />
              <p className="text-sm font-semibold text-white">No email logs found</p>
              <p className="text-xs mt-1">Upload an HR contact list above to initiate tailored position outreach.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1b254b] text-[#a3aed0] font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-3 pr-4 pl-2">Recipient / Sender</th>
                    <th className="pb-3 pr-4">Company</th>
                    <th className="pb-3 pr-4">Subject</th>
                    <th className="pb-3 pr-4">Classification</th>
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 text-right pr-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1b254b]/50">
                  {emails.map((email) => (
                    <tr key={email.id} className="hover:bg-[#1b254b]/30 transition-colors">
                      <td className="py-3.5 pr-4 pl-2 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "w-2 h-2 rounded-full",
                              email.direction === "outbound" ? "bg-[#00f2fe]" : "bg-[#7551ff]"
                            )}
                          />
                          {email.recipient_name || email.recipient_email || "HR Manager"}
                        </div>
                      </td>
                      <td className="py-3.5 pr-4 text-[#a3aed0]">{email.company || "Company"}</td>
                      <td className="py-3.5 pr-4 text-white font-medium max-w-xs truncate">{email.subject}</td>
                      <td className="py-3.5 pr-4">
                        <ClassificationBadge classification={email.classification} />
                      </td>
                      <td className="py-3.5 pr-4 text-[#a3aed0] font-mono text-[11px]">
                        {formatDate(email.timestamp)}
                      </td>
                      <td className="py-3.5 text-right pr-2">
                        <button
                          onClick={() => setSelectedEmail(email)}
                          className="p-1.5 rounded-xl text-[#a3aed0] hover:text-white hover:bg-[#1b254b] transition-colors cursor-pointer"
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
        <DialogContent className="bg-[#111c44] border border-[#1b254b] text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center justify-between">
              <span>{selectedEmail?.subject}</span>
            </DialogTitle>
          </DialogHeader>

          {selectedEmail && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4 p-3 rounded-2xl bg-[#0b1437] border border-[#1b254b] text-xs">
                <div>
                  <span className="text-[#a3aed0] block">Target Contact:</span>
                  <span className="font-bold text-white">{selectedEmail.recipient_name || selectedEmail.recipient_email}</span>
                </div>
                <div>
                  <span className="text-[#a3aed0] block">Company:</span>
                  <span className="font-bold text-white">{selectedEmail.company || "N/A"}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#0b1437] border border-[#1b254b] font-mono text-xs leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap">
                {selectedEmail.body}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
