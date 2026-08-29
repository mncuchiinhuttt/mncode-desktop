import {
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  FilePenLine,
  Layers,
  List,
  Loader2,
  MessageCircle,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import type { ActivityItem } from "@/types";
import { DiffView } from "./diff-view";
import { SubagentSwarmVisualizer } from "./subagent-swarm-visualizer";
import { Button } from "@/components/ui/button";
function statusIcon(item: ActivityItem) {
  if (item.active) return <Loader2 className="size-3 animate-spin" />;
  if (item.status === "error") return <CircleDashed className="size-3" />;
  return <CheckCircle2 className="size-3" />;
}

function Conversation({ label, content }: { label: string; content: string }) {
  return (
    <div className="rounded-lg bg-[var(--mn-surface-muted)] px-3 py-2">
      <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap break-words text-[0.75rem] leading-5 text-foreground/80">
        {content}
      </p>
    </div>
  );
}

function SubagentCard({ item }: { item: ActivityItem }) {
  const [open, setOpen] = useState(false);
  const result =
    item.subagentResult ||
    (item.active ? "Subagent is working…" : item.detail || "No response recorded.");
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--mn-line)] bg-[var(--mn-surface)]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-[var(--mn-surface-muted)]"
        aria-expanded={open}
      >
        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
          {statusIcon(item)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold">
            {item.subagentName || item.label}
          </span>
          <span className="mt-0.5 block truncate text-[0.6875rem] text-muted-foreground">
            {item.subagentRole || "Delegated subagent"}
          </span>
        </span>
        {open ? (
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="space-y-2 border-t border-[var(--mn-line)] px-3 pb-3 pt-2">
          <Conversation
            label="Main agent → subagent"
            content={item.subagentPrompt || "No delegation prompt recorded."}
          />
          <Conversation label="Subagent → main agent" content={result} />
        </div>
      )}
    </div>
  );
}

function EditedFileCard({ item }: { item: ActivityItem }) {
  const [open, setOpen] = useState(false);
  const hasSnippet = Boolean(item.beforeSnippet || item.afterSnippet);
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--mn-line)] bg-[var(--mn-surface)]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-[var(--mn-surface-muted)]"
        aria-expanded={open}
      >
        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-[var(--mn-accent-soft)] text-[var(--mn-accent-strong)]">
          <FilePenLine className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-[0.6875rem] text-foreground/80">
          {item.filePath}
        </span>
        <span className="shrink-0 font-mono text-[0.6875rem]">
          <span className="text-emerald-600">+{item.linesAdded ?? 0}</span>{" "}
          <span className="text-rose-600">-{item.linesRemoved ?? 0}</span>
        </span>
        {hasSnippet &&
          (open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />)}
      </button>
      {open && hasSnippet && (
        <div className="border-t border-[var(--mn-line)] p-2">
          <DiffView before={item.beforeSnippet ?? ""} after={item.afterSnippet ?? ""} />
        </div>
      )}
    </div>
  );
}

export function AgentRunPanel({ activities }: { activities: ActivityItem[] }) {
  const [viewMode, setViewMode] = useState<"list" | "swarm">("swarm");
  const subagents = activities
    .filter((item) => item.kind === "subagent")
    .slice()
    .reverse();
  const editedFiles = activities
    .filter((item) => item.kind === "file" && item.status === "complete" && item.filePath)
    .slice()
    .reverse();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <UsersRound className="size-3.5 text-cyan-600 dark:text-cyan-300" />
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Subagents & Swarm
          </p>
        </div>
        <div className="flex rounded-md border border-[var(--mn-line)] p-0.5 bg-[var(--mn-surface-muted)]">
          <Button
            variant={viewMode === "swarm" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("swarm")}
            className={viewMode === "swarm" ? "h-6 px-2 text-[0.6875rem] mn-accent-button" : "h-6 px-2 text-[0.6875rem]"}
          >
            <Layers className="mr-1 size-3" />
            Swarm
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className={viewMode === "list" ? "h-6 px-2 text-[0.6875rem] mn-accent-button" : "h-6 px-2 text-[0.6875rem]"}
          >
            <List className="mr-1 size-3" />
            List
          </Button>
        </div>
      </div>

      {viewMode === "swarm" ? (
        <div className="h-[380px] rounded-xl border border-[var(--mn-line)] overflow-hidden shadow-sm">
          <SubagentSwarmVisualizer activities={activities} running={activities.some(a => a.active)} />
        </div>
      ) : (
        <>
          {subagents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--mn-line)] px-3 py-6 text-center text-xs text-muted-foreground">
              <MessageCircle className="mx-auto size-4" />
              <p className="mt-2">No subagents spawned yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {subagents.map((item) => (
                <SubagentCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </>
      )}

      <div className="flex items-center gap-2 px-1 pt-2">
        <FilePenLine className="size-3.5 text-[var(--mn-accent-strong)]" />
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Edited files
        </p>
        <span className="ml-auto font-mono text-[0.6875rem] text-muted-foreground">
          {editedFiles.length.toString().padStart(2, "0")}
        </span>
      </div>
      {editedFiles.length > 0 ? (
        <div className="space-y-2">
          {editedFiles.map((item) => (
            <EditedFileCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-[var(--mn-line)] px-3 py-4 text-center text-xs text-muted-foreground">
          No file edits yet.
        </div>
      )}
    </div>
  );
}
