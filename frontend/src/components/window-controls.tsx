import { Maximize2, Minus, X } from 'lucide-react'
import { Quit, WindowMinimise, WindowToggleMaximise } from '../../wailsjs/runtime/runtime'

interface RuntimeWindow extends Window {
  runtime?: Record<string, unknown>
}

function runIfNative(action: () => void) {
  if ((window as RuntimeWindow).runtime) action()
}

export function WindowControls() {
  return <div className="flex items-center gap-1.5" aria-label="Window controls">
    <button type="button" onClick={() => runIfNative(Quit)} className="group grid size-3.5 place-items-center rounded-full bg-rose-400/90 shadow-[0_0_10px_rgba(251,113,133,0.28)]" aria-label="Close window"><X className="size-2.5 text-rose-950 opacity-0 transition-opacity group-hover:opacity-100" /></button>
    <button type="button" onClick={() => runIfNative(WindowMinimise)} className="group grid size-3.5 place-items-center rounded-full bg-amber-300/90 shadow-[0_0_10px_rgba(252,211,77,0.2)]" aria-label="Minimise window"><Minus className="size-2.5 text-amber-950 opacity-0 transition-opacity group-hover:opacity-100" /></button>
    <button type="button" onClick={() => runIfNative(WindowToggleMaximise)} className="group grid size-3.5 place-items-center rounded-full bg-emerald-300/90 shadow-[0_0_10px_rgba(110,231,183,0.2)]" aria-label="Toggle maximise"><Maximize2 className="size-2.5 text-emerald-950 opacity-0 transition-opacity group-hover:opacity-100" /></button>
  </div>
}
