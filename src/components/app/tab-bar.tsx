import { AudioLines, House, Lamp, Layers, SlidersHorizontal } from "lucide-react";
import type { TabId } from "@/lib/dsp/types";
import { cn } from "@/lib/utils";

const TABS: { id: TabId; label: string; icon: typeof House }[] = [
  { id: "home", label: "Home", icon: House },
  { id: "eq", label: "EQ", icon: AudioLines },
  { id: "xover", label: "X-Over", icon: Layers },
  { id: "light", label: "Light", icon: Lamp },
  { id: "amp", label: "Amp", icon: SlidersHorizontal },
];

export function TabBar({
  tab,
  onChange,
}: {
  tab: TabId;
  onChange: (id: TabId) => void;
}) {
  return (
    <nav className="safe-bottom border-t border-border bg-surface px-2 pt-1">
      <ul className="grid grid-cols-5">
        {TABS.map((item) => {
          const active = item.id === tab;
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onChange(item.id)}
                className={cn(
                  "flex h-14 w-full flex-col items-center justify-center gap-1 text-2xs",
                  active ? "text-primary" : "text-muted",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} />
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
