//go:build windows

// Detached spawn for the headroom proxy process.
package main

import (
	"os/exec"
	"syscall"
)

func setHeadroomDetached(command *exec.Cmd) {
	command.SysProcAttr = &syscall.SysProcAttr{
		HideWindow:    true,
		CreationFlags: 0x00000008 | 0x00000200, // DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP
	}
}
