import { useEffect, useState } from "react";
import { FlaskConical, Play, RefreshCw, Terminal, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { desktop } from "@/lib/desktop";
import type { SandboxFixture, SandboxRunResult } from "@/types";

export function SandboxView() {
  const [fixtures, setFixtures] = useState<SandboxFixture[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SandboxRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keep, setKeep] = useState(false);

  const fetchFixtures = async () => {
    try {
      const list = await desktop.listSandboxFixtures();
      setFixtures(list || []);
      if (list && list.length > 0 && !selectedId) {
        setSelectedId(list[0].id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load fixtures");
    }
  };

  const handleRun = async () => {
    if (!selectedId) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await desktop.runSandboxFixture(selectedId, [], keep);
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Execution failed");
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    fetchFixtures();
  }, []);

  const activeFixture = fixtures.find((f) => f.id === selectedId);
  const runFailed =
    result !== null &&
    (result.exit_code !== 0 || result.timed_out || result.truncated || Boolean(result.error));

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--background)] p-6 text-[var(--foreground)]">
      <div className="flex items-center justify-between border-b border-[var(--mn-line)] pb-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg border border-[var(--mn-line)] bg-[var(--card)] text-[var(--mn-accent)]">
            <FlaskConical className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Sandbox Fixture Runner</h1>
            <p className="text-xs text-muted-foreground">
              Copy isolation protects the workspace tree. Commands retain local OS and network permissions.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-mono text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={keep}
              onChange={(e) => setKeep(e.target.checked)}
              className="rounded border-[var(--mn-line)] bg-[var(--card)] text-[var(--mn-accent)]"
            />
            Keep Temp Dir
          </label>
          <Button
            size="sm"
            onClick={handleRun}
            disabled={running || !selectedId}
            className="bg-[var(--mn-accent)] text-white hover:bg-[var(--mn-accent-strong)]"
          >
            <Play className={`size-3.5 ${running ? "animate-spin" : ""}`} />
            Run Fixture
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
          {error}
        </div>
      )}

      <div className="mt-6 grid min-h-0 flex-1 grid-cols-12 gap-6">
        <div className="col-span-4 flex flex-col rounded-lg border border-[var(--mn-line)] bg-[var(--card)]">
          <div className="border-b border-[var(--mn-line)] px-4 py-3 text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
            Available Fixtures ({fixtures.length})
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2 space-y-1">
            {fixtures.length === 0 ? (
              <p className="p-4 text-center text-xs text-muted-foreground">
                No fixtures found in .mncode/sandbox/fixtures/
              </p>
            ) : (
              fixtures.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedId(f.id)}
                  className={`flex w-full flex-col rounded-md px-3 py-2.5 text-left transition-colors ${
                    selectedId === f.id
                      ? "bg-[var(--mn-accent-soft)] text-foreground border border-[var(--mn-accent)]"
                      : "hover:bg-[var(--mn-surface-muted)] text-muted-foreground"
                  }`}
                >
                  <span className="font-mono text-sm font-semibold text-[var(--foreground)]">{f.name}</span>
                  <span className="font-mono text-[11px] text-muted-foreground truncate">
                    cmd: {f.command?.join(" ")}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="col-span-8 flex flex-col rounded-lg border border-[var(--mn-line)] bg-[var(--card)]">
          <div className="flex items-center justify-between border-b border-[var(--mn-line)] px-4 py-3">
            <div className="flex items-center gap-2">
              <Terminal className="size-4 text-[var(--mn-cyan)]" />
              <span className="font-mono text-xs font-semibold text-muted-foreground">
                {activeFixture ? `Console: ${activeFixture.name}` : "Console"}
              </span>
            </div>
            {result && (
              <div className="flex items-center gap-2 font-mono text-xs">
                {!runFailed ? (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="size-3.5" /> Exit 0
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-rose-400">
                    <XCircle className="size-3.5" />{" "}
                    {result.error
                      ? "ERROR"
                      : result.timed_out
                        ? "TIMED OUT"
                        : result.truncated
                          ? "OUTPUT LIMIT"
                          : `Exit ${result.exit_code}`}
                  </span>
                )}
                {result.timed_out && (
                  <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-400">
                    TIMED OUT
                  </span>
                )}
                {result.truncated && (
                  <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-400">
                    TRUNCATED
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto bg-black p-4 font-mono text-xs leading-relaxed text-zinc-300">
            {running ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <RefreshCw className="mr-2 size-5 animate-spin" />
                Executing fixture in a temporary copy workspace...
              </div>
            ) : result ? (
              <div className="space-y-3">
                {result.error && (
                  <div className="rounded border border-rose-500/30 bg-rose-500/10 p-2 text-rose-300">
                    {result.error}
                  </div>
                )}
                {result.stdout && (
                  <div>
                    <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">STDOUT</div>
                    <pre className="whitespace-pre-wrap">{result.stdout}</pre>
                  </div>
                )}
                {result.stderr && (
                  <div>
                    <div className="mb-1 text-[10px] uppercase tracking-wider text-rose-400">STDERR</div>
                    <pre className="whitespace-pre-wrap text-rose-300">{result.stderr}</pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Select a fixture and click Run Fixture to observe isolated execution.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
