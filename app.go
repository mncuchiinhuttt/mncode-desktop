// Core App facade: workspace mounting, provider wiring, and agent turn control.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"mncode/pkg/browserctl"
	"mncode/pkg/codex"
	"mncode/pkg/config"
	"mncode/pkg/persistence"
	"mncode/pkg/provider"
	"mncode/pkg/remote"
)

type App struct {
	ctx context.Context

	mu                  sync.RWMutex
	session             *sessionRuntime
	automations         *automationStore
	automationSched     *automationScheduler
	automationMu        sync.Mutex
	automationRunning   bool
	automationRunID     string
	automationRunCancel context.CancelFunc
	workspace           WorkspaceInfo
	cancel              context.CancelFunc
	runSeq              uint64
	activeRun           uint64
	activeRunHadTool    bool
	terminalMu          sync.Mutex
	terminal            *terminalSession
	remoteMu            sync.Mutex
	remote              *remote.RemoteManager
	codexMu             sync.Mutex
	codexClient         *codex.Client
	powerToolsMu        sync.Mutex

	persistenceOnce  sync.Once
	persistenceStore *persistence.Store
	persistenceErr   error

	permissions map[string]chan bool
	questions   map[string]chan string
}

// NewApp builds the Wails-bound application facade with its runtime dependencies.
func NewApp() *App {
	store := newAutomationStore("")
	if path, err := automationsStorePath(); err == nil {
		store = newAutomationStore(path)
	}
	return &App{
		permissions:     make(map[string]chan bool),
		questions:       make(map[string]chan string),
		automations:     store,
		automationSched: newAutomationScheduler(),
	}
}

func (a *App) startup(ctx context.Context) {
	a.mu.Lock()
	a.ctx = ctx
	a.mu.Unlock()
	a.emit("app:ready", map[string]string{"version": "desktop-preview"})
	a.startAutomationScheduler()

	if workspace := defaultWorkspace(); workspace != "" {
		go func() { _, _ = a.OpenWorkspace(workspace) }()
	}
}

// GetWorkspace returns the workspace info for the currently open project.
func (a *App) GetWorkspace() WorkspaceInfo {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.workspace
}

// ChooseWorkspace opens the OS folder picker and mounts the chosen directory.
func (a *App) ChooseWorkspace() (WorkspaceInfo, error) {
	a.mu.RLock()
	ctx := a.ctx
	current := a.workspace.Path
	a.mu.RUnlock()
	if ctx == nil {
		return WorkspaceInfo{}, fmt.Errorf("desktop runtime is not ready")
	}

	path, err := runtime.OpenDirectoryDialog(ctx, runtime.OpenDialogOptions{
		Title:                "Open a coding workspace",
		DefaultDirectory:     current,
		CanCreateDirectories: false,
		ShowHiddenFiles:      true,
	})
	if err != nil || strings.TrimSpace(path) == "" {
		if err != nil {
			return a.GetWorkspace(), err
		}
		return a.GetWorkspace(), errors.New("workspace selection cancelled")
	}
	return a.OpenWorkspace(path)
}

// ChooseAttachment opens the OS file picker and returns the selected file path.
func (a *App) ChooseAttachment() (string, error) {
	a.mu.RLock()
	ctx := a.ctx
	current := a.workspace.Path
	a.mu.RUnlock()
	if ctx == nil {
		return "", fmt.Errorf("desktop runtime is not ready")
	}
	return runtime.OpenFileDialog(ctx, runtime.OpenDialogOptions{
		Title:            "Add attachment",
		DefaultDirectory: current,
		ShowHiddenFiles:  true,
		Filters: []runtime.FileFilter{
			{DisplayName: "Images and documents", Pattern: "*.png;*.jpg;*.jpeg;*.gif;*.webp;*.pdf;*.md;*.txt;*.go;*.ts;*.tsx;*.json"},
		},
	})
}

// OpenWorkspace mounts the directory at path as the active workspace.
func (a *App) OpenWorkspace(path string) (WorkspaceInfo, error) {
	a.powerToolsMu.Lock()
	defer a.powerToolsMu.Unlock()
	a.closeRemote()
	a.closeTerminal()
	a.mu.Lock()
	if a.cancel != nil {
		a.cancel()
	}
	a.cancel = nil
	a.activeRun = 0
	a.resolvePendingLocked()
	oldSession := a.session
	a.mu.Unlock()
	if oldSession != nil && oldSession.session != nil {
		if recorder := oldSession.session.DetachRecorder(); recorder != nil {
			if closer, ok := recorder.(interface{ Close(bool) error }); ok {
				_ = closer.Close(false)
			}
		}
		if oldSession.session.MCP != nil {
			oldSession.session.MCP.Close()
		}
		if oldSession.session.Tools != nil {
			_ = oldSession.session.Tools.Close()
		}
	}

	info, runtimeState, err := a.loadWorkspace(path)
	if err != nil {
		return WorkspaceInfo{}, err
	}

	a.mu.Lock()
	a.session = runtimeState
	a.workspace = info
	a.cancel = nil
	a.activeRun = 0
	a.mu.Unlock()

	a.emit("workspace:opened", info)
	return info, nil
}

// OpenStandaloneChat detaches from any workspace for workspace-free chat.
func (a *App) OpenStandaloneChat() (WorkspaceInfo, error) {
	a.powerToolsMu.Lock()
	defer a.powerToolsMu.Unlock()
	a.closeRemote()
	a.closeTerminal()
	a.mu.Lock()
	if a.cancel != nil {
		a.cancel()
	}
	a.cancel = nil
	a.activeRun = 0
	a.resolvePendingLocked()
	oldSession := a.session
	a.mu.Unlock()
	if oldSession != nil && oldSession.session != nil {
		if recorder := oldSession.session.DetachRecorder(); recorder != nil {
			if closer, ok := recorder.(interface{ Close(bool) error }); ok {
				_ = closer.Close(false)
			}
		}
		if oldSession.session.MCP != nil {
			oldSession.session.MCP.Close()
		}
		if oldSession.session.Tools != nil {
			_ = oldSession.session.Tools.Close()
		}

	}
	runtimeState, err := a.buildSession("")
	if err != nil {
		return WorkspaceInfo{}, err
	}
	info := WorkspaceInfo{}
	a.mu.Lock()
	a.session = runtimeState
	a.workspace = info
	a.cancel = nil
	a.activeRun = 0
	a.mu.Unlock()
	a.emit("workspace:opened", info)
	return info, nil
}

// ConfigureProvider wires a provider credential and model for this session.
func (a *App) ConfigureProvider(providerName, model, apiKey string) error {
	key := strings.TrimSpace(apiKey)
	if key == "" {
		return fmt.Errorf("an API key is required")
	}
	providerType := config.ProviderType(strings.ToLower(strings.TrimSpace(providerName)))
	if !validProvider(providerType) {
		return fmt.Errorf("unsupported provider: %s", providerName)
	}

	a.mu.Lock()
	if a.session == nil {
		a.mu.Unlock()
		return fmt.Errorf("open a workspace before configuring a provider")
	}

	cfg := a.session.session.Config
	cfg.Provider = providerType
	cfg.Model = strings.TrimSpace(model)
	cfg.APIKey = key
	configured, err := provider.NewProvider(cfg)
	if err != nil {
		a.mu.Unlock()
		return err
	}
	a.session.session.Provider = configured
	configuredPayload := map[string]string{
		"provider": string(cfg.Provider),
		"model":    cfg.Model,
	}
	a.mu.Unlock()
	a.emit("provider:configured", configuredPayload)
	return nil
}

// SetModel switches the active model on the current provider.
func (a *App) SetModel(model string) error {
	model = strings.TrimSpace(model)
	if model == "" {
		return fmt.Errorf("model cannot be empty")
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.session == nil {
		return fmt.Errorf("open a workspace before selecting a model")
	}
	a.session.session.Config.Model = model
	return nil
}

// SendPrompt starts an agent turn with the given prompt.
func (a *App) SendPrompt(prompt string) error {
	text := strings.TrimSpace(prompt)
	if text == "" {
		return fmt.Errorf("prompt cannot be empty")
	}

	a.mu.RLock()
	hasSession := a.session != nil
	a.mu.RUnlock()
	if !hasSession {
		if _, err := a.OpenStandaloneChat(); err != nil {
			return fmt.Errorf("could not start standalone chat: %w", err)
		}
	}

	a.mu.Lock()
	if a.activeRun != 0 {
		a.mu.Unlock()
		return fmt.Errorf("an agent turn is already running")
	}
	if a.session.session.IsExecuting() {
		a.mu.Unlock()
		return fmt.Errorf("an agent turn is already running")
	}
	if a.session.session.Provider == nil && len(a.session.session.Accounts.Accounts) == 0 {
		a.mu.Unlock()
		return fmt.Errorf("configure a provider before sending a prompt")
	}
	ctx, cancel := context.WithCancel(context.Background())
	a.runSeq++
	runID := a.runSeq
	a.activeRun = runID
	a.activeRunHadTool = false
	a.cancel = cancel
	session := a.session.session
	session.UI = newDesktopUI(a, session.WorkspaceDir, runID)
	a.mu.Unlock()

	go func() {
		a.emit("agent:start", map[string]interface{}{"prompt": text, "runID": runID})
		holdKeepAwake := a.keepAwakeEnabled()
		if holdKeepAwake {
			a.automationSched.keepAwake.acquire()
		}
		err := session.ProcessUserInput(ctx, text)
		if holdKeepAwake {
			a.automationSched.keepAwake.release()
		}
		a.mu.Lock()
		isCurrent := a.activeRun == runID
		toolAssisted := a.activeRunHadTool
		if isCurrent {
			a.cancel = nil
			a.activeRun = 0
			a.activeRunHadTool = false
		}
		a.mu.Unlock()
		if !isCurrent {
			return
		}
		a.captureMemoryPrompt(text, toolAssisted)
		if err != nil {
			a.emit("agent:error", map[string]interface{}{"message": err.Error(), "runID": runID})
		} else {
			a.emit("agent:done", map[string]interface{}{"message": "Turn completed", "runID": runID})
		}
	}()
	return nil
}

// SteerPrompt queues a steering directive into the running turn.
func (a *App) SteerPrompt(prompt string) error {
	a.mu.RLock()
	session := a.session
	runID := a.activeRun
	a.mu.RUnlock()
	if session == nil {
		return fmt.Errorf("open a workspace first")
	}
	session.session.EnqueueSteer(prompt)
	a.emit("agent:steer", map[string]interface{}{"prompt": strings.TrimSpace(prompt), "runID": runID})
	return nil
}

// CancelTurn interrupts the in-flight agent turn, if any.
func (a *App) CancelTurn() {
	a.mu.Lock()
	runID := a.activeRun
	if a.cancel != nil {
		a.cancel()
		a.cancel = nil
	}
	a.resolvePendingLocked()
	a.mu.Unlock()
	if runID != 0 {
		a.emit("agent:cancelled", map[string]interface{}{"runID": runID})
	}
}

func (a *App) shutdown(_ context.Context) {
	a.stopAutomationScheduler()
	a.closeRemote()
	a.closeTerminal()
	_ = browserctl.CloseShared()
	a.mu.Lock()
	if a.cancel != nil {
		a.cancel()
	}
	a.cancel = nil
	a.activeRun = 0
	a.resolvePendingLocked()
	oldSession := a.session
	a.session = nil
	store := a.persistenceStore
	a.mu.Unlock()
	a.codexMu.Lock()
	codexClient := a.codexClient
	a.codexClient = nil
	a.codexMu.Unlock()
	if codexClient != nil {
		_ = codexClient.Close()
	}
	if oldSession != nil && oldSession.session != nil && oldSession.session.MCP != nil {
		oldSession.session.MCP.Close()
	}
	if oldSession != nil && oldSession.session != nil && oldSession.session.Tools != nil {
		_ = oldSession.session.Tools.Close()
	}
	if store != nil {
		_ = store.Close()
	}
}

func (a *App) resolvePendingLocked() {
	for id, response := range a.permissions {
		delete(a.permissions, id)
		response <- false
	}
	for id, response := range a.questions {
		delete(a.questions, id)
		response <- "User skipped this question."
	}
}

func (a *App) emit(name string, payload interface{}) {
	a.mu.RLock()
	ctx := a.ctx
	a.mu.RUnlock()
	if ctx != nil {
		runtime.EventsEmit(ctx, name, payload)
	}
}

// keepAwakeEnabled reports the user's keep-awake preference.
func (a *App) keepAwakeEnabled() bool {
	if a.automations == nil {
		return false
	}
	return a.automations.getKeepAwake()
}

func validProvider(providerType config.ProviderType) bool {
	switch providerType {
	case config.ProviderAnthropic, config.ProviderOpenAI, config.ProviderGemini,
		config.ProviderOpenRouter, config.ProviderOpenCode, config.ProviderAntigravity,
		config.ProviderCustom:
		return true
	default:
		return false
	}
}

func defaultWorkspace() string {
	if configured := strings.TrimSpace(os.Getenv("MNCODE_WORKSPACE")); configured != "" {
		return configured
	}
	cwd, err := os.Getwd()
	if err != nil {
		return ""
	}
	if filepath.Base(cwd) == "mncode-desktop" {
		candidate := filepath.Join(filepath.Dir(cwd), "mncode-cli")
		if info, statErr := os.Stat(candidate); statErr == nil && info.IsDir() {
			return candidate
		}
	}
	return ""
}

func (a *App) canonicalPersistence() (*persistence.Store, error) {
	a.persistenceOnce.Do(func() {
		a.persistenceStore, a.persistenceErr = persistence.Open(context.Background(), persistence.StoreConfig{Profile: "default"})
	})
	return a.persistenceStore, a.persistenceErr
}

// MigrateLegacyLocalStorage imports the Desktop's old browser state into the
// canonical store. The source is backed up first and remains untouched.
func (a *App) MigrateLegacyLocalStorage(input DesktopMigrationInput) (DesktopMigrationReport, error) {
	store, err := a.canonicalPersistence()
	if err != nil {
		return DesktopMigrationReport{Status: "failed", RecoveryStatus: "unavailable"}, err
	}
	automationJSON := strings.TrimSpace(input.AutomationJSON)
	if automationJSON == "" {
		if path, pathErr := automationsStorePath(); pathErr == nil {
			if data, readErr := os.ReadFile(path); readErr == nil {
				automationJSON = string(data)
			}
		}
	}
	return migrateDesktopLocalStorage(context.Background(), store, input.ChatJSON, input.NotesJSON, automationJSON, input.WorkspaceDir, filepath.Dir(storePathForProfile("default")))
}

func storePathForProfile(profile string) string {
	path, _ := persistence.DefaultPath(profile)
	return path
}

type desktopMigrationSource struct {
	Chat       json.RawMessage `json:"chat,omitempty"`
	Notes      json.RawMessage `json:"notes,omitempty"`
	Automation json.RawMessage `json:"automation,omitempty"`
}

type legacyChat struct {
	ID        string            `json:"id"`
	Title     string            `json:"title"`
	ChatID    string            `json:"chatId"`
	RunID     string            `json:"runId"`
	Model     string            `json:"model"`
	Provider  string            `json:"provider"`
	Messages  []json.RawMessage `json:"messages"`
	CreatedAt json.RawMessage   `json:"createdAt"`
	UpdatedAt json.RawMessage   `json:"updatedAt"`
}

type legacyMessage struct {
	ID        string          `json:"id"`
	Role      string          `json:"role"`
	Content   string          `json:"content"`
	Thinking  string          `json:"thinking"`
	CreatedAt json.RawMessage `json:"timestamp"`
}

func migrateDesktopLocalStorage(ctx context.Context, store *persistence.Store, chatJSON, notesJSON, automationJSON, workspace, backupDir string) (DesktopMigrationReport, error) {
	trim := func(value string) json.RawMessage {
		value = strings.TrimSpace(value)
		if value == "" {
			return nil
		}
		return json.RawMessage(value)
	}
	source, err := json.Marshal(desktopMigrationSource{Chat: trim(chatJSON), Notes: trim(notesJSON), Automation: trim(automationJSON)})
	if err != nil {
		return DesktopMigrationReport{Status: "failed", RecoveryStatus: "unavailable"}, err
	}
	fingerprint := persistence.Fingerprint(source)
	markerID := "desktop-localstorage:" + fingerprint
	report := DesktopMigrationReport{Status: "started", SourceFingerprint: fingerprint, SourceHash: fingerprint}
	marker := persistence.MigrationMarker{ID: markerID, SourceFingerprint: fingerprint, Status: "started", SourceHash: fingerprint}
	if existing, getErr := store.GetMigration(ctx, markerID); getErr == nil {
		if existing.Status == "complete" {
			return migrationReport(existing, true), nil
		}
		marker = existing
		marker.Status = "started"
	} else if getErr != persistence.ErrNotFound {
		return report, getErr
	}
	if err := store.PutMigration(ctx, marker); err != nil {
		return report, err
	}
	backupPath, backupStatus, err := writeDesktopMigrationBackup(backupDir, fingerprint, source)
	if err != nil {
		marker.Status = "failed"
		_ = store.PutMigration(ctx, marker)
		report.Status, report.BackupStatus, report.RecoveryStatus = "failed", "failed", "available"
		return report, err
	}
	report.BackupPath, report.BackupStatus, report.RecoveryStatus = backupPath, backupStatus, "available"
	records, err := decodeDesktopMigrationRecords(source, workspace)
	if err != nil {
		marker.Status = "failed"
		marker.BackupPath = backupPath
		_ = store.PutMigration(ctx, marker)
		report.Status = "failed"
		return report, err
	}
	marker.SourceCount = len(records)
	report.SourceCount = len(records)
	for index, record := range records {
		if err := store.SaveSession(ctx, record); err != nil {
			marker.Status = "failed"
			marker.BackupPath = backupPath
			marker.ImportedCount = index
			_ = store.PutMigration(ctx, marker)
			report.Status, report.ImportedCount = "failed", index
			return report, err
		}
	}
	marker.Status, marker.BackupPath = "complete", backupPath
	marker.ImportedCount = len(records)
	marker.ImportedHash = persistence.StableSessionHash(records)
	marker.CompletedAt = time.Now().UTC()
	if err := store.PutMigration(ctx, marker); err != nil {
		report.Status = "failed"
		return report, err
	}
	return migrationReport(marker, false), nil
}

func migrationReport(marker persistence.MigrationMarker, already bool) DesktopMigrationReport {
	status := marker.Status
	recovery := "available"
	if marker.BackupPath == "" {
		recovery = "unavailable"
	}
	backupStatus := "created"
	if already {
		backupStatus = "existing"
	}
	return DesktopMigrationReport{
		Status: status, AlreadyImported: already, SourceFingerprint: marker.SourceFingerprint,
		SourceCount: marker.SourceCount, ImportedCount: marker.ImportedCount,
		SourceHash: marker.SourceHash, ImportedHash: marker.ImportedHash,
		BackupPath: marker.BackupPath, BackupStatus: backupStatus,
		RecoveryStatus: recovery,
	}
}

func writeDesktopMigrationBackup(dir, fingerprint string, source []byte) (string, string, error) {
	if dir == "" {
		return "", "failed", fmt.Errorf("migration backup directory is required")
	}
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return "", "failed", err
	}
	path := filepath.Join(dir, "desktop-localstorage-"+fingerprint+".json")
	if existing, err := os.ReadFile(path); err == nil {
		if string(existing) != string(source) {
			return "", "failed", fmt.Errorf("migration backup fingerprint collision")
		}
		return path, "existing", nil
	}
	tmp, err := os.CreateTemp(dir, ".desktop-localstorage-*")
	if err != nil {
		return "", "failed", err
	}
	tmpPath := tmp.Name()
	defer os.Remove(tmpPath)
	if err = tmp.Chmod(0o600); err == nil {
		_, err = tmp.Write(source)
	}
	if err == nil {
		err = tmp.Sync()
	}
	if closeErr := tmp.Close(); err == nil {
		err = closeErr
	}
	if err == nil {
		err = os.Rename(tmpPath, path)
	}
	if err != nil {
		return "", "failed", err
	}
	return path, "created", os.Chmod(path, 0o600)
}

func decodeDesktopMigrationRecords(source []byte, workspace string) ([]persistence.SessionRecord, error) {
	var payload desktopMigrationSource
	if err := json.Unmarshal(source, &payload); err != nil {
		return nil, err
	}
	var records []persistence.SessionRecord
	if len(payload.Chat) != 0 {
		var chats []legacyChat
		if err := json.Unmarshal(payload.Chat, &chats); err != nil {
			return nil, fmt.Errorf("decode chat history: %w", err)
		}
		for index, chat := range chats {
			raw := payload.Chat
			var rawChats []json.RawMessage
			_ = json.Unmarshal(payload.Chat, &rawChats)
			if index < len(rawChats) {
				raw = rawChats[index]
			}
			id := strings.TrimSpace(chat.ID)
			if id == "" {
				id = "legacy-chat:" + persistence.Fingerprint(raw)
			}
			updated := legacyTime(chat.UpdatedAt)
			if updated.IsZero() {
				updated = time.Unix(0, 1).UTC()
			}
			created := legacyTime(chat.CreatedAt)
			if created.IsZero() {
				created = updated
			}
			record := persistence.SessionRecord{
				ID: id, Title: strings.TrimSpace(chat.Title), WorkspaceDir: workspace, ProfileID: "default",
				ChatID: strings.TrimSpace(chat.ChatID), RunID: strings.TrimSpace(chat.RunID),
				Model: strings.TrimSpace(chat.Model), Provider: strings.TrimSpace(chat.Provider),
				CreatedAt: created, UpdatedAt: updated,
			}
			for messageIndex, messageRaw := range chat.Messages {
				var message legacyMessage
				if err := json.Unmarshal(messageRaw, &message); err != nil {
					return nil, fmt.Errorf("decode chat message: %w", err)
				}
				role := strings.TrimSpace(message.Role)
				if role != "user" && role != "assistant" && role != "system" {
					role = "system"
				}
				messageID := strings.TrimSpace(message.ID)
				if messageID == "" {
					messageID = fmt.Sprintf("%s:%d", id, messageIndex)
				}
				createdAt := legacyTime(message.CreatedAt)
				if createdAt.IsZero() {
					createdAt = updated
				}
				record.Messages = append(record.Messages, persistence.MessageRecord{
					ID: messageID, Sequence: messageIndex, Role: role, Content: message.Content,
					Thinking: message.Thinking, Payload: append(json.RawMessage(nil), messageRaw...), CreatedAt: createdAt,
				})
			}
			if record.Title == "" {
				for _, message := range record.Messages {
					if message.Role == "user" && strings.TrimSpace(message.Content) != "" {
						record.Title = strings.TrimSpace(message.Content)
						break
					}
				}
			}
			records = append(records, record)
		}
	}
	if len(payload.Notes) != 0 {
		var notes []json.RawMessage
		if err := json.Unmarshal(payload.Notes, &notes); err != nil {
			var envelope struct {
				Notes []json.RawMessage `json:"notes"`
			}
			if envelopeErr := json.Unmarshal(payload.Notes, &envelope); envelopeErr != nil {
				return nil, fmt.Errorf("decode notes: %w", err)
			}
			notes = envelope.Notes
			if len(notes) == 0 {
				notes = []json.RawMessage{append(json.RawMessage(nil), payload.Notes...)}
			}
		}
		for _, raw := range notes {
			content := strings.TrimSpace(string(raw))
			var text string
			if json.Unmarshal(raw, &text) == nil {
				content = text
			}
			id := "legacy-note:" + persistence.Fingerprint(raw)
			records = append(records, persistence.SessionRecord{
				ID: id, Title: "Imported note", WorkspaceDir: workspace, ProfileID: "default", ChatID: id,
				CreatedAt: time.Unix(0, 1).UTC(), UpdatedAt: time.Unix(0, 1).UTC(),
				Messages: []persistence.MessageRecord{{ID: id + ":0", Sequence: 0, Role: "user", Content: content, Payload: append(json.RawMessage(nil), raw...), CreatedAt: time.Unix(0, 1).UTC()}},
			})
		}
	}
	if len(payload.Automation) != 0 {
		var envelope struct {
			Automations []json.RawMessage `json:"automations"`
		}
		if err := json.Unmarshal(payload.Automation, &envelope); err != nil {
			var automations []json.RawMessage
			if arrayErr := json.Unmarshal(payload.Automation, &automations); arrayErr != nil {
				return nil, fmt.Errorf("decode automations: %w", err)
			}
			envelope.Automations = automations
		}
		for _, raw := range envelope.Automations {
			var automation struct {
				ID        string `json:"id"`
				Name      string `json:"name"`
				Prompt    string `json:"prompt"`
				Workspace string `json:"workspace"`
			}
			if err := json.Unmarshal(raw, &automation); err != nil {
				return nil, fmt.Errorf("decode automation: %w", err)
			}
			id := strings.TrimSpace(automation.ID)
			if id == "" {
				id = persistence.Fingerprint(raw)
			}
			id = "legacy-automation:" + id
			automationWorkspace := strings.TrimSpace(automation.Workspace)
			if automationWorkspace == "" {
				automationWorkspace = workspace
			}
			records = append(records, persistence.SessionRecord{
				ID: id, Title: strings.TrimSpace(automation.Name), WorkspaceDir: automationWorkspace, ProfileID: "default", ChatID: id,
				CreatedAt: time.Unix(0, 1).UTC(), UpdatedAt: time.Unix(0, 1).UTC(),
				Messages: []persistence.MessageRecord{{ID: id + ":0", Sequence: 0, Role: "system", Content: automation.Prompt, Payload: append(json.RawMessage(nil), raw...), CreatedAt: time.Unix(0, 1).UTC()}},
			})
		}
	}
	return records, nil
}

func legacyTime(raw json.RawMessage) time.Time {
	if len(raw) == 0 || string(raw) == "null" {
		return time.Time{}
	}
	var text string
	if json.Unmarshal(raw, &text) == nil {
		if parsed, err := time.Parse(time.RFC3339Nano, text); err == nil {
			return parsed.UTC()
		}
		var number float64
		if _, err := fmt.Sscan(text, &number); err == nil {
			return legacyUnix(number)
		}
		return time.Time{}
	}
	var number float64
	if json.Unmarshal(raw, &number) == nil {
		return legacyUnix(number)
	}
	return time.Time{}
}

func legacyUnix(value float64) time.Time {
	if value > 1e11 {
		return time.UnixMilli(int64(value)).UTC()
	}
	return time.Unix(int64(value), int64((value-float64(int64(value)))*1e9)).UTC()
}
