"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { api, type UserProfile } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";

const STEPS = ["Upload Resume", "Review Profile", "Launch Agents"];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
              i < current
                ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                : i === current
                ? "bg-sky-500/20 border-sky-500/30 text-sky-400"
                : "bg-white/[0.03] border-white/[0.06] text-slate-600"
            }`}
          >
            {i < current ? <Check className="w-3.5 h-3.5" /> : i + 1}
          </div>
          <span
            className={`text-xs font-medium hidden sm:block ${
              i === current ? "text-sky-400" : i < current ? "text-emerald-400" : "text-slate-600"
            }`}
          >
            {step}
          </span>
          {i < STEPS.length - 1 && (
            <div className={`w-8 h-px ${i < current ? "bg-emerald-500/40" : "bg-white/[0.06]"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function Onboarding() {
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
      setTimeout(() => router.push("/"), 2000);
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
    <div className="max-w-2xl mx-auto py-4">
      <button
        onClick={() => router.push("/")}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-white transition-colors mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <h1 className="text-2xl font-bold text-white tracking-tight mb-1">System Onboarding</h1>
      <p className="text-sm text-slate-500 mb-6">Configure your AI agent with your master resume and target roles.</p>

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
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400">Target Role</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Full-Stack AI Engineer"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400">Experience Level</label>
                  <input
                    type="text"
                    placeholder="e.g. 5+ years"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400">Master Resume (PDF)</label>
                  <div className="w-full border-2 border-dashed border-white/[0.08] rounded-xl p-8 flex flex-col items-center justify-center hover:border-sky-500/30 hover:bg-sky-500/[0.02] transition-all relative cursor-pointer">
                    <UploadCloud className="w-8 h-8 text-sky-500/60 mb-2" />
                    <span className="text-sm font-medium text-slate-400 text-center">
                      {file ? file.name : "Click to upload or drag and drop"}
                    </span>
                    {file && (
                      <Badge variant="success" className="mt-2 text-[10px]">
                        <FileText className="w-3 h-3 mr-1" />
                        PDF Ready
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
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Parse & Extract Profile
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
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{profile.name}</h3>
                    <p className="text-xs text-slate-500">{profile.email}</p>
                  </div>
                  <Badge variant="success" className="ml-auto">AI Parsed</Badge>
                </div>

                {/* Skills */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Skills
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editSkills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-medium"
                      >
                        {skill}
                        <button onClick={() => removeSkill(skill)} className="hover:text-red-400 cursor-pointer">
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
                      placeholder="Add skill..."
                      className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500/50 transition-all"
                    />
                    <button onClick={addSkill} className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 cursor-pointer">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Experience */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" /> Experience
                  </label>
                  {profile.experience.map((exp, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] mb-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-semibold text-white">{exp.role}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{exp.start_date} — {exp.end_date}</span>
                      </div>
                      <span className="text-xs text-slate-400">{exp.company}</span>
                    </div>
                  ))}
                </div>

                {/* Education */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5" /> Education
                  </label>
                  {profile.education.map((edu, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] mb-2">
                      <span className="text-sm font-semibold text-white">{edu.degree}</span>
                      <span className="block text-xs text-slate-400">{edu.institution}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(0)}
                    className="flex-1 py-3 rounded-xl border border-white/[0.08] text-slate-400 hover:text-white font-semibold text-sm transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleLaunch}
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Rocket className="w-4 h-4" />
                        Launch Agents
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
              <CardContent>
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Agents Launched!</h2>
                <p className="text-sm text-slate-400">
                  Your autonomous job application agents are now running via Requesty AI Router.
                </p>
                <p className="text-xs text-slate-600 mt-2">Redirecting to dashboard...</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
