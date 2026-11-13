import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-mono font-medium transition-colors select-none",
  {
    variants: {
      variant: {
        default:
          "border border-border bg-muted/60 text-muted-foreground",
        primary:
          "border border-primary/30 bg-primary/10 text-primary",
        cyan:
          "border border-primary/30 bg-primary/10 text-primary",
        secondary:
          "border border-secondary/30 bg-secondary/10 text-secondary",
        crimson:
          "border border-secondary/30 bg-secondary/10 text-secondary",
        outline:
          "border border-border text-foreground",
        glow:
          "border border-primary/40 bg-primary/10 text-primary shadow-[0_0_12px_hsla(var(--primary)/0.25)]",
        destructive:
          "border border-destructive/30 bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
