// In-app updater: verifies a signed release asset, downloads it with progress
// events, validates its bytes/archive, and swaps it in on restart.
package main

import (
	"archive/tar"
	"archive/zip"
	"compress/gzip"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"sync"
	"time"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

const updateProgressEvent = "update:progress"
const maxUpdateDownloadBytes int64 = 2 << 30
const maxUpdateArchiveEntries = 10000
const maxUpdateExpandedBytes int64 = 8 << 30

var downloadedUpdateState = struct {
	sync.RWMutex
	files map[string]string
}{files: make(map[string]string)}

// pickUpdateAsset selects the release artifact built for this machine.
// macOS prefers the universal build (covers Intel + Apple Silicon); Windows
// and Linux match the exact GOARCH.
func pickUpdateAsset(assets []DesktopUpdateAsset) (DesktopUpdateAsset, error) {
	var fallbackByOS []DesktopUpdateAsset
	for _, asset := range assets {
		name := strings.ToLower(asset.Name)
		if _, err := safeUpdateFilename(asset.Name); err != nil || asset.URL == "" {
			continue
		}
		switch runtime.GOOS {
		case "darwin":
			if strings.Contains(name, "darwin-universal") { return asset, nil }
			if strings.Contains(name, "darwin") { fallbackByOS = append(fallbackByOS, asset) }
		case "windows":
			if strings.Contains(name, "windows-"+runtime.GOARCH) { return asset, nil }
			if strings.Contains(name, "windows") { fallbackByOS = append(fallbackByOS, asset) }
		case "linux":
			if strings.Contains(name, "linux-"+runtime.GOARCH) { return asset, nil }
			if strings.Contains(name, "linux") { fallbackByOS = append(fallbackByOS, asset) }
		}
	}
	if len(fallbackByOS) > 0 { return fallbackByOS[0], nil }
	return DesktopUpdateAsset{}, fmt.Errorf("no release asset matches %s/%s", runtime.GOOS, runtime.GOARCH)
}

func safeUpdateFilename(name string) (string, error) {
	name = strings.TrimSpace(name)
	if name == "" || name == "." || name == ".." || filepath.Base(name) != name || strings.ContainsAny(name, "/\\\x00\r\n") {
		return "", fmt.Errorf("filename must be a single safe path component")
	}
	return name, nil
}

// DownloadUpdate fetches the matching release asset into a temp file, emitting
// update:progress events along the way. The asset must have come from a
// manifest accepted by CheckForUpdate; this prevents a frontend caller from
// replacing the signed URL/digest pair.
func (a *App) DownloadUpdate(assets []DesktopUpdateAsset) (string, error) {
	asset, err := pickUpdateAsset(assets)
	if err != nil { return "", err }
	if _, err := safeUpdateFilename(asset.Name); err != nil { return "", fmt.Errorf("update asset rejected: %w", err) }
	record, ok := verifiedAsset(asset)
	if !ok { return "", fmt.Errorf("release manifest has not been verified; check for updates again before downloading") }
	if !strings.EqualFold(record.sha256, asset.SHA256) {
		return "", fmt.Errorf("update asset %q does not match its verified manifest digest", asset.Name)
	}
	if err := validateManifestAsset(asset); err != nil { return "", err }
	parsedURL, err := parseHTTPSReleaseAssetURL(asset.URL)
	if err != nil { return "", fmt.Errorf("update asset %q URL rejected: %w", asset.Name, err) }
	client := &http.Client{
		Timeout: 10 * time.Minute,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 3 { return fmt.Errorf("update download redirected too many times") }
			if err := validateReleaseAssetURL(req.URL); err != nil { return fmt.Errorf("update download redirected to an untrusted URL: %w", err) }
			return nil
		},
	}
	request, err := http.NewRequest(http.MethodGet, parsedURL, nil)
	if err != nil { return "", fmt.Errorf("create update request: %w", err) }
	request.Header.Set("User-Agent", "mncode-desktop-updater")
	response, err := client.Do(request)
	if err != nil { return "", fmt.Errorf("download update %q: %w", asset.Name, err) }
	defer response.Body.Close()
	if response.Request == nil || validateReleaseAssetURL(response.Request.URL) != nil { return "", fmt.Errorf("download response came from an untrusted URL") }
	if response.StatusCode < 200 || response.StatusCode >= 300 { return "", fmt.Errorf("download update %q returned status %d", asset.Name, response.StatusCode) }
	if asset.Size > maxUpdateDownloadBytes { return "", fmt.Errorf("update asset %q exceeds the %d-byte safety limit", asset.Name, maxUpdateDownloadBytes) }
	if response.ContentLength > maxUpdateDownloadBytes || (asset.Size > 0 && response.ContentLength > asset.Size) {
		return "", fmt.Errorf("update asset %q response is larger than its manifest size", asset.Name)
	}

	destinationFile, err := os.CreateTemp(os.TempDir(), "mncode-update-*-"+asset.Name)
	if err != nil { return "", fmt.Errorf("create update staging file: %w", err) }
	destination := destinationFile.Name()
	removeOnError := true
	defer func() { if removeOnError { _ = os.Remove(destination) } }()
	hasher := sha256.New()
	writer := io.MultiWriter(destinationFile, hasher)
	limited := io.LimitReader(response.Body, maxUpdateDownloadBytes+1)
	downloaded, err := io.CopyBuffer(writer, limited, make([]byte, 256*1024))
	if err != nil { _ = destinationFile.Close(); return "", fmt.Errorf("download update %q: %w", asset.Name, err) }
	if downloaded > maxUpdateDownloadBytes { _ = destinationFile.Close(); return "", fmt.Errorf("update asset %q exceeds the %d-byte safety limit", asset.Name, maxUpdateDownloadBytes) }
	if asset.Size > 0 && downloaded != asset.Size { _ = destinationFile.Close(); return "", fmt.Errorf("update asset %q size mismatch: manifest %d bytes, received %d", asset.Name, asset.Size, downloaded) }
	if err := destinationFile.Sync(); err != nil { _ = destinationFile.Close(); return "", fmt.Errorf("stage update %q: %w", asset.Name, err) }
	if err := destinationFile.Close(); err != nil { return "", fmt.Errorf("close staged update %q: %w", asset.Name, err) }
	actualDigest := hex.EncodeToString(hasher.Sum(nil))
	if !strings.EqualFold(actualDigest, record.sha256) {
		return "", fmt.Errorf("update asset %q sha256 mismatch: expected %s, received %s", asset.Name, record.sha256, actualDigest)
	}
	if err := validateDownloadedArtifact(destination); err != nil { return "", fmt.Errorf("update asset %q failed safety validation: %w", asset.Name, err) }
	downloadedUpdateState.Lock()
	downloadedUpdateState.files[destination] = record.sha256
	downloadedUpdateState.Unlock()
	removeOnError = false
	a.emitUpdateProgress(downloaded, downloaded)
	return destination, nil
}

func parseHTTPSReleaseAssetURL(raw string) (string, error) {
	parsed, err := url.Parse(raw)
	if err != nil {
		return "", fmt.Errorf("invalid URL: %w", err)
	}
	if err := validateReleaseAssetURL(parsed); err != nil {
		return "", err
	}
	return parsed.String(), nil
}

func shellQuote(value string) string {
	return "'" + strings.ReplaceAll(value, "'", "'\\''") + "'"
}

func (a *App) emitUpdateProgress(downloaded, total int64) {
	a.mu.RLock(); ctx := a.ctx; a.mu.RUnlock()
	if ctx == nil { return }
	percent := 100.0
	if total > 0 { percent = float64(downloaded) / float64(total) * 100 }
	wailsruntime.EventsEmit(ctx, updateProgressEvent, map[string]any{"percent": percent, "downloaded": downloaded, "total": total})
}
func validateDownloadedArtifact(path string) error {
	info, err := os.Stat(path)
	if err != nil { return fmt.Errorf("staged update not found") }
	if !info.Mode().IsRegular() { return fmt.Errorf("staged update is not a regular file") }
	if info.Size() <= 0 || info.Size() > maxUpdateDownloadBytes { return fmt.Errorf("staged update size is outside the safety limit") }
	switch runtime.GOOS {
	case "darwin":
		return validateUpdateArchive(path)
	case "windows":
		return validateWindowsUpdateArchive(path)
	case "linux":
		return validateLinuxUpdateArchive(path)
	default:
		return nil
	}
}

func archiveEntryPath(raw string) (string, error) {
	name := strings.ReplaceAll(raw, "\\", "/")
	if strings.ContainsRune(name, '\x00') || strings.HasPrefix(name, "/") || strings.HasPrefix(name, "../") || strings.Contains(name, "/../") || name == ".." {
		return "", fmt.Errorf("archive contains unsafe path %q", raw)
	}
	clean := filepath.ToSlash(filepath.Clean(name))
	if clean == "." || strings.HasPrefix(clean, "../") {
		return "", fmt.Errorf("archive contains unsafe path %q", raw)
	}
	return clean, nil
}

// validateUpdateArchive rejects zip-slip entries, symlinks, and archive bombs
// before the macOS apply helper is allowed to invoke unzip.
func validateUpdateArchive(path string) error {
	return validateZipUpdateArchive(path, true)
}

func validateWindowsUpdateArchive(path string) error {
	return validateZipUpdateArchive(path, false)
}

func validateZipUpdateArchive(path string, requireBundle bool) error {
	archive, err := zip.OpenReader(path)
	if err != nil { return fmt.Errorf("expected a readable zip archive: %w", err) }
	defer archive.Close()
	var expanded int64
	topLevel := make(map[string]struct{})
	seen := make(map[string]struct{}, len(archive.File))
	regularFiles := 0
	for index, file := range archive.File {
		if index >= maxUpdateArchiveEntries { return fmt.Errorf("archive contains too many entries") }
		clean, err := archiveEntryPath(file.Name)
		if err != nil { return err }
		if _, duplicate := seen[clean]; duplicate { return fmt.Errorf("archive contains duplicate path %q", file.Name) }
		seen[clean] = struct{}{}
		if slash := strings.IndexByte(clean, '/'); slash > 0 { topLevel[clean[:slash]] = struct{}{} } else { topLevel[clean] = struct{}{} }
		if file.FileInfo().Mode()&os.ModeSymlink != 0 { return fmt.Errorf("archive contains symlink %q", file.Name) }
		if file.UncompressedSize64 > uint64(maxUpdateExpandedBytes) || expanded > maxUpdateExpandedBytes-int64(file.UncompressedSize64) {
			return fmt.Errorf("archive expanded size exceeds safety limit")
		}
		expanded += int64(file.UncompressedSize64)
		if !file.FileInfo().IsDir() {
			regularFiles++
			if !requireBundle && strings.Contains(clean, "/") {
				return fmt.Errorf("executable archive payload must be at the archive root")
			}
		}
	}
	if requireBundle {
		var roots []string
		for root := range topLevel { roots = append(roots, root) }
		sort.Strings(roots)
		if len(roots) != 1 || !strings.HasSuffix(strings.ToLower(roots[0]), ".app") {
			return fmt.Errorf("archive must contain exactly one top-level .app bundle")
		}
		return nil
	}
	if len(topLevel) != 1 || regularFiles != 1 {
		return fmt.Errorf("archive must contain exactly one executable payload")
	}
	for root := range topLevel {
		if !strings.HasSuffix(strings.ToLower(root), ".exe") {
			return fmt.Errorf("archive payload must be a Windows executable")
		}
	}
	return nil
}

func validateLinuxUpdateArchive(path string) error {
	file, err := os.Open(path)
	if err != nil { return fmt.Errorf("open Linux update archive: %w", err) }
	defer file.Close()
	gzipReader, err := gzip.NewReader(file)
	if err != nil { return fmt.Errorf("expected a readable gzip archive: %w", err) }
	defer gzipReader.Close()
	reader := tar.NewReader(gzipReader)
	entries := 0
	var expanded int64
	for {
		header, err := reader.Next()
		if err == io.EOF { break }
		if err != nil { return fmt.Errorf("read Linux update archive: %w", err) }
		entries++
		if entries > maxUpdateArchiveEntries { return fmt.Errorf("archive contains too many entries") }
		clean, err := archiveEntryPath(header.Name)
		if err != nil { return err }
		if strings.Contains(clean, "/") { return fmt.Errorf("executable archive payload must be at the archive root") }
		if header.Typeflag != tar.TypeReg && header.Typeflag != tar.TypeRegA {
			return fmt.Errorf("archive contains unsupported entry %q", header.Name)
		}
		if header.Size < 0 || header.Size > maxUpdateExpandedBytes || expanded > maxUpdateExpandedBytes-header.Size {
			return fmt.Errorf("archive expanded size exceeds safety limit")
		}
		expanded += header.Size
	}
	if entries != 1 || expanded == 0 {
		return fmt.Errorf("archive must contain exactly one executable payload")
	}
	return nil
}

// ApplyUpdateAndRestart verifies the exact staged bytes again immediately
// before spawning the platform helper. A path not produced by DownloadUpdate
// cannot be applied.
func (a *App) ApplyUpdateAndRestart(downloadedPath string) error {
	info, err := os.Stat(downloadedPath)
	if err != nil || !info.Mode().IsRegular() { return fmt.Errorf("downloaded update not found; download and verify it first") }
	downloadedUpdateState.RLock(); expected, ok := downloadedUpdateState.files[downloadedPath]; downloadedUpdateState.RUnlock()
	if !ok { return fmt.Errorf("downloaded update was not verified by the signed manifest") }
	file, err := os.Open(downloadedPath)
	if err != nil { return fmt.Errorf("open downloaded update: %w", err) }
	hasher := sha256.New()
	_, copyErr := io.Copy(hasher, io.LimitReader(file, maxUpdateDownloadBytes+1))
	closeErr := file.Close()
	if copyErr != nil || closeErr != nil { return fmt.Errorf("verify downloaded update: %w", firstError(copyErr, closeErr)) }
	actual := hex.EncodeToString(hasher.Sum(nil))
	if !strings.EqualFold(actual, expected) { return fmt.Errorf("downloaded update sha256 mismatch: expected %s, received %s", expected, actual) }
	if err := validateDownloadedArtifact(downloadedPath); err != nil { return fmt.Errorf("verify downloaded update archive: %w", err) }
	executable, err := os.Executable()
	if err != nil { return fmt.Errorf("locate running executable: %w", err) }
	executable, err = filepath.EvalSymlinks(executable)
	if err != nil { return fmt.Errorf("resolve running executable: %w", err) }
	script, err := writeApplyScript(downloadedPath, executable)
	if err != nil { return fmt.Errorf("prepare update apply: %w", err) }
	if err := spawnDetached(script); err != nil { return fmt.Errorf("start update apply: %w", err) }
	a.mu.RLock(); ctx := a.ctx; a.mu.RUnlock()
	if ctx != nil { go func() { time.Sleep(300 * time.Millisecond); wailsruntime.Quit(ctx) }() }
	return nil
}

func firstError(errors ...error) error { for _, err := range errors { if err != nil { return err } }; return nil }
