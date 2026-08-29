//go:build linux

// Linux apply helper: a detached script waits for the app to exit, replaces
// the executable, relaunches it, and removes the staged artifact.
package main

import (
	"fmt"
	"os"
	"os/exec"
	"syscall"
)

func writeApplyScript(downloadedPath, executable string) (string, error) {
	scriptFile, err := os.CreateTemp(os.TempDir(), "mncode-apply-update-*.sh")
	if err != nil { return "", err }
	scriptPath := scriptFile.Name()
	if err := scriptFile.Chmod(0700); err != nil { _ = scriptFile.Close(); _ = os.Remove(scriptPath); return "", err }
	replacement := executable + ".mncode-new"
	script := fmt.Sprintf(`#!/bin/sh
set -eu
sleep 2
staging=$(mktemp -d "${TMPDIR:-/tmp}/mncode-update.XXXXXX")
cleanup() {
	rm -rf -- "$staging"
	rm -f -- %s %s %s
}
trap cleanup EXIT
tar -xzf -- %s -C "$staging"
payload=$(find "$staging" -mindepth 1 -maxdepth 1 -type f -print -quit)
test -n "$payload"
cp -f -- "$payload" %s
chmod 0755 -- %s
mv -f -- %s %s
nohup %s >/dev/null 2>&1 &
`, shellQuote(scriptPath), shellQuote(downloadedPath), shellQuote(replacement), shellQuote(downloadedPath), shellQuote(replacement), shellQuote(replacement), shellQuote(replacement), shellQuote(executable), shellQuote(executable))
	if _, err := scriptFile.WriteString(script); err != nil { _ = scriptFile.Close(); _ = os.Remove(scriptPath); return "", err }
	if err := scriptFile.Close(); err != nil { _ = os.Remove(scriptPath); return "", err }
	return scriptPath, nil
}

func spawnDetached(scriptPath string) error {
	cmd := exec.Command("sh", scriptPath)
	cmd.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
	return cmd.Start()
}
