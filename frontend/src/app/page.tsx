"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Torus, Ring } from "@react-three/drei";
import { motion } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, BrainCircuit, Rocket, CheckCircle } from "lucide-react";

// Jarvis-style 3D AI Core
function JarvisCore() {
  const outerRingRef = useRef<any>(null);
  const innerRingRef = useRef<any>(null);
  const coreRef = useRef<any>(null);

  useFrame((state) => {
    if (outerRingRef.current && innerRingRef.current && coreRef.current) {
      const time = state.clock.getElapsedTime();
      outerRingRef.current.rotation.z = time * 0.5;
      outerRingRef.current.rotation.y = time * 0.2;
      
      innerRingRef.current.rotation.x = time * 0.8;
      innerRingRef.current.rotation.z = -time * 0.4;
      
      coreRef.current.rotation.y = time * 0.5;
      coreRef.current.rotation.x = time * 0.5;
      
      // Pulsing effect
      const scale = 1 + Math.sin(time * 3) * 0.05;
      coreRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group scale={1.5}>
      {/* Outer rotating ring */}
      <Ring ref={outerRingRef} args={[1.8, 1.9, 64]} rotation={[Math.PI / 4, 0, 0]}>
        <meshStandardMaterial color="#0ea5e9" wireframe={true} emissive="#0ea5e9" emissiveIntensity={2} />
      </Ring>
      
      {/* Inner rotating ring */}
      <Ring ref={innerRingRef} args={[1.4, 1.5, 64]} rotation={[0, Math.PI / 4, 0]}>
        <meshStandardMaterial color="#38bdf8" wireframe={true} emissive="#38bdf8" emissiveIntensity={1.5} />
      </Ring>
      
      {/* AI Core Torus Knot */}
      <Torus ref={coreRef} args={[0.8, 0.3, 16, 100]}>
        <meshStandardMaterial color="#0284c7" wireframe={true} emissive="#0284c7" emissiveIntensity={2} />
      </Torus>
    </group>
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative overflow-hidden">
      {/* Professional Light Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-200/50 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-sky-200/50 blur-[120px] rounded-full pointer-events-none" />

      <main className="relative z-10 flex flex-col md:flex-row h-screen max-w-7xl mx-auto p-6 gap-8">
        
        {/* Left Column: AI Avatar & Controls */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full md:w-1/3 flex flex-col gap-6"
        >
          <div className="flex-1 rounded-3xl bg-white border border-slate-200 shadow-xl p-8 flex flex-col items-center justify-center relative">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Agent Zero</h1>
            <p className="text-slate-500 text-sm mb-8 text-center">Autonomous Job Hunting System</p>
            
            <div className="w-full h-64 mb-8">
              <Canvas camera={{ position: [0, 0, 6] }}>
                <ambientLight intensity={1} />
                <directionalLight position={[10, 10, 10]} intensity={2} />
                <JarvisCore />
              </Canvas>
            </div>

            <Link href="/onboarding" className="w-full group">
              <button className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl shadow-blue-500/30">
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
            <div className="rounded-2xl bg-white border border-slate-200 shadow-md p-6 flex flex-col items-center justify-center">
              <Briefcase className="w-8 h-8 text-blue-500 mb-2" />
              <span className="text-3xl font-bold text-slate-800">{stats.discovered}</span>
              <span className="text-slate-500 text-sm font-medium">Jobs Discovered</span>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 shadow-md p-6 flex flex-col items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
              <span className="text-3xl font-bold text-slate-800">{stats.applied}</span>
              <span className="text-slate-500 text-sm font-medium">Auto-Applied</span>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 shadow-md p-6 flex flex-col items-center justify-center">
              <BrainCircuit className="w-8 h-8 text-indigo-500 mb-2" />
              <span className="text-3xl font-bold text-slate-800">{stats.interviews}</span>
              <span className="text-slate-500 text-sm font-medium">Interviews Tracked</span>
            </div>
          </div>

          {/* Live Activity Feed */}
          <div className="flex-1 rounded-3xl bg-white border border-slate-200 shadow-xl p-8 flex flex-col">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              Live Agent Telemetry
            </h2>
            
            <div className="flex-1 overflow-y-auto pr-4 space-y-3 font-mono text-sm">
              {logs.length === 0 ? (
                <div className="text-slate-400 italic">Waiting for agent activity...</div>
              ) : (
                logs.map((log, idx) => (
                  <motion.div key={idx} initial={{opacity:0}} animate={{opacity:1}} transition={{delay: idx * 0.05}} className="p-4 rounded-xl bg-slate-50 border border-slate-100 shadow-sm text-slate-700">
                    <span className={`font-bold ${log.agent === "Scout" ? "text-sky-600" : log.agent === "Editor" ? "text-indigo-600" : "text-blue-600"}`}>
                      [{log.agent}]
                    </span> <span className="ml-2">{log.message}</span>
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
