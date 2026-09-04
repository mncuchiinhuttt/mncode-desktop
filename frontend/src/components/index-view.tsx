import { useState, useEffect, useRef } from "react";
import { Binary, Search, RefreshCw, Code2, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { desktop } from "@/lib/desktop";
import type { CodeIndexHit } from "@/types";

export function IndexView() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("");
  const [hits, setHits] = useState<CodeIndexHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchRequest = useRef(0);
  const queryRef = useRef("");
  const kindRef = useRef("");
  const handleSearch = async (text: string, selectedKind: string = kind) => {
    const requestID = ++searchRequest.current;
    if (!text.trim()) {
      setHits([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await desktop.queryCodeIndex(text, selectedKind, "", 15);
      if (requestID === searchRequest.current) {
        setHits(res || []);
      }
    } catch (err: unknown) {
      if (requestID === searchRequest.current) {
        setHits([]);
        setError(err instanceof Error ? err.message : "Search failed");
      }
    } finally {
      if (requestID === searchRequest.current) {
        setLoading(false);
      }
    }
  };

  const handleRebuild = async () => {
    setRebuilding(true);
    setError(null);
    try {
      await desktop.rebuildCodeIndex();
      if (queryRef.current.trim()) {
        await handleSearch(queryRef.current, kindRef.current);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Rebuild failed");
    } finally {
      setRebuilding(false);
    }
  };

  const kindFilters = [
    { value: "", label: "All Symbols" },
    { value: "func", label: "Functions" },
    { value: "struct", label: "Structs" },
    { value: "interface", label: "Interfaces" },
    { value: "type", label: "Types" },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--background)] p-6 text-[var(--foreground)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--mn-line)] pb-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg border border-[var(--mn-line)] bg-[var(--card)] text-[var(--mn-accent)]">
            <Binary className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Local Code Index & AST Search</h1>
            <p className="text-xs text-muted-foreground">
              Instant BM25 ranking + symbol boosting with zero network latency.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleRebuild} disabled={rebuilding}>
          <RefreshCw className={`size-3.5 ${rebuilding ? "animate-spin" : ""}`} />
          Rebuild Index
        </Button>
      </div>

      {error && (
        <div role="alert" aria-live="polite" className="mt-4 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Search Input Bar */}
      <div className="mt-6 flex flex-col gap-3">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 size-4 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              queryRef.current = e.target.value;
              setQuery(e.target.value);
              void handleSearch(e.target.value);
            }}
            aria-label="Search local code symbols"
            autoComplete="off"
            placeholder="Search symbols, functions, types, for example Session.ProcessUserInput…"
            className="h-11 w-full rounded-lg border border-[var(--mn-line)] bg-[var(--card)] pl-10 pr-4 font-mono text-sm focus:border-[var(--mn-accent)] focus:outline-none"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          {kindFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={kind === filter.value}
              onClick={() => {
                kindRef.current = filter.value;
                setKind(filter.value);
                void handleSearch(query, filter.value);
              }}
              className={`rounded-md px-3 py-1 font-mono text-xs transition-colors ${
                kind === filter.value
                  ? "bg-[var(--mn-accent)] text-white font-semibold"
                  : "border border-[var(--mn-line)] bg-[var(--card)] text-muted-foreground hover:text-foreground"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results List */}
      <div className="mt-6 flex min-h-0 flex-1 flex-col rounded-lg border border-[var(--mn-line)] bg-[var(--card)]">
        <div className="border-b border-[var(--mn-line)] px-4 py-3 text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
          Index Hits ({hits.length})
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <RefreshCw className="mr-2 size-5 animate-spin" /> Searching index…
            </div>
          ) : hits.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <Search className="size-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm">
                {query.trim() ? "No symbols match this query" : "Type a query above to explore local symbols"}
              </p>
            </div>
          ) : (
            hits.map((hit, idx) => (
              <div
                key={`${hit.path}-${hit.symbol}-${hit.line}-${idx}`}
                className="flex items-start justify-between rounded-md border border-[var(--mn-line)] bg-[var(--mn-surface-muted)] p-3.5 text-xs transition-colors hover:border-[var(--mn-accent)]"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <FileCode className="size-3.5 text-[var(--mn-cyan)]" />
                    <span className="font-mono text-xs font-semibold text-[var(--foreground)] truncate">
                      {hit.path}
                    </span>
                    <span className="rounded bg-[var(--mn-line)] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {hit.language}
                    </span>
                  </div>
                  {hit.symbol && (
                    <div className="flex items-center gap-1.5 text-sm font-mono font-bold text-[var(--mn-accent)]">
                      <Code2 className="size-3.5" />
                      {hit.symbol}
                    </div>
                  )}
                  {hit.signature && (
                    <p className="font-mono text-[11px] text-muted-foreground truncate">
                      {hit.signature}
                      {hit.line ? `:${hit.line}` : ""}
                    </p>
                  )}
                </div>
                <div className="ml-4 shrink-0 font-mono text-xs text-muted-foreground">
                  Score: <span className="font-semibold text-[var(--mn-cyan)]">{hit.score.toFixed(2)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
