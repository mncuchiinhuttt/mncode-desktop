//go:build windows

// Windows apply helper: a detached .cmd waits for the app to exit, replaces
// the executable, relaunches it, and deletes itself.
package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
)

func writeApplyScript(downloadedPath, executable string) (string, error) {
	scriptPath := filepath.Join(os.TempDir(), "mncode-apply-update.cmd")
	script := fmt.Sprintf(`@echo off
timeout /t 2 /nobreak >nul
copy /Y "%s" "%s"
start "" "%s"
del "%%~f0"
`, downloadedPath, executable, executable)
	if err := os.WriteFile(scriptPath, []byte(script), 0600); err != nil {
		return "", err
	}
	return scriptPath, nil
}

func spawnDetached(scriptPath string) error {
	cmd := exec.Command(filepath.Join(os.Getenv("WINDIR"), "System32", "cmd.exe"), "/C", scriptPath)
	cmd.SysProcAttr = &syscall.SysProcAttr{
		HideWindow:    true,
		CreationFlags: 0x00000008 | 0x00000200, // DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP
	}
	return cmd.Start()
}
