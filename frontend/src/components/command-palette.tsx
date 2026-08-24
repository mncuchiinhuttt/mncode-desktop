import { ArrowRight, Command, FileSearch, FolderOpen, Keyboard, Search, Settings2, Sparkles } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenWorkspace: () => void
  onNavigate: (view: 'workspace' | 'insights' | 'settings' | 'skills') => void
}

export function CommandPalette({ open, onOpenChange, onOpenWorkspace, onNavigate }: CommandPaletteProps) {
  function run(action: () => void) { action(); onOpenChange(false) }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="top-[18%] translate-y-0 overflow-hidden border-[var(--mn-line)] bg-[var(--mn-surface)] p-0 text-foreground shadow-2xl sm:max-w-xl"><DialogHeader className="border-b border-[var(--mn-line)] px-4 py-3"><DialogTitle className="flex items-center gap-2 text-xs font-medium"><Command className="size-4 text-[var(--mn-accent-strong)]" />Command palette</DialogTitle><DialogDescription className="sr-only">Search desktop actions</DialogDescription></DialogHeader><div className="p-3"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input autoFocus placeholder="Search actions…" className="h-10 border-[var(--mn-line)] bg-[var(--mn-surface-muted)] pl-9 text-sm" /></div><div className="mt-3 space-y-1"><CommandItem icon={FolderOpen} label="Open workspace" shortcut="⌘O" onClick={() => run(onOpenWorkspace)} /><CommandItem icon={Sparkles} label="Go to workspace" shortcut="W" onClick={() => run(() => onNavigate('workspace'))} /><CommandItem icon={FileSearch} label="Inspect codebase" shortcut="I" onClick={() => run(() => onNavigate('insights'))} /><CommandItem icon={Settings2} label="Open settings" shortcut="S" onClick={() => run(() => onNavigate('settings'))} /><CommandItem icon={Sparkles} label="Open Skills Marketplace" shortcut="M" onClick={() => run(() => onNavigate('skills'))} /></div><div className="mt-4 flex items-center gap-2 border-t border-[var(--mn-line)] px-2 pt-3 text-[0.6875rem] text-muted-foreground"><Keyboard className="size-3.5" />Use arrow keys to navigate <span className="ml-auto flex items-center gap-1">Enter <ArrowRight className="size-3" /></span></div></div></DialogContent></Dialog>
}

function CommandItem({ icon: Icon, label, shortcut, onClick }: { icon: typeof FolderOpen; label: string; shortcut: string; onClick: () => void }) { return <button type="button" onClick={onClick} className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs text-foreground/75 transition-colors hover:bg-[var(--mn-surface-muted)] hover:text-foreground"><Icon className="size-4 text-muted-foreground group-hover:text-[var(--mn-accent-strong)]" /><span>{label}</span><span className="ml-auto rounded border border-[var(--mn-line)] px-1.5 py-0.5 font-mono text-[0.6875rem] text-muted-foreground">{shortcut}</span></button> }
