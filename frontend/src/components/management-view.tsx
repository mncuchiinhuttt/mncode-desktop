import { Badge } from "@/components/ui/badge";
import { McpProviders } from "./mcp-providers";
import type { DesktopMCPServer, DesktopMCPServerInput } from "@/types";

export type ManagementKind = "mcp";

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
  return (
    <div className="mn-page-in flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <Badge
            variant="outline"
            className="border-[var(--mn-line)] bg-[var(--mn-surface)] text-[0.75rem] uppercase tracking-[0.16em]"
          >
            capability bridge
          </Badge>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">MCP & Plugins</h2>
          <p className="mt-2 max-w-xl text-base leading-7 text-muted-foreground">
            Connect Notion and GitHub to give the agent useful external context.
          </p>
        </div>
        <McpContent
          mcpServers={mcpServers}
          onConfigureMCP={onConfigureMCP}
          onOpenURL={onOpenURL}
        />
      </div>
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
  return <McpProviders servers={mcpServers} onConfigure={onConfigureMCP} onOpenURL={onOpenURL} />;
}
