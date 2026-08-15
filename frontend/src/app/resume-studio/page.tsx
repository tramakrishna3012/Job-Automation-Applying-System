"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef } from "react";
import { api, type UserProfile } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  FileText,
  Briefcase,
  Sparkles,
  Eye,
  RefreshCw,
  ChevronRight,
  UploadCloud,
  CheckCircle,
  Download,
  Printer,
  Layers,
  Wand2,
  AlertCircle,
  X,
  User,
  Plus,
} from "lucide-react";

const TEMPLATES = [
  { id: "executive", name: "Executive Modern", description: "Deep navy accents with structured dividers" },
  { id: "harvard", name: "Classic Harvard", description: "Traditional serif typography with top rule header" },
  { id: "tech", name: "Tech / Modern", description: "Indigo pill badges & monospace metadata" },
  { id: "minimal", name: "Clean ATS Minimal", description: "Clean grayscale optimized for automated ATS parsers" },
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
      const res = await api.uploadResume(formData);
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

  // Live Tailor Mutation
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
  const matchedSkills = tailoredResult?.matched_keywords?.length
    ? tailoredResult.matched_keywords
    : profileSkills.filter((s) => activeDescription.toLowerCase().includes(s.toLowerCase()));
  const missingSkills = tailoredResult?.missing_keywords?.length
    ? tailoredResult.missing_keywords
    : ["Kubernetes", "AWS", "CI/CD"].filter((s) => activeDescription.toLowerCase().includes(s.toLowerCase()) && !profileSkills.some(ps => ps.toLowerCase() === s.toLowerCase()));

  const matchPercent = Math.min(100, Math.round(((matchedSkills.length + 1) / (matchedSkills.length + missingSkills.length + 1)) * 100));

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-[24px] bg-[#111c44] border border-[#1b254b] shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#868CFF] to-[#4318FF] flex items-center justify-center shadow-lg shadow-[#4318FF]/30 shrink-0">
            <FileText className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">AI Resume Architect</h1>
              <Badge variant="success" className="text-[10px] bg-[#01b574]/20 text-[#01b574] border-[#01b574]/30">
                Master Resume Active
              </Badge>
            </div>
            <p className="text-xs text-[#a3aed0] mt-0.5">
              Candidate: <span className="text-white font-bold">{resumeData?.profile?.name || user?.name || "T Rama Krishna"}</span> ({resumeData?.profile?.email || user?.email || "candidate@example.com"}) &bull; {profileSkills.length} Verified Skills
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Upload Button */}
          <button
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#868CFF] to-[#4318FF] text-white text-xs font-bold shadow-lg shadow-[#4318FF]/30 hover:shadow-[#4318FF]/50 transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            Upload Master Resume (PDF)
          </button>

          {/* Print / Save PDF Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1b254b] text-white text-xs font-bold border border-[#1b254b] hover:bg-[#243269] transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#00f2fe]" />
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Template Switcher Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-[#a3aed0] uppercase tracking-wider mr-2 flex items-center gap-1.5 shrink-0">
            <Layers className="w-3.5 h-3.5 text-[#7551ff]" /> Template:
          </span>
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setSelectedTemplate(t.id);
                setViewMode("master");
              }}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border",
                selectedTemplate === t.id
                  ? "bg-[#4318ff] text-white border-[#4318ff] shadow-md shadow-[#4318ff]/30"
                  : "bg-[#111c44] text-[#a3aed0] border-[#1b254b] hover:text-white"
              )}
            >
              {t.name}
            </button>
          ))}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-[#111c44] rounded-xl border border-[#1b254b] p-1">
          <button
            onClick={() => setViewMode("master")}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
              viewMode === "master" ? "bg-[#1b254b] text-white" : "text-[#a3aed0] hover:text-white"
            )}
          >
            Master Resume
          </button>
          <button
            onClick={() => setViewMode("tailored")}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
              viewMode === "tailored" ? "bg-[#01b574] text-white shadow-md" : "text-[#a3aed0] hover:text-white"
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
          <Card className="rounded-[20px] bg-[#111c44] border-[#1b254b]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#7551ff]" />
                  Target Job Description
                </CardTitle>
                <div className="flex bg-[#0b1437] rounded-lg p-0.5 border border-[#1b254b]">
                  <button
                    onClick={() => setActiveTab("pipeline")}
                    className={cn(
                      "px-2.5 py-1 rounded text-[10px] font-bold transition-all",
                      activeTab === "pipeline" ? "bg-[#4318ff] text-white" : "text-[#a3aed0]"
                    )}
                  >
                    From Queue
                  </button>
                  <button
                    onClick={() => setActiveTab("custom")}
                    className={cn(
                      "px-2.5 py-1 rounded text-[10px] font-bold transition-all",
                      activeTab === "custom" ? "bg-[#4318ff] text-white" : "text-[#a3aed0]"
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
                  <label className="text-[11px] font-bold text-[#a3aed0] uppercase tracking-wider mb-2 block">
                    Select Application from Queue
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                    {appsLoading ? (
                      [...Array(3)].map((_, i) => <Skeleton key={i} className="h-9 w-32 rounded-xl shrink-0 bg-[#1b254b]" />)
                    ) : applications?.length ? (
                      applications.slice(0, 8).map((app) => (
                        <button
                          key={app.id}
                          onClick={() => setSelectedAppId(app.id)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 cursor-pointer border transition-all",
                            (selectedAppId === app.id || (!selectedAppId && selectedApp?.id === app.id))
                              ? "bg-[#4318ff]/20 text-white border-[#7551ff]"
                              : "bg-[#0b1437] text-[#a3aed0] border-[#1b254b] hover:text-white"
                          )}
                        >
                          <span className="truncate max-w-[120px]">{app.company}</span>
                        </button>
                      ))
                    ) : (
                      <span className="text-xs text-[#a3aed0]">No applications yet</span>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0b1437] border border-[#1b254b]">
                    <div className="text-xs font-bold text-white">{activeTitle}</div>
                    <div className="text-[11px] text-[#7551ff] font-semibold mb-2">{activeCompany}</div>
                    <p className="text-xs text-[#a3aed0] leading-relaxed line-clamp-4">
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
                      className="bg-[#0b1437] border border-[#1b254b] rounded-xl px-3 py-2 text-xs text-white placeholder-[#707eae] focus:outline-none focus:border-[#7551ff]"
                    />
                    <input
                      type="text"
                      placeholder="Company Name"
                      value={customCompany}
                      onChange={(e) => setCustomCompany(e.target.value)}
                      className="bg-[#0b1437] border border-[#1b254b] rounded-xl px-3 py-2 text-xs text-white placeholder-[#707eae] focus:outline-none focus:border-[#7551ff]"
                    />
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Paste the full Job Description here..."
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    className="w-full bg-[#0b1437] border border-[#1b254b] rounded-xl p-3 text-xs text-white placeholder-[#707eae] focus:outline-none focus:border-[#7551ff]"
                  />
                </div>
              )}

              {/* Real-time Keyword & Match Coverage Analysis */}
              <div className="pt-2 border-t border-[#1b254b]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#ffb547]" />
                    AI Skill Match Analysis
                  </span>
                  <Badge className="bg-[#01b574]/20 text-[#01b574] border-[#01b574]/30 font-bold text-[10px]">
                    {matchPercent}% Match
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {matchedSkills.map((s: string) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 rounded-md bg-[#01b574]/15 border border-[#01b574]/30 text-[#01b574] text-[10px] font-semibold flex items-center gap-1"
                    >
                      ✓ {s}
                    </span>
                  ))}
                  {missingSkills.map((s: string) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 rounded-md bg-[#ee5d50]/15 border border-[#ee5d50]/30 text-[#ee5d50] text-[10px] font-semibold flex items-center gap-1"
                    >
                      + {s}
                    </span>
                  ))}
                </div>

                {/* Live Action Button */}
                <button
                  onClick={handleTailor}
                  disabled={isTailoring}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#868CFF] to-[#4318FF] text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#4318FF]/30 hover:shadow-[#4318FF]/50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
          <Card className="rounded-[20px] bg-[#111c44] border-[#1b254b] overflow-hidden">
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#00f2fe]" />
                Live Document Preview ({viewMode === "tailored" ? "Tailored" : "Master"})
              </CardTitle>
              <div className="text-[11px] text-[#a3aed0] font-mono">
                Theme: <span className="text-[#00f2fe] uppercase">{selectedTemplate}</span>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 bg-[#0b1437]/50">
              {resumeLoading ? (
                <div className="flex flex-col items-center justify-center min-h-[600px] gap-3">
                  <div className="w-8 h-8 border-2 border-[#7551ff] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-[#a3aed0]">Rendering resume architect preview...</p>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg rounded-[24px] bg-[#111c44] border border-[#1b254b] p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#868CFF] to-[#4318FF] flex items-center justify-center text-white shadow-md">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Upload Master Resume</h3>
                    <p className="text-xs text-[#a3aed0]">Extract candidate profile & match resume format</p>
                  </div>
                </div>
                <button
                  onClick={() => setUploadModalOpen(false)}
                  className="p-1.5 rounded-lg text-[#a3aed0] hover:text-white hover:bg-[#1b254b] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {uploadError && (
                <div className="p-3 rounded-xl bg-[#ee5d50]/15 border border-[#ee5d50]/30 text-[#ee5d50] text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="border-2 border-dashed border-[#1b254b] rounded-2xl p-8 flex flex-col items-center justify-center hover:border-[#7551ff]/50 transition-all relative cursor-pointer bg-[#0b1437]">
                <UploadCloud className="w-10 h-10 text-[#7551ff] mb-2" />
                <p className="text-xs font-bold text-white text-center">
                  {uploadFile ? uploadFile.name : "Click to select PDF or drag and drop"}
                </p>
                <p className="text-[10px] text-[#a3aed0] mt-1">Accepts standard PDF master resume</p>
                {uploadFile && (
                  <Badge className="mt-3 bg-[#01b574]/20 text-[#01b574] border-[#01b574]/30 text-[10px]">
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
                  className="flex-1 py-2.5 rounded-xl border border-[#1b254b] text-[#a3aed0] hover:text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadResume}
                  disabled={uploadLoading || !uploadFile}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#868CFF] to-[#4318FF] text-white text-xs font-bold shadow-lg shadow-[#4318FF]/30 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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
