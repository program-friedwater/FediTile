import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-foreground hover:bg-accent/80 hover:text-accent-foreground",
        destructive: "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20",
        ghost: "border-transparent bg-transparent text-foreground hover:bg-accent/80 hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        icon: "h-9 w-9 rounded-full p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const BaseButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
BaseButton.displayName = "Button";

type LegacyButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "danger";
  children: React.ReactNode;
};

export function Button({ variant = "default", type = "button", ...props }: LegacyButtonProps) {
  return <BaseButton type={type} variant={variant === "danger" ? "destructive" : "default"} {...props} />;
}

export function IconButton({ variant = "default", type = "button", ...props }: LegacyButtonProps) {
  return (
    <BaseButton
      type={type}
      size="icon"
      variant={variant === "danger" ? "destructive" : "ghost"}
      {...props}
    />
  );
}

export { BaseButton, buttonVariants };
