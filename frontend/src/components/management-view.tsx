import { CalendarClock, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { McpProviders } from "./mcp-providers";
import type { DesktopMCPServer, DesktopMCPServerInput } from "@/types";

export type ManagementKind = "automations" | "mcp";

interface ManagementViewProps {
  kind: ManagementKind;
  onOpenSettings: () => void;
  mcpServers: DesktopMCPServer[];
  onConfigureMCP: (input: DesktopMCPServerInput) => Promise<void>;
  onOpenURL: (url: string) => void;
}

export function ManagementView({
  kind,
  onOpenSettings,
  mcpServers,
  onConfigureMCP,
  onOpenURL,
}: ManagementViewProps) {
  const automations = kind === "automations";
  return (
    <div className="mn-page-in flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <Badge
            variant="outline"
            className="border-[var(--mn-line)] bg-[var(--mn-surface)] text-[11px] uppercase tracking-[0.16em]"
          >
            {automations ? "agent routines" : "capability bridge"}
          </Badge>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            {automations ? "Automations" : "MCP & Plugins"}
          </h2>
          <p className="mt-2 max-w-xl text-base leading-7 text-muted-foreground">
            {automations
              ? "Keep recurring workspace tasks close to the same agent context."
              : "Connect Notion and GitHub to give the agent useful external context."}
          </p>
        </div>
        {automations ? (
          <AutomationContent />
        ) : (
          <McpContent
            mcpServers={mcpServers}
            onConfigureMCP={onConfigureMCP}
            onOpenURL={onOpenURL}
          />
        )}
      </div>
    </div>
  );
}

function AutomationContent() {
  return (
    <div className="mx-auto max-w-2xl">
      <Card className="mn-surface shadow-none">
        <CardContent className="p-10 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--mn-accent-soft)] text-[var(--mn-accent-strong)]">
            <CalendarClock className="size-7" />
          </div>
          <Badge
            variant="outline"
            className="mt-6 border-[var(--mn-accent)]/40 bg-[var(--mn-accent-soft)] text-[10px] uppercase tracking-[0.16em] text-[var(--mn-accent-strong)]"
          >
            Coming soon
          </Badge>
          <h3 className="mt-4 text-lg font-semibold">
            Automations are in progress
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            This feature is currently being built. Soon you’ll be able to
            schedule recurring prompts with the same workspace context and agent
            settings.
          </p>
          <div className="mx-auto mt-6 flex max-w-sm items-center justify-center gap-2 rounded-xl bg-[var(--mn-surface-muted)] px-4 py-3 text-xs text-muted-foreground">
            <CheckCircle2 className="size-4 text-[var(--mn-accent-strong)]" />
            Scheduler bridge is under development
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function McpContent({
  mcpServers,
  onConfigureMCP,
  onOpenURL,
}: {
  mcpServers: DesktopMCPServer[];
  onConfigureMCP: (input: DesktopMCPServerInput) => Promise<void>;
  onOpenURL: (url: string) => void;
}) {
  return (
    <McpProviders
      servers={mcpServers}
      onConfigure={onConfigureMCP}
      onOpenURL={onOpenURL}
    />
  );
}
