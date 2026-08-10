"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Torus, Ring } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { 
  Briefcase, BrainCircuit, Rocket, CheckCircle, Search, Play, 
  Terminal, Sparkles, FileText, Share2, Layers, RefreshCw, Check, AlertCircle, ShieldCheck
} from "lucide-react";

// Jarvis-style 3D AI Core Animation
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
      
      const scale = 1 + Math.sin(time * 3) * 0.05;
      coreRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group scale={1.4}>
      <Ring ref={outerRingRef} args={[1.8, 1.9, 64]} rotation={[Math.PI / 4, 0, 0]}>
        <meshStandardMaterial color="#0ea5e9" wireframe={true} emissive="#0ea5e9" emissiveIntensity={2} />
      </Ring>
      
      <Ring ref={innerRingRef} args={[1.4, 1.5, 64]} rotation={[0, Math.PI / 4, 0]}>
        <meshStandardMaterial color="#38bdf8" wireframe={true} emissive="#38bdf8" emissiveIntensity={1.5} />
      </Ring>
      
      <Torus ref={coreRef} args={[0.8, 0.3, 16, 100]}>
        <meshStandardMaterial color="#0284c7" wireframe={true} emissive="#0284c7" emissiveIntensity={2} />
      </Torus>
    </group>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({ discovered: 0, applied: 0, interviews: 0 });
  const [logs, setLogs] = useState<{agent: string, message: string, time: string}[]>([]);
  const [applications, setApplications] = useState<{id: string, company: string, role: string, status: string, date_applied: string, url: string}[]>([]);
  const [activeTab, setActiveTab] = useState<"logs" | "applications" | "branding">("applications");
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>("All");
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

      const appsRes = await fetch("/api/applications");
      if (appsRes.ok) {
        const appsData = await appsRes.json();
        setApplications(appsData.applications || []);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleTestApply = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/test-apply", { method: "POST" });
      const data = await res.json();
      setTestResult(data);
      await fetchData();
    } catch (err: any) {
      setTestResult({ status: "error", message: err.message || "Test run failed" });
    } finally {
      setTestLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesAgent = selectedAgentFilter === "All" || log.agent.toLowerCase() === selectedAgentFilter.toLowerCase();
    const matchesSearch = log.message.toLowerCase().includes(searchQuery.toLowerCase()) || log.agent.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesAgent && matchesSearch;
  });

  const filteredApps = applications.filter(app => {
    return app.company.toLowerCase().includes(searchQuery.toLowerCase()) || 
           app.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
           app.status.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans relative overflow-x-hidden">
      {/* Dynamic Dark Gradients & Ambient Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-sky-600/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/15 blur-[140px] rounded-full pointer-events-none" />

      {/* Top Navbar */}
      <header className="relative z-20 border-b border-slate-800 bg-slate-950/60 backdrop-blur-md px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Job Automation Applying System
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 font-mono">
                Requesty Router Active
              </span>
            </h1>
            <p className="text-xs text-slate-400">Autonomous Full-Stack AI Agent & Vector Search Matching</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleTestApply}
            disabled={testLoading}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center gap-2 transition-all shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
          >
            <Play className={`w-4 h-4 ${testLoading ? "animate-spin" : ""}`} />
            {testLoading ? "Running AI Test Suite..." : "Run Test Job Application"}
          </button>

          <Link href="/onboarding">
            <button className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm flex items-center gap-2 transition-all shadow-lg hover:shadow-blue-500/20 cursor-pointer">
              <Rocket className="w-4 h-4" />
              Configure Profile
            </button>
          </Link>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="relative z-10 max-w-7xl mx-auto p-6 flex flex-col gap-6">
        
        {/* Top Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="rounded-2xl bg-slate-800/60 border border-slate-700/60 p-5 flex items-center gap-4 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.discovered}</div>
              <div className="text-xs text-slate-400 font-medium">Discovered Jobs</div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="rounded-2xl bg-slate-800/60 border border-slate-700/60 p-5 flex items-center gap-4 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.applied}</div>
              <div className="text-xs text-slate-400 font-medium">Auto-Applied</div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} className="rounded-2xl bg-slate-800/60 border border-slate-700/60 p-5 flex items-center gap-4 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.interviews}</div>
              <div className="text-xs text-slate-400 font-medium">Interviews Tracked</div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }} className="rounded-2xl bg-slate-800/60 border border-slate-700/60 p-5 flex items-center gap-4 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-sky-300">Requesty Unified</div>
              <div className="text-xs text-slate-400 font-medium">PostgreSQL + pgvector</div>
            </div>
          </motion.div>
        </div>

        {/* Dynamic Test Run Result Banner */}
        <AnimatePresence>
          {testResult && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: "auto" }} 
              exit={{ opacity: 0, height: 0 }} 
              className="rounded-2xl bg-emerald-950/60 border border-emerald-500/40 p-6 text-slate-200 shadow-2xl relative"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Check className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-emerald-300">Test AI Job Application Suite Complete!</h3>
                    <p className="text-xs text-emerald-400/80">Full end-to-end task execution verified via Requesty AI Router Gateway</p>
                  </div>
                </div>
                <button onClick={() => setTestResult(null)} className="text-slate-400 hover:text-white text-sm">✕</button>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-emerald-500/20">
                  <span className="text-emerald-400 font-bold block mb-1">🎯 Job Matched & Applied</span>
                  <span className="text-white">{testResult.job?.title} at {testResult.job?.company}</span>
                  <span className="block text-slate-400 text-[10px] mt-1">Status: {testResult.job?.status}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-emerald-500/20">
                  <span className="text-sky-400 font-bold block mb-1">📝 WeasyPrint AI Resume Architect</span>
                  <span className="text-slate-300 truncate block">{testResult.job?.tailored_resume_path}</span>
                  <span className="block text-slate-400 text-[10px] mt-1">Tailored HTML/PDF generated</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-emerald-500/20">
                  <span className="text-indigo-400 font-bold block mb-1">📱 Requesty Branding Agent</span>
                  <span className="text-slate-300 block line-clamp-2">{testResult.branding?.linkedin_post}</span>
                  <span className="block text-slate-400 text-[10px] mt-1">Intent Classified: {testResult.tracker_intent}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dashboard Core Body: Avatar & Interactive Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Left Column: Jarvis 3D AI Core (4 cols) */}
          <div className="md:col-span-4 flex flex-col gap-6">
            <div className="rounded-3xl bg-slate-800/40 border border-slate-700/60 p-6 flex flex-col items-center justify-center relative shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-1">Agent Zero Core</h2>
              <p className="text-xs text-sky-400 font-mono mb-4">Requesty Unified Gateway Enabled</p>
              
              <div className="w-full h-64 mb-4">
                <Canvas camera={{ position: [0, 0, 6] }}>
                  <ambientLight intensity={1} />
                  <directionalLight position={[10, 10, 10]} intensity={2} />
                  <JarvisCore />
                </Canvas>
              </div>

              <div className="w-full space-y-2 font-mono text-xs">
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400">AI Gateway:</span>
                  <span className="text-emerald-400 font-bold">router.requesty.ai</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400">Vector Search:</span>
                  <span className="text-sky-400 font-bold">Neon pgvector</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400">Resume Engine:</span>
                  <span className="text-indigo-400 font-bold">WeasyPrint PDF</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Multi-Tab Interactive Task Viewer (8 cols) */}
          <div className="md:col-span-8 flex flex-col gap-4">
            
            {/* Tab Navigation Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-800/40 border border-slate-700/60 rounded-2xl p-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("applications")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === "applications" 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  Jobs Applied ({applications.length})
                </button>

                <button
                  onClick={() => setActiveTab("logs")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === "logs" 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  Agent Tasks & Logs ({logs.length})
                </button>

                <button
                  onClick={() => setActiveTab("branding")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === "branding" 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  AI Branding Outputs
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* TAB 1: Job Applications List */}
            {activeTab === "applications" && (
              <div className="rounded-3xl bg-slate-800/40 border border-slate-700/60 p-6 flex flex-col min-h-[450px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-blue-400" />
                    Neon DB Job Applications Tracked
                  </h3>
                  <button onClick={fetchData} className="text-xs text-slate-400 hover:text-sky-400 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                </div>

                {filteredApps.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-sm py-12">
                    <Briefcase className="w-12 h-12 mb-3 text-slate-600 stroke-[1.5]" />
                    <p>No job applications tracked in database yet.</p>
                    <p className="text-xs text-slate-600 mt-1">Click "Run Test Job Application" above to trigger an instant test run!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-sans">
                      <thead>
                        <tr className="border-b border-slate-700/60 text-slate-400 font-semibold uppercase tracking-wider">
                          <th className="pb-3 px-2">Company</th>
                          <th className="pb-3 px-2">Target Role</th>
                          <th className="pb-3 px-2">Status</th>
                          <th className="pb-3 px-2">Date Applied</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredApps.map((app) => (
                          <tr key={app.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-2 font-bold text-white">{app.company}</td>
                            <td className="py-3 px-2 text-slate-300">{app.role}</td>
                            <td className="py-3 px-2">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                app.status.toLowerCase().includes("applied") ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" :
                                app.status.toLowerCase().includes("interview") ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30" :
                                "bg-sky-500/10 text-sky-400 border border-sky-500/30"
                              }`}>
                                {app.status}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-slate-400 font-mono text-[11px]">
                              {app.date_applied ? new Date(app.date_applied).toLocaleString() : "Recently"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Agent Telemetry Log Feed */}
            {activeTab === "logs" && (
              <div className="rounded-3xl bg-slate-800/40 border border-slate-700/60 p-6 flex flex-col min-h-[450px]">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    Live Requesty Agent Tasks & Telemetry
                  </h3>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["All", "System", "Scout", "Editor", "Dispatcher", "Visibility", "Tracker"].map((agent) => (
                      <button
                        key={agent}
                        onClick={() => setSelectedAgentFilter(agent)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          selectedAgentFilter === agent
                            ? "bg-sky-500 text-slate-950 font-extrabold"
                            : "bg-slate-900 text-slate-400 hover:text-white"
                        }`}
                      >
                        {agent}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[380px] space-y-2.5 font-mono text-xs pr-2">
                  {filteredLogs.length === 0 ? (
                    <div className="text-slate-500 italic py-12 text-center">No agent tasks match the selected filter.</div>
                  ) : (
                    filteredLogs.map((log, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-start justify-between gap-3">
                        <div>
                          <span className={`font-bold ${
                            log.agent === "Scout" ? "text-sky-400" :
                            log.agent === "Editor" ? "text-indigo-400" :
                            log.agent === "Dispatcher" ? "text-emerald-400" :
                            log.agent === "Visibility" ? "text-purple-400" :
                            log.agent === "Tracker" ? "text-amber-400" : "text-blue-400"
                          }`}>
                            [{log.agent}]
                          </span>
                          <span className="ml-2 text-slate-200">{log.message}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 whitespace-nowrap">{new Date(log.time).toLocaleTimeString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: AI Branding & Output Hub */}
            {activeTab === "branding" && (
              <div className="rounded-3xl bg-slate-800/40 border border-slate-700/60 p-6 flex flex-col min-h-[450px] space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Requesty AI Branding & Content Generation Hub
                </h3>

                <div className="grid grid-cols-1 gap-4 font-sans text-xs">
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sky-400 flex items-center gap-1.5">
                        <Share2 className="w-4 h-4" /> LinkedIn Personal Branding Post (Requesty AI)
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">System Prompt Instructed</span>
                    </div>
                    <p className="text-slate-300 italic bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                      "{testResult?.branding?.linkedin_post || 'Run the test suite above to generate an automated LinkedIn personal branding post tailored to your target role!'}"
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                        <FileText className="w-4 h-4" /> WeasyPrint AI Resume Architect Engine
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">Structured HTML/CSS to PDF</span>
                    </div>
                    <p className="text-slate-400">
                      The AI Resume Architect compiles candidate profiles and job description requirements into executive single-page HTML & WeasyPrint PDF documents without hallucinating facts.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </main>
    </div>
  );
}
