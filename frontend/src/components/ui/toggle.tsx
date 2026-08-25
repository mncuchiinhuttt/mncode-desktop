import * as React from "react";

import { cn } from "@/lib/utils";

function Toggle({
  className,
  pressed,
  onPressedChange,
  size = "default",
  ...props
}: Omit<React.ComponentProps<"button">, "onPress"> & {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  size?: "sm" | "default";
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={pressed}
      onClick={(event) => {
        event.stopPropagation();
        onPressedChange?.(!pressed);
      }}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--mn-accent)]/50 disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-4 w-7" : "h-5 w-9",
        pressed ? "bg-[var(--mn-accent)]" : "bg-[var(--mn-line)]",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow transition-transform",
          size === "sm" ? "size-3 translate-x-0.5" : "size-4 translate-x-0.5",
          pressed && (size === "sm" ? "translate-x-3.5" : "translate-x-[1.15rem]"),
        )}
      />
    </button>
  );
}

export { Toggle };
