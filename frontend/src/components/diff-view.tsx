import { useMemo } from "react";

type DiffOp = {
  type: "equal" | "remove" | "add";
  text: string;
  oldNo?: number;
  newNo?: number;
};

const MAX_RENDERED_ROWS = 400;

/**
 * LCS line diff between the pre-edit and post-edit snippets. Snippets are
 * short excerpts, so an O(n·m) table is fine.
 */
function diffLines(before: string, after: string): DiffOp[] {
  const a = before.replace(/\n$/, "").split("\n");
  const b = after.replace(/\n$/, "").split("\n");
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  let oldNo = 1;
  let newNo = 1;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: "equal", text: a[i], oldNo: oldNo++, newNo: newNo++ });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: "remove", text: a[i], oldNo: oldNo++ });
      i++;
    } else {
      ops.push({ type: "add", text: b[j], newNo: newNo++ });
      j++;
    }
  }
  while (i < n) {
    ops.push({ type: "remove", text: a[i], oldNo: oldNo++ });
    i++;
  }
  while (j < m) {
    ops.push({ type: "add", text: b[j], newNo: newNo++ });
    j++;
  }
  return ops;
}

const TOKEN_RE = /(\/\/.*|#.*|"[^"]*"|'[^']*'|`[^`]*`|\b\d+(?:\.\d+)?\b|\w+|\s+|.)/g;

const KEYWORDS = new Set([
  "const",
  "let",
  "var",
  "function",
  "return",
  "if",
  "else",
  "for",
  "while",
  "import",
  "export",
  "from",
  "default",
  "class",
  "extends",
  "new",
  "await",
  "async",
  "try",
  "catch",
  "finally",
  "throw",
  "switch",
  "case",
  "break",
  "continue",
  "type",
  "interface",
  "enum",
  "public",
  "private",
  "readonly",
  "package",
  "func",
  "struct",
  "go",
  "defer",
  "chan",
  "map",
  "range",
  "nil",
  "true",
  "false",
  "null",
  "undefined",
  "string",
  "number",
  "boolean",
  "void",
  "error",
  "err",
  "self",
  "this",
  "super",
  "in",
  "of",
  "as",
  "is",
]);

function tokenClass(token: string): string {
  if (/^(\/\/|#)/.test(token)) return "italic text-muted-foreground/70";
  if (/^["'`]/.test(token)) return "text-emerald-700 dark:text-emerald-300";
  if (/^\d/.test(token)) return "text-cyan-700 dark:text-cyan-300";
  if (KEYWORDS.has(token)) return "text-purple-700 dark:text-purple-300";
  return "";
}

/** Very small, dependency-free syntax tinting for diff rows and file previews. */
export function HighlightedLine({ text }: { text: string }) {
  const parts = useMemo(() => text.match(TOKEN_RE) ?? [text], [text]);
  return (
    <>
      {parts.map((token, index) => {
        const cls = tokenClass(token);
        return cls ? (
          <span key={index} className={cls}>
            {token}
          </span>
        ) : (
          <span key={index}>{token}</span>
        );
      })}
    </>
  );
}

const OP_STYLES: Record<DiffOp["type"], { bar: string; row: string; sign: string }> = {
  remove: {
    bar: "bg-rose-500/70",
    row: "bg-rose-500/[0.08]",
    sign: "text-rose-600 dark:text-rose-400",
  },
  add: {
    bar: "bg-emerald-500/70",
    row: "bg-emerald-500/[0.08]",
    sign: "text-emerald-600 dark:text-emerald-400",
  },
  equal: { bar: "", row: "", sign: "text-transparent" },
};

/**
 * Unified diff view with line numbers, per-row add/remove highlighting, and
 * lightweight syntax tinting — rendered from before/after tool snippets.
 */
export function DiffView({ before, after }: { before: string; after: string }) {
  const ops = useMemo(() => diffLines(before, after), [before, after]);
  const changed = ops.filter((op) => op.type !== "equal").length;
  const visible = ops.slice(0, MAX_RENDERED_ROWS);

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--mn-line)] bg-[var(--mn-surface)]">
      <div className="flex items-center gap-2 border-b border-[var(--mn-line)] bg-[var(--mn-surface-muted)] px-2.5 py-1.5">
        <span className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Unified diff
        </span>
        <span className="ml-auto font-mono text-[0.625rem]">
          <span className="text-emerald-600 dark:text-emerald-400">
            +{ops.filter((op) => op.type === "add").length}
          </span>{" "}
          <span className="text-rose-600 dark:text-rose-400">
            −{ops.filter((op) => op.type === "remove").length}
          </span>
          <span className="ml-2 text-muted-foreground">{changed} changed</span>
        </span>
      </div>
      <div className="max-h-72 overflow-auto">
        <pre className="w-max min-w-full font-mono text-[0.6875rem] leading-[1.15rem]">
          {visible.map((op, index) => {
            const style = OP_STYLES[op.type];
            return (
              <div key={index} className={`flex items-stretch ${style.row}`}>
                <span className={`w-[3px] shrink-0 ${style.bar}`} />
                <span className="w-9 shrink-0 select-none pr-1.5 text-right text-muted-foreground/50">
                  {op.oldNo ?? ""}
                </span>
                <span className="w-9 shrink-0 select-none pr-1.5 text-right text-muted-foreground/50">
                  {op.newNo ?? ""}
                </span>
                <span className={`w-4 shrink-0 select-none text-center ${style.sign}`}>
                  {op.type === "remove" ? "−" : op.type === "add" ? "+" : ""}
                </span>
                <code className="whitespace-pre pr-3 text-foreground/85">
                  {op.text ? <HighlightedLine text={op.text} /> : " "}
                </code>
              </div>
            );
          })}
          {ops.length > visible.length && (
            <div className="px-3 py-1 text-[0.625rem] text-muted-foreground">
              … {ops.length - visible.length} more lines
            </div>
          )}
        </pre>
      </div>
    </div>
  );
}
