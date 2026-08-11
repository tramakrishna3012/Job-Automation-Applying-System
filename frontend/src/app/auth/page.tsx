"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { Mail, Lock, User, ArrowRight, Sparkles, Eye, EyeOff } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const { login } = useAppStore();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulated auth delay
    await new Promise((r) => setTimeout(r, 1200));
    login(email, name || email.split("@")[0]);
    setLoading(false);
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#06070b] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute top-[-20%] left-[-15%] w-[50%] h-[50%] bg-sky-600/[0.08] blur-[180px] rounded-full" />
      <div className="absolute bottom-[-20%] right-[-15%] w-[50%] h-[50%] bg-indigo-600/[0.06] blur-[180px] rounded-full" />
      <div className="absolute top-1/3 right-1/4 w-[20%] h-[20%] bg-purple-600/[0.05] blur-[120px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-xl shadow-sky-500/20 mb-4">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            JobAuto<span className="text-sky-400">AI</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Autonomous Job Application System</p>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-8 shadow-2xl">
          {/* Tab Toggle */}
          <div className="flex rounded-xl bg-white/[0.03] border border-white/[0.06] p-1 mb-6">
            <button
              onClick={() => setIsSignup(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                !isSignup
                  ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsSignup(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                isSignup
                  ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {isSignup && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Mercer"
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 transition-all"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  required
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-sky-500/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isSignup ? "Create Account" : "Sign In"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-[11px] text-slate-600 mt-4">
            Secured by Requesty AI Gateway encryption
          </p>
        </div>
      </motion.div>
    </div>
  );
}
