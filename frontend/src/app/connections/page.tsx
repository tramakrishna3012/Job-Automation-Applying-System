"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Code2,
  Globe,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
  Loader2,
  Check,
  Database,
  Cpu,
  MessageCircle,
  Zap,
} from "lucide-react";

interface PlatformConfig {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  type: "oauth" | "token" | "system";
  initialStatus: ConnectionStatus;
  description: string;
}

const PLATFORMS: PlatformConfig[] = [
  {
    id: "neon",
    name: "Neon PostgreSQL",
    icon: Database,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    type: "system",
    initialStatus: "connected",
    description: "Cloud Serverless Postgres with pgvector semantic similarity search",
  },
  {
    id: "requesty",
    name: "Requesty AI Gateway",
    icon: Cpu,
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/20",
    type: "system",
    initialStatus: "connected",
    description: "Multi-model OpenAI GPT-4o-mini router for resume tailoring & cold emails",
  },
  {
    id: "linkedin",
    name: "LinkedIn Automation",
    icon: Globe,
    color: "text-sky-400",
    bgColor: "bg-sky-500/10",
    borderColor: "border-sky-500/20",
    type: "oauth",
    initialStatus: "connected",
    description: "Auto-publish technical thought leadership and dispatch job applications",
  },
  {
    id: "github",
    name: "GitHub Developer Sync",
    icon: Code2,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
    type: "token",
    initialStatus: "connected",
    description: "Automated daily engineering streaks and portfolio sync",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Instant Alerts",
    icon: MessageCircle,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    type: "token",
    initialStatus: "disconnected",
    description: "Instant phone notification whenever an interview or HR response is detected",
  },
  {
    id: "naukri",
    name: "Naukri / Job Portals",
    icon: Globe,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    type: "token",
    initialStatus: "disconnected",
    description: "Automated browser dispatcher for India job boards",
  },
];

type ConnectionStatus = "connected" | "expired" | "syncing" | "disconnected";

function StatusBadge({ status }: { status: ConnectionStatus }) {
  const config = {
    connected: { label: "Active & Connected", variant: "success" as const, icon: ShieldCheck },
    expired: { label: "Token Expired", variant: "destructive" as const, icon: ShieldAlert },
    syncing: { label: "Validating...", variant: "default" as const, icon: RefreshCw },
    disconnected: { label: "Not Configured", variant: "outline" as const, icon: Shield },
  }[status];

  return (
    <Badge variant={config.variant} className="text-[10px] gap-1" dot={status === "connected"}>
      <config.icon className={cn("w-3 h-3", status === "syncing" && "animate-spin")} />
      {config.label}
    </Badge>
  );
}

function PlatformCard({ platform }: { platform: PlatformConfig }) {
  const [status, setStatus] = useState<ConnectionStatus>(platform.initialStatus);
  const [showToken, setShowToken] = useState(false);
  const [token, setToken] = useState("");
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    setStatus("syncing");
    await new Promise((r) => setTimeout(r, 1200));
    setStatus("connected");
    setConnecting(false);
  };

  const handleDisconnect = () => {
    setStatus("disconnected");
    setToken("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="hover:border-indigo-500/30 transition-all h-full flex flex-col justify-between">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 shadow-sm",
                  platform.bgColor,
                  platform.borderColor
                )}
              >
                <platform.icon className={cn("w-5 h-5", platform.color)} />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-white">{platform.name}</CardTitle>
                <CardDescription className="text-[11px] mt-0.5 leading-snug line-clamp-2">
                  {platform.description}
                </CardDescription>
              </div>
            </div>
            <StatusBadge status={status} />
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          {platform.type === "token" && status === "disconnected" && (
            <div className="mb-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <Lock className="w-3 h-3" />
                API Token / Webhook URL
              </label>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Enter API key or access token..."
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-3.5 pr-9 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
                >
                  {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
            {status === "connected" ? (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="flex-1 py-2 rounded-xl border border-slate-800 hover:bg-slate-800/60 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={cn("w-3.5 h-3.5 text-emerald-400", connecting && "animate-spin")} />
                {connecting ? "Testing Ping..." : "Test Connection"}
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="stellar-gradient-btn flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                {connecting ? "Connecting..." : "Connect Service"}
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function ConnectionsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Banner Header */}
      <div className="p-6 sm:p-7 rounded-[24px] bg-slate-900/60 border border-slate-800/80 backdrop-blur-2xl shadow-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Zero-Knowledge Encrypted Gateway
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          Integration & Service Hub
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage third-party platform connections, AI routing models, and automated dispatch credentials
        </p>
      </div>

      {/* Grid of Platform Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {PLATFORMS.map((platform) => (
          <PlatformCard key={platform.id} platform={platform} />
        ))}
      </div>
    </div>
  );
}
