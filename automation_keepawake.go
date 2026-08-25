// Keep-awake coordination: while an automation run is active, hold the
// platform-specific awake assertion (caffeinate on macOS).
package main

import "os"

// automationKeepAwake wraps the platform process handle.
type automationKeepAwake struct {
	proc *os.Process
}

func (k *automationKeepAwake) start() {
	k.proc = startKeepAwakeProc()
}

func (k *automationKeepAwake) stop() {
	if k.proc == nil {
		return
	}
	stopKeepAwakeProc(k.proc)
	k.proc = nil
}
