// Keep-awake coordination: while an automation run is active, hold the
// platform-specific awake assertion (caffeinate on macOS).
package main

import (
	"os"
	"sync"
)

// automationKeepAwake wraps the platform process handle with reference
// counting so overlapping holders (interactive turn + automation run) share
// one caffeinate process.
type automationKeepAwake struct {
	mu   sync.Mutex
	proc *os.Process
	refs int
}

func (k *automationKeepAwake) acquire() {
	k.mu.Lock()
	defer k.mu.Unlock()
	k.refs++
	if k.refs == 1 {
		k.proc = startKeepAwakeProc()
	}
}

func (k *automationKeepAwake) release() {
	k.mu.Lock()
	defer k.mu.Unlock()
	if k.refs > 0 {
		k.refs--
	}
	if k.refs == 0 && k.proc != nil {
		stopKeepAwakeProc(k.proc)
		k.proc = nil
	}
}
