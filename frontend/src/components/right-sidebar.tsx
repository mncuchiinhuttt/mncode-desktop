import type React from "react";
import { FolderTree, MessageCircle, PanelRightClose, Send, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileTree } from "./file-tree";
import { AgentRunPanel } from "./agent-run-panel";
import { ResizeHandle } from "./resize-handle";
import type { ActivityItem, FileNode, WorkspaceInfo } from "@/types";

export type RightPanel = "workspace" | "chat" | "activity";

interface RightSidebarProps {
  panel: RightPanel;
  workspace: WorkspaceInfo;
  files: FileNode[];
  activities: ActivityItem[];
  sidePrompt: string;
  sideNotes: string[];
  onPanelChange: (panel: RightPanel) => void;
  onClose: () => void;
  onSidePromptChange: (value: string) => void;
  onSideSubmit: () => void;
  onPromoteNote: (note: string) => void;
  onOpenWorkspace: () => void;
  onFileSelect: (node: FileNode) => void;
  onResizeStart: (event: React.PointerEvent<HTMLDivElement>) => void;
}

export function RightSidebar({
  panel,
  workspace,
  files,
  activities,
  sidePrompt,
  sideNotes,
  onPanelChange,
  onClose,
  onSidePromptChange,
  onSideSubmit,
  onPromoteNote,
  onOpenWorkspace,
  onFileSelect,
  onResizeStart,
}: RightSidebarProps) {
  return (
    <aside className="mn-surface-muted mn-right-sidebar relative flex h-full w-full shrink-0 flex-col border-l border-[var(--mn-line)] text-foreground">
      <div className="flex h-14 items-center justify-between border-b border-[var(--mn-line)] px-3">
        <div>
          <p className="text-xs font-semibold">Workspace sidecar</p>
          <p className="mt-0.5 text-[0.6875rem] text-muted-foreground">
            {workspace.ready ? workspace.name : "No project selected"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close right sidebar"
        >
          <PanelRightClose className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-3 border-b border-[var(--mn-line)] p-1">
        <SideTab
          active={panel === "workspace"}
          icon={FolderTree}
          label="Files"
          onClick={() => onPanelChange("workspace")}
        />
        <SideTab
          active={panel === "chat"}
          icon={MessageCircle}
          label="Chat"
          onClick={() => onPanelChange("chat")}
        />
        <SideTab
          active={panel === "activity"}
          icon={UsersRound}
          label="Agents"
          onClick={() => onPanelChange("activity")}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {panel === "workspace" && (
          <FolderPanel
            workspace={workspace}
            files={files}
            onOpenWorkspace={onOpenWorkspace}
            onFileSelect={onFileSelect}
          />
        )}
        {panel === "chat" && (
          <SideChat
            notes={sideNotes}
            prompt={sidePrompt}
            onPromptChange={onSidePromptChange}
            onSubmit={onSideSubmit}
            onPromote={onPromoteNote}
          />
        )}
        {panel === "activity" && <AgentRunPanel activities={activities} />}
      </div>
      <ResizeHandle side="left" onPointerDown={onResizeStart} />
    </aside>
  );
}

function SideTab({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-0 flex-col items-center gap-1 rounded-md px-1 py-1 text-[0.625rem] transition-colors ${active ? "bg-[var(--mn-surface)] text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
    >
      <Icon className="size-3.5" />
      <span>{label}</span>
    </button>
  );
}

function FolderPanel({
  workspace,
  files,
  onOpenWorkspace,
  onFileSelect,
}: {
  workspace: WorkspaceInfo;
  files: FileNode[];
  onOpenWorkspace: () => void;
  onFileSelect: (node: FileNode) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Project root
          </p>
          <Badge variant="outline" className="border-[var(--mn-line)] text-[0.625rem]">
            {workspace.ready ? "indexed" : "waiting"}
          </Badge>
        </div>
        {workspace.ready ? (
          <>
            <p className="mt-2 truncate text-sm font-medium">{workspace.name}</p>
            <p className="mt-1 truncate font-mono text-[0.6875rem] text-muted-foreground">
              {workspace.path}
            </p>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenWorkspace}
            className="mt-3 border-[var(--mn-line)]"
          >
            Open workspace
          </Button>
        )}
      </div>
      {workspace.ready && (
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Files" value={workspace.totalFiles.toString()} />
          <Stat label="Lines" value={workspace.totalLines.toLocaleString()} />
        </div>
      )}
      {workspace.ready && (
        <div>
          <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Files
          </p>
          <div className="rounded-lg border border-[var(--mn-line)] bg-[var(--mn-surface)] p-2">
            <FileTree nodes={files} onSelect={onFileSelect} />
          </div>
        </div>
      )}
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="hud-stat">
      <span className="hud-stat-label">{label}</span>
      <span className="hud-stat-value !text-base">{value}</span>
    </div>
  );
}

function SideChat({
  notes,
  prompt,
  onPromptChange,
  onSubmit,
  onPromote,
}: {
  notes: string[];
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  onPromote: (note: string) => void;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="mb-4">
        <p className="text-sm font-medium">Side chat</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Keep a thought beside the main task. Promote it when it becomes actionable.
        </p>
      </div>
      <div className="flex-1 space-y-2">
        {notes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--mn-line)] p-4 text-center text-xs text-muted-foreground">
            No side notes yet.
          </div>
        ) : (
          notes.map((note) => (
            <button
              type="button"
              key={note}
              onClick={() => onPromote(note)}
              className="w-full rounded-lg border border-[var(--mn-line)] bg-[var(--mn-surface)] p-3 text-left text-xs leading-5 hover:border-[var(--mn-accent)]/50"
            >
              {note}
              <span className="mt-2 block text-[0.6875rem] text-[var(--mn-accent-strong)]">
                Add to main task
              </span>
            </button>
          ))
        )}
      </div>
      <div className="mt-4 rounded-lg border border-[var(--mn-line)] bg-[var(--mn-surface)] p-2">
        <textarea
          aria-label="Side chat note"
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder="Ask or jot down a thought..."
          className="min-h-20 w-full resize-none bg-transparent p-2 text-xs outline-none placeholder:text-muted-foreground"
        />
        <div className="flex justify-end">
          <Button
            size="icon-sm"
            disabled={!prompt.trim()}
            onClick={onSubmit}
            className="mn-accent-button"
            aria-label="Save side note"
          >
            <Send className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
function ActivityPanel({ activities }: { activities: ActivityItem[] }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">Agent activity</p>
        <p className="mt-1 text-xs text-muted-foreground">The current run, tools and subagents.</p>
      </div>
      {activities.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--mn-line)] p-4 text-center text-xs text-muted-foreground">
          No active run.
        </div>
      ) : (
        activities.map((item) => (
          <Card key={item.id} className="mn-surface gap-0 py-0 shadow-none">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-xs font-medium">
                {item.active && (
                  <span className="size-1.5 animate-pulse rounded-full bg-[var(--mn-accent)]" />
                )}
                {item.label}
              </div>
              <p className="mt-1 text-[0.6875rem] leading-4 text-muted-foreground">{item.detail}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
