//go:build darwin

// macOS apply helper: a detached script waits for the app to exit, extracts a
// previously validated bundle into a private staging directory, and relaunches.
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
	appPath := executable
	for range 3 {
		appPath = filepath.Dir(appPath)
	}
	if !strings.HasSuffix(appPath, ".app") {
		return "", fmt.Errorf("cannot locate the .app bundle for %s", executable)
	}
	scriptPath, err := os.CreateTemp(os.TempDir(), "mncode-apply-update-*.sh")
	if err != nil {
		return "", err
	}
	path := scriptPath.Name()
	if err := scriptPath.Chmod(0700); err != nil {
		_ = scriptPath.Close()
		_ = os.Remove(path)
		return "", err
	}
	script := fmt.Sprintf(`#!/bin/bash
set -eu
sleep 2
staging=$(mktemp -d "${TMPDIR:-/tmp}/mncode-update.XXXXXX")
cleanup() { rm -rf -- "$staging"; rm -f -- %s; }
trap cleanup EXIT
unzip -o -q -- %s -d "$staging"
bundle=$(find "$staging" -maxdepth 1 -type d -name '*.app' -print -quit)
test -n "$bundle"
rm -rf -- %s
ditto "$bundle" %s
open %s
`, shellQuote(path), shellQuote(downloadedPath), shellQuote(appPath), shellQuote(appPath), shellQuote(appPath))
	if _, err := scriptPath.WriteString(script); err != nil {
		_ = scriptPath.Close()
		_ = os.Remove(path)
		return "", err
	}
	if err := scriptPath.Close(); err != nil {
		_ = os.Remove(path)
		return "", err
	}
	return path, nil
}

func spawnDetached(scriptPath string) error {
	cmd := exec.Command("bash", scriptPath)
	cmd.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
	return cmd.Start()
}
