import type { ReactNode } from "react";

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "code"; language: string; text: string }
  | { type: "rule" };

function isBlockStart(line: string) {
  return /^( {0,3}#{1,6}\s| {0,3}[-*+]\s| {0,3}\d+[.)]\s| {0,3}```| {0,3}[-*_]{3,}\s*$)/.test(line);
}

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }
    const fence = line.match(/^ {0,3}```\s*([\w-]*)\s*$/);
    if (fence) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !/^ {0,3}```\s*$/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push({ type: "code", language: fence[1] || "text", text: code.join("\n") });
      continue;
    }
    const heading = line.match(/^ {0,3}(#{1,6})\s+(.+?)\s*#*$/);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
      index += 1;
      continue;
    }
    if (/^ {0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      blocks.push({ type: "rule" });
      index += 1;
      continue;
    }
    const list = line.match(/^ {0,3}([-*+]\s|\d+[.)]\s)(.+)$/);
    if (list) {
      const ordered = /^\d/.test(list[1]);
      const items: string[] = [];
      while (index < lines.length) {
        const match = lines[index].match(/^ {0,3}([-*+]\s|\d+[.)]\s)(.+)$/);
        if (!match || /^\d/.test(match[1]) !== ordered) break;
        items.push(match[2]);
        index += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }
    const paragraph: string[] = [line.trim()];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index])) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }
  return blocks;
}

function inline(text: string): ReactNode[] {
  const pattern = /(\`[^`]+\`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^\)]+\))/g;
  const parts = text.split(pattern).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index} className="rounded bg-[var(--mn-surface-muted)] px-1.5 py-0.5 font-mono text-[0.9em]">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    const link = part.match(/^\[([^\]]+)\]\(([^\)]+)\)$/);
    if (link && /^https?:\/\//.test(link[2])) return <a key={index} href={link[2]} target="_blank" rel="noreferrer" className="text-[var(--mn-accent-strong)] underline underline-offset-2">{link[1]}</a>;
    return <span key={index}>{part}</span>;
  });
}

export function MarkdownRenderer({ content }: { content: string }) {
  return <div className="mn-markdown space-y-4">{parseBlocks(content).map((block, index) => {
    if (block.type === "rule") return <hr key={index} className="border-[var(--mn-line)]" />;
    if (block.type === "code") return <pre key={index} className="overflow-x-auto rounded-xl border border-[var(--mn-line)] bg-[var(--mn-surface-muted)] p-4 font-mono text-[12px] leading-6"><code>{block.text}</code></pre>;
    if (block.type === "heading") {
      const Tag = (`h${Math.min(block.level, 4)}`) as "h1" | "h2" | "h3" | "h4";
      return <Tag key={index} className="font-semibold tracking-tight">{inline(block.text)}</Tag>;
    }
    if (block.type === "list") {
      const Tag = block.ordered ? "ol" : "ul";
      return <Tag key={index} className={block.ordered ? "list-decimal space-y-1 pl-6" : "list-disc space-y-1 pl-6"}>{block.items.map((item) => <li key={item}>{inline(item)}</li>)}</Tag>;
    }
    return <p key={index} className="leading-7">{inline(block.text)}</p>;
  })}</div>;
}
