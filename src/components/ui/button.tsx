import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium select-none pressable disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-fg",
        secondary: "bg-raised text-fg border border-border",
        ghost: "bg-transparent text-fg",
        subtle: "bg-surface text-fg border border-border",
      },
      size: {
        md: "h-11 px-5 rounded-lg text-sm",
        sm: "h-9 px-3 rounded-md text-sm",
        lg: "h-12 px-6 rounded-xl text-sm",
        icon: "size-11 rounded-lg",
        pill: "h-9 px-3.5 rounded-full text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
