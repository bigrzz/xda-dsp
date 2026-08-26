import * as SwitchPrimitive from "@radix-ui/react-switch";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Switch({
  className,
  ...props
}: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-border bg-raised transition-colors",
        "data-[state=checked]:bg-primary data-[state=checked]:border-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-5 translate-x-0.5 rounded-full bg-fg transition-transform data-[state=checked]:translate-x-6 data-[state=checked]:bg-primary-fg" />
    </SwitchPrimitive.Root>
  );
}
