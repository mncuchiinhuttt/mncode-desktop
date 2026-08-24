import { useMemo, useState } from "react";
import { Activity, CalendarDays, Flame, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UsageDay, UsageStats } from "@/types";

type UsageView = "daily" | "weekly" | "cumulative";

interface UsageCell extends UsageDay {
  level: number;
}

export function UsageHeatmap({ usage }: { usage: UsageStats }) {
  const [view, setView] = useState<UsageView>("daily");
  const model = useMemo(() => buildUsageModel(usage.dailyUsage, view), [usage.dailyUsage, view]);
  const tabs: UsageView[] = ["daily", "weekly", "cumulative"];

  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <UsageMetric
          icon={Zap}
          label="Total tokens"
          value={formatTokens(usage.summary.totalTokens)}
        />
        <UsageMetric icon={Flame} label="Peak day" value={formatTokens(model.peak)} />
        <UsageMetric icon={CalendarDays} label="Active days" value={`${model.activeDays}`} />
        <UsageMetric icon={Activity} label="Current streak" value={`${model.currentStreak}d`} />
        <UsageMetric icon={Flame} label="Longest streak" value={`${model.longestStreak}d`} />
      </div>
      <Card className="mn-surface overflow-visible shadow-none">
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0 px-4 py-4 sm:px-5">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="size-4 text-[var(--mn-accent-strong)]" />
            Token activity
          </CardTitle>
          <div className="flex items-center gap-0.5 rounded-lg bg-[var(--mn-surface-muted)] p-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setView(tab)}
                className={
                  "rounded-md px-2.5 py-1 text-[0.6875rem] font-medium capitalize transition-colors " +
                  (view === tab
                    ? "bg-[var(--mn-surface)] text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {tab}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <div className="grid w-full grid-cols-[repeat(53,minmax(0,1fr))] gap-1">
            {model.weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid min-w-0 grid-rows-7 gap-1">
                {week.map((cell, dayIndex) => (
                  <UsageCellView key={cell.date} cell={cell} rowIndex={dayIndex} />
                ))}
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between text-[0.6875rem] text-muted-foreground">
            <span>12 months ago</span>
            <span>6 months ago</span>
            <span>Today</span>
          </div>
          <div className="mt-4 flex items-center justify-between text-[0.6875rem] text-muted-foreground">
            <span>
              {view === "daily"
                ? "Daily token distribution"
                : view === "weekly"
                  ? "Weekly token distribution"
                  : "Cumulative token load"}
            </span>
            <span>{formatTokens(model.total)} tokens in view</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UsageMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Zap;
  label: string;
  value: string;
}) {
  return (
    <div className="mn-surface rounded-xl border p-3">
      <div className="flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground">
        <Icon className="size-3.5 text-[var(--mn-accent-strong)]" />
        {label}
      </div>
      <p className="mt-2 font-mono text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function UsageCellView({ cell, rowIndex }: { cell: UsageCell; rowIndex: number }) {
  const date = formatDate(cell.date);
  const below = rowIndex < 2;
  return (
    <div className="group relative min-w-0">
      <div
        role="img"
        aria-label={`${date}: ${formatTokens(cell.tokens)} tokens`}
        className={
          "aspect-square w-full rounded-[3px] border transition-transform duration-150 group-hover:scale-125 " +
          levelClass(cell.level)
        }
      />
      <div
        className={
          "pointer-events-none absolute left-1/2 z-30 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-[var(--mn-line)] bg-[var(--mn-surface)] px-2.5 py-2 text-[0.6875rem] shadow-xl group-hover:block " +
          (below ? "top-full mt-2" : "bottom-full mb-2")
        }
      >
        <p className="font-medium text-foreground">{date}</p>
        <p className="mt-0.5 text-muted-foreground">
          {formatTokens(cell.tokens)} tokens · {cell.sessions} sessions
        </p>
      </div>
    </div>
  );
}

function buildUsageModel(days: UsageDay[], view: UsageView) {
  const dayMap = new Map(days.map((day) => [day.date, day]));
  const today = new Date();
  const end = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 364);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const weeks: UsageCell[][] = [];
  const weeklyTotals = new Map<string, number>();
  for (const day of days) {
    const date = new Date(`${day.date}T00:00:00Z`);
    const week = weekKey(date);
    weeklyTotals.set(week, (weeklyTotals.get(week) ?? 0) + day.tokens);
  }
  const cumulative = new Map<string, number>();
  let running = 0;
  for (const day of [...days].sort((a, b) => a.date.localeCompare(b.date))) {
    running += day.tokens;
    cumulative.set(day.date, running);
  }
  for (let weekIndex = 0; weekIndex < 53; weekIndex += 1) {
    const week: UsageCell[] = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + weekIndex * 7 + dayIndex);
      const key = date.toISOString().slice(0, 10);
      const raw = dayMap.get(key);
      const future = date > end;
      const value = future
        ? 0
        : view === "weekly"
          ? (weeklyTotals.get(weekKey(date)) ?? 0)
          : view === "cumulative"
            ? (cumulative.get(key) ?? 0)
            : (raw?.tokens ?? 0);
      week.push({ date: key, tokens: value, sessions: raw?.sessions ?? 0, level: 0 });
    }
    weeks.push(week);
  }
  const values = weeks.flat().map((cell) => cell.tokens);
  const max = Math.max(...values, 1);
  for (const cell of weeks.flat())
    cell.level = cell.tokens === 0 ? 0 : Math.max(1, Math.ceil((cell.tokens / max) * 4));
  const activeDates = days
    .filter((day) => day.tokens > 0)
    .map((day) => day.date)
    .sort();
  const streaks = streakStats(activeDates);
  return {
    weeks,
    total: view === "cumulative" ? running : days.reduce((sum, day) => sum + day.tokens, 0),
    peak: Math.max(...days.map((day) => day.tokens), 0),
    activeDays: activeDates.length,
    ...streaks,
  };
}

function streakStats(dates: string[]) {
  let longest = 0;
  let run = 0;
  let previous = "";
  for (const date of dates) {
    const consecutive = previous && dateDiff(previous, date) === 1;
    run = consecutive ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = date;
  }
  let current = 0;
  for (let index = dates.length - 1; index >= 0; index -= 1) {
    if (index === dates.length - 1 || dateDiff(dates[index], dates[index + 1]) === 1) current += 1;
    else break;
  }
  return { currentStreak: current, longestStreak: longest };
}
function dateDiff(left: string, right: string) {
  return Math.round(
    (Date.parse(`${right}T00:00:00Z`) - Date.parse(`${left}T00:00:00Z`)) / 86400000,
  );
}
function weekKey(date: Date) {
  const sunday = new Date(date);
  sunday.setUTCDate(date.getUTCDate() - date.getUTCDay());
  return sunday.toISOString().slice(0, 10);
}
function formatDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function formatTokens(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return `${value}`;
}
function levelClass(level: number) {
  return [
    "bg-[var(--mn-surface-muted)] border-[var(--mn-line)]",
    "bg-[var(--mn-accent-soft)] border-[var(--mn-accent)]/25",
    "bg-[var(--mn-accent)]/45 border-[var(--mn-accent)]/40",
    "bg-[var(--mn-accent)]/70 border-[var(--mn-accent)]",
    "bg-[var(--mn-accent-strong)] border-[var(--mn-accent-strong)]",
  ][level];
}
