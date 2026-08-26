import { createFileRoute } from "@tanstack/react-router";
import { DspApp } from "@/components/app/dsp-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <div className="flex min-h-svh justify-center bg-bg text-fg">
      <DspApp />
    </div>
  );
}
