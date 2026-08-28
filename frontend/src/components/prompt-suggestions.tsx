import { AtSign, Command, FileCode2, Folder, GitBranch, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PromptCatalog, PromptOption } from "@/types";

export type PromptTrigger = "@" | "/";

export interface PromptTriggerState {
  trigger: PromptTrigger;
  query: string;
  start: number;
  end: number;
}

export function getPromptTriggerState(value: string, cursor: number): PromptTriggerState | null {
  const beforeCursor = value.slice(0, cursor);
  const atMatch = beforeCursor.match(/(?:^|\s)@([^\s]*)$/);
  const slashMatch = beforeCursor.match(/(?:^|\s)\/([^\n]*)$/);
  const matches = [
    atMatch && { trigger: "@" as const, match: atMatch },
    slashMatch && { trigger: "/" as const, match: slashMatch },
  ].filter(Boolean) as Array<{
    trigger: PromptTrigger;
    match: RegExpMatchArray;
  }>;
  if (matches.length === 0) return null;

  const current = matches.sort(
    (left, right) => (right.match.index ?? 0) - (left.match.index ?? 0),
  )[0];
  const tokenOffset = current.match[0].indexOf(current.trigger);
  return {
    trigger: current.trigger,
    query: current.match[1] ?? "",
    start: (current.match.index ?? 0) + tokenOffset,
    end: cursor,
  };
}

export function getPromptOptions(
  catalog: PromptCatalog,
  state: PromptTriggerState,
): PromptOption[] {
  const matches = getMatchingPromptOptions(catalog, state);
  if (state.trigger === "/" && !state.query.trim())
    return [...catalog.commands.slice(0, 5), ...catalog.skills.slice(0, 3)];
  return matches.slice(0, 8);
}

export function getPromptOptionCount(catalog: PromptCatalog, state: PromptTriggerState) {
  return getMatchingPromptOptions(catalog, state).length;
}

function getMatchingPromptOptions(catalog: PromptCatalog, state: PromptTriggerState) {
  const query = state.query.trim().toLowerCase();
  const source = state.trigger === "@" ? catalog.context : [...catalog.commands, ...catalog.skills];
  return query
    ? source.filter((option) =>
        `${option.label} ${option.detail} ${option.category}`.toLowerCase().includes(query),
      )
    : source;
}

export function PromptSuggestionMenu({
  trigger,
  options,
  totalCount,
  activeIndex,
  onSelect,
  onHover,
}: {
  trigger: PromptTrigger;
  options: PromptOption[];
  totalCount: number;
  activeIndex: number;
  onSelect: (option: PromptOption) => void;
  onHover: (index: number) => void;
}) {
  const countLabel =
    totalCount > options.length ? `${options.length} of ${totalCount}` : `${totalCount}`;
  return (
    <div
      id="prompt-suggestions"
      role="listbox"
      aria-label={trigger === "@" ? "Context suggestions" : "Command and skill suggestions"}
      className="mn-prompt-suggestions absolute bottom-full left-2 right-2 z-50 mb-2 overflow-hidden rounded-lg border border-[var(--mn-line)] bg-[var(--mn-surface)] text-foreground shadow-2xl animate-in fade-in-0 slide-in-from-bottom-1"
    >
      <div className="flex items-center justify-between border-b border-[var(--mn-line)] px-3 py-2">
        <div className="flex items-center gap-2 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {trigger === "@" ? (
            <AtSign className="size-3.5 text-[var(--mn-accent-strong)]" />
          ) : (
            <Command className="size-3.5 text-[var(--mn-accent-strong)]" />
          )}
          {trigger === "@" ? "Add context" : "Commands & skills"}
        </div>
        <span className="font-mono text-[0.6875rem] text-muted-foreground">
          {countLabel} matches
        </span>
      </div>
      <div className="max-h-64 overflow-y-auto p-1">
        {options.length === 0 ? (
          <p className="px-3 py-5 text-center text-[0.875rem] text-muted-foreground">
            No matching {trigger === "@" ? "files or context" : "commands or skills"}
          </p>
        ) : (
          options.map((option, index) => {
            const Icon = optionIcon(option, trigger);
            return (
              <button
                key={`${option.kind}-${option.id}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => onHover(index)}
                onClick={() => onSelect(option)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors",
                  index === activeIndex
                    ? "bg-[var(--mn-accent-soft)]"
                    : "hover:bg-[var(--mn-surface-muted)]",
                )}
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-[var(--mn-surface-muted)] text-muted-foreground">
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.875rem] font-medium">{option.label}</span>
                  <span className="mt-0.5 block truncate text-[0.75rem] text-muted-foreground">
                    {option.detail}
                  </span>
                </span>
                {option.category && (
                  <span className="shrink-0 text-[0.6875rem] text-muted-foreground">
                    {option.category}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
      <div className="border-t border-[var(--mn-line)] px-3 py-2 text-[0.6875rem] text-muted-foreground">
        ↑↓ navigate <span className="mx-1">·</span> Enter select <span className="mx-1">·</span> Esc
        close
      </div>
    </div>
  );
}

function optionIcon(option: PromptOption, trigger: PromptTrigger) {
  if (trigger === "@") {
    if (option.kind === "folder") return Folder;
    if (option.kind === "git") return GitBranch;
    if (option.kind === "file") return FileCode2;
    return AtSign;
  }
  return option.kind === "skill" ? Sparkles : Command;
}
