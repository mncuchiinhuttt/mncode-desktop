import {
  CircleHelp,
  Command,
  PanelBottom,
  PanelRight,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { handleTitlebarDoubleClick } from "@/lib/window";
import { cn } from "@/lib/utils";
import type { ViewName, WorkspaceInfo } from "@/types";

interface TopBarProps {
  view: ViewName;
  workspace: WorkspaceInfo;
  sidebarCollapsed: boolean;
  onCommandPalette: () => void;
  onToggleInspector: () => void;
  onToggleTerminal: () => void;
  onHelp: () => void;
}

const viewMeta: Record<ViewName, { code: string; label: string }> = {
  workspace: { code: "00", label: "Workspace" },
  insights: { code: "01", label: "Insights" },
  settings: { code: "02", label: "Settings" },
  automations: { code: "03", label: "Automations" },
  mcp: { code: "04", label: "MCP & Plugins" },
};

export function TopBar({
  view,
  workspace,
  sidebarCollapsed,
  onCommandPalette,
  onToggleInspector,
  onToggleTerminal,
  onHelp,
}: TopBarProps) {
  const meta = viewMeta[view];
  return (
    <header
      className="mn-drag-region flex h-14 shrink-0 items-center justify-between border-b border-[var(--mn-line)] px-5"
      onDoubleClick={handleTitlebarDoubleClick}
    >
      <div
        className={cn(
          "flex min-w-0 items-center gap-3",
          sidebarCollapsed && "pl-3",
        )}
      >
        <span className="eyebrow-badge">
          [ {meta.code} · {meta.label} ]
        </span>
        <i className="pipe-delimiter hidden text-xs lg:inline">|</i>
        {workspace.ready ? (
          <span className="hidden min-w-0 items-center gap-2 md:flex">
            <span className="pulse-beacon" />
            <span className="hud-mono truncate text-muted-foreground">
              {workspace.name}
            </span>
            <i className="pipe-delimiter text-xs">|</i>
            <span className="hud-mono shrink-0 text-[var(--mn-cyan)]">
              {workspace.totalFiles} files
            </span>
          </span>
        ) : (
          <span className="hud-mono hidden text-muted-foreground/70 md:inline">
            No workspace mounted
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <TooltipProvider delayDuration={250}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onCommandPalette}
                className="text-muted-foreground hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.06]"
                aria-label="Search"
              >
                <Search className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Search <span className="font-mono text-[10px]">⌘K</span>
            </TooltipContent>
          </Tooltip>
          <span
            className="mr-1 hidden items-center gap-0.5 font-mono text-[10px] text-muted-foreground sm:flex"
            aria-label="Search shortcut"
          >
            <Command className="size-3" />K
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onToggleTerminal}
                className="text-muted-foreground hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.06]"
                aria-label="Toggle terminal"
              >
                <PanelBottom className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Toggle terminal <span className="font-mono text-[10px]">⌘J</span>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onToggleInspector}
                className="text-muted-foreground hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.06]"
                aria-label="Toggle activity"
              >
                <PanelRight className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle activity panel</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onHelp}
                className="text-muted-foreground hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.06]"
                aria-label="Help"
              >
                <CircleHelp className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Help and shortcuts</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  );
}
