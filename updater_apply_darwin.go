//go:build darwin

// macOS apply helper: a detached script waits for the app to exit, unzips the
// downloaded bundle over the old one, and relaunches the app.
package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
)

func writeApplyScript(downloadedPath, executable string) (string, error) {
	// executable: <App>.app/Contents/MacOS/<bin> — the bundle is three levels up.
	appPath := executable
	for i := 0; i < 3; i++ {
		appPath = filepath.Dir(appPath)
	}
	if !strings.HasSuffix(appPath, ".app") {
		return "", fmt.Errorf("cannot locate the .app bundle for %s", executable)
	}
	parentDir := filepath.Dir(appPath)

	scriptPath := filepath.Join(os.TempDir(), "mncode-apply-update.sh")
	script := fmt.Sprintf(`#!/bin/bash
sleep 2
rm -rf "%s"
unzip -o -q "%s" -d "%s"
open "%s"
rm -f "%s"
`, appPath, downloadedPath, parentDir, appPath, scriptPath)
	if err := os.WriteFile(scriptPath, []byte(script), 0755); err != nil {
		return "", err
	}
	return scriptPath, nil
}

func spawnDetached(scriptPath string) error {
	cmd := exec.Command("bash", scriptPath)
	cmd.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
	return cmd.Start()
}
