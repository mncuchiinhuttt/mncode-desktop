import type React from "react";
import { cn } from "@/lib/utils";

export function ResizeHandle({
  side,
  onPointerDown,
}: {
  side: "left" | "right";
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${side === "left" ? "right" : "left"} sidebar`}
      onPointerDown={onPointerDown}
      className={cn(
        "absolute inset-y-0 z-40 w-2 cursor-col-resize touch-none select-none",
        side === "left" ? "left-0" : "-right-1",
      )}
      style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
    >
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors hover:bg-[var(--mn-accent)]/60" />
    </div>
  );
}
