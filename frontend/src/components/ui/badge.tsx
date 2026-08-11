import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors border",
  {
    variants: {
      variant: {
        default: "bg-sky-500/10 text-sky-400 border-sky-500/30",
        success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        warning: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        destructive: "bg-red-500/10 text-red-400 border-red-500/30",
        outline: "bg-transparent text-slate-400 border-slate-600",
        purple: "bg-purple-500/10 text-purple-400 border-purple-500/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
