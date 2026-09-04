//go:build darwin || linux || freebsd || openbsd || netbsd

package main

import (
	"os"
	"path/filepath"
	"syscall"
	"testing"
)

func TestReadWorkspaceFileRejectsSpecialAndEscapingPaths(t *testing.T) {
	parent := t.TempDir()
	root := filepath.Join(parent, "workspace")
	if err := os.Mkdir(root, 0o700); err != nil {
		t.Fatal(err)
	}
	outside := filepath.Join(parent, "outside.txt")
	if err := os.WriteFile(outside, []byte("outside"), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(outside, filepath.Join(root, "escape.txt")); err != nil {
		t.Skipf("symlinks unavailable: %v", err)
	}
	if err := syscall.Mkfifo(filepath.Join(root, "pipe"), 0o600); err != nil {
		t.Skipf("fifo unavailable: %v", err)
	}

	app := powerToolsApp(root, false)
	if _, err := app.ReadWorkspaceFile("escape.txt"); err == nil {
		t.Fatal("preview followed a symlink outside the workspace")
	}
	if _, err := app.ReadWorkspaceFile("pipe"); err == nil {
		t.Fatal("preview accepted a FIFO")
	}
}
