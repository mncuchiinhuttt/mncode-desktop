import { useEffect, useRef, useState, type FormEvent } from "react";
import { Ban, Eraser, Play, Terminal, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TerminalPanel({
  cwd,
  output,
  running,
  onCommand,
  onInterrupt,
  onClear,
  onClose,
}: {
  cwd: string;
  output: string;
  running: boolean;
  onCommand: (command: string) => Promise<void>;
  onInterrupt: () => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [command, setCommand] = useState("");
  const outputRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight });
  }, [output]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next = command.trim();
    if (!next || running) return;
    setCommand("");
    await onCommand(next);
  }

  return (
    <section className="mn-terminal-panel flex h-[300px] shrink-0 flex-col border-t border-[var(--mn-line)] bg-[var(--mn-surface-muted)] text-foreground shadow-[0_-16px_40px_rgba(0,0,0,0.12)]">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-[var(--mn-line)] bg-[var(--mn-surface)] px-4">
        <Terminal className="size-4 text-[var(--mn-accent)]" />
        <span className="text-xs font-medium">Terminal</span>
        <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-muted-foreground">
          {cwd || "No workspace"}
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onClear}
          className="text-muted-foreground hover:bg-[var(--mn-surface-muted)] hover:text-foreground"
          aria-label="Clear terminal"
        >
          <Eraser className="size-3.5" />
        </Button>
        {running && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onInterrupt}
            className="text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-300/80 dark:hover:bg-amber-300/10 dark:hover:text-amber-200"
            aria-label="Interrupt terminal command"
          >
            <Ban className="size-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onClose}
          className="text-muted-foreground hover:bg-[var(--mn-surface-muted)] hover:text-foreground"
          aria-label="Close terminal"
        >
          <X className="size-3.5" />
        </Button>
      </header>
      <pre
        ref={outputRef}
        className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap px-4 py-3 font-mono text-[12px] leading-5 text-foreground"
      >
        {output || (
          <span className="text-muted-foreground">Run a command in the workspace…</span>
        )}
      </pre>
      <form
        onSubmit={submit}
        className="flex shrink-0 items-center gap-2 border-t border-[var(--mn-line)] bg-[var(--mn-surface)] px-4 py-2.5"
      >
        <span className="font-mono text-sm text-[var(--mn-accent)]">›</span>
        <input
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          disabled={running}
          placeholder={
            running ? "Command running…" : "Type a command and press Enter"
          }
          className="min-w-0 flex-1 bg-transparent font-mono text-[12px] text-foreground outline-none placeholder:text-muted-foreground"
          aria-label="Terminal command"
          autoComplete="off"
        />
        <Button
          type="submit"
          size="icon-xs"
          disabled={!command.trim() || running}
          className="bg-[var(--mn-accent)] text-[#24151d] hover:bg-[var(--mn-accent)]/90"
          aria-label="Run command"
        >
          <Play className="size-3" />
        </Button>
      </form>
    </section>
  );
}
