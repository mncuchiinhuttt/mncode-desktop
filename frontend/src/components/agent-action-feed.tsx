import {
  CheckCircle2,
  CircleX,
  FilePenLine,
  Loader2,
  Sparkles,
  SquareTerminal,
  UsersRound,
  Wrench,
} from "lucide-react";
import type { ActivityItem } from "@/types";

function iconFor(item: ActivityItem) {
  if (item.kind === "file") return FilePenLine;
  if (item.kind === "command") return SquareTerminal;
  if (item.kind === "subagent") return UsersRound;
  if (item.kind === "tool") return Wrench;
  return Sparkles;
}

export function AgentActionFeed({ activities }: { activities: ActivityItem[] }) {
  const items = activities.filter((item) => item.kind !== "subagent").reverse();
  if (items.length === 0) return null;
  return (
    <div
      aria-label="Agent actions"
      aria-live="polite"
      className="mx-auto mt-4 w-full max-w-5xl space-y-1.5 px-6"
    >
      {items.map((item) => {
        const Icon = iconFor(item);
        const done = item.status === "complete" || !item.active;
        const error = item.status === "error";
        return (
          <div
            key={item.id}
            className="flex items-center gap-2 rounded-lg border border-[var(--mn-line)]/70 bg-[var(--mn-surface)]/80 px-3 py-2 text-xs shadow-sm"
          >
            <span
              className={
                "grid size-5 shrink-0 place-items-center rounded-md " +
                (error
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-300"
                  : item.kind === "subagent"
                    ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300"
                    : "bg-[var(--mn-accent-soft)] text-[var(--mn-accent-strong)]")
              }
            >
              {item.active ? (
                <Loader2 className="size-3 animate-spin" />
              ) : error ? (
                <CircleX className="size-3" />
              ) : done ? (
                <CheckCircle2 className="size-3" />
              ) : (
                <Icon className="size-3" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{item.label}</span>
              {item.detail && (
                <span className="mt-0.5 block truncate text-[0.6875rem] text-muted-foreground">
                  {item.detail}
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
