import { useEffect, useState } from "react";
import { Video, GitFork, RefreshCw, Play, Clock, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { desktop } from "@/lib/desktop";
import type { ReplayTrace, ReplayTraceDetail } from "@/types";

export function ReplayView() {
  const [traces, setTraces] = useState<ReplayTrace[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<ReplayTraceDetail | null>(null);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [forking, setForking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forkSuccess, setForkSuccess] = useState<string | null>(null);

  const fetchTraces = async () => {
    try {
      const list = await desktop.listReplayTraces();
      setTraces(list || []);
      if (list && list.length > 0 && !selectedId) {
        handleSelectTrace(list[0].id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load traces");
    }
  };

  const handleSelectTrace = async (id: string) => {
    setSelectedId(id);
    setError(null);
    try {
      const d = await desktop.getReplayTrace(id);
      setDetail(d);
      setStepIndex(d.events.length > 0 ? d.events.length - 1 : 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load trace details");
    }
  };

  const handleFork = async () => {
    if (!selectedId || !detail) return;
    setForking(true);
    setError(null);
    setForkSuccess(null);
    try {
      const newID = `fork-${Date.now().toString(36)}`;
      await desktop.forkReplaySession(selectedId, stepIndex + 1, newID);
      setForkSuccess(`Forked new active session: ${newID}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fork failed");
    } finally {
      setForking(false);
    }
  };

  useEffect(() => {
    fetchTraces();
  }, []);

  const activeEvent = detail?.events?.[stepIndex];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--background)] p-6 text-[var(--foreground)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--mn-line)] pb-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg border border-[var(--mn-line)] bg-[var(--card)] text-[var(--mn-accent)]">
            <Video className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Flight Recorder & Time-Travel</h1>
            <p className="text-xs text-muted-foreground">
              Inspect agent reasoning step-by-step and fork new conversation branches.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleFork}
            disabled={forking || !detail}
            className="bg-[var(--mn-accent)] text-white hover:bg-[var(--mn-accent-strong)]"
          >
            <GitFork className={`size-3.5 ${forking ? "animate-spin" : ""}`} />
            Fork At Step {stepIndex + 1}
          </Button>
        </div>
      </div>

      {forkSuccess && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
          <CheckCircle2 className="size-4 shrink-0" />
          {forkSuccess}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Main Grid */}
      <div className="mt-6 grid min-h-0 flex-1 grid-cols-12 gap-6">
        {/* Left: Traces */}
        <div className="col-span-4 flex flex-col rounded-lg border border-[var(--mn-line)] bg-[var(--card)]">
          <div className="border-b border-[var(--mn-line)] px-4 py-3 text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
            Recorded Traces ({traces.length})
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2 space-y-1">
            {traces.length === 0 ? (
              <p className="p-4 text-center text-xs text-muted-foreground">No flight traces found</p>
            ) : (
              traces.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTrace(t.id)}
                  className={`flex w-full flex-col rounded-md px-3 py-2 text-left transition-colors ${
                    selectedId === t.id
                      ? "bg-[var(--mn-accent-soft)] border border-[var(--mn-accent)]"
                      : "hover:bg-[var(--mn-surface-muted)] text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-[var(--foreground)]">{t.id}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{t.events} events</span>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground truncate">
                    Model: {t.model || "default"}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Step Scrubber & Payload */}
        <div className="col-span-8 flex flex-col rounded-lg border border-[var(--mn-line)] bg-[var(--card)]">
          {detail ? (
            <>
              {/* Scrubber Controls */}
              <div className="flex items-center justify-between border-b border-[var(--mn-line)] px-4 py-3">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-[var(--mn-cyan)]" />
                  <span className="font-mono text-xs font-semibold">
                    Step {stepIndex + 1} of {detail.events.length}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, detail.events.length - 1)}
                  value={stepIndex}
                  onChange={(e) => setStepIndex(Number(e.target.value))}
                  className="w-64 accent-[var(--mn-accent)] cursor-pointer"
                />
              </div>

              {/* Event Card */}
              <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
                {activeEvent ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[var(--mn-accent-soft)] px-2 py-0.5 text-[var(--mn-accent)] font-bold">
                        {activeEvent.kind}
                      </span>
                      <span className="text-muted-foreground">Turn #{activeEvent.turn}</span>
                    </div>
                    <pre className="max-h-96 overflow-y-auto rounded-md bg-black p-3.5 text-zinc-300 whitespace-pre-wrap">
                      {typeof activeEvent.data === "string"
                        ? activeEvent.data
                        : JSON.stringify(activeEvent.data, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No events recorded in this trace</p>
                )}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Select a recorded trace to begin inspection.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
