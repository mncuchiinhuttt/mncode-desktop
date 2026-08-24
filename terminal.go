package main

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
)

const terminalExitMarker = "__MNCODE_EXIT__"

type terminalSession struct {
	cmd            *exec.Cmd
	stdin          io.WriteCloser
	cancel         context.CancelFunc
	commandRunning bool
	closed         bool
}

func (a *App) OpenTerminal() error {
	a.terminalMu.Lock()
	if a.terminal != nil {
		a.terminalMu.Unlock()
		return nil
	}
	a.terminalMu.Unlock()

	a.mu.RLock()
	root := a.workspace.Path
	a.mu.RUnlock()
	if root == "" {
		return fmt.Errorf("open a workspace before opening the terminal")
	}
	if info, err := os.Stat(root); err != nil || !info.IsDir() {
		return fmt.Errorf("workspace directory is unavailable")
	}

	shell, args := terminalShell()
	ctx, cancel := context.WithCancel(context.Background())
	cmd := exec.CommandContext(ctx, shell, args...)
	cmd.Dir = filepath.Clean(root)
	cmd.Env = append(os.Environ(), "TERM=dumb", "PS1=", "PROMPT=", "PROMPT2=")
	stdin, err := cmd.StdinPipe()
	if err != nil {
		cancel()
		return err
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		_ = stdin.Close()
		cancel()
		return err
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		_ = stdin.Close()
		_ = stdout.Close()
		cancel()
		return err
	}
	if err := cmd.Start(); err != nil {
		_ = stdin.Close()
		_ = stdout.Close()
		_ = stderr.Close()
		cancel()
		return fmt.Errorf("could not start terminal: %w", err)
	}

	session := &terminalSession{cmd: cmd, stdin: stdin, cancel: cancel}
	a.terminalMu.Lock()
	if a.terminal != nil {
		a.terminalMu.Unlock()
		_ = cmd.Process.Kill()
		cancel()
		return nil
	}
	a.terminal = session
	a.terminalMu.Unlock()

	go a.readTerminalStream(session, stdout, "stdout")
	go a.readTerminalStream(session, stderr, "stderr")
	go a.waitForTerminal(session)
	a.emit("terminal:ready", map[string]string{"cwd": cmd.Dir})
	return nil
}

func (a *App) RunTerminalCommand(command string) error {
	command = strings.TrimSpace(command)
	if command == "" {
		return fmt.Errorf("terminal command cannot be empty")
	}
	if err := a.OpenTerminal(); err != nil {
		return err
	}

	a.terminalMu.Lock()
	session := a.terminal
	if session == nil {
		a.terminalMu.Unlock()
		return fmt.Errorf("terminal is not available")
	}
	if session.commandRunning {
		a.terminalMu.Unlock()
		return fmt.Errorf("a terminal command is already running")
	}
	session.commandRunning = true
	stdin := session.stdin
	a.terminalMu.Unlock()

	a.emit("terminal:command", map[string]string{"command": command})
	if runtime.GOOS == "windows" {
		_, err := fmt.Fprintf(stdin, "%s\r\necho %s:%%ERRORLEVEL%%\r\n", command, terminalExitMarker)
		return err
	}
	_, err := fmt.Fprintf(stdin, "%s\nprintf '\\n%s:%%s\\n' \"$?\"\n", command, terminalExitMarker)
	return err
}

func (a *App) InterruptTerminal() error {
	a.terminalMu.Lock()
	session := a.terminal
	a.terminalMu.Unlock()
	if session == nil || session.cmd == nil || session.cmd.Process == nil {
		return nil
	}
	return session.cmd.Process.Signal(os.Interrupt)
}

func (a *App) CloseTerminal() {
	a.closeTerminal()
}

func (a *App) closeTerminal() {
	a.terminalMu.Lock()
	session := a.terminal
	a.terminal = nil
	if session != nil {
		session.closed = true
	}
	a.terminalMu.Unlock()
	if session == nil {
		return
	}
	_ = session.stdin.Close()
	if session.cmd.Process != nil {
		_ = session.cmd.Process.Kill()
	}
	session.cancel()
}

func (a *App) readTerminalStream(session *terminalSession, reader io.Reader, stream string) {
	scanner := bufio.NewScanner(reader)
	scanner.Buffer(make([]byte, 4096), 1024*1024)
	for scanner.Scan() {
		line := scanner.Text()
		if stream == "stdout" && strings.HasPrefix(line, terminalExitMarker+":") {
			code, _ := strconv.Atoi(strings.TrimPrefix(line, terminalExitMarker+":"))
			a.terminalMu.Lock()
			if a.terminal == session {
				session.commandRunning = false
			}
			a.terminalMu.Unlock()
			a.emit("terminal:exit", map[string]int{"code": code})
			continue
		}
		a.emit("terminal:output", map[string]string{"text": line + "\n", "stream": stream})
	}
}

func (a *App) waitForTerminal(session *terminalSession) {
	err := session.cmd.Wait()
	a.terminalMu.Lock()
	closed := session.closed
	if a.terminal == session {
		a.terminal = nil
	}
	a.terminalMu.Unlock()
	if closed {
		a.emit("terminal:closed", map[string]string{"error": ""})
		return
	}
	if err != nil && !strings.Contains(strings.ToLower(err.Error()), "signal: interrupt") {
		a.emit("terminal:closed", map[string]string{"error": err.Error()})
		return
	}
	a.emit("terminal:closed", map[string]string{"error": ""})
}

func terminalShell() (string, []string) {
	if runtime.GOOS == "windows" {
		return "cmd.exe", []string{"/Q", "/K"}
	}
	shell := os.Getenv("SHELL")
	if shell == "" {
		shell = "/bin/sh"
	}
	base := filepath.Base(shell)
	if base == "bash" {
		return shell, []string{"--noprofile", "--norc", "-i"}
	}
	if base == "zsh" {
		return shell, []string{"-f", "-i"}
	}
	return shell, []string{"-i"}
}
