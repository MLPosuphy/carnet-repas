"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";

export function Timer({ minutes }: { minutes: number }) {
  const initialSeconds = minutes * 60;
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || seconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [running, seconds]);

  const label = useMemo(() => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, [seconds]);

  return (
    <div className="flex items-center gap-2 rounded-md border border-[#e3d8c7] bg-cream px-3 py-2">
      <span className="tabular-nums text-sm font-semibold">{label}</span>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        onClick={() => setRunning((current) => !current)}
        aria-label={running ? "Pause" : "Lancer"}
      >
        {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        onClick={() => {
          setRunning(false);
          setSeconds(initialSeconds);
        }}
        aria-label="Réinitialiser"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
}
