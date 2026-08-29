import { useEffect, useState } from "react";
import { FileWarning, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { InAppCodeEditor } from "./in-app-code-editor";
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
        className="flex h-[88vh] w-full max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl border-0 bg-transparent shadow-none"
      >
        {loading ? (
          <div className="flex h-64 items-center justify-center gap-2 text-xs text-muted-foreground bg-background rounded-xl border border-[var(--mn-line)]">
            <Loader2 className="size-4 animate-spin text-[var(--mn-accent-strong)]" />
            Reading file…
          </div>
        ) : error ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 p-6 text-center text-xs text-destructive bg-background rounded-xl border border-destructive/30">
            <FileWarning className="size-5" />
            {error}
          </div>
        ) : preview?.binary ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 p-6 text-center text-xs text-muted-foreground bg-background rounded-xl border border-[var(--mn-line)]">
            <FileWarning className="size-5" />
            Binary file preview not supported in text editor.
          </div>
        ) : preview ? (
          <InAppCodeEditor
            filePath={preview.path}
            initialContent={preview.content}
            onClose={onClose}
            onNotify={onNotify}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
