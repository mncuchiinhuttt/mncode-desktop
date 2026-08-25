// Headroom context-compression integration: when enabled, provider requests
// are routed through a local headroom proxy that compresses tool outputs,
// files, and history before they reach the LLM. The proxy is spawned on
// demand and stopped with the app.
package main

import (
	"context"
	"fmt"
	"net"
	"os/exec"
	"sync"
	"time"
)

const (
	headroomProxyAddr      = "127.0.0.1:8787"
	headroomProxyURL       = "http://127.0.0.1:8787"
	headroomInstallEvent   = "headroom:install"
	headroomInstallTimeout = 10 * time.Minute
)

var (
	headroomMu         sync.Mutex
	headroomProxyCmd   *exec.Cmd
	headroomInstalling bool
)

// headroomInstalled reports whether the headroom CLI is on PATH.
func headroomInstalled() bool {
	_, err := exec.LookPath("headroom")
	return err == nil
}

// CheckHeadroomInstalled exposes detection to the settings UI.
func (a *App) CheckHeadroomInstalled() bool {
	return headroomInstalled()
}

// headroomProxyRunning reports whether something listens on the proxy port.
func headroomProxyRunning() bool {
	conn, err := net.DialTimeout("tcp", headroomProxyAddr, 300*time.Millisecond)
	if err != nil {
		return false
	}
	_ = conn.Close()
	return true
}

// ensureHeadroomProxy starts the local proxy if enabled, installed, and not
// already listening. Returns the base URL to route provider requests through,
// or "" when the proxy is unavailable (runs proceed uncompressed).
func (a *App) ensureHeadroomProxy() string {
	headroomMu.Lock()
	defer headroomMu.Unlock()
	if headroomProxyRunning() {
		return headroomProxyURL
	}
	headroom, err := exec.LookPath("headroom")
	if err != nil {
		return ""
	}
	command := exec.Command(headroom, "proxy", "--port", "8787")
	setHeadroomDetached(command)
	if err := command.Start(); err != nil {
		return ""
	}
	headroomProxyCmd = command

	deadline := time.Now().Add(10 * time.Second)
	for time.Now().Before(deadline) {
		if headroomProxyRunning() {
			return headroomProxyURL
		}
		time.Sleep(250 * time.Millisecond)
	}
	return ""
}

// stopHeadroomProxy terminates a proxy this app spawned.
func (a *App) stopHeadroomProxy() {
	headroomMu.Lock()
	defer headroomMu.Unlock()
	if headroomProxyCmd != nil && headroomProxyCmd.Process != nil {
		_ = headroomProxyCmd.Process.Kill()
		headroomProxyCmd = nil
	}
}

// InstallHeadroom installs the headroom CLI in the background
// (uv tool install → pip install fallback) with headroom:install events.
func (a *App) InstallHeadroom() error {
	headroomMu.Lock()
	if headroomInstalling {
		headroomMu.Unlock()
		return fmt.Errorf("a headroom install is already running")
	}
	headroomInstalling = true
	headroomMu.Unlock()

	go func() {
		defer func() {
			headroomMu.Lock()
			headroomInstalling = false
			headroomMu.Unlock()
		}()
		a.emit(headroomInstallEvent, map[string]any{"status": "installing"})
		output, err := a.runHeadroomInstall()
		if err != nil {
			a.emit(headroomInstallEvent, map[string]any{
				"status": "error",
				"output": tail(output, 400) + err.Error(),
			})
			return
		}
		a.emit(headroomInstallEvent, map[string]any{"status": "done", "output": tail(output, 400)})
	}()
	return nil
}

func (a *App) runHeadroomInstall() (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), headroomInstallTimeout)
	defer cancel()

	packageSpec := "\"headroom-ai[proxy,mcp,code,memory]\""
	if uv, uvErr := exec.LookPath("uv"); uvErr == nil {
		command := exec.CommandContext(ctx, uv, "tool", "install", "--python", "3.13", packageSpec)
		output, err := command.CombinedOutput()
		return string(output), err
	}
	pip := "pip3"
	if _, pipErr := exec.LookPath("pip3"); pipErr != nil {
		if _, pipErr = exec.LookPath("pip"); pipErr != nil {
			return "", fmt.Errorf("headroom requires Python 3.10+ with uv or pip installed")
		}
		pip = "pip"
	}
	command := exec.CommandContext(ctx, pip, "install", packageSpec)
	output, err := command.CombinedOutput()
	return string(output), err
}
