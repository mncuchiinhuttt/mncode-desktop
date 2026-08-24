import { useState } from "react";
import { ExternalLink, KeyRound, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { DesktopMCPServer, DesktopMCPServerInput } from "@/types";

type MCPServerID = "notion" | "github";

const serverMeta: Record<
  MCPServerID,
  {
    label: string;
    tokenLabel: string;
    placeholder: string;
    guideUrl: string;
    guideLabel: string;
    guide: string[];
  }
> = {
  notion: {
    label: "Notion",
    tokenLabel: "Notion personal access token",
    placeholder: "ntn_…",
    guideUrl: "https://app.notion.com/developers/connections",
    guideLabel: "Open Notion Dev Connections",
    guide: [
      "Open Notion’s Developer portal and choose Personal access tokens.",
      "Create a new token with the Notion API capability and copy it immediately.",
      "Paste the token here. The local Notion MCP server will use your Notion permissions.",
    ],
  },
  github: {
    label: "GitHub",
    tokenLabel: "GitHub personal access token",
    placeholder: "github_pat_…",
    guideUrl: "https://github.com/settings/tokens",
    guideLabel: "Open GitHub token settings",
    guide: [
      "Create a GitHub PAT and grant only the repository or organization permissions you need.",
      "Paste the token here. mncode will configure GitHub’s official MCP server through Docker.",
      "Keep Docker Desktop installed and running before opening a workspace.",
    ],
  },
};

export function McpProviders({
  servers,
  onConfigure,
  onOpenURL,
}: {
  servers: DesktopMCPServer[];
  onConfigure: (input: DesktopMCPServerInput) => Promise<void>;
  onOpenURL: (url: string) => void;
}) {
  const [selected, setSelected] = useState<MCPServerID>();
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const selectedServer = selected
    ? servers.find((server) => server.id === selected)
    : undefined;
  const meta = selected ? serverMeta[selected] : undefined;

  function openConnect(id: MCPServerID) {
    setSelected(id);
    setToken("");
  }

  async function save() {
    if (!selected || !token.trim()) return;
    setSaving(true);
    try {
      await onConfigure({ id: selected, token: token.trim() });
      setSelected(undefined);
      setToken("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <McpProviderCard
          id="notion"
          server={servers.find((server) => server.id === "notion")}
          onConnect={openConnect}
        />
        <McpProviderCard
          id="github"
          server={servers.find((server) => server.id === "github")}
          onConnect={openConnect}
        />
      </div>
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(undefined)}
      >
        <DialogContent className="max-w-xl border-[var(--mn-line)] bg-[var(--mn-surface)] text-foreground">
          {selected && meta && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <ProviderLogo id={selected} />
                  Connect {meta.label} MCP
                </DialogTitle>
                <DialogDescription>
                  Add a local MCP connection for this desktop. The token is
                  saved in
                  <code className="mx-1 rounded bg-[var(--mn-surface-muted)] px-1.5 py-0.5 text-[11px]">
                    ~/.mncode/mcp.json
                  </code>
                  with restricted file permissions.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5">
                <div className="rounded-xl border border-[var(--mn-line)] bg-[var(--mn-surface-muted)] p-4">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Connection guide
                  </p>
                  <ol className="space-y-3 text-sm leading-6 text-muted-foreground">
                    {meta.guide.map((step, index) => (
                      <li key={step} className="flex gap-3">
                        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[var(--mn-accent-soft)] font-mono text-[10px] text-[var(--mn-accent-strong)]">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-4 border-t border-[var(--mn-line)] pt-3 text-sm leading-6 text-muted-foreground">
                    Quick link:{" "}
                    <button
                      type="button"
                      onClick={() => onOpenURL(meta.guideUrl)}
                      className="inline-flex items-center gap-1 font-medium text-[var(--mn-accent-strong)] underline-offset-4 hover:underline"
                    >
                      {meta.guideLabel}
                      <ExternalLink className="size-3" />
                    </button>
                  </p>
                </div>
                {selected === "notion" && (
                  <p className="text-sm leading-6 text-muted-foreground">
                    Notion’s hosted MCP uses OAuth and does not need a token.
                    This field is for the local token-based server used by
                    mncode.
                  </p>
                )}
                <label className="block text-sm font-medium">
                  {meta.tokenLabel}
                  <Input
                    autoFocus
                    type="password"
                    value={token}
                    onChange={(event) => setToken(event.target.value)}
                    placeholder={meta.placeholder}
                    className="mt-2 border-[var(--mn-line)] bg-[var(--mn-surface-muted)]"
                  />
                </label>
                <div className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                  <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[var(--mn-accent-strong)]" />
                  Use a separate token with the smallest permissions you need.
                  Never commit the generated MCP config to source control.
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setSelected(undefined)}>
                  Cancel
                </Button>
                <Button
                  className="mn-accent-button"
                  disabled={!token.trim() || saving}
                  onClick={() => void save()}
                >
                  <KeyRound className="size-3.5" />
                  {saving
                    ? "Saving…"
                    : selectedServer?.tokenConfigured
                      ? "Update token"
                      : "Save connection"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function McpProviderCard({
  id,
  server,
  onConnect,
}: {
  id: MCPServerID;
  server?: DesktopMCPServer;
  onConnect: (id: MCPServerID) => void;
}) {
  const meta = serverMeta[id];
  const active = server?.connected || server?.configured;
  return (
    <Card className="mn-surface overflow-hidden shadow-none transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-[var(--mn-accent)]/60">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="flex items-center gap-3">
          <ProviderLogo id={id} />
          <div>
            <CardTitle className="text-base font-semibold">
              {meta.label}
            </CardTitle>
            <CardDescription className="mt-1 text-sm">
              {server?.connected
                ? "Connected"
                : active
                  ? "Configured"
                  : "Not configured"}
            </CardDescription>
          </div>
        </div>
        <Badge
          variant="outline"
          className={
            server?.connected
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-[var(--mn-line)] bg-[var(--mn-surface-muted)] text-muted-foreground"
          }
        >
          {server?.connected ? "Active" : active ? "Ready" : "Available"}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end justify-between gap-4">
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
          {meta.label === "Notion"
            ? "Connect pages, notes, and workspace knowledge to the agent."
            : "Connect repositories, issues, pull requests, and project context."}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="border-[var(--mn-line)]"
          onClick={() => onConnect(id)}
        >
          {active ? "Manage" : "Connect"}
        </Button>
      </CardContent>
    </Card>
  );
}

function ProviderLogo({ id }: { id: MCPServerID }) {
  const [failed, setFailed] = useState(false);
  const logoURL =
    id === "github"
      ? "https://cdn.simpleicons.org/github/ffffff"
      : "https://cdn.simpleicons.org/notion/ffffff";
  return (
    <div className="grid size-10 place-items-center rounded-xl bg-[#171717] text-white">
      {failed ? (
        <span className="font-serif text-lg font-bold">
          {id === "github" ? "GH" : "N"}
        </span>
      ) : (
        <img
          src={logoURL}
          alt=""
          className="size-5"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
