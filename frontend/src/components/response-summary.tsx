import { FilePenLine } from "lucide-react";
import type { ActivityItem } from "@/types";

interface EditedFile {
  path: string;
  added: number;
  removed: number;
}

function collectEditedFiles(activities: ActivityItem[]) {
  const files = new Map<string, EditedFile>();
  for (const item of activities) {
    if (item.kind !== "file" || item.status !== "complete") continue;
    const path = item.filePath?.trim();
    if (!path) continue;
    const current = files.get(path) ?? { path, added: 0, removed: 0 };
    current.added += item.linesAdded ?? 0;
    current.removed += item.linesRemoved ?? 0;
    files.set(path, current);
  }
  return [...files.values()];
}

export function ResponseSummary({ activities }: { activities: ActivityItem[] }) {
  const files = collectEditedFiles(activities);
  if (files.length === 0) return null;

  const added = files.reduce((total, file) => total + file.added, 0);
  const removed = files.reduce((total, file) => total + file.removed, 0);
  const label = files.length === 1 ? "file" : "files";

  return (
    <section className="mt-5 overflow-hidden rounded-xl border border-[var(--mn-line)] bg-[var(--mn-surface)]">
      <div className="flex items-center gap-3 border-b border-[var(--mn-line)] px-4 py-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--mn-surface-muted)] text-muted-foreground">
          <FilePenLine className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Edited {files.length} {label}
          </p>
          <p className="mt-0.5 font-mono text-xs">
            <span className="text-emerald-600">+{added}</span>{" "}
            <span className="text-rose-600">-{removed}</span>
          </p>
        </div>
      </div>
      <div className="divide-y divide-[var(--mn-line)]">
        {files.map((file) => (
          <div
            key={file.path}
            className="flex items-center gap-3 px-4 py-2.5 text-xs"
          >
            <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground">
              {file.path}
            </span>
            <span className="shrink-0 font-mono">
              <span className="text-emerald-600">+{file.added}</span>{" "}
              <span className="text-rose-600">-{file.removed}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
