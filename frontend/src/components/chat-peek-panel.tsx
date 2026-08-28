import { MessageSquare, PanelRightClose, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "./markdown-renderer";
import { cn } from "@/lib/utils";
import type { ChatSession } from "@/types";

interface ChatPeekPanelProps {
  chat: ChatSession | null;
  onClose: () => void;
  onSwitchTo: (chatID: string) => void;
}

/**
 * Read-only split view: shows another chat's history beside the active
 * chat so you can reference or compare it without leaving your current
 * conversation. The agent only ever runs one turn at a time, so this panel
 * plays back history rather than accepting new prompts — "Switch to this
 * chat" promotes it to the active, interactive chat.
 */
export function ChatPeekPanel({ chat, onClose, onSwitchTo }: ChatPeekPanelProps) {
  if (!chat) return null;

  return (
    <aside className="mn-surface-muted flex h-full w-full max-w-md shrink-0 flex-col border-l border-[var(--mn-line)]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--mn-line)] px-3 py-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <MessageSquare className="size-3" />
            Split view
          </p>
          <p className="mt-0.5 truncate text-sm font-medium">{chat.title}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 border-[var(--mn-line)] text-xs"
            onClick={() => onSwitchTo(chat.id)}
          >
            <RefreshCw className="size-3.5" />
            Switch to this chat
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close split view"
            className="text-muted-foreground hover:text-foreground"
          >
            <PanelRightClose className="size-4" />
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {chat.messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            This chat has no messages yet.
          </p>
        )}
        <div className="space-y-4">
          {chat.messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
                message.role === "user"
                  ? "ml-6 bg-[var(--mn-accent-soft)] text-foreground"
                  : "mr-2",
              )}
            >
              {message.role === "user" ? (
                <p className="whitespace-pre-wrap">{message.content}</p>
              ) : (
                <MarkdownRenderer content={message.content || "…"} />
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
