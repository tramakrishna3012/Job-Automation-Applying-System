"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { api, type UserProfile } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  UploadCloud,
  Rocket,
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  User,
  GraduationCap,
  Briefcase,
  Sparkles,
  X,
  Plus,
  ShieldCheck,
  Zap,
  Cpu,
} from "lucide-react";

const STEPS = [
  { title: "Upload Resume", subtitle: "Extract Master Facts" },
  { title: "Review Profile", subtitle: "Skills & Experience" },
  { title: "Launch Agents", subtitle: "Autonomous Execution" },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-8 px-2">
      {STEPS.map((step, i) => (
        <div key={step.title} className="flex items-center gap-3 flex-1 last:flex-initial">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-bold border transition-all shrink-0 shadow-sm",
                i < current
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : i === current
                  ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300 ring-2 ring-indigo-500/20"
                  : "bg-slate-900/60 border-slate-800 text-slate-500"
              )}
            >
              {i < current ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <div className="hidden sm:block">
              <span
                className={cn(
                  "text-xs font-bold block leading-tight",
                  i === current ? "text-white" : i < current ? "text-emerald-400" : "text-slate-500"
                )}
              >
                {step.title}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">{step.subtitle}</span>
            </div>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                "flex-1 h-px mx-2 transition-all",
                i < current ? "bg-emerald-500/40" : "bg-slate-800"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { setProfileOnboarded } = useAppStore();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editSkills, setEditSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");

  const handleUpload = async () => {
    if (!file || !role || !experience) {
      setError("Please fill out all fields and upload a resume.");
      return;
    }
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("target_role", role);
    formData.append("target_experience_level", experience);
    formData.append("file", file);

    try {
      const data = await api.onboard(formData);
      setProfile(data.profile);
      setEditSkills(data.profile.skills || []);
      setStep(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to parse resume";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLaunch = async () => {
    setLoading(true);
    try {
      await api.startAgents();
      setProfileOnboarded(true);
      setStep(2);
      setTimeout(() => router.push("/"), 2200);
    } catch {
      setError("Failed to start agents");
    } finally {
      setLoading(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !editSkills.includes(newSkill.trim())) {
      setEditSkills([...editSkills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    setEditSkills(editSkills.filter((s) => s !== skill));
  };

  return (
    <div className="max-w-2xl mx-auto py-4 space-y-6">
      <button
        onClick={() => router.push("/")}
        className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Candidate Onboarding Wizard</h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure your autonomous AI agents with your master resume, career preferences, and target roles.
        </p>
      </div>

      <StepIndicator current={step} />

      <AnimatePresence mode="wait">
        {/* Step 0: Upload */}
        {step === 0 && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardContent className="p-6 sm:p-7 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Target Job Title / Position
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Full-Stack AI Engineer"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Experience Level
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 5+ years"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Master Resume (PDF)
                  </label>
                  <div className="w-full border-2 border-dashed border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center hover:border-indigo-500/40 hover:bg-slate-900/40 transition-all relative cursor-pointer bg-slate-950/60">
                    <UploadCloud className="w-10 h-10 text-indigo-400 mb-2" />
                    <span className="text-xs font-bold text-white text-center">
                      {file ? file.name : "Click to select PDF or drag and drop"}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">Accepts standard PDF resume</span>
                    {file && (
                      <Badge variant="success" className="mt-3 text-[10px]">
                        <FileText className="w-3 h-3 mr-1" />
                        PDF Loaded ({(file.size / 1024).toFixed(1)} KB)
                      </Badge>
                    )}
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-semibold">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={loading}
                  className="stellar-gradient-btn w-full py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Parse & Extract Profile Facts
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 1: Review Profile */}
        {step === 1 && profile && (
          <motion.div
            key="review"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardContent className="p-6 sm:p-7 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{profile.name}</h3>
                    <p className="text-xs text-slate-400 font-mono">{profile.email}</p>
                  </div>
                  <Badge variant="success" className="ml-auto text-[10px]">
                    AI Parsed
                  </Badge>
                </div>

                {/* Extracted Skills Cloud */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Parsed Candidate Skills
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {editSkills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-semibold"
                      >
                        {skill}
                        <button
                          onClick={() => removeSkill(skill)}
                          className="hover:text-rose-400 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addSkill()}
                      placeholder="Add custom skill (e.g. LangChain, Kubernetes)..."
                      className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                    />
                    <button
                      onClick={addSkill}
                      className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Experience Review */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-cyan-400" /> Career History
                  </label>
                  {profile.experience.map((exp, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 mb-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-white">{exp.role}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {exp.start_date} — {exp.end_date}
                        </span>
                      </div>
                      <span className="text-xs text-indigo-400 font-medium">{exp.company}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    onClick={() => setStep(0)}
                    className="flex-1 py-3 rounded-full border border-slate-800 text-slate-400 hover:text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleLaunch}
                    disabled={loading}
                    className="stellar-gradient-btn flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Rocket className="w-4 h-4" />
                        Launch Autonomous Agents
                      </>
                    )}
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Launched */}
        {step === 2 && (
          <motion.div
            key="launched"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="text-center py-16">
              <CardContent className="space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/10">
                  <Check className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-extrabold text-white">Autonomous Agents Online!</h2>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Your candidate profile is vectorized and stored in Neon DB. Scout, Editor, Dispatcher, and Tracker are now active.
                </p>
                <p className="text-[11px] text-slate-500 font-mono animate-pulse">
                  Redirecting to Command Center...
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
