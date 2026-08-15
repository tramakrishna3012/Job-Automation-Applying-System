"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef } from "react";
import { api, type UserProfile } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import {
  FileText,
  Briefcase,
  Sparkles,
  Eye,
  RefreshCw,
  ChevronRight,
  UploadCloud,
  CheckCircle2,
  Printer,
  Layers,
  Wand2,
  AlertCircle,
  X,
  User,
  Plus,
  Cpu,
} from "lucide-react";

const TEMPLATES = [
  { id: "executive", name: "Executive Modern", description: "Deep navy accents with structured dividers" },
  { id: "harvard", name: "Classic Harvard", description: "Traditional serif typography with top rule header" },
  { id: "tech", name: "Tech / Modern", description: "Indigo pill badges & monospace metadata" },
  { id: "minimal", name: "Clean ATS Minimal", description: "Crisp grayscale optimized for automated ATS parsers" },
];

export default function ResumeStudioPage() {
  const queryClient = useQueryClient();
  const { user } = useAppStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [selectedTemplate, setSelectedTemplate] = useState("executive");
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Custom Job input state
  const [customJobTitle, setCustomJobTitle] = useState("");
  const [customCompany, setCustomCompany] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [activeTab, setActiveTab] = useState<"pipeline" | "custom">("pipeline");

  // Tailored state
  const [tailoredHtml, setTailoredHtml] = useState<string | null>(null);
  const [tailoredResult, setTailoredResult] = useState<any>(null);
  const [isTailoring, setIsTailoring] = useState(false);
  const [viewMode, setViewMode] = useState<"master" | "tailored">("master");

  // Fetch candidate profile & master preview
  const { data: resumeData, isLoading: resumeLoading } = useQuery({
    queryKey: ["resumePreview", selectedTemplate],
    queryFn: () => api.getResumePreview(selectedTemplate),
  });

  const { data: applications, isLoading: appsLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: api.applications,
  });

  const selectedApp = applications?.find((a) => a.id === selectedAppId) || applications?.[0];

  // Active target role & description
  const activeTitle = activeTab === "pipeline" ? selectedApp?.role || "Senior Full-Stack AI Engineer" : customJobTitle || "Senior AI Engineer";
  const activeCompany = activeTab === "pipeline" ? selectedApp?.company || "Target Company" : customCompany || "Target Company";
  const activeDescription = activeTab === "pipeline"
    ? "We are looking for a Senior AI Engineer proficient in Python, FastAPI, OpenAI SDK, vector search, and containerized Docker deployments. Experience with PostgreSQL, pgvector, and modern React frontends is highly valued."
    : customDescription || "We are looking for a Senior Software & AI Engineer with strong background in Python, backend APIs, and cloud systems.";

  // Upload mutation
  const handleUploadResume = async () => {
    if (!uploadFile) {
      setUploadError("Please select a PDF resume file.");
      return;
    }
    setUploadLoading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("template_style", selectedTemplate);

    try {
      await api.uploadResume(formData);
      queryClient.invalidateQueries({ queryKey: ["resumePreview"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setUploadModalOpen(false);
      setUploadFile(null);
      setUploadLoading(false);
    } catch (err: any) {
      setUploadLoading(false);
      setUploadError(err?.message || "Failed to upload and parse resume.");
    }
  };

  // Live Tailor Action
  const handleTailor = async () => {
    setIsTailoring(true);
    try {
      const res = await api.tailorResume({
        job_title: activeTitle,
        company: activeCompany,
        description: activeDescription,
        template_style: selectedTemplate,
      });
      setTailoredHtml(res.html);
      setTailoredResult(res);
      setViewMode("tailored");
    } catch (err) {
      console.error(err);
    } finally {
      setIsTailoring(false);
    }
  };

  // Print function
  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.print();
    }
  };

  const currentHtml = viewMode === "tailored" && tailoredHtml ? tailoredHtml : resumeData?.html || "";

  // Skill analysis
  const profileSkills = resumeData?.profile?.skills || ["Python", "FastAPI", "React", "PostgreSQL", "Docker"];
  const matchedSkills: string[] = tailoredResult?.matched_keywords?.length
    ? tailoredResult.matched_keywords
    : profileSkills.filter((s: string) => activeDescription.toLowerCase().includes(s.toLowerCase()));
  const missingSkills: string[] = tailoredResult?.missing_keywords?.length
    ? tailoredResult.missing_keywords
    : ["Kubernetes", "AWS", "CI/CD"].filter((s: string) => activeDescription.toLowerCase().includes(s.toLowerCase()) && !profileSkills.some((ps: string) => ps.toLowerCase() === s.toLowerCase()));

  const matchPercent = Math.min(100, Math.round(((matchedSkills.length + 1) / (matchedSkills.length + missingSkills.length + 1)) * 100));

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 sm:p-7 rounded-[24px] bg-white/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-2xl shadow-lg dark:shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">AI Resume Architect</h1>
              <Badge variant="success" dot className="text-[10px]">
                Master Active
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Candidate: <span className="text-slate-900 dark:text-white font-bold">{resumeData?.profile?.name || user?.name || "Candidate"}</span> ({resumeData?.profile?.email || user?.email || "candidate@example.com"}) &bull; {profileSkills.length} Skills Extracted
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          {/* Upload Master Resume Button */}
          <button
            onClick={() => setUploadModalOpen(true)}
            className="stellar-gradient-btn flex items-center gap-2 px-5 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-lg shadow-indigo-500/20"
          >
            <UploadCloud className="w-4 h-4" />
            Upload Master Resume (PDF)
          </button>

          {/* Print / Save PDF Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-semibold border border-slate-200 dark:border-slate-700/60 transition-all cursor-pointer shadow-sm"
          >
            <Printer className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Template Switcher Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-1">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-2 flex items-center gap-1.5 shrink-0">
            <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Template:
          </span>
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setSelectedTemplate(t.id);
                setViewMode("master");
              }}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer border",
                selectedTemplate === t.id
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/25"
                  : "bg-white/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              {t.name}
            </button>
          ))}
        </div>

        {/* View Mode Toggle Pill */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-900/80 rounded-full border border-slate-200 dark:border-slate-800 p-1">
          <button
            onClick={() => setViewMode("master")}
            className={cn(
              "px-3.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer",
              viewMode === "master" ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Master Resume
          </button>
          <button
            onClick={() => setViewMode("tailored")}
            className={cn(
              "px-3.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
              viewMode === "tailored" ? "bg-emerald-600 text-white shadow-md" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Sparkles className="w-3 h-3" />
            Tailored For Job
          </button>
        </div>
      </div>

      {/* Split Screen Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Job Targeting & Keyword Analysis */}
        <div className="lg:col-span-5 space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Target Position & Description
                </CardTitle>
                <div className="flex bg-slate-100 dark:bg-slate-950/80 rounded-lg p-0.5 border border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => setActiveTab("pipeline")}
                    className={cn(
                      "px-2.5 py-1 rounded text-[10px] font-bold transition-all",
                      activeTab === "pipeline" ? "bg-indigo-600 text-white" : "text-slate-500 dark:text-slate-400"
                    )}
                  >
                    From Pipeline
                  </button>
                  <button
                    onClick={() => setActiveTab("custom")}
                    className={cn(
                      "px-2.5 py-1 rounded text-[10px] font-bold transition-all",
                      activeTab === "custom" ? "bg-indigo-600 text-white" : "text-slate-500 dark:text-slate-400"
                    )}
                  >
                    Custom JD
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeTab === "pipeline" ? (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                    Choose Queued Application
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                    {appsLoading ? (
                      [...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-28 rounded-xl shrink-0 bg-slate-200 dark:bg-slate-800" />)
                    ) : applications?.length ? (
                      applications.slice(0, 8).map((app) => (
                        <button
                          key={app.id}
                          onClick={() => setSelectedAppId(app.id)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 cursor-pointer border transition-all",
                            (selectedAppId === app.id || (!selectedAppId && selectedApp?.id === app.id))
                              ? "bg-indigo-500/15 text-indigo-700 dark:text-white border-indigo-500/50"
                              : "bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white"
                          )}
                        >
                          <span className="truncate max-w-[120px]">{app.company}</span>
                        </button>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">No applications in pipeline</span>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{activeTitle}</div>
                    <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mb-2">{activeCompany}</div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-4">
                      {activeDescription}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Role (e.g. Senior AI Engineer)"
                      value={customJobTitle}
                      onChange={(e) => setCustomJobTitle(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                    />
                    <input
                      type="text"
                      placeholder="Company Name"
                      value={customCompany}
                      onChange={(e) => setCustomCompany(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Paste target job description here..."
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              )}

              {/* Real-time Keyword & Match Coverage Analysis */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                    AI Skill Match Analysis
                  </span>
                  <Badge variant="success" className="font-bold text-[10px]">
                    {matchPercent}% Match
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {matchedSkills.map((s: string) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold flex items-center gap-1"
                    >
                      ✓ {s}
                    </span>
                  ))}
                  {missingSkills.map((s: string) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-[10px] font-semibold flex items-center gap-1"
                    >
                      + {s}
                    </span>
                  ))}
                </div>

                {/* Live Action Button */}
                <button
                  onClick={handleTailor}
                  disabled={isTailoring}
                  className="stellar-gradient-btn w-full py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isTailoring ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      Tailor Resume for this Job
                    </>
                  )}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (7 cols): High-Fidelity Paper Resume Preview */}
        <div className="lg:col-span-7">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                Document Preview ({viewMode === "tailored" ? "Tailored" : "Master"})
              </CardTitle>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Theme: <span className="text-cyan-600 dark:text-cyan-400 uppercase font-bold">{selectedTemplate}</span>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 bg-slate-100 dark:bg-slate-950/60">
              {resumeLoading ? (
                <div className="flex flex-col items-center justify-center min-h-[600px] gap-3">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">Compiling resume architect document...</p>
                </div>
              ) : (
                <div className="rounded-xl shadow-2xl bg-white overflow-hidden border border-slate-300 min-h-[650px] relative">
                  <iframe
                    ref={iframeRef}
                    srcDoc={currentHtml}
                    title="Resume Preview"
                    className="w-full h-[750px] border-0"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upload Master Resume Modal */}
      <AnimatePresence>
        {uploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg rounded-[24px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Upload Master Resume</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Parse candidate facts & match resume format</p>
                  </div>
                </div>
                <button
                  onClick={() => setUploadModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center hover:border-indigo-500/50 transition-all relative cursor-pointer bg-slate-50 dark:bg-slate-950/60">
                <UploadCloud className="w-10 h-10 text-indigo-600 dark:text-indigo-400 mb-2" />
                <p className="text-xs font-bold text-slate-900 dark:text-white text-center">
                  {uploadFile ? uploadFile.name : "Click to select PDF or drag and drop"}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Accepts standard PDF master resume</p>
                {uploadFile && (
                  <Badge variant="success" className="mt-3 text-[10px]">
                    ✓ PDF Selected ({(uploadFile.size / 1024).toFixed(1)} KB)
                  </Badge>
                )}
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setUploadModalOpen(false)}
                  className="flex-1 py-2.5 rounded-full border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadResume}
                  disabled={uploadLoading || !uploadFile}
                  className="stellar-gradient-btn flex-1 py-2.5 text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {uploadLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Parse & Save Profile
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
