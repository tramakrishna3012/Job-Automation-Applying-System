"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";

export default function ResumeStudioPage() {
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  const { data: applications, isLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: api.applications,
  });

  // Sample JD keywords for demonstration
  const sampleKeywords = [
    { keyword: "Python", match: true },
    { keyword: "FastAPI", match: true },
    { keyword: "React", match: true },
    { keyword: "PostgreSQL", match: true },
    { keyword: "pgvector", match: true },
    { keyword: "Docker", match: true },
    { keyword: "OpenAI SDK", match: true },
    { keyword: "Kubernetes", match: false },
    { keyword: "CI/CD", match: false },
    { keyword: "AWS", match: false },
  ];

  const selectedApp = applications?.find((a) => a.id === selectedAppId) || applications?.[0];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Resume Studio</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Split-screen JD analysis and AI-generated resume preview
        </p>
      </div>

      {/* Application Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {isLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-40 rounded-xl shrink-0" />)
        ) : (
          applications?.map((app) => (
            <button
              key={app.id}
              onClick={() => setSelectedAppId(app.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer border",
                selectedApp?.id === app.id
                  ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                  : "bg-white/[0.02] text-slate-500 border-white/[0.06] hover:text-white hover:border-white/[0.1]"
              )}
            >
              <Briefcase className="w-3.5 h-3.5" />
              {app.company}
              <ChevronRight className="w-3 h-3" />
            </button>
          ))
        )}
      </div>

      {/* Split Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Job Description + Keywords */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="w-4 h-4 text-sky-400" />
                Job Description Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedApp ? (
                <>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <h3 className="text-sm font-bold text-white mb-1">{selectedApp.role}</h3>
                    <p className="text-xs text-slate-500 mb-3">{selectedApp.company}</p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      We are looking for a Senior AI Engineer proficient in Python, FastAPI, OpenAI SDK,
                      vector search, and containerized Docker deployments. Experience with PostgreSQL,
                      pgvector, and modern React frontends is highly valued.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      AI-Extracted Keywords
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {sampleKeywords.map((kw) => (
                        <Badge
                          key={kw.keyword}
                          variant={kw.match ? "success" : "destructive"}
                          className="text-[10px]"
                        >
                          {kw.match ? "✓" : "✗"} {kw.keyword}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-[10px]">
                      <span className="text-emerald-400">
                        {sampleKeywords.filter((k) => k.match).length} matched
                      </span>
                      <span className="text-slate-600">|</span>
                      <span className="text-red-400">
                        {sampleKeywords.filter((k) => !k.match).length} missing
                      </span>
                      <span className="text-slate-600">|</span>
                      <span className="text-white font-bold">
                        {Math.round(
                          (sampleKeywords.filter((k) => k.match).length / sampleKeywords.length) * 100
                        )}
                        % coverage
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-16 text-slate-600 text-sm">
                  <FileText className="w-10 h-10 mx-auto mb-2 stroke-[1.5]" />
                  <p>Select a job to analyze</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Right: Resume Preview */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Eye className="w-4 h-4 text-emerald-400" />
                Resume Preview
              </CardTitle>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold hover:bg-emerald-500/20 transition-colors cursor-pointer">
                <RefreshCw className="w-3 h-3" />
                Regenerate
              </button>
            </CardHeader>
            <CardContent>
              {selectedApp ? (
                <div className="rounded-xl border border-white/[0.06] bg-white text-slate-900 p-8 min-h-[500px] text-xs leading-relaxed">
                  {/* Mock Resume Content */}
                  <div className="text-center mb-6">
                    <h2 className="text-lg font-bold text-slate-900">Alex Mercer</h2>
                    <p className="text-slate-500 text-[11px]">
                      alex.mercer@example.com | +1 (555) 234-5678 | San Francisco, CA
                    </p>
                  </div>

                  <div className="mb-4">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
                      Professional Summary
                    </h3>
                    <p className="text-slate-600">
                      Accomplished Senior Full-Stack AI Engineer with expertise in autonomous agent
                      orchestration, Requesty AI gateway routing, and pgvector semantic search systems.
                      Proven track record in building production-grade Python/FastAPI backends with
                      React frontends.
                    </p>
                  </div>

                  <div className="mb-4">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
                      Experience
                    </h3>
                    <div className="mb-3">
                      <div className="flex justify-between">
                        <span className="font-semibold">Senior Full-Stack AI Engineer</span>
                        <span className="text-slate-500">2022 — Present</span>
                      </div>
                      <span className="text-slate-500">Nexus AI Corp</span>
                      <ul className="mt-1 space-y-0.5 text-slate-600 list-disc list-inside">
                        <li>Engineered autonomous AI routing system handling multi-LLM gateways</li>
                        <li>Designed high-throughput vector database search pipelines using pgvector</li>
                      </ul>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
                      Skills
                    </h3>
                    <p className="text-slate-600">
                      Python, FastAPI, React, PostgreSQL, pgvector, Docker, OpenAI SDK, TypeScript, Next.js
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
                      Education
                    </h3>
                    <div className="flex justify-between">
                      <span className="font-semibold">B.S. Computer Science</span>
                      <span className="text-slate-500">2021</span>
                    </div>
                    <span className="text-slate-500">University of California, Berkeley</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-slate-600 text-sm min-h-[500px] flex items-center justify-center">
                  <div>
                    <Eye className="w-10 h-10 mx-auto mb-2 stroke-[1.5]" />
                    <p>Select a job to preview the tailored resume</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
