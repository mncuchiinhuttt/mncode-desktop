// rtk installer: installs the rtk CLI from rtk-ai/rtk in a background
// goroutine (brew → curl script → Windows zip flow) with progress events.
package main

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
)

const rtkInstallEvent = "rtk:install"
const rtkInstallTimeout = 8 * time.Minute

var (
	rtkInstallMu      sync.Mutex
	rtkInstallingFlag bool
)

// findRtkPath locates the rtk binary, including common install locations that
// are not on the PATH a GUI app inherits.
func findRtkPath() string {
	if path, err := exec.LookPath("rtk"); err == nil {
		return path
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	candidates := []string{
		filepath.Join(home, ".local", "bin", "rtk"),
		"/opt/homebrew/bin/rtk",
		"/usr/local/bin/rtk",
	}
	if runtime.GOOS == "windows" {
		candidates = []string{
			filepath.Join(home, ".local", "bin", "rtk.exe"),
			filepath.Join(os.Getenv("LOCALAPPDATA"), "Programs", "rtk", "rtk.exe"),
		}
	}
	for _, candidate := range candidates {
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
	}
	return ""
}

func rtkInstalled() bool { return findRtkPath() != "" }

// InstallRtk starts the platform install flow in the background. Progress is
// emitted through rtk:install events (installing | done | error).
func (a *App) InstallRtk() error {
	rtkInstallMu.Lock()
	if rtkInstallingFlag {
		rtkInstallMu.Unlock()
		return fmt.Errorf("an rtk install is already running")
	}
	rtkInstallingFlag = true
	rtkInstallMu.Unlock()

	go func() {
		defer func() {
			rtkInstallMu.Lock()
			rtkInstallingFlag = false
			rtkInstallMu.Unlock()
		}()
		a.emitRtkInstall("installing", "")
		output, err := a.runRtkInstall()
		if err != nil {
			a.emitRtkInstall("error", tail(output, 400)+err.Error())
			return
		}
		a.emitRtkInstall("done", tail(output, 400))
	}()
	return nil
}

func (a *App) emitRtkInstall(status string, output string) {
	a.emit(rtkInstallEvent, map[string]any{"status": status, "output": output})
}

func (a *App) runRtkInstall() (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), rtkInstallTimeout)
	defer cancel()

	var command *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		if brew := findBrewPath(); brew != "" {
			command = exec.CommandContext(ctx, brew, "install", "rtk")
		} else {
			command = exec.CommandContext(ctx, "sh", "-c",
				"curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh")
		}
	case "linux":
		command = exec.CommandContext(ctx, "sh", "-c",
			"curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh")
	case "windows":
		script := filepath.Join(os.TempDir(), "mncode-install-rtk.ps1")
		if err := os.WriteFile(script, []byte(windowsRtkInstallScript()), 0600); err != nil {
			return "", err
		}
		command = exec.CommandContext(ctx, "powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script)
	default:
		return "", fmt.Errorf("unsupported platform: %s", runtime.GOOS)
	}
	output, err := command.CombinedOutput()
	return string(output), err
}

// windowsRtkInstallScript downloads the latest rtk windows release, extracts
// rtk.exe into %LOCALAPPDATA%\Programs\rtk, and adds it to the user PATH.
func windowsRtkInstallScript() string {
	return strings.Join([]string{
		"$ErrorActionPreference = \"Stop\"",
		"$dir = Join-Path $env:LOCALAPPDATA \"Programs\\rtk\"",
		"New-Item -ItemType Directory -Force -Path $dir | Out-Null",
		"$rel = Invoke-RestMethod \"https://api.github.com/repos/rtk-ai/rtk/releases/latest\"",
		"$asset = $rel.assets | Where-Object { $_.name -like \"*windows-msvc.zip\" } | Select-Object -First 1",
		"if (-not $asset) { throw \"no windows asset in the latest release\" }",
		"$zip = Join-Path $env:TEMP \"rtk.zip\"",
		"Invoke-WebRequest $asset.browser_download_url -OutFile $zip",
		"Expand-Archive -Force $zip $dir",
		"$exe = Get-ChildItem -Recurse $dir -Filter rtk.exe | Select-Object -First 1",
		"if (-not $exe) { throw \"rtk.exe not found in the archive\" }",
		"Copy-Item $exe.FullName (Join-Path $dir \"rtk.exe\") -Force",
		"$userPath = [Environment]::GetEnvironmentVariable(\"Path\", \"User\")",
		"if ($userPath -notlike \"*\" + $dir + \"*\") {",
		"  [Environment]::SetEnvironmentVariable(\"Path\", \"$userPath;$dir\", \"User\")",
		"}",
		"Write-Output \"installed to $dir\"",
	}, "\n") + "\n"
}

func tail(value string, length int) string {
	if len(value) <= length {
		return value
	}
	return "…" + value[len(value)-length:]
}

func findBrewPath() string {
	if path, err := exec.LookPath("brew"); err == nil {
		return path
	}
	for _, candidate := range []string{"/opt/homebrew/bin/brew", "/usr/local/bin/brew"} {
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
	}
	return ""
}
