import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  AtSign,
  BrainCircuit,
  Check,
  ChevronDown,
  Copy,
  Folder,
  GitBranch,
  Loader2,
  MessageSquare,
  Paperclip,
  Plus,
  ShieldCheck,
  Sparkles,
  SquareSlash,
  ThumbsDown,
  ThumbsUp,
  Workflow,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { modelLabel } from "@/lib/models";
import {
  getPromptOptionCount,
  getPromptOptions,
  getPromptTriggerState,
  PromptSuggestionMenu,
  type PromptTriggerState,
} from "./prompt-suggestions";
import type {
  ActivityItem,
  AgentRunSummary,
  AgentRunUsage,
  ChatMessage,
  DesktopAccount,
  DesktopCatalog,
  DesktopSettings,
  ModeOption,
  PermissionRequest,
  PromptCatalog,
  PromptOption,
  QuestionRequest,
  WorkspaceInfo,
} from "@/types";
import { FullAccessCautionDialog } from "./full-access-caution-dialog";
import { MarkdownRenderer } from "./markdown-renderer";
import { ResponseSummary } from "./response-summary";
import { RunSummary } from "./run-summary";

interface WorkspaceViewProps {
  workspace: WorkspaceInfo;
  account: DesktopAccount;
  messages: ChatMessage[];
  activities: ActivityItem[];
  runSummary?: AgentRunSummary;
  runUsage: AgentRunUsage;
  runStartedAt?: number;
  prompt: string;
  running: boolean;
  permission?: PermissionRequest;
  question?: QuestionRequest;
  catalog: DesktopCatalog;
  settings: DesktopSettings;
  onPromptChange: (value: string) => void;
  onPromptPreset: (value: string) => void;
  onSend: () => void;
  onSteer: () => void;
  onPermission: (allowed: boolean) => void;
  onQuestion: (answer: string) => void;
  onCopyResponse: (content: string) => void;
  onBranchResponse: (messageId: string) => void;
  onFeedback: (messageId: string, feedback: "like" | "dislike") => void;
  onOpenWorkspace: () => void;
  onOpenStandaloneChat: () => void;
  onAttach: () => void;
  onSettingsChange: (input: Partial<DesktopSettings>) => void;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  workspace,
  account,
  messages,
  activities,
  runSummary,
  runUsage,
  runStartedAt,
  prompt,
  running,
  permission,
  question,
  catalog,
  settings,
  onPromptChange,
  onPromptPreset,
  onSend,
  onSteer,
  onPermission,
  onQuestion,
  onCopyResponse,
  onBranchResponse,
  onFeedback,
  onOpenWorkspace,
  onOpenStandaloneChat,
  onAttach,
  onSettingsChange,
}) => {
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const composer = (
    <Composer
      ref={composerRef}
      workspace={workspace}
      prompt={prompt}
      running={running}
      catalog={catalog}
      settings={settings}
      promptCatalog={catalog.prompt}
      onPromptChange={onPromptChange}
      onSend={onSend}
      onSteer={onSteer}
      onOpenWorkspace={onOpenWorkspace}
      onOpenStandaloneChat={onOpenStandaloneChat}
      onAttach={onAttach}
      onSettingsChange={onSettingsChange}
    />
  );

  return (
    <div className="mn-page-in relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <Landing
            account={account}
            workspace={workspace}
            composer={composer}
            suggestedPrompts={settings.suggestedPrompts}
            onPromptPreset={onPromptPreset}
          />
        ) : (
          <>
            <div className="mx-auto max-w-5xl space-y-5 px-6 pb-[300px] pt-8">
              {messages.map((message, index) => {
                const isLatestAssistant =
                  message.role === "assistant" &&
                  !messages.slice(index + 1).some(
                    (nextMessage) => nextMessage.role === "assistant",
                  );
                return (
                  <React.Fragment key={message.id}>
                    {isLatestAssistant && (
                      <RunSummary
                        running={running}
                        summary={runSummary}
                        usage={runUsage}
                        startedAt={runStartedAt}
                        activities={activities}
                      />
                    )}
                    <MessageBubble
                      message={message}
                      activities={isLatestAssistant ? activities : []}
                      onCopy={onCopyResponse}
                      onBranch={onBranchResponse}
                      onFeedback={onFeedback}
                    />
                  </React.Fragment>
                );
              })}
            </div>
          </>
        )}
      </div>
      {messages.length > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-2 pb-5 sm:px-3 lg:px-3">
          <div className="pointer-events-auto mx-auto w-full">{composer}</div>
        </div>
      )}
      {question && (
        <div className="relative z-30">
          <QuestionCard question={question} onQuestion={onQuestion} />
        </div>
      )}
      {permission && (
        <div className="relative z-30">
          <PermissionCard permission={permission} onPermission={onPermission} />
        </div>
      )}
    </div>
  );
};

function Landing({
  account,
  workspace,
  composer,
  suggestedPrompts,
  onPromptPreset,
}: {
  account: DesktopAccount;
  workspace: WorkspaceInfo;
  composer: React.ReactNode;
  suggestedPrompts: boolean;
  onPromptPreset: (value: string) => void;
}) {
  const displayName = account.connected
    ? (account.name.trim().split(/\s+/).pop() ?? "")
    : "";
  const greeting = displayName
    ? `Good evening, ${displayName}`
    : "Good evening";
  return (
    <div className="mx-auto flex min-h-full max-w-4xl flex-col items-center justify-center px-6 pb-10 pt-8">
      <div className="relative z-10 mb-5 text-center">
        <p className="text-sm text-muted-foreground">{greeting}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          What would you like to build?
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          Ask mncode anything about your codebase. Use{" "}
          <span className="font-mono text-[var(--mn-accent-strong)]">@</span>{" "}
          for context or{" "}
          <span className="font-mono text-[var(--mn-accent-strong)]">/</span>{" "}
          for commands.
        </p>
      </div>
      <div className="relative z-10 w-full max-w-3xl">{composer}</div>
      {suggestedPrompts && (
        <div className="relative z-10 mt-7 grid w-full max-w-3xl gap-2 sm:grid-cols-3">
          <StarterCard
            icon={BrainCircuit}
            title="Quick fix"
            text="Find and fix the next error"
            onClick={() =>
              onPromptPreset(
                "Please inspect this workspace and find the most important issue to fix next.",
              )
            }
          />
          <StarterCard
            icon={Workflow}
            title="Plan a feature"
            text="Turn an idea into phases"
            onClick={() =>
              onPromptPreset(
                "Help me plan the next feature for this workspace. Start with a concise implementation plan.",
              )
            }
          />
          <StarterCard
            icon={Sparkles}
            title="Explore code"
            text={
              workspace.ready
                ? `Understand ${workspace.name}`
                : "Open a project first"
            }
            onClick={() =>
              onPromptPreset(
                "Give me a concise architecture overview of this codebase.",
              )
            }
          />
        </div>
      )}
    </div>
  );
}

function StarterCard({
  icon: Icon,
  title,
  text,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-xl border border-[var(--mn-line)] bg-[var(--mn-surface)] p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--mn-accent)]/45 hover:shadow-md"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="size-3.5 text-[var(--mn-accent-strong)]" />
        {title}
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground group-hover:text-foreground/70">
        {text}
      </p>
    </button>
  );
}

interface ComposerProps {
  workspace: WorkspaceInfo;
  prompt: string;
  running: boolean;
  catalog: DesktopCatalog;
  settings: DesktopSettings;
  promptCatalog: PromptCatalog;
  onPromptChange: (value: string) => void;
  onSend: () => void;
  onSteer: () => void;
  onOpenWorkspace: () => void;
  onOpenStandaloneChat: () => void;
  onAttach: () => void;
  onSettingsChange: (input: Partial<DesktopSettings>) => void;
}

const Composer = React.forwardRef<HTMLTextAreaElement, ComposerProps>(
  (
    {
      workspace,
      prompt,
      running,
      catalog,
      settings,
      promptCatalog,
      onPromptChange,
      onSend,
      onSteer,
      onOpenWorkspace,
      onOpenStandaloneChat,
      onAttach,
      onSettingsChange,
    },
    ref,
  ) => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const [triggerState, setTriggerState] = useState<PromptTriggerState | null>(
      null,
    );
    const [activeSuggestion, setActiveSuggestion] = useState(0);
    const [fullAccessCautionOpen, setFullAccessCautionOpen] = useState(false);
    const model = catalog.models.find((item) => item.id === settings.model);
    const permission = catalog.permissions.find(
      (item) => item.id === settings.permissionMode,
    );
    const effort = catalog.efforts.find((item) => item.id === settings.effort);
    const suggestions = useMemo(
      () => (triggerState ? getPromptOptions(promptCatalog, triggerState) : []),
      [promptCatalog, triggerState],
    );
    const suggestionCount = useMemo(
      () =>
        triggerState ? getPromptOptionCount(promptCatalog, triggerState) : 0,
      [promptCatalog, triggerState],
    );

    useEffect(() => {
      setActiveSuggestion((current) =>
        Math.min(current, Math.max(0, suggestions.length - 1)),
      );
    }, [suggestions.length]);

    function assignTextarea(element: HTMLTextAreaElement | null) {
      textareaRef.current = element;
      if (typeof ref === "function") ref(element);
      else if (ref) ref.current = element;
    }

    function syncSuggestions(value: string, cursor: number) {
      setTriggerState(getPromptTriggerState(value, cursor));
      setActiveSuggestion(0);
    }

    function handlePromptChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
      onPromptChange(event.target.value);
      syncSuggestions(event.target.value, event.target.selectionStart);
    }

    function insertTrigger(token: "@" | "/") {
      const cursor = textareaRef.current?.selectionStart ?? prompt.length;
      const spacer = cursor > 0 && !/\s/.test(prompt[cursor - 1]) ? " " : "";
      const insertion = `${spacer}${token}`;
      const nextPrompt = `${prompt.slice(0, cursor)}${insertion}${prompt.slice(cursor)}`;
      const tokenStart = cursor + spacer.length;
      onPromptChange(nextPrompt);
      setTriggerState({
        trigger: token,
        query: "",
        start: tokenStart,
        end: tokenStart + 1,
      });
      setActiveSuggestion(0);
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(tokenStart + 1, tokenStart + 1);
      });
    }

    function selectSuggestion(option: PromptOption) {
      if (!triggerState) return;
      const trailingSpace = prompt.slice(triggerState.end).startsWith(" ")
        ? ""
        : " ";
      const nextPrompt = `${prompt.slice(0, triggerState.start)}${option.insertText}${trailingSpace}${prompt.slice(triggerState.end)}`;
      const nextCursor =
        triggerState.start + option.insertText.length + trailingSpace.length;
      onPromptChange(nextPrompt);
      setTriggerState(null);
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
      });
    }

    function changePermissionMode(value: string) {
      if (value === "bypass" && settings.permissionMode !== "bypass") {
        setFullAccessCautionOpen(true);
        return;
      }
      onSettingsChange({ permissionMode: value });
    }

    function confirmFullAccess() {
      setFullAccessCautionOpen(false);
      onSettingsChange({ permissionMode: "bypass" });
    }

    function handlePromptKeyDown(
      event: React.KeyboardEvent<HTMLTextAreaElement>,
    ) {
      if (triggerState) {
        if (event.key === "ArrowDown" && suggestions.length > 0) {
          event.preventDefault();
          setActiveSuggestion((current) => (current + 1) % suggestions.length);
          return;
        }
        if (event.key === "ArrowUp" && suggestions.length > 0) {
          event.preventDefault();
          setActiveSuggestion(
            (current) =>
              (current - 1 + suggestions.length) % suggestions.length,
          );
          return;
        }
        if (
          (event.key === "Enter" || event.key === "Tab") &&
          suggestions[activeSuggestion]
        ) {
          event.preventDefault();
          selectSuggestion(suggestions[activeSuggestion]);
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          setTriggerState(null);
          setActiveSuggestion(0);
          return;
        }
      }
      if (
        event.key === "Enter" &&
        !event.shiftKey &&
        settings.sendShortcut === "enter"
      ) {
        event.preventDefault();
        running ? onSteer() : onSend();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        running ? onSteer() : onSend();
      }
    }

    return (
      <div className="relative">
        {triggerState && (
          <PromptSuggestionMenu
            trigger={triggerState.trigger}
            options={suggestions}
            totalCount={suggestionCount}
            activeIndex={activeSuggestion}
            onSelect={selectSuggestion}
            onHover={setActiveSuggestion}
          />
        )}
        <Card className="mn-composer mn-soft-shadow gap-0 overflow-hidden rounded-2xl border py-0">
          <CardContent className="p-0">
            <div className="border-b border-[var(--mn-line)] px-3 py-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-2 px-2 text-[0.6875rem] text-foreground/75 hover:bg-[var(--mn-surface-muted)]"
                  >
                    <Folder className="size-3.5 text-[var(--mn-accent-strong)]" />
                    {workspace.ready ? workspace.name : "Chat without workspace"}
                    <ChevronDown className="size-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="border-[var(--mn-line)] bg-[var(--mn-surface)] text-foreground"
                >
                  <DropdownMenuItem onClick={onOpenWorkspace}>
                    <Folder className="size-3.5" />
                    {workspace.ready ? "Switch workspace" : "Open workspace"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onOpenStandaloneChat}>
                    <MessageSquare className="size-3.5" />
                    Chat without workspace
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <textarea
              aria-label="Prompt"
              aria-controls="prompt-suggestions"
              ref={assignTextarea}
              value={prompt}
              onChange={handlePromptChange}
              onKeyDown={handlePromptKeyDown}
              onKeyUp={(event) => {
                if (
                  !["Enter", "Tab", "Escape", "ArrowUp", "ArrowDown"].includes(
                    event.key,
                  )
                )
                  syncSuggestions(
                    event.currentTarget.value,
                    event.currentTarget.selectionStart,
                  );
              }}
              onClick={(event) =>
                syncSuggestions(
                  event.currentTarget.value,
                  event.currentTarget.selectionStart,
                )
              }
              placeholder="Ask mncode anything, @ to add context, / for commands or capabilities"
              className="min-h-[88px] w-full resize-none bg-transparent px-4 py-3.5 text-[0.875rem] leading-6 text-foreground outline-none placeholder:text-muted-foreground/65"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--mn-line)] px-3 py-2">
              <div className="flex items-center gap-1">
                <ContextMenu
                  onAttach={onAttach}
                  onContextToken={insertTrigger}
                />
                <ModeMenu
                  menuTitle="Permission"
                  label={permission?.label ?? "Ask before changes"}
                  icon={ShieldCheck}
                  options={catalog.permissions}
                  value={settings.permissionMode}
                  danger={settings.permissionMode === "bypass"}
                  onChange={changePermissionMode}
                />
              </div>
              <div className="flex items-center gap-1">
                {settings.showContextWindowUsage && (
                  <ContextRing
                    percent={settings.contextPercent}
                    used={settings.contextUsed}
                    limit={settings.contextLimit}
                    modelName={model?.name ?? settings.model}
                  />
                )}
                <ModelMenu
                  models={catalog.models}
                  value={settings.model}
                  onChange={(value, provider) =>
                    onSettingsChange({ model: value, provider })
                  }
                />
                <ModeMenu
                  menuTitle="Effort"
                  formatOptionLabel={titleCase}
                  label={titleCase(effort?.label ?? "high")}
                  icon={BrainCircuit}
                  options={catalog.efforts}
                  value={settings.effort}
                  onChange={(value) => onSettingsChange({ effort: value })}
                />
                <Button
                  size="icon"
                  disabled={!prompt.trim()}
                  onClick={running ? onSteer : onSend}
                  className="mn-accent-button size-8 rounded-lg"
                  aria-label={running ? "Steer agent" : "Send prompt"}
                >
                  {running ? (
                    <Sparkles className="size-4" />
                  ) : (
                    <ArrowUp className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <FullAccessCautionDialog
          open={fullAccessCautionOpen}
          onOpenChange={setFullAccessCautionOpen}
          onConfirm={confirmFullAccess}
        />
      </div>
    );
  },
);

function ContextMenu({
  onAttach,
  onContextToken,
}: {
  onAttach: () => void;
  onContextToken: (token: "@" | "/") => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:bg-[var(--mn-surface-muted)] hover:text-foreground"
          aria-label="Add context"
        >
          <Plus className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-64 border-[var(--mn-line)] bg-[var(--mn-surface)] text-foreground"
      >
        <DropdownMenuLabel className="text-[0.6875rem] uppercase tracking-[0.14em] text-muted-foreground">
          Add context
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={onAttach}>
          <Paperclip className="size-4" />
          Add attachment
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onContextToken("@")}>
          <AtSign className="size-4" />
          Use @ to add context
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onContextToken("/")}>
          <SquareSlash className="size-4" />
          Use / for commands or capabilities
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ContextRing({
  percent,
  used,
  limit,
  modelName,
}: {
  percent: number;
  used: number;
  limit: number;
  modelName: string;
}) {
  const safe = Math.max(0, Math.min(100, percent || 0));
  const remaining = Math.max(0, limit - used);
  const statusClass =
    safe >= 85
      ? "bg-rose-500"
      : safe >= 70
        ? "bg-amber-500"
        : "bg-[var(--mn-accent-strong)]";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="mn-context-ring border-0 p-0"
          style={{ "--context-percent": `${safe}%` } as React.CSSProperties}
          aria-label={`Context window ${Math.round(safe)}% used`}
        >
          <span>{Math.round(safe)}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="center"
        sideOffset={12}
        arrowClassName="bg-[var(--mn-surface)] fill-[var(--mn-surface)]"
        className="w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-[var(--mn-line)] bg-[var(--mn-surface)] p-4 text-foreground shadow-2xl"
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Context window</p>
              <p className="mt-1 max-w-[220px] truncate text-[0.75rem] text-muted-foreground">
                {modelName || "Current model"}
              </p>
            </div>
            <span className="rounded-full bg-[var(--mn-accent-soft)] px-2 py-1 font-mono text-[0.6875rem] font-semibold text-[var(--mn-accent-strong)]">
              {Math.round(safe)}% used
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ContextStat
              label="Used"
              value={`${formatTokenCount(used)} tokens`}
            />
            <ContextStat
              label="Context budget"
              value={`${formatTokenCount(limit)} tokens`}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[0.75rem] text-muted-foreground">
              <span>Current load</span>
              <span>{formatTokenCount(remaining)} remaining</span>
            </div>
            <div
              role="progressbar"
              aria-label="Context window usage"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(safe)}
              className="h-2 overflow-hidden rounded-full bg-[var(--mn-line)]"
            >
              <div
                className={`h-full rounded-full transition-[width] duration-300 ${statusClass}`}
                style={{ width: `${safe}%` }}
              />
            </div>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function ContextStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--mn-line)] bg-[var(--mn-surface-muted)] px-3 py-2">
      <p className="text-[0.6875rem] text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-xs font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}

function formatTokenCount(value: number) {
  if (!value || value < 1000) return `${Math.max(0, value || 0)}`;
  if (value >= 1000000)
    return `${(value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1)}M`;
  return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (character) => character.toUpperCase());
}

function ModeMenu({
  menuTitle,
  label,
  icon: Icon,
  options,
  value,
  onChange,
  formatOptionLabel,
  danger = false,
}: {
  menuTitle: string;
  label: string;
  icon: React.ElementType;
  options: ModeOption[];
  value: string;
  onChange: (value: string) => void;
  formatOptionLabel?: (value: string) => string;
  danger?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 gap-1.5 px-2 text-[0.6875rem] text-muted-foreground hover:bg-[var(--mn-surface-muted)] hover:text-foreground",
            danger && "text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-200",
          )}
        >
          <Icon
            className={cn(
              "size-3.5 text-[var(--mn-accent-strong)]",
              danger && "text-rose-600 dark:text-rose-300",
            )}
          />
          {label}
          <ChevronDown className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-80 w-72 overflow-y-auto border-[var(--mn-line)] bg-[var(--mn-surface)] text-foreground"
      >
        <DropdownMenuLabel className="text-[0.75rem] uppercase tracking-[0.14em] text-muted-foreground">
          {menuTitle}
        </DropdownMenuLabel>
        {options.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onClick={() => onChange(option.id)}
            className={cn(
              "items-start gap-2",
              option.id === "bypass" &&
                "text-rose-600 hover:bg-rose-500/10 focus:bg-rose-500/10 dark:text-rose-300",
            )}
          >
            <Check
              className={cn(
                "mt-0.5 size-3.5",
                option.id === value
                  ? option.id === "bypass"
                    ? "opacity-100 text-rose-600 dark:text-rose-300"
                    : "opacity-100 text-[var(--mn-accent-strong)]"
                  : "opacity-0",
              )}
            />
            <span>
              <span className="block text-sm">
                {formatOptionLabel
                  ? formatOptionLabel(option.label)
                  : option.label}
              </span>
              <span className="mt-0.5 block max-w-60 text-xs leading-5 text-muted-foreground">
                {option.description}
              </span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ModelMenu({
  models,
  value,
  onChange,
}: {
  models: DesktopCatalog["models"];
  value: string;
  onChange: (value: string, provider: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 max-w-52 gap-1.5 px-2 text-[0.6875rem] text-muted-foreground hover:bg-[var(--mn-surface-muted)] hover:text-foreground"
        >
          <Sparkles className="size-3.5 text-[var(--mn-accent-strong)]" />
          <span className="truncate">
            {modelLabel(value, models) || "Select model"}
          </span>
          <ChevronDown className="size-3 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-80 w-80 overflow-y-auto border-[var(--mn-line)] bg-[var(--mn-surface)] text-foreground"
      >
        <DropdownMenuLabel className="text-[0.75rem] uppercase tracking-[0.14em] text-muted-foreground">
          Models
        </DropdownMenuLabel>
        {models.length === 0 ? (
          <DropdownMenuItem disabled>Models are loading…</DropdownMenuItem>
        ) : (
          models.map((model) => (
            <DropdownMenuItem
              key={`${model.provider}-${model.id}`}
              onClick={() => onChange(model.id, model.provider)}
              className="items-start gap-2"
            >
              <Check
                className={cn(
                  "mt-0.5 size-3.5",
                  model.id === value
                    ? "opacity-100 text-[var(--mn-accent-strong)]"
                    : "opacity-0",
                )}
              />
              <span className="min-w-0">
                <span className="block truncate text-sm">{model.name}</span>
                <span className="mt-0.5 block truncate font-mono text-[0.75rem] text-muted-foreground">
                  {model.id} · {model.tag}
                </span>
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MessageBubble({
  message,
  activities,
  onCopy,
  onBranch,
  onFeedback,
}: {
  message: ChatMessage;
  activities: ActivityItem[];
  onCopy: (content: string) => void;
  onBranch: (messageId: string) => void;
  onFeedback: (messageId: string, feedback: "like" | "dislike") => void;
}) {
  const user = message.role === "user";
  if (!user) {
    return (
      <div className="mx-auto w-full max-w-5xl px-2 py-3">
        <MarkdownRenderer content={message.content || "…"} />
        {message.content.trim() && activities.length > 0 && (
          <ResponseSummary activities={activities} />
        )}
        {message.content.trim() && message.id !== "streaming" && (
          <div className="mt-5 flex items-center gap-1 border-t border-[var(--mn-line)] pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Copy response"
              aria-label="Copy response"
              onClick={() => onCopy(message.content)}
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Copy className="size-3.5" />
              <span>Copy</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Start in new branch"
              aria-label="Start in new branch"
              onClick={() => onBranch(message.id)}
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <GitBranch className="size-3.5" />
              <span>Start in new branch</span>
            </Button>
            <span className="mx-1 h-3.5 w-px bg-[var(--mn-line)]" />
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              title="Like response"
              aria-label="Like response"
              onClick={() => onFeedback(message.id, "like")}
              className={cn(
                "text-muted-foreground hover:text-emerald-600",
                message.feedback === "like" && "bg-emerald-500/10 text-emerald-600",
              )}
            >
              <ThumbsUp className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              title="Dislike response"
              aria-label="Dislike response"
              onClick={() => onFeedback(message.id, "dislike")}
              className={cn(
                "text-muted-foreground hover:text-rose-600",
                message.feedback === "dislike" && "bg-rose-500/10 text-rose-600",
              )}
            >
              <ThumbsDown className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="flex justify-end">
      <div
        className="max-w-[82%] rounded-2xl border border-[var(--mn-line)] bg-[var(--mn-surface-muted)] px-4 py-3 text-[15px] leading-7"
      >
        <p className="whitespace-pre-wrap">{message.content || "…"}</p>
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  onQuestion,
}: {
  question: QuestionRequest;
  onQuestion: (answer: string) => void;
}) {
  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      className="border-t border-[var(--mn-line)] bg-[var(--mn-surface-muted)] px-3 py-3 sm:px-4"
    >
      <div className="flex w-full items-start gap-3 rounded-xl border border-[var(--mn-line)] bg-[var(--mn-surface)] px-4 py-3">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-[var(--mn-accent-strong)]" />
        <div className="min-w-0 flex-1">
          <p className="text-[0.875rem] font-medium">mncode needs your input</p>
          <p className="mt-1 break-words text-[0.875rem] text-muted-foreground">
            {question.question}
          </p>
          <div className="mt-3 grid w-full gap-2">
            {question.options.map((option) => (
              <Button
                key={option}
                size="sm"
                variant="outline"
                className="h-auto min-h-8 w-full justify-start whitespace-normal break-words text-left leading-5 border-[var(--mn-line)]"
                onClick={() => onQuestion(option)}
              >
                {option}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
function PermissionCard({
  permission,
  onPermission,
}: {
  permission: PermissionRequest;
  onPermission: (allowed: boolean) => void;
}) {
  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      className="border-t border-[var(--mn-line)] bg-[var(--mn-surface-muted)] px-6 py-3"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-50/50 px-4 py-3 dark:bg-amber-300/[0.08]">
        <ShieldCheck className="size-4 shrink-0 text-amber-600 dark:text-amber-200" />
        <div className="min-w-0 flex-1">
          <p className="text-[0.875rem] font-medium">
            Permission requested for{" "}
            <span className="font-mono">{permission.tool}</span>
          </p>
          <p className="mt-1 truncate text-[0.75rem] text-muted-foreground">
            {permission.summary}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => onPermission(false)}>
            Deny
          </Button>
          <Button
            size="sm"
            className="bg-amber-500 text-white hover:bg-amber-600"
            onClick={() => onPermission(true)}
          >
            Allow once
          </Button>
        </div>
      </div>
    </div>
  );
}
