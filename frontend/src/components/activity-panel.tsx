import { CheckCircle2, CircleDashed, Clock3, Cpu, FileCog, Loader2, ShieldCheck, Sparkles, Terminal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ActivityItem, WorkspaceInfo } from '@/types'

interface ActivityPanelProps {
  activities: ActivityItem[]
  workspace: WorkspaceInfo
  running: boolean
}

const iconMap = { pink: Sparkles, cyan: Terminal, green: CheckCircle2, muted: CircleDashed }

export function ActivityPanel({ activities, workspace, running }: ActivityPanelProps) {
  return (
    <aside className="hidden w-[280px] shrink-0 flex-col border-l border-[var(--mn-line)] bg-[var(--mn-surface-muted)] xl:flex">
      <div className="flex h-16 items-center justify-between border-b border-[var(--mn-line)] px-5"><div><p className="text-xs font-semibold">Agent activity</p><p className="mt-0.5 text-[10px] text-muted-foreground">Live execution telemetry</p></div><Badge variant="outline" className="border-[var(--mn-line)] bg-[var(--mn-surface)] text-[10px]">{running ? 'streaming' : 'idle'}</Badge></div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <Card className="mn-surface py-4 shadow-none"><CardHeader className="px-4 pb-2"><CardTitle className="flex items-center gap-2 text-xs font-medium"><Cpu className="size-3.5 text-[var(--mn-accent-strong)]" />Session health</CardTitle></CardHeader><CardContent className="space-y-3 px-4"><Metric label="Workspace" value={workspace.ready ? 'Indexed' : 'Waiting'} icon={workspace.ready ? CheckCircle2 : Clock3} tone="text-emerald-600 dark:text-emerald-200" /><Metric label="Permission mode" value="Ask before tools" icon={ShieldCheck} tone="text-[var(--mn-accent-strong)]" /><Metric label="Context window" value="0% used" icon={FileCog} tone="text-violet-600 dark:text-violet-200" /></CardContent></Card>
        <div className="px-1"><div className="mb-3 flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Timeline</p><span className="font-mono text-[10px] text-slate-600">{activities.length.toString().padStart(2, '0')}</span></div>{activities.length === 0 ? <div className="mn-dot-grid rounded-xl border border-dashed border-white/[0.1] px-4 py-7 text-center"><Clock3 className="mx-auto size-5 text-slate-600" /><p className="mt-3 text-xs text-slate-400">No active run</p><p className="mt-1 text-[10px] leading-relaxed text-slate-600">Tool calls, subagents and file changes will appear here.</p></div> : <div className="space-y-2">{activities.map((item) => <ActivityRow key={item.id} item={item} />)}</div>}</div>
      </div>
      <div className="border-t border-[var(--mn-line)] p-4"><div className="flex items-center gap-2 text-[10px] text-muted-foreground"><span className="size-1.5 rounded-full bg-emerald-500" />Local agent bridge connected</div></div>
    </aside>
  )
}

function Metric({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof CheckCircle2; tone: string }) {
  return <div className="flex items-center gap-2.5"><Icon className={`size-3.5 ${tone}`} /><span className="text-[11px] text-muted-foreground">{label}</span><span className="ml-auto text-[10px] font-medium">{value}</span></div>
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const Icon = iconMap[item.tone]
  return <div className="flex gap-3 rounded-lg border border-[var(--mn-line)] bg-[var(--mn-surface)] p-3"><div className="mt-0.5">{item.active ? <Loader2 className="size-3.5 animate-spin text-[var(--mn-accent-strong)]" /> : <Icon className="size-3.5 text-muted-foreground" />}</div><div className="min-w-0"><p className="truncate text-[11px] font-medium">{item.label}</p><p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">{item.detail}</p></div></div>
}
