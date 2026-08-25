//go:build darwin

// macOS keep-awake: hold a caffeinate process while automation runs so an
// idle-timed task is never cut short by system sleep.
package main

import (
	"os"
	"os/exec"
)

func startKeepAwakeProc() *os.Process {
	cmd := exec.Command("caffeinate", "-i")
	if err := cmd.Start(); err != nil {
		return nil
	}
	return cmd.Process
}

func stopKeepAwakeProc(proc *os.Process) {
	if proc == nil {
		return
	}
	_ = proc.Kill()
}
