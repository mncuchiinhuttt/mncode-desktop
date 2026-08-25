//go:build unix

// Detached spawn for the headroom proxy process.
package main

import (
	"os/exec"
	"syscall"
)

func setHeadroomDetached(command *exec.Cmd) {
	command.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
}
