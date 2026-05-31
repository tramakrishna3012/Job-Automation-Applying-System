"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, MeshDistortMaterial } from "@react-three/drei";
import { motion } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, BrainCircuit, Rocket, CheckCircle } from "lucide-react";

// Floating AI Core Avatar
function AICore() {
  const meshRef = useRef<any>(null);
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.2;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
    }
  });

  return (
    <Sphere ref={meshRef} args={[1, 64, 64]} scale={2}>
      <MeshDistortMaterial
        color="#8B5CF6"
        attach="material"
        distort={0.4}
        speed={2}
        roughness={0.2}
        metalness={0.8}
      />
    </Sphere>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({ discovered: 0, applied: 0, interviews: 0 });
  const [logs, setLogs] = useState<{agent: string, message: string, time: string}[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsRes = await fetch("/api/stats");
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
        const logsRes = await fetch("/api/logs");
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setLogs(logsData.logs || []);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-900/30 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/30 blur-[120px] rounded-full pointer-events-none" />

      <main className="relative z-10 flex flex-col md:flex-row h-screen max-w-7xl mx-auto p-6 gap-8">
        
        {/* Left Column: AI Avatar & Controls */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full md:w-1/3 flex flex-col gap-6"
        >
          <div className="flex-1 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-8 flex flex-col items-center justify-center relative shadow-2xl">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent mb-2">Agent Zero</h1>
            <p className="text-slate-400 text-sm mb-8 text-center">Your autonomous job hunting system is standing by.</p>
            
            <div className="w-full h-64 mb-8">
              <Canvas camera={{ position: [0, 0, 5] }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 10]} intensity={1} />
                <AICore />
              </Canvas>
            </div>

            <Link href="/onboarding" className="w-full group">
              <button className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]">
                <Rocket className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                Initialize Deployment
              </button>
            </Link>
          </div>
        </motion.div>

        {/* Right Column: Live Feed & Stats */}
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="w-full md:w-2/3 flex flex-col gap-6"
        >
          {/* Top Stats */}
          <div className="grid grid-cols-3 gap-6">
            <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-6 flex flex-col items-center justify-center">
              <Briefcase className="w-8 h-8 text-cyan-400 mb-2" />
              <span className="text-3xl font-bold">{stats.discovered}</span>
              <span className="text-slate-400 text-sm">Jobs Discovered</span>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-6 flex flex-col items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-400 mb-2" />
              <span className="text-3xl font-bold">{stats.applied}</span>
              <span className="text-slate-400 text-sm">Auto-Applied</span>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-6 flex flex-col items-center justify-center">
              <BrainCircuit className="w-8 h-8 text-violet-400 mb-2" />
              <span className="text-3xl font-bold">{stats.interviews}</span>
              <span className="text-slate-400 text-sm">Interviews Tracked</span>
            </div>
          </div>

          {/* Live Activity Feed */}
          <div className="flex-1 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-8 flex flex-col">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              Live Agent Telemetry
            </h2>
            
            <div className="flex-1 overflow-y-auto pr-4 space-y-4 font-mono text-sm">
              {logs.length === 0 ? (
                <div className="text-slate-500 italic">Waiting for agent activity...</div>
              ) : (
                logs.map((log, idx) => (
                  <motion.div key={idx} initial={{opacity:0}} animate={{opacity:1}} transition={{delay: idx * 0.05}} className="p-4 rounded-lg bg-white/5 border border-white/5">
                    <span className={log.agent === "Scout" ? "text-cyan-400" : log.agent === "Editor" ? "text-violet-400" : "text-indigo-400"}>
                      [{log.agent}]
                    </span> {log.message}
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
