import type React from "react";
import {
  Blocks,
  CalendarClock,
  Check,
  ChevronLeft,
  Copy,
  History,
  LogIn,
  LogOut,
  Mail,
  PanelLeft,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Settings2,
  Smartphone,
  Trash2,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import mncodeLogo from "@/assets/images/mncode-logo.svg";
import { cn } from "@/lib/utils";
import { handleTitlebarDoubleClick } from "@/lib/window";
import { ResizeHandle } from "./resize-handle";
import type {
  ChatSession,
  DesktopAccount,
  ViewName,
  WorkspaceInfo,
} from "@/types";

interface AppSidebarProps {
  account: DesktopAccount;
  accountBusy: boolean;
  collapsed: boolean;
  view: ViewName;
  workspace: WorkspaceInfo;
  chatSessions: ChatSession[];
  activeChatId: string;
  width: number;
  resizing: boolean;
  remoteConnected: boolean;
  onToggle: () => void;
  onViewChange: (view: ViewName) => void;
  onOpenWorkspace: () => void;
  onNewTask: () => void;
  onOpenRemote: () => void;
  onUtilityAction: (label: string) => void;
  onLoginAccount: () => void;
  onLogoutAccount: () => void;
  onChatSelect: (chatID: string) => void;
  onRenameChat: (chatID: string) => void;
  onToggleChatPin: (chatID: string) => void;
  onDeleteChat: (chatID: string) => void;
  onMarkChatUnread: (chatID: string) => void;
  onCopyChatID: (chatID: string) => void;
  onResizeStart: (event: React.PointerEvent<HTMLDivElement>) => void;
}

export function AppSidebar({
  account,
  accountBusy,
  collapsed,
  view,
  workspace,
  chatSessions,
  activeChatId,
  width,
  resizing,
  remoteConnected,
  onToggle,
  onViewChange,
  onOpenWorkspace,
  onNewTask,
  onOpenRemote,
  onUtilityAction,
  onLoginAccount,
  onLogoutAccount,
  onChatSelect,
  onRenameChat,
  onToggleChatPin,
  onDeleteChat,
  onMarkChatUnread,
  onCopyChatID,
  onResizeStart,
}: AppSidebarProps) {
  const visibleChatSessions = [...chatSessions].sort(
    (left, right) => Number(right.pinned) - Number(left.pinned),
  );
  return (
    <aside
      className={cn(
        "mn-sidebar relative z-20 flex h-full shrink-0 flex-col overflow-hidden border-r",
        resizing ? "transition-none" : "transition-[width] duration-300",
      )}
      style={{ width: collapsed ? 68 : width }}
    >
      <div
        className={cn(
          "mn-drag-region relative flex h-16 shrink-0 items-center",
          collapsed ? "px-3" : "px-4",
        )}
        onDoubleClick={handleTitlebarDoubleClick}
      >
        {!collapsed && (
          <>
            <img
              src={mncodeLogo}
              alt="mncode"
              className="absolute left-1/2 top-1/2 h-10 w-[168px] -translate-x-1/2 -translate-y-1/2 object-contain"
            />
            <span className="sr-only">mncode desktop</span>
          </>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          className={cn(
            "absolute text-muted-foreground hover:bg-black/[0.06] dark:hover:bg-white/[0.08]",
            collapsed
              ? "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              : "right-3 top-1/2 -translate-y-1/2",
          )}
          aria-label="Toggle sidebar"
        >
          {collapsed ? (
            <PanelLeft className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </Button>
      </div>
      <TooltipProvider delayDuration={200}>
        <div className="space-y-1 px-3 pb-4">
          <SidebarAction
            icon={Plus}
            label="New chat"
            collapsed={collapsed}
            emphasized
            shortcut="⌘N"
            onClick={onNewTask}
          />
          <SidebarAction
            icon={CalendarClock}
            label="Automations"
            collapsed={collapsed}
            active={view === "automations"}
            onClick={() => onUtilityAction("Automations")}
          />
          <SidebarAction
            icon={Blocks}
            label="MCP & Plugins"
            collapsed={collapsed}
            active={view === "mcp"}
            onClick={() => onUtilityAction("MCP")}
          />
        </div>
      </TooltipProvider>
      {!collapsed && (
        <>
          <Separator className="bg-[var(--mn-line)]" />
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            <div className="flex items-center justify-between py-4">
              <span className="eyebrow-badge">[ Projects ]</span>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onOpenWorkspace}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Open project"
              >
                <Plus className="size-3.5" />
              </Button>
            </div>
            {workspace.ready ? (
              <button
                type="button"
                onClick={onOpenWorkspace}
                className="flex w-full items-center gap-2 rounded-md border border-[var(--mn-line)] bg-[var(--mn-surface)] px-2.5 py-2.5 text-left text-base transition-colors hover:border-[var(--mn-accent)]"
              >
                <span className="pulse-beacon" />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {workspace.name}
                </span>
                <span className="hud-mono shrink-0 text-[var(--mn-cyan)]">
                  {workspace.totalFiles}f
                </span>
              </button>
            ) : (
              <p className="px-2 py-2.5 text-sm text-muted-foreground">
                No open projects
              </p>
            )}
            <div className="mt-7 flex items-center justify-between py-2">
              <span className="eyebrow-badge">[ Chats ]</span>
              <History className="size-4 text-muted-foreground" />
            </div>
            {visibleChatSessions.length === 0 ? (
              <p className="px-2 py-2 text-sm text-muted-foreground">
                No chats yet
              </p>
            ) : (
              <div className="space-y-1">
                {visibleChatSessions.map((chat, index) => (
                  <ContextMenu key={chat.id}>
                    <ContextMenuTrigger asChild>
                      <button
                        type="button"
                        onClick={() => onChatSelect(chat.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.06]",
                          chat.id === activeChatId &&
                            "bg-[var(--mn-accent-soft)] text-foreground shadow-[inset_2px_0_0_0_var(--mn-accent)]",
                          chat.unread && "font-semibold",
                        )}
                      >
                        <span className="grid size-5 shrink-0 place-items-center rounded-md bg-[var(--mn-surface-muted)] font-mono text-[10px] text-muted-foreground">
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          {chat.title}
                        </span>
                        {chat.pinned && (
                          <Pin className="size-3 shrink-0 text-[var(--mn-accent-strong)]" />
                        )}
                        {chat.unread && (
                          <span className="size-1.5 shrink-0 rounded-full bg-[var(--mn-accent-strong)]" />
                        )}
                        {index < 9 && (
                          <span className="font-mono text-[10px] text-muted-foreground/60">
                            ⌘{index + 1}
                          </span>
                        )}
                      </button>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-56">
                      <ContextMenuLabel>{chat.title}</ContextMenuLabel>
                      <ContextMenuItem onSelect={() => onToggleChatPin(chat.id)}>
                        {chat.pinned ? <PinOff /> : <Pin />}
                        {chat.pinned ? "Unpin chat" : "Pin chat"}
                      </ContextMenuItem>
                      <ContextMenuItem onSelect={() => onRenameChat(chat.id)}>
                        <Pencil />
                        Rename chat
                      </ContextMenuItem>
                      <ContextMenuItem
                        variant="destructive"
                        onSelect={() => onDeleteChat(chat.id)}
                      >
                        <Trash2 />
                        Delete chat
                      </ContextMenuItem>
                      <ContextMenuItem onSelect={() => onMarkChatUnread(chat.id)}>
                        <Mail />
                        Mark as unread
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem onSelect={() => onCopyChatID(chat.id)}>
                        <Copy />
                        Copy session ID
                      </ContextMenuItem>
                      <ContextMenuItem disabled>
                        <Check />
                        Open in split view
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
              </div>
            )}
            <div className="mt-8 rounded-md border border-dashed border-[var(--mn-line)] p-3">
              <p className="eyebrow-badge mb-1.5">[ Pro Tip ]</p>
              <p className="text-sm font-medium">Keep your workspace tidy</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Start a task from any project and keep the full agent context in
                one place.
              </p>
            </div>
          </div>
          <div className="border-t border-[var(--mn-line)] p-3">
            <div className="flex items-center gap-2 px-2 py-2">
              <AccountMenu
                account={account}
                busy={accountBusy}
                onLogin={onLoginAccount}
                onLogout={onLogoutAccount}
              />
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onOpenRemote}
                className={cn(
                  "text-muted-foreground hover:text-foreground",
                  remoteConnected &&
                    "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15 hover:text-emerald-700 dark:text-emerald-300 dark:hover:text-emerald-200",
                )}
                aria-label={
                  remoteConnected
                    ? "Remote companion connected"
                    : "Open remote companion"
                }
              >
                <Smartphone className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onViewChange("settings")}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Settings"
              >
                <Settings2 className="size-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}
      {!collapsed && <ResizeHandle side="right" onPointerDown={onResizeStart} />}
    </aside>
  );
}

function SidebarAction({
  icon: Icon,
  label,
  collapsed,
  onClick,
  shortcut,
  emphasized,
  active,
}: {
  icon: React.ElementType;
  label: string;
  collapsed: boolean;
  onClick: () => void;
  shortcut?: string;
  emphasized?: boolean;
  active?: boolean;
}) {
  const button = (
    <Button
      variant="ghost"
      onClick={onClick}
      className={cn(
        "h-10 w-full justify-start gap-3 rounded-md px-3 text-base font-normal text-foreground/80 hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.07]",
        collapsed && "justify-center px-0",
        active &&
          !emphasized &&
          "bg-[var(--mn-accent-soft)] text-foreground shadow-[inset_2px_0_0_0_var(--mn-accent)]",
        emphasized &&
          "bg-[var(--mn-accent)] font-semibold text-primary-foreground shadow-[0_8px_22px_color-mix(in_srgb,var(--mn-accent)_28%,transparent)] hover:bg-[var(--mn-accent-strong)] hover:text-primary-foreground",
      )}
    >
      <Icon
        className={cn(
          "size-5",
          emphasized ? "text-primary-foreground" : active && "text-[var(--mn-accent)]",
        )}
      />
      {!collapsed && (
        <>
          <span>{label}</span>
          {shortcut && (
            <span className="ml-auto font-mono text-[10px] opacity-50">
              {shortcut}
            </span>
          )}
        </>
      )}
    </Button>
  );
  return collapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  ) : (
    button
  );
}

function AccountMenu({
  account,
  busy,
  onLogin,
  onLogout,
}: {
  account: DesktopAccount;
  busy: boolean;
  onLogin: () => void;
  onLogout: () => void;
}) {
  const identity = account.connected
    ? account.name || account.email || "mncode account"
    : "Guest mode";
  const detail = account.connected
    ? account.email ||
      (account.status === "offline" ? "Offline cache" : "Connected")
    : "Sign in to mncode account";
  const initial = (account.name || account.email || "?")
    .slice(0, 1)
    .toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={busy}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg text-left outline-none transition-colors hover:bg-[var(--mn-surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--mn-accent)]"
        >
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--mn-accent-soft)] text-sm font-semibold text-[var(--mn-accent-strong)]">
            {account.connected ? initial : <UserRound className="size-4" />}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{identity}</p>
            <p className="truncate text-xs text-muted-foreground">{detail}</p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        sideOffset={8}
        align="start"
        className="w-56 border-[var(--mn-line)] bg-[var(--mn-surface)] text-foreground"
      >
        <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          ACCOUNT
        </DropdownMenuLabel>
        {account.connected ? (
          <>
            <div className="px-2 py-1 text-xs">
              <p className="font-medium">{identity}</p>
              {account.email && (
                <p className="mt-1 truncate text-[10px] text-muted-foreground">
                  {account.email}
                </p>
              )}
              {account.status === "offline" && (
                <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-300">
                  Offline cache
                </p>
              )}
            </div>
            <DropdownMenuSeparator className="bg-[var(--mn-line)]" />
            <DropdownMenuItem onClick={onLogout}>
              <LogOut className="size-3.5" />
              Sign out
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <div className="px-2 py-1 text-xs text-muted-foreground">
              Link this desktop to your mncode account.
            </div>
            <DropdownMenuSeparator className="bg-[var(--mn-line)]" />
            <DropdownMenuItem disabled={busy} onClick={onLogin}>
              <LogIn className="size-3.5" />
              {busy ? "Opening browser…" : "Sign in to mncode account"}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
