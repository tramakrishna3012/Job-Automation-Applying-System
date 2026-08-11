import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(dateString: string | null | undefined): string {
  if (!dateString) return "";
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getMatchScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
}

export function getStatusVariant(status: string): "default" | "success" | "warning" | "destructive" {
  const s = status.toLowerCase();
  if (s.includes("applied") || s.includes("success")) return "success";
  if (s.includes("interview")) return "default";
  if (s.includes("expired") || s.includes("reject")) return "destructive";
  return "warning";
}
