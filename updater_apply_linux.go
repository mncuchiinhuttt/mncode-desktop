//go:build linux

// Linux apply helper: a detached script waits for the app to exit, replaces
// the binary, and relaunches it.
package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
)

func writeApplyScript(downloadedPath, executable string) (string, error) {
	scriptPath := filepath.Join(os.TempDir(), "mncode-apply-update.sh")
	script := fmt.Sprintf(`#!/bin/sh
sleep 2
cp -f "%s" "%s"
chmod +x "%s"
nohup "%s" >/dev/null 2>&1 &
rm -f "%s"
`, downloadedPath, executable, executable, executable, scriptPath)
	if err := os.WriteFile(scriptPath, []byte(script), 0755); err != nil {
		return "", err
	}
	return scriptPath, nil
}

func spawnDetached(scriptPath string) error {
	cmd := exec.Command("sh", scriptPath)
	cmd.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
	return cmd.Start()
}
