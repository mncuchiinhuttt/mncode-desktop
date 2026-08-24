import type React from "react";
import { WindowToggleMaximise } from "../../wailsjs/runtime/runtime";

interface NativeWindow extends Window {
  runtime?: Record<string, unknown>;
}

export function toggleWindowMaximise() {
  if ((window as NativeWindow).runtime) WindowToggleMaximise();
}

export function handleTitlebarDoubleClick(event: React.MouseEvent<HTMLElement>) {
  const target = event.target as HTMLElement;
  if (target.closest('button, a, input, textarea, select, [role="button"]')) return;
  toggleWindowMaximise();
}
