import { useState } from "react";
import { Swords, Play, Shield, Bug, Wrench, AlertOctagon, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { desktop } from "@/lib/desktop";
import type { ArenaReport, ArenaFinding } from "@/types";

export function ArenaView() {
  const [report, setReport] = useState<ArenaReport | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rounds = 1;

  const handleReview = async () => {
    setRunning(true);
    setError(null);
    setReport(null);
    try {
      const res = await desktop.runArenaReview("", "", "", rounds);
      setReport(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Review failed");
    } finally {
      setRunning(false);
    }
  };

  const roleMatches = (finding: ArenaFinding, role: string) =>
    `${finding.role ?? ""} ${(finding.roles ?? []).join(" ")}`.toLowerCase().includes(role);
  const securityFindings = report?.findings?.filter((f) => roleMatches(f, "security")) || [];
  const correctnessFindings = report?.findings?.filter((f) => roleMatches(f, "correctness")) || [];
  const maintainabilityFindings = report?.findings?.filter((f) => roleMatches(f, "maintainability")) || [];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--background)] p-6 text-[var(--foreground)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--mn-line)] pb-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg border border-[var(--mn-line)] bg-[var(--card)] text-[var(--mn-accent)]">
            <Swords className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Red Team Review Arena</h1>
            <p className="text-xs text-muted-foreground">
              Concurrent 3-way hostile adversarial review on current diff with redacted secrets.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={handleReview}
            disabled={running}
            aria-busy={running}
            className="bg-[var(--mn-accent)] text-white hover:bg-[var(--mn-accent-strong)]"
          >
            <Play className={`size-3.5 ${running ? "animate-spin" : ""}`} />
            {running ? "Reviewing…" : "Run Red Team Review"}
          </Button>
        </div>
      </div>

      {error && (
        <div role="alert" aria-live="polite" className="mt-4 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Verdict Banner */}
      {report && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-4 flex items-center justify-between rounded-lg border p-4 ${
            report.verdict === "block"
              ? "border-rose-500/40 bg-rose-950/30 text-rose-300"
              : report.verdict === "warn"
                ? "border-amber-500/40 bg-amber-950/30 text-amber-300"
                : "border-emerald-500/40 bg-emerald-950/30 text-emerald-300"
          }`}
        >
          <div className="flex items-center gap-3">
            {report.verdict === "block" ? (
              <AlertOctagon className="size-6 text-rose-400" />
            ) : report.verdict === "warn" ? (
              <AlertTriangle className="size-6 text-amber-400" />
            ) : (
              <CheckCircle2 className="size-6 text-emerald-400" />
            )}
            <div>
              <span className="font-mono text-sm font-bold uppercase tracking-wider">
                VERDICT: {report.verdict}
              </span>
              <p className="text-xs opacity-80">
                {report.verdict === "block"
                  ? "Merge blocked due to high severity findings."
                  : report.verdict === "warn"
                    ? "Warnings detected. Review before merging."
                    : "All clear across security, logic, and maintainability checks."}
              </p>
            </div>
          </div>
          <div className="font-mono text-xs opacity-70">
            Total Findings: {report.findings?.length || 0}
          </div>
        </div>
      )}

      <div className="mt-6 grid min-h-0 flex-1 grid-cols-3 gap-4">
        <AdversaryColumn
          title="Security Adversary"
          icon={Shield}
          color="rose"
          findings={securityFindings}
          reportReady={report !== null}
        />
        <AdversaryColumn
          title="Correctness Adversary"
          icon={Bug}
          color="cyan"
          findings={correctnessFindings}
          reportReady={report !== null}
        />
        <AdversaryColumn
          title="Maintainability"
          icon={Wrench}
          color="emerald"
          findings={maintainabilityFindings}
          reportReady={report !== null}
        />
      </div>
    </div>
  );
}

function AdversaryColumn({
  title,
  icon: Icon,
  color,
  findings,
  reportReady,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "rose" | "cyan" | "emerald";
  findings: ArenaFinding[];
  reportReady: boolean;
}) {

  return (
    <div className="flex flex-col rounded-lg border border-[var(--mn-line)] bg-[var(--card)]">
      <div className="flex items-center justify-between border-b border-[var(--mn-line)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <span className="font-mono text-xs font-semibold text-[var(--foreground)]">{title}</span>
        </div>
        <span className="font-mono text-xs text-muted-foreground">{findings.length}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-2.5">
        {findings.length === 0 ? (
          <p className="p-4 text-center text-xs text-muted-foreground">
            {reportReady ? "No violations reported." : "Run a review to populate this lane."}
          </p>
        ) : (
          findings.map((f, i) => (
            <div
              key={i}
              className="rounded-md border border-[var(--mn-line)] bg-[var(--mn-surface-muted)] p-3 text-xs space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
                    f.severity === "high"
                      ? "bg-rose-500/20 text-rose-700 dark:text-rose-400"
                      : f.severity === "medium"
                        ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                        : "bg-zinc-500/20 text-zinc-700 dark:text-zinc-400"
                  }`}
                >
                  {f.severity}
                </span>
                <span className="max-w-[140px] truncate font-mono text-[10px] text-muted-foreground">
                  {f.file}:{f.line}
                </span>
              </div>
              <p className="font-medium text-[var(--foreground)]">{f.evidence}</p>
              {f.recommendation && (
                <p className="font-mono text-[11px] text-[var(--mn-cyan)]">{f.recommendation}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
