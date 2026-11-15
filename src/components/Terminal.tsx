"use client";

import { useEffect, useRef } from "react";
import type { LogLevel } from "@/lib/types";

export interface LogLine {
  id: number;
  level: LogLevel;
  message: string;
  time: string;
}

const COLORS: Record<LogLevel, string> = {
  info: "text-zinc-300",
  success: "text-emerald-400",
  warn: "text-amber-400",
  error: "text-red-400",
};

export default function Terminal({ logs, running }: { logs: LogLine[]; running: boolean }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [logs]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-black/60">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <span className="text-sm font-medium text-zinc-300">Agent log</span>
        <span className="flex items-center gap-2 text-xs text-zinc-500">
          <span className={`h-2 w-2 rounded-full ${running ? "animate-pulse bg-emerald-400" : "bg-zinc-600"}`} />
          {running ? "Hunting" : "Idle"}
        </span>
      </div>
      <div className="h-56 overflow-y-auto px-4 py-3 font-mono text-[13px] leading-6" aria-live="polite">
        {logs.length === 0 ? (
          <p className="text-zinc-600">Pick a niche and launch a hunt. Each pipeline step will show up here.</p>
        ) : (
          logs.map((l) => (
            <div key={l.id} className={COLORS[l.level]}>
              <span className="mr-2 text-zinc-600">{l.time}</span>
              {l.message}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
