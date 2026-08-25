// App version metadata and update checks against the release feed.
package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"mncode/pkg/config"
)

const desktopVersion = "v0.1.1-beta"
const desktopReleaseEndpoint = "/api/releases/desktop/latest"

// DesktopAppInfo describes the running desktop build.
type DesktopAppInfo struct {
	Version     string `json:"version"`
	Channel     string `json:"channel"`
	Description string `json:"description"`
	Repository  string `json:"repository"`
	Copyright   string `json:"copyright"`
}

// DesktopUpdateAsset is one downloadable release artifact.
type DesktopUpdateAsset struct {
	Name string `json:"name"`
	URL  string `json:"url"`
	Size int64  `json:"size"`
}

// DesktopUpdateInfo reports update availability against the release feed.
type DesktopUpdateInfo struct {
	CurrentVersion  string               `json:"currentVersion"`
	LatestVersion   string               `json:"latestVersion"`
	ReleaseDate     string               `json:"releaseDate"`
	Channel         string               `json:"channel"`
	ReleaseURL      string               `json:"releaseUrl"`
	Notes           string               `json:"notes"`
	Assets          []DesktopUpdateAsset `json:"assets"`
	UpdateAvailable bool                 `json:"updateAvailable"`
}

// GetAppInfo returns version, channel, and metadata for the running build.
func (a *App) GetAppInfo() DesktopAppInfo {
	return DesktopAppInfo{
		Version:     desktopVersion,
		Channel:     "beta",
		Description: "A local-first AI workspace for building with your code.",
		Repository:  "https://github.com/mncuchiinhuttt/mncode",
		Copyright:   "© 2026 mncuchiinhuttt",
	}
}

// CheckForUpdate queries the release feed and reports newer versions.
func (a *App) CheckForUpdate() (DesktopUpdateInfo, error) {
	baseURL := "https://mncode.mncuchiinhuttt.dev"
	if cfg, err := config.LoadConfig(""); err == nil {
		baseURL = cfg.GetWebBaseURL()
	}
	request, err := http.NewRequest(http.MethodGet, strings.TrimRight(baseURL, "/")+desktopReleaseEndpoint, nil)
	if err != nil {
		return DesktopUpdateInfo{}, err
	}
	request.Header.Set("User-Agent", "mncode-desktop-updater")
	client := &http.Client{Timeout: 5 * time.Second}
	response, err := client.Do(request)
	if err != nil {
		return DesktopUpdateInfo{}, err
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return DesktopUpdateInfo{}, fmt.Errorf("release endpoint returned status %d", response.StatusCode)
	}
	var release struct {
		Version     string               `json:"version"`
		ReleaseDate string               `json:"releaseDate"`
		Channel     string               `json:"channel"`
		ReleaseURL  string               `json:"releaseUrl"`
		Notes       string               `json:"notes"`
		Assets      []DesktopUpdateAsset `json:"assets"`
	}
	if err := json.NewDecoder(response.Body).Decode(&release); err != nil {
		return DesktopUpdateInfo{}, err
	}
	if release.ReleaseURL == "" {
		release.ReleaseURL = "https://github.com/mncuchiinhuttt/mncode-desktop/releases"
	}
	return DesktopUpdateInfo{
		CurrentVersion:  desktopVersion,
		LatestVersion:   release.Version,
		ReleaseDate:     release.ReleaseDate,
		Channel:         release.Channel,
		ReleaseURL:      release.ReleaseURL,
		Notes:           release.Notes,
		Assets:          release.Assets,
		UpdateAvailable: newerVersion(desktopVersion, release.Version),
	}, nil
}

// OpenUpdatePage opens the release page in the system browser.
func (a *App) OpenUpdatePage(url string) error {
	return a.openExternalURL(url)
}

// OpenExternalURL opens an arbitrary URL in the system browser.
func (a *App) OpenExternalURL(rawURL string) error {
	return a.openExternalURL(rawURL)
}

func (a *App) openExternalURL(rawURL string) error {
	parsed, err := parseExternalURL(rawURL)
	if err != nil {
		return err
	}
	a.mu.RLock()
	ctx := a.ctx
	a.mu.RUnlock()
	if ctx == nil {
		return fmt.Errorf("desktop runtime is not ready")
	}
	runtime.BrowserOpenURL(ctx, parsed)
	return nil
}

func parseExternalURL(rawURL string) (string, error) {
	parsed, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return "", fmt.Errorf("invalid external URL")
	}
	return parsed.String(), nil
}

func newerVersion(current, latest string) bool {
	currentParts := versionParts(current)
	latestParts := versionParts(latest)
	for index := 0; index < len(currentParts) || index < len(latestParts); index++ {
		left, right := 0, 0
		if index < len(currentParts) {
			left = currentParts[index]
		}
		if index < len(latestParts) {
			right = latestParts[index]
		}
		if right != left {
			return right > left
		}
	}
	return false
}

func versionParts(value string) []int {
	value = strings.TrimPrefix(strings.TrimSpace(value), "v")
	value = strings.SplitN(value, "-", 2)[0]
	parts := strings.Split(value, ".")
	result := make([]int, 0, len(parts))
	for _, part := range parts {
		number, err := strconv.Atoi(part)
		if err != nil {
			result = append(result, 0)
		} else {
			result = append(result, number)
		}
	}
	return result
}
