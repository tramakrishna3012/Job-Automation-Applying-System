"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { UploadCloud, Rocket, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Onboarding() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const res = await fetch("/api/onboard", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to onboard. Please check backend logs.");
      }

      const data = await res.json();
      console.log("Onboarding Success:", data);

      // Now start the agents
      const startRes = await fetch("/api/start-agents", { method: "POST" });
      if (!startRes.ok) throw new Error("Failed to start agents.");

      // Redirect back to dashboard
      router.push("/");
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex items-center justify-center p-6">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-900/30 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/30 blur-[120px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-lg rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-8 shadow-2xl"
      >
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-slate-400 hover:text-white transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Link>
        </div>

        <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent mb-2">Initialize System</h1>
        <p className="text-slate-400 text-sm mb-8">Configure your AI agent with your master resume and target roles.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300">Target Role</label>
            <input 
              type="text" 
              placeholder="e.g. Senior Frontend Engineer" 
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-violet-500 transition-colors placeholder:text-slate-600"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300">Experience Level</label>
            <input 
              type="text" 
              placeholder="e.g. 5+ years" 
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-violet-500 transition-colors placeholder:text-slate-600"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300">Master Resume (PDF)</label>
            <div className="w-full border-2 border-dashed border-white/20 rounded-xl p-6 flex flex-col items-center justify-center hover:border-violet-500/50 transition-colors bg-white/5 relative">
              <UploadCloud className="w-8 h-8 text-violet-400 mb-2" />
              <span className="text-sm text-slate-300 text-center">
                {file ? file.name : "Click to upload or drag and drop"}
              </span>
              <input 
                type="file" 
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-4 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Rocket className="w-5 h-5" />
            )}
            {loading ? "Extracting & Initializing..." : "Start Autonomous Agent"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
