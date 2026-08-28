import { useEffect, useState } from "react";
import { Copy, FileWarning, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HighlightedLine } from "./diff-view";
import type { DesktopFilePreview } from "@/types";

interface FilePreviewDialogProps {
  path: string | null;
  onClose: () => void;
  onLoad: (path: string) => Promise<DesktopFilePreview>;
  onNotify?: (message: string, kind?: "success" | "error") => void;
}

/**
 * Read-only file preview: click a file in the workspace tree and see its
 * contents right away, with line numbers and light syntax tinting, instead
 * of only getting a "Selected path/to/file" toast.
 */
export function FilePreviewDialog({ path, onClose, onLoad, onNotify }: FilePreviewDialogProps) {
  const [preview, setPreview] = useState<DesktopFilePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!path) {
      setPreview(null);
      setError("");
      return;
    }
    let active = true;
    setLoading(true);
    setError("");
    void onLoad(path)
      .then((result) => {
        if (active) setPreview(result);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Could not read file");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  const lines = preview && !preview.binary ? preview.content.replace(/\n$/, "").split("\n") : [];

  async function copyContent() {
    if (!preview) return;
    try {
      await navigator.clipboard.writeText(preview.content);
      onNotify?.("Copied file contents", "success");
    } catch {
      onNotify?.("Could not copy file contents", "error");
    }
  }

  return (
    <Dialog open={Boolean(path)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[85vh] w-full max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
      >
        <DialogHeader className="flex-row items-center justify-between gap-3 space-y-0 border-b border-[var(--mn-line)] px-4 py-3">
          <div className="min-w-0">
            <DialogTitle className="truncate font-mono text-sm">
              {preview?.path ?? path ?? ""}
            </DialogTitle>
            <DialogDescription className="text-[0.6875rem]">
              {preview && !preview.binary
                ? `${preview.lines} lines · ${formatBytes(preview.size)}${preview.truncated ? " · truncated preview" : ""}`
                : "Read-only preview"}
            </DialogDescription>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {preview && !preview.binary && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => void copyContent()}
                aria-label="Copy file contents"
              >
                <Copy className="size-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close preview">
              <X className="size-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-auto">
          {loading && (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )}
          {!loading && error && (
            <div className="flex h-40 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
              <FileWarning className="size-5 text-rose-500" />
              {error}
            </div>
          )}
          {!loading && !error && preview?.binary && (
            <div className="flex h-40 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
              <FileWarning className="size-5" />
              This looks like a binary file and can&apos;t be previewed as text.
            </div>
          )}
          {!loading && !error && preview && !preview.binary && (
            <pre className="m-0 min-w-full text-[0.75rem] leading-5">
              <code className="grid grid-cols-[auto_1fr]">
                {lines.map((line, index) => (
                  <span key={index} className="contents">
                    <span className="select-none border-r border-[var(--mn-line)] bg-[var(--mn-surface-muted)] px-3 py-0 text-right text-muted-foreground/60">
                      {index + 1}
                    </span>
                    <span className="whitespace-pre px-3 font-mono">
                      <HighlightedLine text={line || " "} />
                    </span>
                  </span>
                ))}
              </code>
            </pre>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
