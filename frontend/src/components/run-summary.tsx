import { ChevronDown, ChevronRight, Clock3 } from "lucide-react";
import { useEffect, useState } from "react";
import type { ActivityItem, AgentRunSummary, AgentRunUsage } from "@/types";
import { AgentActionFeed } from "./agent-action-feed";

function formatTokens(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return `${value}`;
}

function formatDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.round(milliseconds / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function RunSummary({ running, summary, usage, startedAt, activities }: { running: boolean; summary?: AgentRunSummary; usage: AgentRunUsage; startedAt?: number; activities: ActivityItem[] }) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  useEffect(() => {
    if (running) setOpen(false);
  }, [running]);
  const duration = summary?.durationMs ?? (running && startedAt ? now - startedAt : 0);
  const tokens = summary?.usage.totalTokens ?? usage.totalTokens;
  return (
    <div className="mx-auto mt-4 w-full max-w-5xl px-6">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center gap-2 border-b border-[var(--mn-line)] px-1 py-2 text-left text-sm text-muted-foreground transition-colors hover:text-foreground">
        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        <Clock3 className="size-3.5" />
        <span>{running ? "Working for" : "Worked for"} {formatDuration(duration)}</span>
        <span className="ml-auto font-mono text-[11px]">Used {formatTokens(tokens)} tokens</span>
      </button>
      {open && <AgentActionFeed activities={activities} />}
    </div>
  );
}
