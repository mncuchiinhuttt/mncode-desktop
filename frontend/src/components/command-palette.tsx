import {
  ArrowRight,
  Command,
  FileSearch,
  FolderOpen,
  Keyboard,
  MessageSquare,
  Search,
  Settings2,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PaletteChat {
  id: string;
  title: string;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenWorkspace: () => void;
  onNavigate: (view: "workspace" | "insights" | "settings" | "skills") => void;
  chats: PaletteChat[];
  onOpenChat: (id: string) => void;
}

type PaletteEntry = {
  key: string;
  icon: typeof FolderOpen;
  label: string;
  shortcut: string;
  section: "Conversations" | "Actions";
  run: () => void;
};

export function CommandPalette({
  open,
  onOpenChange,
  onOpenWorkspace,
  onNavigate,
  chats,
  onOpenChat,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Fresh palette state on every open.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  const run = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  const actions: PaletteEntry[] = useMemo(
    () => [
      {
        key: "action-open-workspace",
        icon: FolderOpen,
        label: "Open workspace",
        shortcut: "⌘O",
        section: "Actions",
        run: () => run(onOpenWorkspace),
      },
      {
        key: "action-workspace",
        icon: Sparkles,
        label: "Go to workspace",
        shortcut: "W",
        section: "Actions",
        run: () => run(() => onNavigate("workspace")),
      },
      {
        key: "action-insights",
        icon: FileSearch,
        label: "Inspect codebase",
        shortcut: "I",
        section: "Actions",
        run: () => run(() => onNavigate("insights")),
      },
      {
        key: "action-settings",
        icon: Settings2,
        label: "Open settings",
        shortcut: "S",
        section: "Actions",
        run: () => run(() => onNavigate("settings")),
      },
      {
        key: "action-skills",
        icon: Sparkles,
        label: "Open Skills Marketplace",
        shortcut: "M",
        section: "Actions",
        run: () => run(() => onNavigate("skills")),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onOpenWorkspace, onNavigate],
  );

  const query_ = query.trim().toLowerCase();
  const results: PaletteEntry[] = useMemo(() => {
    const matchedChats: PaletteEntry[] = chats
      .filter((chat) => chat.title.toLowerCase().includes(query_))
      .slice(0, 8)
      .map((chat) => ({
        key: `chat-${chat.id}`,
        icon: MessageSquare,
        label: chat.title,
        shortcut: "",
        section: "Conversations",
        run: () => run(() => onOpenChat(chat.id)),
      }));
    const matchedActions = actions.filter((action) =>
      action.label.toLowerCase().includes(query_),
    );
    // With a query, best matches first; empty query shows actions only.
    if (!query_) return matchedActions;
    return [...matchedChats, ...matchedActions];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query_, chats, actions, onOpenChat]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, results.length]);

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        results.length ? (current + 1) % results.length : 0,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(
        (current) =>
          (current - 1 + Math.max(1, results.length)) %
          Math.max(1, results.length),
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      const entry = results[activeIndex];
      if (entry) {
        entry.run();
        onOpenChange(false);
      }
    }
  }

  let lastSection = "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[18%] translate-y-0 overflow-hidden border-[var(--mn-line)] bg-[var(--mn-surface)] p-0 text-foreground shadow-2xl sm:max-w-xl">
        <DialogHeader className="border-b border-[var(--mn-line)] px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-xs font-medium">
            <Command className="size-4 text-[var(--mn-accent-strong)]" />
            Command palette
          </DialogTitle>
          <DialogDescription className="sr-only">
            Search conversations and desktop actions
          </DialogDescription>
        </DialogHeader>
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search conversations and actions…"
              className="h-10 border-[var(--mn-line)] bg-[var(--mn-surface-muted)] pl-9 text-sm"
            />
          </div>

          <div ref={listRef} className="mt-3 max-h-80 space-y-1 overflow-y-auto">
            {results.length === 0 && (
              <p className="px-3 py-8 text-center text-xs text-muted-foreground">
                No results for “{query.trim()}”.
              </p>
            )}
            {results.map((entry, index) => {
              const showSection = entry.section !== lastSection;
              lastSection = entry.section;
              const active = index === activeIndex;
              return (
                <div key={entry.key}>
                  {showSection && (
                    <p className="px-3 pb-1 pt-2 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {entry.section}
                    </p>
                  )}
                  <button
                    type="button"
                    data-active={active}
                    onClick={() => {
                      entry.run();
                      onOpenChange(false);
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs transition-colors",
                      active
                        ? "bg-[var(--mn-accent-soft)] text-foreground"
                        : "text-foreground/75 hover:bg-[var(--mn-surface-muted)] hover:text-foreground",
                    )}
                  >
                    <entry.icon
                      className={cn(
                        "size-4",
                        active
                          ? "text-[var(--mn-accent-strong)]"
                          : "text-muted-foreground",
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                    {entry.shortcut && (
                      <span className="ml-auto rounded border border-[var(--mn-line)] px-1.5 py-0.5 font-mono text-[0.6875rem] text-muted-foreground">
                        {entry.shortcut}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-2 border-t border-[var(--mn-line)] px-2 pt-3 text-[0.6875rem] text-muted-foreground">
            <Keyboard className="size-3.5" />
            Use arrow keys to navigate{" "}
            <span className="ml-auto flex items-center gap-1">
              Enter <ArrowRight className="size-3" />
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
