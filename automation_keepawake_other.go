//go:build !darwin

// Keep-awake is a macOS-only concern in v1; other platforms no-op.
package main

import "os"

func startKeepAwakeProc() *os.Process { return nil }

func stopKeepAwakeProc(proc *os.Process) {}
