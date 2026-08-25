// In-app updater: picks the release asset matching the running OS/arch,
// downloads it with progress events, and swaps it in on restart.
package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

const updateProgressEvent = "update:progress"

// pickUpdateAsset selects the release artifact built for this machine.
// macOS prefers the universal build (covers Intel + Apple Silicon); Windows
// and Linux match the exact GOARCH.
func pickUpdateAsset(assets []DesktopUpdateAsset) (DesktopUpdateAsset, error) {
	var fallbackByOS []DesktopUpdateAsset
	for _, asset := range assets {
		name := strings.ToLower(asset.Name)
		if asset.URL == "" || asset.Name == "" {
			continue
		}
		switch runtime.GOOS {
		case "darwin":
			if strings.Contains(name, "darwin-universal") {
				return asset, nil
			}
			if strings.Contains(name, "darwin") {
				fallbackByOS = append(fallbackByOS, asset)
			}
		case "windows":
			if strings.Contains(name, "windows-"+runtime.GOARCH) {
				return asset, nil
			}
			if strings.Contains(name, "windows") {
				fallbackByOS = append(fallbackByOS, asset)
			}
		case "linux":
			if strings.Contains(name, "linux-"+runtime.GOARCH) {
				return asset, nil
			}
			if strings.Contains(name, "linux") {
				fallbackByOS = append(fallbackByOS, asset)
			}
		}
	}
	if len(fallbackByOS) > 0 {
		return fallbackByOS[0], nil
	}
	return DesktopUpdateAsset{}, fmt.Errorf("no release asset matches %s/%s", runtime.GOOS, runtime.GOARCH)
}

// DownloadUpdate fetches the matching release asset into a temp file, emitting
// update:progress events along the way. Returns the downloaded file path.
func (a *App) DownloadUpdate(assets []DesktopUpdateAsset) (string, error) {
	asset, err := pickUpdateAsset(assets)
	if err != nil {
		return "", err
	}
	response, err := http.Get(asset.URL)
	if err != nil {
		return "", err
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return "", fmt.Errorf("download returned status %d", response.StatusCode)
	}

	total := asset.Size
	if total <= 0 {
		total = response.ContentLength
	}
	destination := filepath.Join(os.TempDir(), "mncode-update-"+asset.Name)
	out, err := os.Create(destination)
	if err != nil {
		return "", err
	}
	defer out.Close()

	var downloaded int64
	var lastReported int64
	buf := make([]byte, 256*1024)
	for {
		read, err := response.Body.Read(buf)
		if read > 0 {
			downloaded += int64(read)
			if _, writeErr := out.Write(buf[:read]); writeErr != nil {
				return "", writeErr
			}
			if total > 0 && downloaded-lastReported > total/100 {
				lastReported = downloaded
				a.emitUpdateProgress(downloaded, total)
			}
		}
		if err == io.EOF {
			break
		}
		if err != nil {
			return "", err
		}
	}
	a.emitUpdateProgress(downloaded, downloaded)
	return destination, nil
}

func (a *App) emitUpdateProgress(downloaded, total int64) {
	a.mu.RLock()
	ctx := a.ctx
	a.mu.RUnlock()
	if ctx == nil {
		return
	}
	percent := 100.0
	if total > 0 {
		percent = float64(downloaded) / float64(total) * 100
	}
	wailsruntime.EventsEmit(ctx, updateProgressEvent, map[string]any{
		"percent":    percent,
		"downloaded": downloaded,
		"total":      total,
	})
}

// ApplyUpdateAndRestart swaps the downloaded artifact over the running
// installation via a detached helper script, then quits so the helper can
// finish while nothing is holding the files open.
func (a *App) ApplyUpdateAndRestart(downloadedPath string) error {
	if _, err := os.Stat(downloadedPath); err != nil {
		return fmt.Errorf("downloaded update not found")
	}
	executable, err := os.Executable()
	if err != nil {
		return err
	}
	executable, err = filepath.EvalSymlinks(executable)
	if err != nil {
		return err
	}

	script, err := writeApplyScript(downloadedPath, executable)
	if err != nil {
		return err
	}
	if err := spawnDetached(script); err != nil {
		return err
	}

	a.mu.RLock()
	ctx := a.ctx
	a.mu.RUnlock()
	if ctx != nil {
		go func() {
			time.Sleep(300 * time.Millisecond)
			wailsruntime.Quit(ctx)
		}()
	}
	return nil
}
