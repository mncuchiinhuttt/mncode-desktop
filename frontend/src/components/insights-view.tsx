import {
  Activity,
  Braces,
  FileCode2,
  Gauge,
  GitCommitHorizontal,
  Layers3,
  ScanSearch,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkspaceInfo } from "@/types";

export function InsightsView({
  workspace,
  onOpenWorkspace,
}: {
  workspace: WorkspaceInfo;
  onOpenWorkspace: () => void;
}) {
  if (!workspace.ready)
    return (
      <div className="mn-page-in flex flex-1 items-center justify-center p-10">
        <Card className="mn-surface max-w-md gap-0 py-0 text-center shadow-none">
          <CardContent className="p-8">
            <ScanSearch className="mx-auto size-8 text-[var(--mn-accent-strong)]" />
            <h2 className="mt-4 text-lg font-semibold">No codebase map yet</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Open a workspace and mncode will scan its structure, languages and entrypoints
              locally.
            </p>
            <Button className="mn-accent-button mt-6" onClick={onOpenWorkspace}>
              Open workspace
            </Button>
          </CardContent>
        </Card>
      </div>
    );

  const topLanguages = workspace.languages.slice(0, 5);
  return (
    <div className="mn-page-in flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge
              variant="outline"
              className="border-[var(--mn-line)] bg-[var(--mn-surface)] text-[0.6875rem] uppercase tracking-[0.16em]"
            >
              architecture pulse
            </Badge>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              A quick read on <span className="mn-gradient-text">{workspace.name}</span>
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Fresh local scan · no files leave this machine.
            </p>
          </div>
          <Button variant="outline" className="border-[var(--mn-line)]" onClick={onOpenWorkspace}>
            <Activity className="mr-2 size-4" />
            Rescan workspace
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InsightMetric
            icon={FileCode2}
            label="Files indexed"
            value={workspace.totalFiles.toLocaleString()}
          />
          <InsightMetric
            icon={Braces}
            label="Lines counted"
            value={workspace.totalLines.toLocaleString()}
          />
          <InsightMetric
            icon={Layers3}
            label="Languages"
            value={workspace.languages.length.toString()}
          />
          <InsightMetric icon={Gauge} label="Scan state" value="Ready" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="mn-surface shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="size-4 text-[var(--mn-accent-strong)]" />
                Language signal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {topLanguages.map((language) => {
                const percentage = Math.max(
                  8,
                  Math.round((language.count / workspace.totalFiles) * 100),
                );
                return (
                  <div key={language.name}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span>{language.name}</span>
                      <span className="font-mono text-[0.6875rem] text-muted-foreground">
                        {language.count} files
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--mn-surface-muted)]">
                      <div
                        className="h-full rounded-full bg-[var(--mn-accent)] transition-[width] duration-700"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          <Card className="mn-surface shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <GitCommitHorizontal className="size-4 text-[var(--mn-accent-strong)]" />
                Workspace profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ProfileRow label="Project type" value={workspace.projectType} />
              <ProfileRow label="Root" value={workspace.path} mono />
              <ProfileRow label="Indexing" value="Ignored build artifacts" />
              <ProfileRow label="Agent mode" value="Permission-aware" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InsightMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileCode2;
  label: string;
  value: string;
}) {
  return (
    <Card className="mn-surface mn-sheen py-0 shadow-none">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="grid size-9 place-items-center rounded-lg bg-[var(--mn-accent-soft)] text-[var(--mn-accent-strong)]">
          <Icon className="size-4" />
        </div>
        <div>
          <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-lg font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
function ProfileRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--mn-line)] pb-3 last:border-0 last:pb-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={`max-w-[65%] truncate text-right text-xs ${mono ? "font-mono text-[0.6875rem]" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
