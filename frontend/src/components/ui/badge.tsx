import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors border shadow-sm",
  {
    variants: {
      variant: {
        default: "bg-indigo-500/10 text-indigo-400 border-indigo-500/25",
        success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
        warning: "bg-amber-500/10 text-amber-400 border-amber-500/25",
        destructive: "bg-rose-500/10 text-rose-400 border-rose-500/25",
        purple: "bg-purple-500/10 text-purple-400 border-purple-500/25",
        cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/25",
        outline: "bg-slate-900/60 text-slate-400 border-slate-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot = false, children, ...props }: BadgeProps) {
  const dotColor = {
    default: "bg-indigo-400",
    success: "bg-emerald-400",
    warning: "bg-amber-400",
    destructive: "bg-rose-400",
    purple: "bg-purple-400",
    cyan: "bg-cyan-400",
    outline: "bg-slate-400",
  }[variant || "default"];

  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", dotColor)} />}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
