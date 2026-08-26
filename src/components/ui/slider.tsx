import * as SliderPrimitive from "@radix-ui/react-slider";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Slider({
  className,
  trackClassName,
  ...props
}: ComponentProps<typeof SliderPrimitive.Root> & {
  trackClassName?: string;
}) {
  return (
    <SliderPrimitive.Root
      className={cn(
        "relative flex h-11 w-full touch-none items-center select-none",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        className={cn(
          "relative h-1.5 grow overflow-hidden rounded-full bg-raised",
          trackClassName,
        )}
      >
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block size-6 rounded-full border border-border bg-fg shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/70" />
    </SliderPrimitive.Root>
  );
}
