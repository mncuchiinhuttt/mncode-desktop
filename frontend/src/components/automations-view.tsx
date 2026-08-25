import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  Clock3,
  FileText,
  Info,
  ListTodo,
  Pencil,
  Play,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listen, desktop } from "@/lib/desktop";
import { cn } from "@/lib/utils";
import type { Automation, AutomationInput, WorkspaceInfo } from "@/types";

type AutomationKind = "scheduled" | "idle";

interface AutomationTemplate {
  icon: typeof ListTodo;
  title: string;
  text: string;
  scheduleLabel: string;
  cron?: string;
  prompt: string;
}

const IDLE_TEMPLATES: AutomationTemplate[] = [
  {
    icon: ListTodo,
    title: "Standup Git Summary",
    text: "A Friday summary of what happened this week.",
    scheduleLabel: "Soonest available",
    prompt:
      "Review this week's git history and summarize what changed, why it matters, and anything left unfinished. Group by feature, call out blockers, and list follow-ups for Monday.",
  },
  {
    icon: Activity,
    title: "CI Failures & Flaky Test Report",
    text: "A report on recent CI failures, flaky tests, and likely causes.",
    scheduleLabel: "Soonest available",
    prompt:
      "Inspect recent CI failures and flaky tests. For each failure report the failing test, the error, the likely root cause, and a suggested fix. Order by impact.",
  },
  {
    icon: FileText,
    title: "Documentation sync check",
    text: "Check whether README files, docs, configuration guidance, and usage examples match the current code.",
    scheduleLabel: "Soonest available",
    prompt:
      "Check whether README files, docs, configuration guidance, and usage examples match the current code. Report every mismatch with file paths and suggested corrections.",
  },
];

const SCHEDULED_TEMPLATES: AutomationTemplate[] = [
  {
    icon: CalendarClock,
    title: "Morning dev brief",
    text: "Summarize commits, module changes, and follow-ups since the previous workday.",
    scheduleLabel: "Weekdays at 09:00",
    cron: "0 9 * * 1-5",
    prompt:
      "Summarize commits, module changes, and open follow-ups since the previous workday. Highlight anything that blocks today's work.",
  },
  {
    icon: Activity,
    title: "Risk scan",
    text: "Inspect changes from the last 24 hours and report high-confidence risks.",
    scheduleLabel: "Daily at 10:00",
    cron: "0 10 * * *",
    prompt:
      "Inspect changes from the last 24 hours and report high-confidence risks with direct evidence: security issues, regressions, missing tests, and unsafe patterns.",
  },
  {
    icon: FileText,
    title: "Release brief",
    text: "Draft release notes from merged changes and open items.",
    scheduleLabel: "Mondays at 09:00",
    cron: "0 9 * * 1",
    prompt:
      "Draft release notes from changes merged since the last release tag: features, fixes, breaking changes, and upgrade notes.",
  },
];

/** Humanize the small set of cron specs the UI produces; fall back to raw. */
function humanizeCron(spec: string): string {
  const dayNames: Record<string, string> = {
    "0": "Sundays",
    "1": "Mondays",
    "2": "Tuesdays",
    "3": "Wednesdays",
    "4": "Thursdays",
    "5": "Fridays",
    "6": "Saturdays",
    "1-5": "Weekdays",
    "0,6": "Weekends",
  };
  if (spec === "@daily") return "Daily";
  if (spec.startsWith("@every ")) return `Every ${spec.slice(7)}`;
  const match = spec.match(/^(\d{1,2}) (\d{1,2}) \* \* (\S+)$/);
  if (!match) return spec;
  const [, minute, hour, days] = match;
  const clock = `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  const dayLabel = dayNames[days];
  if (!dayLabel) return spec;
  return `${dayLabel} at ${clock}`;
}

function formatRelative(millis: number): string {
  if (!millis) return "never";
  const seconds = Math.max(0, Math.round((Date.now() - millis) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function AutomationsView({ workspace }: { workspace: WorkspaceInfo }) {
  const [automations, setAutomations] = useState<Automation[]>();
  const [keepAwake, setKeepAwake] = useState(false);
  const [runningId, setRunningId] = useState("");
  const [dialog, setDialog] = useState<
    | { mode: "create"; kind: AutomationKind; template?: AutomationTemplate }
    | { mode: "edit"; automation: Automation }
    | undefined
  >();
  const [deleteTarget, setDeleteTarget] = useState<Automation>();

  const load = useCallback(async () => {
    try {
      setAutomations(await desktop.listAutomations());
    } catch {
      setAutomations([]);
    }
  }, []);

  useEffect(() => {
    void load();
    void desktop
      .getKeepAwake()
      .then(setKeepAwake)
      .catch(() => undefined);
    const offUpdated = listen("automation:updated", () => void load());
    const offRun = listen("automation:run", (payload: { id?: string; status?: string }) => {
      if (payload?.status === "running" && payload.id) setRunningId(payload.id);
      if (payload?.status !== "running") setRunningId("");
      void load();
    });
    return () => {
      offUpdated();
      offRun();
    };
  }, [load]);

  const changeKeepAwake = async (enabled: boolean) => {
    setKeepAwake(enabled);
    try {
      await desktop.setKeepAwake(enabled);
    } catch {
      setKeepAwake(!enabled);
    }
  };

  const templates = useMemo(() => (automations ?? []).length === 0, [automations]);

  return (
    <div className="mn-page-in mx-auto max-w-4xl px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <p className="eyebrow-badge mb-3">[ Automations ]</p>
        <h1 className="text-3xl font-extralight tracking-tight text-foreground">Automations</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Schedule recurring tasks or queue background work that runs during idle time.
        </p>
      </div>

      {/* Keep-awake preference */}
      <div className="mb-8 flex items-center justify-between gap-4 rounded-lg border border-[var(--mn-line)] bg-[var(--mn-surface-muted)] px-4 py-3">
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <Info className="size-4 shrink-0 text-[var(--mn-accent)]" />
          Keep your computer awake while mncode is running a chat.
        </div>
        <Toggle
          size="sm"
          pressed={keepAwake}
          onPressedChange={(value) => void changeKeepAwake(value)}
          aria-label="Toggle keep awake"
        />
      </div>

      {/* Empty state with templates */}
      {templates && automations ? (
        <div className="space-y-8">
          <div className="grid min-h-48 place-items-center rounded-lg border border-dashed border-[var(--mn-line)] p-8 text-center">
            <div>
              <p className="text-sm text-muted-foreground">No automations yet.</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <Button
                  className="mn-accent-button"
                  onClick={() => setDialog({ mode: "create", kind: "scheduled" })}
                >
                  <Plus className="mr-2 size-3.5" />
                  Create scheduled task
                </Button>
                <Button
                  variant="outline"
                  className="border-[var(--mn-line)]"
                  onClick={() => setDialog({ mode: "create", kind: "idle" })}
                >
                  <Plus className="mr-2 size-3.5" />
                  Create idle-time task
                </Button>
              </div>
            </div>
          </div>

          <TemplateGallery
            title="Idle-time templates"
            templates={IDLE_TEMPLATES}
            onPick={(template) => setDialog({ mode: "create", kind: "idle", template })}
          />
          <TemplateGallery
            title="Scheduled templates"
            templates={SCHEDULED_TEMPLATES}
            onPick={(template) => setDialog({ mode: "create", kind: "scheduled", template })}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {(automations ?? []).map((automation) => (
            <AutomationCard
              key={automation.id}
              automation={automation}
              running={runningId === automation.id}
              onToggle={(enabled) =>
                void desktop.toggleAutomation(automation.id, enabled).catch(() => undefined)
              }
              onRun={() => void desktop.runAutomationNow(automation.id).catch(() => undefined)}
              onEdit={() => setDialog({ mode: "edit", automation })}
              onDelete={() => setDeleteTarget(automation)}
            />
          ))}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              className="border-[var(--mn-line)]"
              onClick={() => setDialog({ mode: "create", kind: "scheduled" })}
            >
              <Plus className="mr-2 size-3.5" />
              New scheduled task
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-[var(--mn-line)]"
              onClick={() => setDialog({ mode: "create", kind: "idle" })}
            >
              <Plus className="mr-2 size-3.5" />
              New idle-time task
            </Button>
          </div>
        </div>
      )}

      {/* Create / edit dialog */}
      {dialog && (
        <AutomationDialog
          workspace={workspace}
          mode={dialog.mode}
          kind={dialog.mode === "create" ? dialog.kind : dialog.automation.kind}
          template={dialog.mode === "create" ? dialog.template : undefined}
          edit={dialog.mode === "edit" ? dialog.automation : undefined}
          onClose={() => setDialog(undefined)}
        />
      )}

      {/* Delete confirmation */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(undefined);
        }}
      >
        <DialogContent className="border-[var(--mn-line)] bg-[var(--mn-surface)] text-foreground">
          <DialogHeader>
            <DialogTitle>Delete automation?</DialogTitle>
            <DialogDescription>
              Remove “{deleteTarget?.name}” and its run history from this computer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(undefined)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget)
                  void desktop.deleteAutomation(deleteTarget.id).catch(() => undefined);
                setDeleteTarget(undefined);
              }}
            >
              Delete automation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplateGallery({
  title,
  templates,
  onPick,
}: {
  title: string;
  templates: AutomationTemplate[];
  onPick: (template: AutomationTemplate) => void;
}) {
  return (
    <section>
      <p className="mb-3 font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {templates.map((template) => {
          const Icon = template.icon;
          return (
            <button
              key={template.title}
              type="button"
              onClick={() => onPick(template)}
              className="group rounded-lg border border-[var(--mn-line)] bg-[var(--mn-surface)] p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--mn-accent)]/50 hover:shadow-[0_14px_30px_-14px_color-mix(in_srgb,var(--mn-accent)_35%,transparent)] active:scale-[0.99]"
            >
              <div className="flex items-center gap-2.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-[var(--mn-accent-soft)] text-[var(--mn-accent-strong)] transition-transform duration-200 group-hover:scale-110">
                  <Icon className="size-3.5" />
                </span>
                <span className="truncate text-sm font-medium">{template.title}</span>
                <Plus className="ml-auto size-3.5 -translate-x-1 text-[var(--mn-accent)] opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                {template.text}
              </p>
              <p className="mt-2 font-mono text-[0.625rem] uppercase tracking-wider text-muted-foreground/70">
                {template.scheduleLabel}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function AutomationCard({
  automation,
  running,
  onToggle,
  onRun,
  onEdit,
  onDelete,
}: {
  automation: Automation;
  running: boolean;
  onToggle: (enabled: boolean) => void;
  onRun: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const runs = automation.runs ?? [];
  const lastRun = runs[0];
  return (
    <Card className="mn-surface gap-0 py-0 shadow-none transition-colors hover:border-[var(--mn-accent)]/45">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-md",
              running
                ? "bg-[var(--mn-accent)] text-white"
                : "bg-[var(--mn-accent-soft)] text-[var(--mn-accent-strong)]",
            )}
          >
            {automation.kind === "scheduled" ? (
              <CalendarClock className="size-4" />
            ) : (
              <Clock3 className="size-4" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold">{automation.name}</h3>
              <Badge
                variant="outline"
                className={cn(
                  "text-[0.5625rem] uppercase tracking-widest",
                  automation.kind === "scheduled"
                    ? "border-[var(--mn-cyan)]/40 text-[var(--mn-cyan)]"
                    : "border-[var(--mn-accent)]/40 text-[var(--mn-accent)]",
                )}
              >
                {automation.kind}
              </Badge>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span className="font-mono">
                {automation.kind === "scheduled"
                  ? humanizeCron(automation.schedule)
                  : "Soonest available"}
              </span>
              {automation.workspace ? (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="truncate">in {automation.workspace}</span>
                </>
              ) : (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  <span>standalone</span>
                </>
              )}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground">
              {running ? (
                <>
                  <span className="size-1.5 animate-pulse rounded-full bg-[var(--mn-accent)]" />
                  Running now…
                </>
              ) : lastRun ? (
                <>
                  {lastRun.status === "success" ? (
                    <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                  ) : lastRun.status === "skipped" ? (
                    <CircleDashed className="size-3 text-muted-foreground" />
                  ) : (
                    <AlertCircle className="size-3 text-rose-600 dark:text-rose-400" />
                  )}
                  <span>
                    Last run {formatRelative(lastRun.startedAt)} — {lastRun.status}
                  </span>
                </>
              ) : (
                <>
                  <Clock3 className="size-3" />
                  <span>Never run</span>
                </>
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Toggle
              size="sm"
              pressed={automation.enabled}
              onPressedChange={onToggle}
              aria-label={`Toggle ${automation.name}`}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={running}
              onClick={onRun}
              aria-label={`Run ${automation.name} now`}
            >
              <Play className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onEdit}
              aria-label={`Edit ${automation.name}`}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-rose-600 hover:text-rose-700"
              onClick={onDelete}
              aria-label={`Delete ${automation.name}`}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Run history */}
        {runs.length > 0 && (
          <div className="mt-3 border-t border-[var(--mn-line)] pt-2">
            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              aria-expanded={expanded}
            >
              {expanded ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )}
              Run history ({automation.runCount})
            </button>
            {expanded && (
              <div className="mt-2 space-y-1.5">
                {runs.slice(0, 5).map((run, index) => (
                  <div
                    key={`${run.startedAt}-${index}`}
                    className="flex items-start gap-2 rounded-md bg-[var(--mn-surface-muted)] px-2.5 py-1.5 text-xs"
                  >
                    {run.status === "success" ? (
                      <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : run.status === "skipped" ? (
                      <CircleDashed className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                    ) : (
                      <AlertCircle className="mt-0.5 size-3 shrink-0 text-rose-600 dark:text-rose-400" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2">
                        <span className="font-medium">{run.status}</span>
                        <span className="text-[0.625rem] text-muted-foreground">
                          {formatRelative(run.startedAt)} · {(run.durationMs / 1000).toFixed(1)}s
                        </span>
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[0.6875rem] leading-4 text-muted-foreground">
                        {run.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AutomationDialog({
  workspace,
  mode,
  kind,
  template,
  edit,
  onClose,
}: {
  workspace: WorkspaceInfo;
  mode: "create" | "edit";
  kind: AutomationKind;
  template?: AutomationTemplate;
  edit?: Automation;
  onClose: () => void;
}) {
  const [name, setName] = useState(edit?.name ?? template?.title ?? "");
  const [prompt, setPrompt] = useState(edit?.prompt ?? template?.prompt ?? "");
  const [schedule, setSchedule] = useState(edit?.schedule ?? template?.cron ?? "0 9 * * 1-5");
  const [customCron, setCustomCron] = useState(
    edit && !SCHEDULED_PRESETS.some((preset) => preset.cron === edit.schedule) ? edit.schedule : "",
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const effectiveKind = mode === "edit" ? edit!.kind : kind;
  const schedulePresets = useMemo(() => SCHEDULED_PRESETS, []);

  async function submit() {
    setSaving(true);
    setError("");
    const input: AutomationInput = {
      name,
      prompt,
      kind: effectiveKind,
      schedule: effectiveKind === "scheduled" ? schedule : "",
      workspace: workspace.ready ? workspace.path : "",
      enabled: edit?.enabled ?? true,
    };
    try {
      if (mode === "edit" && edit) {
        await desktop.updateAutomation(edit.id, input);
      } else {
        await desktop.createAutomation(input);
      }
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-[var(--mn-line)] bg-[var(--mn-surface)] text-foreground sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-[var(--mn-accent-strong)]" />
            {mode === "edit"
              ? "Edit automation"
              : effectiveKind === "scheduled"
                ? "New scheduled task"
                : "New idle-time task"}
          </DialogTitle>
          <DialogDescription>
            {effectiveKind === "scheduled"
              ? "Runs automatically on a schedule, even while the app is in the background."
              : "Runs whenever the app is idle and no agent turn is active."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium" htmlFor="automation-name">
              Name
            </label>
            <input
              id="automation-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Morning dev brief"
              maxLength={80}
              className="h-9 w-full rounded-md border border-[var(--mn-line)] bg-[var(--mn-surface-muted)] px-3 text-sm outline-none focus:border-[var(--mn-accent)]"
            />
          </div>

          {effectiveKind === "scheduled" && (
            <div>
              <label className="mb-1.5 block text-xs font-medium" htmlFor="automation-schedule">
                Schedule
              </label>
              <div className="flex flex-wrap gap-2">
                {schedulePresets.map((preset) => (
                  <button
                    key={preset.cron}
                    type="button"
                    onClick={() => {
                      setSchedule(preset.cron);
                      setCustomCron("");
                    }}
                    className={cn(
                      "rounded-md border px-2.5 py-1 font-mono text-xs transition-colors",
                      schedule === preset.cron && !customCron
                        ? "border-[var(--mn-accent)] bg-[var(--mn-accent-soft)] text-[var(--mn-accent-strong)]"
                        : "border-[var(--mn-line)] text-muted-foreground hover:border-[var(--mn-accent)]",
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCustomCron(schedule)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 font-mono text-xs transition-colors",
                    customCron
                      ? "border-[var(--mn-accent)] bg-[var(--mn-accent-soft)] text-[var(--mn-accent-strong)]"
                      : "border-[var(--mn-line)] text-muted-foreground hover:border-[var(--mn-accent)]",
                  )}
                >
                  Custom
                </button>
              </div>
              {customCron ? (
                <input
                  value={customCron}
                  onChange={(event) => {
                    setCustomCron(event.target.value);
                    setSchedule(event.target.value);
                  }}
                  placeholder="*/30 * * * *"
                  className="mt-2 h-9 w-full rounded-md border border-[var(--mn-line)] bg-[var(--mn-surface-muted)] px-3 font-mono text-sm outline-none focus:border-[var(--mn-accent)]"
                />
              ) : (
                <p className="mt-1.5 font-mono text-[0.625rem] text-muted-foreground">{schedule}</p>
              )}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium" htmlFor="automation-prompt">
              Prompt
            </label>
            <textarea
              id="automation-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={5}
              maxLength={20000}
              placeholder="What should the agent do on every run?"
              className="w-full resize-y rounded-md border border-[var(--mn-line)] bg-[var(--mn-surface-muted)] px-3 py-2.5 text-sm outline-none focus:border-[var(--mn-accent)]"
            />
          </div>

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Runs in:</span>
            {workspace.ready ? workspace.name : "Standalone (no workspace)"}
          </p>

          {error && (
            <p className="rounded-md border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-600 dark:text-rose-300">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="mn-accent-button"
            disabled={saving || !name.trim() || !prompt.trim()}
            onClick={() => void submit()}
          >
            {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Create automation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const SCHEDULED_PRESETS = [
  { label: "Weekdays 09:00", cron: "0 9 * * 1-5" },
  { label: "Daily 10:00", cron: "0 10 * * *" },
  { label: "Mondays 09:00", cron: "0 9 * * 1" },
];
