import { cn } from "@/lib/utils";

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex rounded-lg bg-raised p-1"
    >
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className={cn(
              "h-9 flex-1 rounded-md px-2 text-sm font-medium transition-colors duration-150",
              active ? "bg-surface text-fg" : "text-muted",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
