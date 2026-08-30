import { useEffect, useRef, useState } from "react";
import { FileCheck2, Play, CheckCircle2, XCircle, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { desktop } from "@/lib/desktop";
import type { SpecContract, SpecMatrix } from "@/types";

export function SpecView() {
  const [contracts, setContracts] = useState<SpecContract[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [matrix, setMatrix] = useState<SpecMatrix | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matrixRequest = useRef(0);

  const fetchContracts = async () => {
    try {
      const list = await desktop.listSpecContracts();
      setContracts(list || []);
      if (list && list.length > 0 && !selectedId) setSelectedId(list[0].id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load contracts");
    }
  };

  const handleRunMatrix = async () => {
    if (!selectedId) return;
    const requestID = ++matrixRequest.current;
    const contractID = selectedId;
    setRunning(true);
    setError(null);
    setMatrix(null);
    try {
      const res = await desktop.runSpecMatrix(contractID);
      if (requestID === matrixRequest.current) setMatrix(res);
    } catch (err: unknown) {
      if (requestID === matrixRequest.current) {
        setError(err instanceof Error ? err.message : "Matrix check failed");
      }
    } finally {
      if (requestID === matrixRequest.current) setRunning(false);
    }
  };

  useEffect(() => {
    void fetchContracts();
  }, []);

  const activeContract = contracts.find((contract) => contract.id === selectedId);
  const matrixHealthy =
    matrix !== null && matrix.failed === 0 && matrix.invalid === 0 && matrix.skipped === 0;
  const matrixTotal = matrix ? matrix.passed + matrix.failed + matrix.skipped + matrix.invalid : 0;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--background)] p-6 text-[var(--foreground)]">
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
        <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">{error}</div>
      )}

      <div className="mt-6 grid min-h-0 flex-1 grid-cols-12 gap-6">
        <div className="col-span-4 flex flex-col rounded-lg border border-[var(--mn-line)] bg-[var(--card)]">
          <div className="border-b border-[var(--mn-line)] px-4 py-3 text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
            Contracts ({contracts.length})
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
            {contracts.length === 0 ? (
              <p className="p-4 text-center text-xs text-muted-foreground">No specification contracts found in .mncode/spec/</p>
            ) : (
              contracts.map((contract) => (
                <button
                  key={contract.id}
                  disabled={running}
                  onClick={() => {
                    matrixRequest.current++;
                    setSelectedId(contract.id);
                    setMatrix(null);
                  }}
                  className={`flex w-full flex-col rounded-md px-3 py-2.5 text-left transition-colors ${
                    selectedId === contract.id
                      ? "border border-[var(--mn-accent)] bg-[var(--mn-accent-soft)]"
                      : "text-muted-foreground hover:bg-[var(--mn-surface-muted)]"
                  }`}
                >
                  <span className="font-mono text-sm font-semibold text-[var(--foreground)]">{contract.title || contract.id}</span>
                  <span className="truncate font-mono text-[11px] text-muted-foreground">
                    {contract.cases?.length || 0} cases · {contract.invariants?.length || 0} invariants
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="col-span-8 flex flex-col rounded-lg border border-[var(--mn-line)] bg-[var(--card)]">
          <div className="flex items-center justify-between border-b border-[var(--mn-line)] px-4 py-3">
            <span className="font-mono text-xs font-semibold text-muted-foreground">
              {activeContract ? `Contract: ${activeContract.title || activeContract.id}` : "Matrix"}
            </span>
            {matrix && (
              <span
                className={`rounded px-2 py-0.5 font-mono text-xs font-bold ${
                  matrix.failed > 0 || matrix.invalid > 0
                    ? "bg-rose-500/20 text-rose-400"
                    : matrix.skipped > 0
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-emerald-500/20 text-emerald-400"
                }`}
              >
                {matrixHealthy
                  ? `${matrix.passed}/${matrixTotal} PASS`
                  : matrix.failed > 0
                    ? `${matrix.failed} FAIL`
                    : matrix.invalid > 0
                      ? `${matrix.invalid} INVALID`
                      : `${matrix.skipped} SKIPPED`}
              </span>
            )}
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 font-mono text-xs">
            {activeContract && (
              <div>
                <span className="font-semibold uppercase tracking-wider text-muted-foreground">Invariants</span>
                <div className="mt-1 space-y-1">
                  {activeContract.invariants?.map((invariant) => (
                    <div key={invariant.id} className="flex items-center gap-2 rounded bg-[var(--mn-surface-muted)] px-2.5 py-1.5">
                      <ScrollText className="size-3.5 text-[var(--mn-cyan)]" />
                      <span className="font-bold text-[var(--foreground)]">{invariant.id}:</span>
                      <span className="text-muted-foreground">{invariant.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <span className="font-semibold uppercase tracking-wider text-muted-foreground">Test Cases & Evaluation Matrix</span>
              <div className="mt-2 space-y-2">
                {activeContract?.cases?.map((testCase) => {
                  const result = matrix?.results?.find((item) => item.case_id === testCase.id);
                  return (
                    <div key={testCase.id} className="flex items-start justify-between rounded-md border border-[var(--mn-line)] bg-[var(--mn-surface-muted)] p-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--foreground)]">{testCase.name || testCase.id}</span>
                          <span className="rounded bg-black/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">{testCase.kind}</span>
                        </div>
                        {result?.message && <p className="text-rose-400 text-[11px]">{result.message}</p>}
                      </div>
                      <div className="ml-4 shrink-0">
                        {result?.status === "pass" ? (
                          <span className="flex items-center gap-1 font-bold text-emerald-400"><CheckCircle2 className="size-3.5" /> PASS</span>
                        ) : result?.status === "skipped" ? (
                          <span className="font-bold text-amber-400">SKIPPED</span>
                        ) : result ? (
                          <span className="flex items-center gap-1 font-bold text-rose-400"><XCircle className="size-3.5" /> {result.status.toUpperCase()}</span>
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
