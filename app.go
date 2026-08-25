// Core App facade: workspace mounting, provider wiring, and agent turn control.
package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"mncode/pkg/config"
	"mncode/pkg/provider"
	"mncode/pkg/remote"
)

// App is the Wails facade. The frontend talks to this small surface while the
// existing mncode agent remains responsible for provider and tool execution.
type App struct {
	ctx context.Context

	mu                  sync.RWMutex
	session             *sessionRuntime
	automations         *automationStore
	automationSched     *automationScheduler
	automationMu        sync.Mutex
	automationRunning   bool
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
	if oldSession != nil && oldSession.session.MCP != nil {
		oldSession.session.MCP.Close()
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
	if oldSession != nil && oldSession.session.MCP != nil {
		oldSession.session.MCP.Close()
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
	a.mu.Unlock()

	go func() {
		a.emit("agent:start", map[string]string{"prompt": text})
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
			a.emit("agent:error", map[string]string{"message": err.Error()})
		} else {
			a.emit("agent:done", map[string]string{"message": "Turn completed"})
		}
	}()
	return nil
}

// SteerPrompt queues a steering directive into the running turn.
func (a *App) SteerPrompt(prompt string) error {
	a.mu.RLock()
	session := a.session
	a.mu.RUnlock()
	if session == nil {
		return fmt.Errorf("open a workspace first")
	}
	session.session.EnqueueSteer(prompt)
	a.emit("agent:steer", map[string]string{"prompt": strings.TrimSpace(prompt)})
	return nil
}

// CancelTurn interrupts the in-flight agent turn, if any.
func (a *App) CancelTurn() {
	a.mu.Lock()
	if a.cancel != nil {
		a.cancel()
		a.cancel = nil
	}
	a.activeRun = 0
	a.resolvePendingLocked()
	a.mu.Unlock()
	a.emit("agent:cancelled", map[string]string{"message": "Turn cancelled"})
}

func (a *App) shutdown(_ context.Context) {
	a.stopAutomationScheduler()
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
	a.session = nil
	a.mu.Unlock()
	if oldSession != nil && oldSession.session.MCP != nil {
		oldSession.session.MCP.Close()
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
