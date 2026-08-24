// Phone companion remote session management and pairing.
package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"runtime"
	"strings"
	"time"

	qrcode "github.com/skip2/go-qrcode"
	"mncode/pkg/remote"
)

const remoteCompanionTTL = 8 * time.Second

type remoteServerSession struct {
	Status                 string `json:"status"`
	CompanionDeviceID      string `json:"companion_device_id"`
	CompanionDeviceName    string `json:"companion_device_name"`
	CompanionDeviceOS      string `json:"companion_device_os"`
	CompanionLastHeartbeat int64  `json:"companion_last_heartbeat"`
}

// StartRemoteSession opens (or reuses) the phone companion session and returns
// its pairing info.
func (a *App) StartRemoteSession() (DesktopRemoteSession, error) {
	cfg, _, err := a.providerConfig()
	if err != nil {
		return DesktopRemoteSession{}, err
	}
	a.mu.RLock()
	workspaceReady := a.workspace.Ready
	workspaceName := a.workspace.Name
	if workspaceName == "" {
		workspaceName = "mncode-workspace"
	}
	current := a.session
	a.mu.RUnlock()
	if !workspaceReady || current == nil || current.session == nil {
		return DesktopRemoteSession{}, fmt.Errorf("open a workspace before starting remote companion")
	}

	a.remoteMu.Lock()
	existingManager := a.remote
	a.remoteMu.Unlock()
	if existingManager != nil {
		existingManager.Mu.RLock()
		active := existingManager.IsActive
		existingManager.Mu.RUnlock()
		if active {
			return a.GetRemoteSession(), nil
		}
	}

	serverURL := cfg.GetSetting("remote_server_url", "")
	if serverURL == "" {
		serverURL = cfg.GetWebBaseURL()
	}
	manager := remote.NewRemoteManager(serverURL, cfg.APIKey)
	manager.OnSteer = func(prompt string) { a.handleRemoteSteer(prompt) }
	manager.OnAction = func(answer string) { a.answerLatestQuestion(answer) }
	manager.OnCancel = func() { a.CancelTurn() }
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if _, err := manager.InitSession(ctx, workspaceName); err != nil {
		return DesktopRemoteSession{}, err
	}

	a.remoteMu.Lock()
	a.remote = manager
	a.remoteMu.Unlock()
	a.mu.Lock()
	if current != nil && current.session != nil {
		current.session.Remote = manager
	}
	a.mu.Unlock()
	return a.GetRemoteSession(), nil
}

// GetRemoteSession returns the current companion session state.
func (a *App) GetRemoteSession() DesktopRemoteSession {
	a.remoteMu.Lock()
	manager := a.remote
	a.remoteMu.Unlock()
	if manager == nil {
		return DesktopRemoteSession{Devices: []DesktopRemoteDevice{}}
	}

	manager.Mu.RLock()
	active := manager.IsActive
	session := manager.Session
	serverURL := manager.ServerURL
	manager.Mu.RUnlock()
	if !active || session == nil {
		return DesktopRemoteSession{Devices: []DesktopRemoteDevice{}}
	}
	devices := []DesktopRemoteDevice{{
		ID:       "desktop-" + strings.ToLower(session.SessionID),
		Name:     "This Mac",
		Platform: runtime.GOOS + "/" + runtime.GOARCH,
		Status:   "Host",
	}}
	status := remoteServerSessionStatus(serverURL, session.SessionID)
	if status.CompanionDeviceID != "" && time.Since(time.UnixMilli(status.CompanionLastHeartbeat)) < remoteCompanionTTL {
		devices = append(devices, DesktopRemoteDevice{
			ID:       status.CompanionDeviceID,
			Name:     status.CompanionDeviceName,
			Platform: status.CompanionDeviceOS,
			Status:   "Connected",
		})
	}
	state := "Waiting for phone"
	if len(devices) > 1 {
		state = "Phone connected"
	}
	qr, _ := remoteQRCode(session.PairingURL)
	return DesktopRemoteSession{
		Active:           true,
		SessionID:        session.SessionID,
		PairingURL:       session.PairingURL,
		QRCode:           qr,
		Status:           state,
		ConnectedDevices: len(devices),
		Devices:          devices,
	}
}

// StopRemoteSession tears down the phone companion session.
func (a *App) StopRemoteSession() {
	a.closeRemote()
}

func (a *App) activeRemoteManager() *remote.RemoteManager {
	a.remoteMu.Lock()
	manager := a.remote
	a.remoteMu.Unlock()
	if manager == nil {
		return nil
	}
	manager.Mu.RLock()
	active := manager.IsActive
	manager.Mu.RUnlock()
	if !active {
		return nil
	}
	return manager
}

func (a *App) closeRemote() {
	a.remoteMu.Lock()
	manager := a.remote
	a.remote = nil
	a.remoteMu.Unlock()
	if manager == nil {
		return
	}
	a.mu.Lock()
	if a.session != nil && a.session.session != nil && a.session.session.Remote == manager {
		a.session.session.Remote = nil
	}
	a.mu.Unlock()
	manager.Close()
	a.emit("remote:closed", map[string]string{"message": "Remote companion disconnected"})
}

func (a *App) handleRemoteSteer(prompt string) {
	prompt = strings.TrimSpace(prompt)
	if prompt == "" {
		return
	}
	a.mu.RLock()
	running := a.activeRun != 0
	if a.session != nil && a.session.session != nil {
		running = running || a.session.session.IsExecuting()
	}
	a.mu.RUnlock()
	if running {
		_ = a.SteerPrompt(prompt)
		return
	}
	_ = a.SendPrompt(prompt)
}

func (a *App) answerLatestQuestion(answer string) {
	a.mu.Lock()
	for id, response := range a.questions {
		delete(a.questions, id)
		a.mu.Unlock()
		response <- strings.TrimSpace(answer)
		return
	}
	a.mu.Unlock()
}

func remoteQRCode(pairingURL string) (string, error) {
	png, err := qrcode.Encode(pairingURL, qrcode.Medium, 320)
	if err != nil {
		return "", err
	}
	return "data:image/png;base64," + base64.StdEncoding.EncodeToString(png), nil
}

func remoteServerSessionStatus(serverURL, sessionID string) remoteServerSession {
	client := &httpClientWithTimeout{}
	response, err := client.get(fmt.Sprintf("%s/api/remote/session?id=%s", strings.TrimRight(serverURL, "/"), url.QueryEscape(sessionID)))
	if err != nil {
		return remoteServerSession{}
	}
	defer response.Body.Close()
	var payload struct {
		Success bool                `json:"success"`
		Session remoteServerSession `json:"session"`
	}
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil || !payload.Success {
		return remoteServerSession{}
	}
	return payload.Session
}

type httpClientWithTimeout struct{}

func (c *httpClientWithTimeout) get(endpoint string) (*http.Response, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	return http.DefaultClient.Do(req)
}
