"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Linkedin,
  Github,
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
} from "lucide-react";

interface PlatformConfig {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  type: "oauth" | "token";
  description: string;
}

const PLATFORMS: PlatformConfig[] = [
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: Linkedin,
    color: "text-sky-400",
    bgColor: "bg-sky-500/10",
    borderColor: "border-sky-500/20",
    type: "oauth",
    description: "Auto-publish personal branding posts and network outreach",
  },
  {
    id: "github",
    name: "GitHub",
    icon: Github,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
    type: "token",
    description: "Maintain daily commit streak and engineering activity logs",
  },
  {
    id: "naukri",
    name: "Naukri",
    icon: Globe,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    type: "token",
    description: "Automated job applications on India's largest job platform",
  },
  {
    id: "wellfound",
    name: "Wellfound",
    icon: Globe,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    type: "token",
    description: "Target startup roles with AI-tailored applications",
  },
];

type ConnectionStatus = "connected" | "expired" | "syncing" | "disconnected";

function StatusBadge({ status }: { status: ConnectionStatus }) {
  const config = {
    connected: { label: "Connected", variant: "success" as const, icon: ShieldCheck },
    expired: { label: "Token Expired", variant: "destructive" as const, icon: ShieldAlert },
    syncing: { label: "Syncing", variant: "default" as const, icon: RefreshCw },
    disconnected: { label: "Not Connected", variant: "outline" as const, icon: Shield },
  }[status];

  return (
    <Badge variant={config.variant} className="text-[10px] gap-1">
      <config.icon className={cn("w-3 h-3", status === "syncing" && "animate-spin")} />
      {config.label}
    </Badge>
  );
}

function PlatformCard({ platform }: { platform: PlatformConfig }) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [showToken, setShowToken] = useState(false);
  const [token, setToken] = useState("");
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    setStatus("syncing");
    // Simulate connection
    await new Promise((r) => setTimeout(r, 2000));
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
      transition={{ duration: 0.3 }}
    >
      <Card className="hover:border-white/[0.1] transition-all">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-11 h-11 rounded-xl border flex items-center justify-center",
                  platform.bgColor,
                  platform.borderColor
                )}
              >
                <platform.icon className={cn("w-5 h-5", platform.color)} />
              </div>
              <div>
                <CardTitle className="text-sm">{platform.name}</CardTitle>
                <CardDescription className="text-[11px] mt-0.5">{platform.description}</CardDescription>
              </div>
            </div>
            <StatusBadge status={status} />
          </div>
        </CardHeader>
        <CardContent>
          {platform.type === "token" && (
            <div className="mb-4">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Lock className="w-3 h-3" />
                API Token / Credential
              </label>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Enter API token..."
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-4 pr-10 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 transition-all font-mono"
                />
                <button
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
                >
                  {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            {status === "connected" ? (
              <>
                <button
                  onClick={handleDisconnect}
                  className="flex-1 py-2 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Disconnect
                </button>
                <button className="p-2 rounded-xl border border-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer">
                  <ExternalLink className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={handleConnect}
                disabled={connecting || (platform.type === "token" && !token)}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40",
                  "bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-lg shadow-sky-500/10"
                )}
              >
                {connecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : status === "connected" ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                {connecting ? "Connecting..." : "Connect"}
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Integration Hub</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage third-party platform connections and authentication credentials
        </p>
      </div>

      {/* Security Notice */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-sky-500/[0.04] border border-sky-500/10">
        <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0" />
        <p className="text-xs text-slate-400">
          <span className="text-sky-400 font-semibold">End-to-end encryption</span> — All tokens and
          credentials are encrypted at rest and transmitted securely via the Requesty AI Gateway.
        </p>
      </div>

      {/* Platform Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLATFORMS.map((platform) => (
          <PlatformCard key={platform.id} platform={platform} />
        ))}
      </div>
    </div>
  );
}
