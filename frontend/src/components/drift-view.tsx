import { useEffect, useState } from "react";
import { ShieldAlert, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { desktop } from "@/lib/desktop";
import type { DriftReport } from "@/types";

export function DriftView() {
  const [report, setReport] = useState<DriftReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await desktop.getDriftReport();
      setReport(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load drift report");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (accepting || loading) return;
    setAccepting(true);
    setError(null);
    try {
      await desktop.acceptDriftBaseline();
      await fetchReport();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to accept baseline");
    } finally {
      setAccepting(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const totalViolations = report?.findings?.length ?? 0;
  const statusHealthy = report !== null && !report.drifted;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--background)] p-6 text-[var(--foreground)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--mn-line)] pb-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg border border-[var(--mn-line)] bg-[var(--card)] text-[var(--mn-accent)]">
            <ShieldAlert className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Architectural Drift Sentinel</h1>
            <p className="text-xs text-muted-foreground">
              AST-level dependency boundaries, cyclic imports, and layer enforcement.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchReport} disabled={loading || accepting}>
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Scanning…" : "Re-Scan"}
          </Button>
          <Button
            size="sm"
            onClick={handleAccept}
            disabled={accepting || loading}
            className="bg-[var(--mn-accent)] text-white hover:bg-[var(--mn-accent-strong)]"
          >
            <CheckCircle2 className="size-3.5" />
            {accepting ? "Saving…" : "Accept Baseline"}
          </Button>
        </div>
      </div>

      {error && (
        <div role="alert" aria-live="polite" className="mt-4 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="mt-6 grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-[var(--mn-line)] bg-[var(--card)] p-4">
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Status</span>
          <div className="mt-2 flex items-center gap-2">
            {loading ? (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--mn-cyan)]">
                <RefreshCw className="size-4 animate-spin" /> Scanning…
              </span>
            ) : statusHealthy ? (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4" /> Healthy
              </span>
            ) : report ? (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-rose-700 dark:text-rose-400">
                <XCircle className="size-4" /> {totalViolations} Findings
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                <XCircle className="size-4" /> Unavailable
              </span>
            )}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--mn-line)] bg-[var(--card)] p-4">
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Changed Files</span>
          <div className="mt-2 text-2xl font-mono font-bold text-[var(--mn-cyan)]">
            {loading ? "…" : report ? report.changed_files : "Not checked"}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--mn-line)] bg-[var(--card)] p-4">
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Generated</span>
          <div className="mt-2 truncate font-mono text-sm font-semibold text-[var(--foreground)]">
            {loading
              ? "Checking…"
              : report?.generated_at
                ? new Date(report.generated_at).toLocaleString()
                : "Not checked"}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--mn-line)] bg-[var(--card)] p-4">
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Baseline ID</span>
          <div className="mt-2 truncate font-mono text-sm font-semibold text-[var(--foreground)]">
            {loading ? "Checking…" : report?.baseline_id || "None"}
          </div>
        </div>
      </div>

      <div className="mt-6 flex min-h-0 flex-1 flex-col rounded-lg border border-[var(--mn-line)] bg-[var(--card)]">
        <div className="border-b border-[var(--mn-line)] px-4 py-3 text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
          Drift Findings Feed ({totalViolations})
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <RefreshCw className="mb-2 size-8 animate-spin text-[var(--mn-accent)]" />
              <p className="text-sm font-medium">Scanning workspace architecture…</p>
              <p className="text-xs">Comparing imports and layer boundaries.</p>
            </div>
          ) : !report ? (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <XCircle className="mb-2 size-10 text-rose-400/60" />
              <p className="text-sm font-medium">Drift report unavailable</p>
              <p className="text-xs">Open a workspace before scanning architecture.</p>
            </div>
          ) : totalViolations === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <CheckCircle2 className="mb-2 size-10 text-emerald-400/60" />
              <p className="text-sm font-medium">Architecture is consistent with active baseline</p>
              <p className="text-xs">No forbidden layer accesses or circular imports detected.</p>
            </div>
          ) : (
            report.findings.map((f, i) => (
              <div
                key={`${f.code}-${f.path}-${i}`}
                className="flex items-start justify-between rounded-md border border-[var(--mn-line)] bg-[var(--mn-surface-muted)] p-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
                        f.severity === "error"
                          ? "border-rose-500/30 bg-rose-500/20 text-rose-700 dark:text-rose-400"
                          : f.severity === "warning"
                            ? "border-amber-500/30 bg-amber-500/20 text-amber-700 dark:text-amber-400"
                            : "border-cyan-500/30 bg-cyan-500/20 text-cyan-700 dark:text-cyan-400"
                      }`}
                    >
                      {f.severity}
                    </span>
                    <span className="font-mono text-muted-foreground">{f.code}</span>
                  </div>
                  <p className="font-medium text-[var(--foreground)]">{f.message}</p>
                  {f.path && <p className="font-mono text-[11px] text-[var(--mn-cyan)]">{f.path}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
