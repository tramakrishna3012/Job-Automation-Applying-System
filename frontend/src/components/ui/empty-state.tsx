import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-[20px] bg-slate-900/40 border border-dashed border-slate-800/80",
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3 shadow-md">
        <Icon className="w-6 h-6 stroke-[1.5]" />
      </div>
      <h4 className="text-sm font-bold text-white tracking-tight">{title}</h4>
      <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
        >
          {action.icon && <action.icon className="w-3.5 h-3.5" />}
          {action.label}
        </button>
      )}
    </div>
  );
}
