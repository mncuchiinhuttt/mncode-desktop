// Headroom context-compression integration: when enabled, provider requests
// are routed through a local headroom proxy (spawned by the shared config
// loader) that compresses tool outputs, files, and history before they reach
// the LLM.
package main

import (
	"context"
	"fmt"
	"os/exec"
	"time"
)

const (
	headroomInstallEvent   = "headroom:install"
	headroomInstallTimeout = 10 * time.Minute
)

var headroomInstalling bool

// headroomInstalled reports whether the headroom CLI is on PATH.
func headroomInstalled() bool {
	_, err := exec.LookPath("headroom")
	return err == nil
}

// CheckHeadroomInstalled exposes detection to the settings UI.
func (a *App) CheckHeadroomInstalled() bool {
	return headroomInstalled()
}

// InstallHeadroom installs the headroom CLI in the background
// (uv tool install → pip install fallback) with headroom:install events.
func (a *App) InstallHeadroom() error {
	rtkInstallMu.Lock()
	if headroomInstalling {
		rtkInstallMu.Unlock()
		return fmt.Errorf("a headroom install is already running")
	}
	headroomInstalling = true
	rtkInstallMu.Unlock()

	go func() {
		defer func() {
			rtkInstallMu.Lock()
			headroomInstalling = false
			rtkInstallMu.Unlock()
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

	packageSpec := `"headroom-ai[proxy,mcp,code,memory]"`
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
