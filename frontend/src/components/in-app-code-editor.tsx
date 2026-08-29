import { useState, useMemo } from "react";
import {
  Check,
  Code2,
  Copy,
  Download,
  Eye,
  FileCode,
  FilePenLine,
  Minimize2,
  RotateCcw,
  Save,
  Split,
  Sparkles,
  WrapText,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HighlightedLine } from "./diff-view";
import { cn } from "@/lib/utils";

interface InAppCodeEditorProps {
  filePath: string;
  initialContent: string;
  originalContent?: string;
  onSave?: (newContent: string) => Promise<void> | void;
  onClose?: () => void;
  onNotify?: (message: string, kind?: "success" | "error") => void;
}

type DiffLine = {
  type: "equal" | "add" | "remove";
  text: string;
  oldNo?: number;
  newNo?: number;
};

// Fast line-by-line LCS diff computation
function computeInlineDiff(before: string, after: string): DiffLine[] {
  const a = before.replace(/\r\n/g, "\n").split("\n");
  const b = after.replace(/\r\n/g, "\n").split("\n");
  const n = a.length;
  const m = b.length;

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  let oldNo = 1;
  let newNo = 1;

  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: "equal", text: a[i], oldNo: oldNo++, newNo: newNo++ });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: "remove", text: a[i], oldNo: oldNo++ });
      i++;
    } else {
      out.push({ type: "add", text: b[j], newNo: newNo++ });
      j++;
    }
  }
  while (i < n) {
    out.push({ type: "remove", text: a[i], oldNo: oldNo++ });
    i++;
  }
  while (j < m) {
    out.push({ type: "add", text: b[j], newNo: newNo++ });
    j++;
  }

  return out;
}

export function InAppCodeEditor({
  filePath,
  initialContent,
  originalContent,
  onSave,
  onClose,
  onNotify,
}: InAppCodeEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [mode, setMode] = useState<"editor" | "diff">(originalContent ? "diff" : "editor");
  const [wrap, setWrap] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const hasDiff = Boolean(originalContent && originalContent !== content);
  const diffLines = useMemo(() => {
    if (!originalContent) return [];
    return computeInlineDiff(originalContent, content);
  }, [originalContent, content]);

  const addedCount = diffLines.filter((l) => l.type === "add").length;
  const removedCount = diffLines.filter((l) => l.type === "remove").length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      onNotify?.("Copied code to clipboard", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onNotify?.("Failed to copy code", "error");
    }
  };

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(content);
      onNotify?.("File saved successfully", "success");
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : "Could not save file", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAcceptAll = () => {
    setMode("editor");
    onNotify?.("Accepted all agent changes", "success");
  };

  const handleRejectAll = () => {
    if (originalContent) {
      setContent(originalContent);
      setMode("editor");
      onNotify?.("Reverted all edits to original", "success");
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-[var(--mn-line)] bg-background text-foreground shadow-2xl">
      {/* Editor Header */}
      <div className="flex items-center justify-between border-b border-[var(--mn-line)] bg-secondary/30 px-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="grid size-7 place-items-center rounded-md bg-[var(--mn-accent-soft)] text-[var(--mn-accent-strong)]">
            <FileCode className="size-4" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-mono text-xs font-semibold text-foreground">{filePath}</h3>
            <p className="text-[0.6875rem] text-muted-foreground">
              {content.split("\n").length} lines · {content.length} chars
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {hasDiff && (
            <div className="flex items-center rounded-lg border border-[var(--mn-line)] bg-background p-0.5">
              <Button
                size="sm"
                variant={mode === "diff" ? "default" : "ghost"}
                onClick={() => setMode("diff")}
                className={cn(
                  "h-6 px-2 text-[0.6875rem]",
                  mode === "diff" && "mn-accent-button"
                )}
              >
                <Split className="mr-1 size-3" />
                Inline Diff
                <span className="ml-1 text-[0.625rem] text-emerald-400">+{addedCount}</span>
                <span className="ml-0.5 text-[0.625rem] text-rose-400">-{removedCount}</span>
              </Button>
              <Button
                size="sm"
                variant={mode === "editor" ? "default" : "ghost"}
                onClick={() => setMode("editor")}
                className={cn(
                  "h-6 px-2 text-[0.6875rem]",
                  mode === "editor" && "mn-accent-button"
                )}
              >
                <FilePenLine className="mr-1 size-3" />
                Source Code
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setWrap((w) => !w)}
            className={cn("h-7 w-7", wrap && "bg-secondary text-primary")}
            title="Toggle word wrap"
          >
            <WrapText className="size-3.5" />
          </Button>

          <Button variant="ghost" size="icon-sm" onClick={handleCopy} className="h-7 w-7" title="Copy code">
            {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
          </Button>

          {onSave && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="h-7 gap-1 px-2.5 text-xs mn-accent-button"
            >
              <Save className="size-3" />
              Save
            </Button>
          )}

          {onClose && (
            <Button variant="ghost" size="icon-sm" onClick={onClose} className="h-7 w-7 text-muted-foreground">
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Main View Area */}
      <div className="relative flex-1 overflow-auto font-mono text-xs">
        {mode === "diff" && hasDiff ? (
          <div className="min-w-full divide-y divide-border/20 py-2">
            {diffLines.map((line, idx) => {
              const isAdd = line.type === "add";
              const isRemove = line.type === "remove";

              return (
                <div
                  key={idx}
                  className={cn(
                    "flex items-start px-2 py-0.5 font-mono text-xs leading-relaxed transition-colors",
                    isAdd && "bg-emerald-500/15 text-emerald-300 dark:bg-emerald-950/40",
                    isRemove && "bg-rose-500/15 text-rose-300 dark:bg-rose-950/40 line-through opacity-85",
                    !isAdd && !isRemove && "hover:bg-secondary/20"
                  )}
                >
                  {/* Line Numbers */}
                  <span className="w-10 select-none text-right text-[0.6875rem] text-muted-foreground/60 pr-2">
                    {line.oldNo || ""}
                  </span>
                  <span className="w-10 select-none text-right text-[0.6875rem] text-muted-foreground/60 pr-2">
                    {line.newNo || ""}
                  </span>

                  {/* Sign Indicator */}
                  <span className={cn(
                    "w-5 select-none font-bold text-center",
                    isAdd && "text-emerald-400",
                    isRemove && "text-rose-400",
                    !isAdd && !isRemove && "text-transparent"
                  )}>
                    {isAdd ? "+" : isRemove ? "-" : " "}
                  </span>

                  {/* Content */}
                  <span className={cn("flex-1", wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre")}>
                    <HighlightedLine text={line.text} />
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-full">
            {/* Editor Line Numbers Gutter */}
            <div className="select-none border-r border-border/40 bg-secondary/15 px-3 py-3 text-right text-muted-foreground/50">
              {content.split("\n").map((_, i) => (
                <div key={i} className="leading-6 text-[0.6875rem]">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Editable Text Area */}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              spellCheck={false}
              className={cn(
                "flex-1 resize-none bg-transparent p-3 leading-6 outline-none font-mono text-foreground focus:ring-0",
                wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre overflow-x-auto"
              )}
            />
          </div>
        )}
      </div>

      {/* Footer / Accept-Reject Controls for Diff */}
      {mode === "diff" && hasDiff && (
        <div className="flex items-center justify-between border-t border-[var(--mn-line)] bg-secondary/25 px-4 py-2 text-xs">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
              +{addedCount} additions
            </Badge>
            <Badge variant="outline" className="text-rose-400 border-rose-500/30">
              -{removedCount} deletions
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleRejectAll} className="h-7 text-xs border-rose-500/40 text-rose-400 hover:bg-rose-500/10">
              <RotateCcw className="mr-1 size-3" />
              Revert Edits
            </Button>
            <Button size="sm" onClick={handleAcceptAll} className="h-7 text-xs mn-accent-button">
              <Check className="mr-1 size-3" />
              Accept Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
