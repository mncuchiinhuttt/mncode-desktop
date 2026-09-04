// App version metadata and update checks against the release feed.
package main

import (
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"mncode/pkg/config"
)

const desktopVersion = "v0.1.6-beta"
const desktopReleaseEndpoint = "/api/releases/desktop/latest"
const desktopReleaseOrigin = "https://mncode.mncuchiinhuttt.dev"
const desktopReleaseAssetOrigin = "https://github.com"
const releaseManifestSchemaVersion = 1
const releaseClockSkew = 5 * time.Minute
const releaseManifestMaxAge = 31 * 24 * time.Hour
const desktopReleaseAssetCDNOrigin = "https://release-assets.githubusercontent.com"

// The root key is intentionally compiled into the desktop binary. Rotated keys
// may only be introduced by metadata signed by this key.
const pinnedReleaseRootKeyID = "mncode-release-2026"
const pinnedReleaseRootKeyBase64 = "Ln/WP/P6PGgmNpwoO0waNBGllXtafV6YLels+cj7yMQ="

var pinnedReleaseKeys = map[string]ed25519.PublicKey{
	pinnedReleaseRootKeyID: mustReleasePublicKey(pinnedReleaseRootKeyBase64),
}

func mustReleasePublicKey(encoded string) ed25519.PublicKey {
	key, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil || len(key) != ed25519.PublicKeySize {
		panic("invalid pinned release public key")
	}
	return ed25519.PublicKey(key)
}

// DesktopAppInfo describes the running desktop build.
type DesktopAppInfo struct {
	Version     string `json:"version"`
	Channel     string `json:"channel"`
	Description string `json:"description"`
	Repository  string `json:"repository"`
	Copyright   string `json:"copyright"`
}

// DesktopUpdateAsset is one downloadable release artifact. SHA256 is the
// digest of the exact bytes served by URL; it is authenticated by the release
// manifest signature.
type DesktopUpdateAsset struct {
	Name   string `json:"name"`
	URL    string `json:"url"`
	Size   int64  `json:"size"`
	SHA256 string `json:"sha256"`
}

// ReleaseKeyRotation permits a key transition without making the desktop
// binary trust arbitrary keys. Its signature is always made by the pinned
// root, and the transition itself is bounded by the same expiry policy.
type ReleaseKeyRotation struct {
	KeyID     string `json:"keyID"`
	PublicKey string `json:"publicKey"`
	Signature string `json:"signature"`
	IssuedAt  string `json:"issuedAt"`
	ExpiresAt string `json:"expiresAt"`
}

// DesktopReleaseManifest is the signed update envelope returned by the web
// release API. Signature covers version, channel, times, and every asset's
// name, URL, size, and SHA256 (but not Signature itself).
type DesktopReleaseManifest struct {
	SchemaVersion int                  `json:"schemaVersion"`
	Version       string               `json:"version"`
	Channel       string               `json:"channel"`
	IssuedAt      string               `json:"issuedAt"`
	ExpiresAt     string               `json:"expiresAt"`
	KeyID         string               `json:"keyID"`
	Signature     string               `json:"signature"`
	Assets        []DesktopUpdateAsset `json:"assets"`
	KeyRotation   *ReleaseKeyRotation  `json:"keyRotation,omitempty"`
}

// DesktopUpdateInfo reports update availability against the release feed.
type DesktopUpdateInfo struct {
	CurrentVersion  string                 `json:"currentVersion"`
	LatestVersion   string                 `json:"latestVersion"`
	ReleaseDate     string                 `json:"releaseDate"`
	Channel         string                 `json:"channel"`
	ReleaseURL      string                 `json:"releaseUrl"`
	Notes           string                 `json:"notes"`
	Assets          []DesktopUpdateAsset   `json:"assets"`
	Manifest        DesktopReleaseManifest `json:"manifest"`
	UpdateAvailable bool                   `json:"updateAvailable"`
}

type releaseAssetRecord struct {
	sha256      string
	fingerprint string
}

var verifiedReleaseState = struct {
	sync.RWMutex
	assets map[string]releaseAssetRecord
	latest map[string]string
}{assets: make(map[string]releaseAssetRecord), latest: make(map[string]string)}

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

// CheckForUpdate queries and verifies the release feed. No update metadata is
// exposed to the frontend until its signature, freshness, origin, and replay
// protections all pass.
func (a *App) CheckForUpdate() (DesktopUpdateInfo, error) {
	baseURL := desktopReleaseOrigin
	if cfg, err := config.LoadConfig(""); err == nil && strings.TrimSpace(cfg.GetWebBaseURL()) != "" {
		baseURL = cfg.GetWebBaseURL()
	}
	endpoint, err := releaseEndpointURL(baseURL)
	if err != nil {
		return DesktopUpdateInfo{}, fmt.Errorf("release endpoint rejected: %w", err)
	}
	origin := endpointOrigin(endpoint)
	request, err := http.NewRequest(http.MethodGet, endpoint, nil)
	if err != nil {
		return DesktopUpdateInfo{}, fmt.Errorf("create release request: %w", err)
	}
	request.Header.Set("User-Agent", "mncode-desktop-updater")
	client := &http.Client{
		Timeout: 5 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 3 {
				return fmt.Errorf("release endpoint redirected too many times")
			}
			if !sameURLOrigin(req.URL, origin) {
				return fmt.Errorf("release endpoint redirected to an untrusted origin")
			}
			return nil
		},
	}
	response, err := client.Do(request)
	if err != nil {
		return DesktopUpdateInfo{}, fmt.Errorf("fetch release manifest: %w", err)
	}
	defer response.Body.Close()
	if !sameURLOrigin(response.Request.URL, origin) {
		return DesktopUpdateInfo{}, fmt.Errorf("release response came from an untrusted origin")
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return DesktopUpdateInfo{}, fmt.Errorf("release endpoint returned status %d", response.StatusCode)
	}

	var release struct {
		Product     string                  `json:"product"`
		Version     string                  `json:"version"`
		ReleaseDate string                  `json:"releaseDate"`
		Channel     string                  `json:"channel"`
		ReleaseURL  string                  `json:"releaseUrl"`
		Notes       string                  `json:"notes"`
		Assets      []DesktopUpdateAsset    `json:"assets"`
		Manifest    *DesktopReleaseManifest `json:"manifest"`
		DesktopReleaseManifest
	}
	if err := json.NewDecoder(io.LimitReader(response.Body, 4<<20)).Decode(&release); err != nil {
		return DesktopUpdateInfo{}, fmt.Errorf("decode release manifest: %w", err)
	}
	manifest := release.DesktopReleaseManifest
	if release.Manifest != nil {
		manifest = *release.Manifest
	}
	if manifest.Version == "" {
		manifest.Version = release.Version
	}
	if manifest.Channel == "" {
		manifest.Channel = release.Channel
	}
	if len(manifest.Assets) == 0 {
		manifest.Assets = release.Assets
	}
	if err := verifyReleaseManifest(manifest, time.Now().UTC()); err != nil {
		return DesktopUpdateInfo{}, err
	}
	if manifest.Channel != "beta" && manifest.Channel != "stable" {
		return DesktopUpdateInfo{}, fmt.Errorf("release manifest has unsupported channel %q", manifest.Channel)
	}
	rememberVerifiedManifest(manifest)
	if release.ReleaseURL == "" {
		release.ReleaseURL = "https://github.com/mncuchiinhuttt/mncode-desktop/releases"
	}
	if _, err := validateReleasePageURL(release.ReleaseURL); err != nil {
		return DesktopUpdateInfo{}, fmt.Errorf("release page rejected: %w", err)
	}
	return DesktopUpdateInfo{
		CurrentVersion:  desktopVersion,
		LatestVersion:   manifest.Version,
		ReleaseDate:     release.ReleaseDate,
		Channel:         manifest.Channel,
		ReleaseURL:      release.ReleaseURL,
		Notes:           release.Notes,
		Assets:          manifest.Assets,
		Manifest:        manifest,
		UpdateAvailable: newerVersion(desktopVersion, manifest.Version),
	}, nil
}

// OpenUpdatePage opens the release page in the system browser.
func (a *App) OpenUpdatePage(rawURL string) error {
	parsed, err := validateReleasePageURL(rawURL)
	if err != nil {
		return err
	}
	return a.openExternalURL(parsed)
}

// OpenExternalURL opens an arbitrary safe HTTP(S) URL in the system browser.
func (a *App) OpenExternalURL(rawURL string) error { return a.openExternalURL(rawURL) }

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
	if err != nil || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.User != nil || strings.ContainsAny(parsed.Host, "\r\n") {
		return "", fmt.Errorf("invalid external URL: HTTPS/HTTP URL without credentials required")
	}
	return parsed.String(), nil
}

func releaseEndpointURL(raw string) (string, error) {
	parsed, err := url.Parse(strings.TrimRight(strings.TrimSpace(raw), "/") + desktopReleaseEndpoint)
	if err != nil || parsed.Scheme != "https" || parsed.Host == "" || parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" {
		return "", fmt.Errorf("must be an HTTPS URL without credentials, query, or fragment")
	}
	if !sameURLOrigin(parsed, desktopReleaseOrigin) {
		return "", fmt.Errorf("origin %q is not trusted", parsed.Host)
	}
	return parsed.String(), nil
}

func validateReleasePageURL(raw string) (string, error) {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || parsed.Scheme != "https" || parsed.Host == "" || parsed.User != nil {
		return "", fmt.Errorf("invalid release page URL: HTTPS URL without credentials required")
	}
	if !sameURLOrigin(parsed, desktopReleaseOrigin) && !sameURLOrigin(parsed, desktopReleaseAssetOrigin) {
		return "", fmt.Errorf("release page origin %q is not trusted", parsed.Host)
	}
	return parsed.String(), nil
}

func endpointOrigin(raw string) string {
	parsed, _ := url.Parse(raw)
	return parsed.Scheme + "://" + parsed.Host
}

func trustedReleaseAssetOrigin(raw *url.URL) bool {
	return sameURLOrigin(raw, desktopReleaseAssetOrigin) || sameURLOrigin(raw, desktopReleaseAssetCDNOrigin)
}
func sameURLOrigin(raw *url.URL, expected string) bool {
	want, err := url.Parse(expected)
	return err == nil && raw != nil && raw.Scheme == want.Scheme && strings.EqualFold(raw.Host, want.Host)
}
func validateReleaseAssetURL(parsed *url.URL) error {
	if parsed == nil || parsed.Scheme != "https" || parsed.Host == "" || parsed.User != nil || parsed.Fragment != "" {
		return fmt.Errorf("must be an HTTPS URL without credentials or fragment")
	}
	switch {
	case sameURLOrigin(parsed, desktopReleaseAssetOrigin):
		if parsed.RawQuery != "" {
			return fmt.Errorf("GitHub release URLs must not contain query parameters")
		}
		if !strings.HasPrefix(parsed.Path, "/mncuchiinhuttt/mncode-desktop/releases/download/") {
			return fmt.Errorf("path is outside the trusted release path")
		}
	case sameURLOrigin(parsed, desktopReleaseAssetCDNOrigin):
		if !strings.HasPrefix(parsed.Path, "/github-production-release-asset/") {
			return fmt.Errorf("path is outside the trusted release-assets CDN path")
		}
		query, err := url.ParseQuery(parsed.RawQuery)
		if err != nil || strings.TrimSpace(query.Get("sig")) == "" {
			return fmt.Errorf("release-assets CDN URL is missing its signed query parameters")
		}
	default:
		return fmt.Errorf("origin %q is not trusted", parsed.Host)
	}
	return nil
}


func verifyReleaseManifest(manifest DesktopReleaseManifest, now time.Time) error {
	if manifest.SchemaVersion != releaseManifestSchemaVersion {
		return fmt.Errorf("release manifest schemaVersion %d is unsupported (want %d)", manifest.SchemaVersion, releaseManifestSchemaVersion)
	}
	if strings.TrimSpace(manifest.Version) == "" {
		return fmt.Errorf("release manifest missing version")
	}
	if strings.TrimSpace(manifest.Channel) == "" {
		return fmt.Errorf("release manifest missing channel")
	}
	issued, err := time.Parse(time.RFC3339, manifest.IssuedAt)
	if err != nil {
		return fmt.Errorf("release manifest issuedAt is invalid: %w", err)
	}
	expires, err := time.Parse(time.RFC3339, manifest.ExpiresAt)
	if err != nil {
		return fmt.Errorf("release manifest expiresAt is invalid: %w", err)
	}
	if issued.After(expires) || expires.Sub(issued) > releaseManifestMaxAge {
		return fmt.Errorf("release manifest validity window is invalid")
	}
	if manifest.KeyRotation != nil {
		rotationIssued, rotationErr := time.Parse(time.RFC3339, manifest.KeyRotation.IssuedAt)
		rotationExpires, rotationExpiryErr := time.Parse(time.RFC3339, manifest.KeyRotation.ExpiresAt)
		if rotationErr != nil || rotationExpiryErr != nil || rotationIssued.After(now.Add(releaseClockSkew)) || !rotationExpires.After(now) {
			return fmt.Errorf("release key rotation is expired or issued in the future")
		}
	}
	if issued.After(now.Add(releaseClockSkew)) {
		return fmt.Errorf("release manifest is issued in the future")
	}
	if !expires.After(now) {
		return fmt.Errorf("release manifest expired at %s", expires.UTC().Format(time.RFC3339))
	}
	if strings.TrimSpace(manifest.Signature) == "" {
		return fmt.Errorf("release manifest missing signature")
	}
	if len(manifest.Assets) == 0 {
		return fmt.Errorf("release manifest has no assets")
	}
	seenNames := make(map[string]struct{}, len(manifest.Assets))
	for _, asset := range manifest.Assets {
		if err := validateManifestAsset(asset); err != nil {
			return err
		}
		if _, ok := seenNames[asset.Name]; ok {
			return fmt.Errorf("release manifest contains duplicate asset %q", asset.Name)
		}
		seenNames[asset.Name] = struct{}{}
	}
	key, err := manifestVerificationKey(manifest)
	if err != nil {
		return err
	}
	signature, err := decodeSignature(manifest.Signature)
	if err != nil {
		return fmt.Errorf("release manifest signature is malformed: %w", err)
	}
	payload, err := manifestSigningBytes(manifest)
	if err != nil {
		return fmt.Errorf("release manifest cannot be canonicalized: %w", err)
	}
	if !ed25519.Verify(key, payload, signature) {
		return fmt.Errorf("release manifest signature mismatch for version %s", manifest.Version)
	}
	verifiedReleaseState.RLock()
	previous := verifiedReleaseState.latest[manifest.Channel]
	verifiedReleaseState.RUnlock()
	if previous != "" && compareVersion(manifest.Version, previous) < 0 {
		return fmt.Errorf("release manifest replay/rollback rejected: %s is older than %s", manifest.Version, previous)
	}
	return nil
}

func validateManifestAsset(asset DesktopUpdateAsset) error {
	if strings.TrimSpace(asset.Name) == "" {
		return fmt.Errorf("release manifest asset missing name")
	}
	if _, err := safeUpdateFilename(asset.Name); err != nil {
		return fmt.Errorf("release manifest asset %q has unsafe name: %w", asset.Name, err)
	}
	if asset.Size < 0 {
		return fmt.Errorf("release manifest asset %q has invalid size", asset.Name)
	}
	if len(strings.TrimSpace(asset.SHA256)) != sha256.Size*2 {
		return fmt.Errorf("release manifest asset %q missing or invalid sha256", asset.Name)
	}
	if _, err := hex.DecodeString(asset.SHA256); err != nil {
		return fmt.Errorf("release manifest asset %q has invalid sha256: %w", asset.Name, err)
	}
	parsed, err := url.Parse(asset.URL)
	if err != nil {
		return fmt.Errorf("release manifest asset %q has unsafe URL: %w", asset.Name, err)
	}
	if err := validateReleaseAssetURL(parsed); err != nil {
		return fmt.Errorf("release manifest asset %q has unsafe URL: %w", asset.Name, err)
	}
	return nil
}

type manifestAssetPayload struct {
	Name   string `json:"name"`
	URL    string `json:"url"`
	Size   int64  `json:"size"`
	SHA256 string `json:"sha256"`
}
type manifestPayload struct {
	SchemaVersion int                    `json:"schemaVersion"`
	Version       string                 `json:"version"`
	Channel       string                 `json:"channel"`
	IssuedAt      string                 `json:"issuedAt"`
	ExpiresAt     string                 `json:"expiresAt"`
	Assets        []manifestAssetPayload `json:"assets"`
}

func manifestSigningBytes(manifest DesktopReleaseManifest) ([]byte, error) {
	assets := make([]manifestAssetPayload, 0, len(manifest.Assets))
	for _, asset := range manifest.Assets {
		assets = append(assets, manifestAssetPayload{Name: asset.Name, URL: asset.URL, Size: asset.Size, SHA256: strings.ToLower(asset.SHA256)})
	}
	sort.Slice(assets, func(i, j int) bool { return assets[i].Name < assets[j].Name })
	return json.Marshal(manifestPayload{SchemaVersion: manifest.SchemaVersion, Version: manifest.Version, Channel: manifest.Channel, IssuedAt: manifest.IssuedAt, ExpiresAt: manifest.ExpiresAt, Assets: assets})
}

func manifestVerificationKey(manifest DesktopReleaseManifest) (ed25519.PublicKey, error) {
	if key, ok := pinnedReleaseKeys[manifest.KeyID]; ok {
		return key, nil
	}
	if manifest.KeyRotation == nil || manifest.KeyID == "" || manifest.KeyRotation.KeyID != manifest.KeyID {
		return nil, fmt.Errorf("release manifest keyID %q is not trusted (missing signed rotation)", manifest.KeyID)
	}
	rotation := manifest.KeyRotation
	if rotation.KeyID == pinnedReleaseRootKeyID {
		return nil, fmt.Errorf("release manifest key rotation cannot replace the pinned root")
	}
	publicKey, err := base64.StdEncoding.DecodeString(rotation.PublicKey)
	if err != nil || len(publicKey) != ed25519.PublicKeySize {
		return nil, fmt.Errorf("release key rotation publicKey is invalid")
	}
	issued, err := time.Parse(time.RFC3339, rotation.IssuedAt)
	if err != nil {
		return nil, fmt.Errorf("release key rotation issuedAt is invalid")
	}
	expires, err := time.Parse(time.RFC3339, rotation.ExpiresAt)
	if err != nil || !expires.After(issued) || expires.Sub(issued) > releaseManifestMaxAge {
		return nil, fmt.Errorf("release key rotation validity window is invalid")
	}
	rotationPayload, _ := json.Marshal(struct {
		KeyID     string `json:"keyID"`
		PublicKey string `json:"publicKey"`
		IssuedAt  string `json:"issuedAt"`
		ExpiresAt string `json:"expiresAt"`
	}{rotation.KeyID, rotation.PublicKey, rotation.IssuedAt, rotation.ExpiresAt})
	signature, err := decodeSignature(rotation.Signature)
	if err != nil || !ed25519.Verify(pinnedReleaseKeys[pinnedReleaseRootKeyID], rotationPayload, signature) {
		return nil, fmt.Errorf("release key rotation signature mismatch")
	}
	return ed25519.PublicKey(publicKey), nil
}

func decodeSignature(value string) ([]byte, error) {
	value = strings.TrimSpace(value)
	if decoded, err := base64.StdEncoding.DecodeString(value); err == nil {
		return decoded, nil
	}
	if decoded, err := base64.RawStdEncoding.DecodeString(value); err == nil {
		return decoded, nil
	}
	decoded, err := hex.DecodeString(value)
	if err != nil {
		return nil, err
	}
	return decoded, nil
}

func releaseManifestFingerprint(manifest DesktopReleaseManifest) string {
	payload, _ := manifestSigningBytes(manifest)
	hash := sha256.Sum256(append(payload, []byte(manifest.Signature)...))
	return hex.EncodeToString(hash[:])
}

func releaseAssetKey(asset DesktopUpdateAsset) string { return asset.Name + "\x00" + asset.URL }

func rememberVerifiedManifest(manifest DesktopReleaseManifest) {
	fingerprint := releaseManifestFingerprint(manifest)
	verifiedReleaseState.Lock()
	defer verifiedReleaseState.Unlock()
	verifiedReleaseState.latest[manifest.Channel] = manifest.Version
	for _, asset := range manifest.Assets {
		verifiedReleaseState.assets[releaseAssetKey(asset)] = releaseAssetRecord{sha256: strings.ToLower(asset.SHA256), fingerprint: fingerprint}
	}
}

func verifiedAsset(asset DesktopUpdateAsset) (releaseAssetRecord, bool) {
	verifiedReleaseState.RLock()
	defer verifiedReleaseState.RUnlock()
	record, ok := verifiedReleaseState.assets[releaseAssetKey(asset)]
	return record, ok
}

func compareVersion(a, b string) int {
	currentParts := versionParts(a)
	latestParts := versionParts(b)
	for index := 0; index < len(currentParts) || index < len(latestParts); index++ {
		left, right := 0, 0
		if index < len(currentParts) {
			left = currentParts[index]
		}
		if index < len(latestParts) {
			right = latestParts[index]
		}
		if left != right {
			if left > right {
				return 1
			}
			return -1
		}
	}
	return 0
}

func newerVersion(current, latest string) bool {
	return compareVersion(latest, current) > 0
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
