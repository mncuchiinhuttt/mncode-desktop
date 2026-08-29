import { useState, useMemo } from "react";
import {
  Activity,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Code2,
  FileCode,
  GitBranch,
  Layers,
  Sparkles,
  Terminal,
  Wrench,
  XCircle,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ActivityItem } from "@/types";

export interface SubagentNode {
  id: string;
  name: string;
  role: string;
  prompt: string;
  status: "running" | "completed" | "failed" | "queued";
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
  toolCalls: Array<{ name: string; target?: string; success: boolean }>;
  output?: string;
  branch?: string;
}

const AGENT_ROLES: Record<string, { icon: typeof Bot; color: string; bg: string; desc: string }> = {
  scout: { icon: FileCode, color: "text-sky-400", bg: "bg-sky-400/10 border-sky-400/30", desc: "Fast read-only codebase explorer" },
  planner: { icon: Layers, color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/30", desc: "Architectural & phase planner" },
  tester: { icon: Zap, color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/30", desc: "Test runner & test suite author" },
  "code-reviewer": { icon: CheckCircle2, color: "text-indigo-400", bg: "bg-indigo-400/10 border-indigo-400/30", desc: "Security & code quality reviewer" },
  debugger: { icon: Wrench, color: "text-rose-400", bg: "bg-rose-400/10 border-rose-400/30", desc: "Root cause diagnostics specialist" },
  designer: { icon: Sparkles, color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/30", desc: "UI/UX design & visual refinement" },
  librarian: { icon: Terminal, color: "text-cyan-400", bg: "bg-cyan-400/10 border-cyan-400/30", desc: "External source & API researcher" },
  default: { icon: Bot, color: "text-pink-400", bg: "bg-pink-400/10 border-pink-400/30", desc: "Specialized task subagent" },
};

export function SubagentSwarmVisualizer({
  activities,
  running,
  activeRunID,
}: {
  activities: ActivityItem[];
  running: boolean;
  activeRunID?: number;
}) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  // Derive subagent topology from activity events
  const subagents = useMemo(() => {
    const map = new Map<string, SubagentNode>();
    activities.forEach((item) => {
      if (item.kind === "subagent" || item.label.toLowerCase().includes("subagent")) {
        const nameMatch = item.label.match(/subagent[:\s]+(\w+[-]?\w*)/i);
        const name = item.subagentName?.toLowerCase() || (nameMatch ? nameMatch[1].toLowerCase() : "task");
        const id = item.id;

        const roleDef = AGENT_ROLES[name] || AGENT_ROLES.default;
        const isRunning = Boolean(item.active || item.status === "running");
        const isFailed = item.status === "error";

        const node: SubagentNode = map.get(name) || {
          id,
          name,
          role: item.subagentRole || roleDef.desc,
          prompt: item.subagentPrompt || item.detail || "Specialized delegated subtask",
          status: isRunning ? "running" : isFailed ? "failed" : "completed",
          startedAt: item.createdAt || Date.now(),
          toolCalls: [],
          output: item.subagentResult || item.detail,
        };

        if (item.toolName) {
          node.toolCalls.push({
            name: item.toolName,
            target: item.filePath,
            success: item.status !== "error",
          });
        }

        map.set(name, node);
      }
    });

    // If active turn running but no subagents spawned yet, provide live orchestrator status
    return Array.from(map.values());
  }, [activities]);

  const selectedAgent = subagents.find((s) => s.id === selectedAgentId) || subagents[0] || null;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      {/* Header Metrics */}
      <div className="flex items-center justify-between border-b border-border/50 bg-secondary/15 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg bg-[var(--mn-accent-soft)] text-[var(--mn-accent-strong)]">
            <Activity className="size-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-tight">Autonomous Subagent Swarm</h3>
            <p className="text-[0.6875rem] text-muted-foreground">
              {running
                ? "Active parallel agents orchestrating tasks"
                : `${subagents.length} subagents recorded in session`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-6 gap-1 text-[0.6875rem]">
            <Zap className="size-3 text-amber-400" />
            <span>{subagents.filter((s) => s.status === "running").length} active</span>
          </Badge>
          <Badge variant="outline" className="h-6 gap-1 text-[0.6875rem]">
            <Wrench className="size-3 text-sky-400" />
            <span>{subagents.reduce((acc, s) => acc + s.toolCalls.length, 0)} tool calls</span>
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 divide-x divide-border/40">
        {/* Swarm Node Tree View */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Root Orchestrator Card */}
          <div className="relative rounded-xl border border-[var(--mn-accent-border)] bg-[var(--mn-accent-soft)]/20 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-xl bg-[var(--mn-accent-strong)] text-white shadow">
                  <Bot className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-foreground">mncode Orchestrator</span>
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-[0.625rem] h-4">
                      Parent Root
                    </Badge>
                  </div>
                  <p className="text-[0.6875rem] text-muted-foreground">Ultra Workflow Multi-Agent Engine</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[0.6875rem] gap-1 font-mono">
                <Clock className="size-3" />
                {running ? "Orchestrating" : "Idle / Ready"}
              </Badge>
            </div>
          </div>

          {/* Child Subagents Grid / Nodes */}
          {subagents.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-border/60 p-8 text-center">
              <Layers className="size-7 text-muted-foreground/40" />
              <p className="text-xs font-medium text-foreground">No Subagents Spawned Yet</p>
              <p className="max-w-xs text-[0.6875rem] text-muted-foreground">
                When the agent encounters deep research, test execution, or reviews, specialized subagents will appear here in real-time.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                Active Swarm Nodes ({subagents.length})
              </p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {subagents.map((agent) => {
                  const roleDef = AGENT_ROLES[agent.name] || AGENT_ROLES.default;
                  const Icon = roleDef.icon;
                  const isSelected = selectedAgent?.id === agent.id;

                  return (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => setSelectedAgentId(agent.id)}
                      className={cn(
                        "flex flex-col gap-2 rounded-xl border p-3 text-left transition-all hover:scale-[1.01]",
                        roleDef.bg,
                        isSelected ? "ring-2 ring-primary shadow-sm" : "opacity-95"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Icon className={cn("size-4", roleDef.color)} />
                          <span className="font-bold text-xs capitalize text-foreground">{agent.name}</span>
                        </div>
                        {agent.status === "running" ? (
                          <span className="relative flex size-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
                            <span className="relative inline-flex size-2 rounded-full bg-sky-500" />
                          </span>
                        ) : agent.status === "completed" ? (
                          <CheckCircle2 className="size-3.5 text-emerald-400" />
                        ) : (
                          <XCircle className="size-3.5 text-rose-400" />
                        )}
                      </div>

                      <p className="text-[0.6875rem] text-muted-foreground line-clamp-2 leading-relaxed">
                        {agent.prompt}
                      </p>

                      <div className="mt-auto flex items-center justify-between pt-1 border-t border-border/20 text-[0.625rem] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Wrench className="size-2.5" />
                          {agent.toolCalls.length} tools
                        </span>
                        <span className="capitalize">{agent.status}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Selected Subagent Inspector Detail */}
        <div className="w-80 overflow-y-auto p-4 bg-secondary/10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted-foreground">
              Node Inspector
            </span>
            {selectedAgent && (
              <Badge variant="outline" className="text-[0.625rem] capitalize">
                {selectedAgent.status}
              </Badge>
            )}
          </div>

          {selectedAgent ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-sm capitalize text-foreground">{selectedAgent.name}</h4>
                <p className="text-xs text-muted-foreground">{selectedAgent.role}</p>
              </div>

              {/* Task Prompt */}
              <div className="space-y-1.5 rounded-lg border border-border/40 bg-background/60 p-2.5">
                <span className="text-[0.625rem] font-semibold uppercase text-muted-foreground">
                  Assigned Objective
                </span>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                  {selectedAgent.prompt}
                </p>
              </div>

              {/* Tool Execution Activity */}
              <div className="space-y-1.5">
                <span className="text-[0.625rem] font-semibold uppercase text-muted-foreground">
                  Tool Calls ({selectedAgent.toolCalls.length})
                </span>
                {selectedAgent.toolCalls.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No tools executed yet.</p>
                ) : (
                  <div className="space-y-1">
                    {selectedAgent.toolCalls.map((t, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded bg-secondary/30 px-2 py-1 text-[0.6875rem]"
                      >
                        <span className="font-mono text-primary">{t.name}</span>
                        {t.target && <span className="text-muted-foreground truncate max-w-[120px]">{t.target}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Output Report */}
              {selectedAgent.output && (
                <div className="space-y-1.5 rounded-lg border border-border/40 bg-background/60 p-2.5">
                  <span className="text-[0.625rem] font-semibold uppercase text-muted-foreground">
                    Output & Findings
                  </span>
                  <div className="text-xs text-foreground/90 font-mono text-[0.6875rem] max-h-48 overflow-y-auto">
                    {selectedAgent.output}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic text-center py-8">
              Select an agent node on the left to inspect its parameters and tool calls.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
