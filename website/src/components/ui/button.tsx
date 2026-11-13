import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-xs font-mono font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-foreground text-background shadow-sm hover:opacity-90 active:scale-[0.98]",
        primary:
          "bg-primary text-primary-foreground shadow-sm hover:brightness-110 active:scale-[0.98] font-semibold",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:brightness-110 active:scale-[0.98] font-semibold",
        outline:
          "border border-border bg-card/60 text-foreground hover:bg-muted/80 hover:border-foreground/20 active:scale-[0.98]",
        ghost:
          "text-muted-foreground hover:text-foreground hover:bg-muted/60",
        link: "text-primary underline-offset-4 hover:underline",
        subtle:
          "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-7.5 px-3 text-[11px]",
        lg: "h-11 px-6 text-sm font-semibold",
        icon: "h-8.5 w-8.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
