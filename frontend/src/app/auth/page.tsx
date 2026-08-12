"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Mail, Lock, User, ArrowRight, Sparkles, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const { login } = useAppStore();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (isSignup) {
        const res = await api.signup({ email, password, name: name || undefined });
        login(res.user, res.token);
      } else {
        const res = await api.login({ email, password });
        login(res.user, res.token);
      }
      setLoading(false);
      router.push("/");
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err?.message || "Authentication failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1437] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Horizon Ambient background */}
      <div className="absolute top-[-20%] left-[-15%] w-[50%] h-[50%] bg-[#4318ff]/[0.15] blur-[180px] rounded-full" />
      <div className="absolute bottom-[-20%] right-[-15%] w-[50%] h-[50%] bg-[#7551ff]/[0.12] blur-[180px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#868CFF] to-[#4318FF] shadow-xl shadow-[#4318FF]/30 mb-4">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            HORIZON <span className="text-[#7551ff]">UI</span>
          </h1>
          <p className="text-xs text-[#a3aed0] mt-1 font-semibold uppercase tracking-wider">
            Autonomous Job Application Platform
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-[20px] border border-[#1b254b] bg-[#111c44] backdrop-blur-xl p-8 shadow-2xl">
          {/* Tab Toggle */}
          <div className="flex rounded-2xl bg-[#0b1437] border border-[#1b254b] p-1 mb-6">
            <button
              onClick={() => {
                setIsSignup(false);
                setErrorMsg(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                !isSignup
                  ? "bg-[#4318ff] text-white shadow-md shadow-[#4318ff]/30"
                  : "text-[#a3aed0] hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsSignup(true);
                setErrorMsg(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isSignup
                  ? "bg-[#4318ff] text-white shadow-md shadow-[#4318ff]/30"
                  : "text-[#a3aed0] hover:text-white"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error Alert Box */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#ee5d50]/15 border border-[#ee5d50]/30 text-[#ee5d50] text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

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
                  <label className="block text-xs font-bold text-[#a3aed0] mb-1.5 uppercase tracking-wider">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a3aed0]" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Mercer"
                      className="w-full bg-[#0b1437] border border-[#1b254b] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-[#707eae] focus:outline-none focus:border-[#7551ff] transition-all"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-xs font-bold text-[#a3aed0] mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a3aed0]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  required
                  className="w-full bg-[#0b1437] border border-[#1b254b] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-[#707eae] focus:outline-none focus:border-[#7551ff] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#a3aed0] mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a3aed0]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#0b1437] border border-[#1b254b] rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder:text-[#707eae] focus:outline-none focus:border-[#7551ff] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#a3aed0] hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#868CFF] to-[#4318FF] text-white text-xs font-bold tracking-wider uppercase shadow-lg shadow-[#4318FF]/30 hover:shadow-[#4318FF]/50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-6"
            >
              <span>{loading ? "Authenticating..." : isSignup ? "Create Account" : "Sign In"}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
