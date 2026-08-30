import { useEffect, useState } from "react";
import { FileCheck2, Play, CheckCircle2, XCircle, AlertCircle, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { desktop } from "@/lib/desktop";
import type { SpecContract, SpecMatrix } from "@/types";

export function SpecView() {
  const [contracts, setContracts] = useState<SpecContract[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [matrix, setMatrix] = useState<SpecMatrix | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContracts = async () => {
    try {
      const list = await desktop.listSpecContracts();
      setContracts(list || []);
      if (list && list.length > 0 && !selectedId) {
        setSelectedId(list[0].id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load contracts");
    }
  };

  const handleRunMatrix = async () => {
    if (!selectedId) return;
    setRunning(true);
    setError(null);
    setMatrix(null);
    try {
      const res = await desktop.runSpecMatrix(selectedId);
      setMatrix(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Matrix check failed");
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const activeContract = contracts.find((c) => c.id === selectedId);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--background)] p-6 text-[var(--foreground)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--mn-line)] pb-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg border border-[var(--mn-line)] bg-[var(--card)] text-[var(--mn-accent)]">
            <FileCheck2 className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Spec-First Contract Matrix</h1>
            <p className="text-xs text-muted-foreground">
              Define observable behavior and run deterministic compliance test matrices.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleRunMatrix}
          disabled={running || !selectedId}
          className="bg-[var(--mn-accent)] text-white hover:bg-[var(--mn-accent-strong)]"
        >
          <Play className={`size-3.5 ${running ? "animate-spin" : ""}`} />
          Run Matrix Check
        </Button>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Main Grid */}
      <div className="mt-6 grid min-h-0 flex-1 grid-cols-12 gap-6">
        {/* Left: Contracts */}
        <div className="col-span-4 flex flex-col rounded-lg border border-[var(--mn-line)] bg-[var(--card)]">
          <div className="border-b border-[var(--mn-line)] px-4 py-3 text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
            Contracts ({contracts.length})
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2 space-y-1">
            {contracts.length === 0 ? (
              <p className="p-4 text-center text-xs text-muted-foreground">
                No specification contracts found in .mncode/spec/
              </p>
            ) : (
              contracts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedId(c.id);
                    setMatrix(null);
                  }}
                  className={`flex w-full flex-col rounded-md px-3 py-2.5 text-left transition-colors ${
                    selectedId === c.id
                      ? "bg-[var(--mn-accent-soft)] border border-[var(--mn-accent)]"
                      : "hover:bg-[var(--mn-surface-muted)] text-muted-foreground"
                  }`}
                >
                  <span className="font-mono text-sm font-semibold text-[var(--foreground)]">{c.title || c.id}</span>
                  <span className="font-mono text-[11px] text-muted-foreground truncate">
                    {c.cases?.length || 0} cases · {c.invariants?.length || 0} invariants
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Matrix Results & Invariants */}
        <div className="col-span-8 flex flex-col rounded-lg border border-[var(--mn-line)] bg-[var(--card)]">
          <div className="flex items-center justify-between border-b border-[var(--mn-line)] px-4 py-3">
            <span className="font-mono text-xs font-semibold text-muted-foreground">
              {activeContract ? `Contract: ${activeContract.title || activeContract.id}` : "Matrix"}
            </span>
            {matrix && (
              <span
                className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                  matrix.passed ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                }`}
              >
                {matrix.passed ? "100% PASS" : "FAILURES DETECTED"}
              </span>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
            {activeContract && (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Invariants
                </span>
                <div className="mt-1 space-y-1">
                  {activeContract.invariants?.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center gap-2 rounded bg-[var(--mn-surface-muted)] px-2.5 py-1.5"
                    >
                      <ScrollText className="size-3.5 text-[var(--mn-cyan)]" />
                      <span className="font-bold text-[var(--foreground)]">{inv.id}:</span>
                      <span className="text-muted-foreground">{inv.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Test Cases & Evaluation Matrix</span>
              <div className="mt-2 space-y-2">
                {activeContract?.cases?.map((c) => {
                  const res = matrix?.results?.find((r) => r.case_id === c.id);
                  return (
                    <div key={c.id} className="flex items-start justify-between rounded-md border border-[var(--mn-line)] bg-[var(--mn-surface-muted)] p-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--foreground)]">{c.name || c.id}</span>
                          <span className="rounded bg-black/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">{c.kind}</span>
                        </div>
                        {res?.error && <p className="text-rose-400 text-[11px]">{res.error}</p>}
                      </div>
                      <div className="ml-4 shrink-0">
                        {res ? (
                          res.status === "PASS" ? (
                            <span className="flex items-center gap-1 text-emerald-400 font-bold"><CheckCircle2 className="size-3.5" /> PASS</span>
                          ) : (
                            <span className="flex items-center gap-1 text-rose-400 font-bold"><XCircle className="size-3.5" /> {res.status}</span>
                          )
                        ) : (
                          <span className="text-muted-foreground">Ready</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
