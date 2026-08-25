// Automation CRUD surface for the UI: validation, persistence, and change
// events. Scheduling and execution live in automation_scheduler.go /
// automation_runner.go.
package main

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/robfig/cron/v3"
)

// AutomationInput is the create/update payload from the frontend.
type AutomationInput struct {
	Name      string `json:"name"`
	Prompt    string `json:"prompt"`
	Kind      string `json:"kind"`
	Schedule  string `json:"schedule"`
	Workspace string `json:"workspace"`
	Enabled   bool   `json:"enabled"`
}

// automationCronParser accepts standard 5-field cron specs plus @descriptors
// ("@daily", "@every 1h").
var automationCronParser = cron.NewParser(
	cron.Minute | cron.Hour | cron.Dom | cron.Month | cron.Dow | cron.Descriptor,
)

func (a *App) automationStoreOrDefault() *automationStore {
	if a.automations == nil {
		path, err := automationsStorePath()
		if err != nil {
			path = "automations.json"
		}
		a.automations = newAutomationStore(path)
	}
	return a.automations
}

// ListAutomations returns every stored automation for the UI.
func (a *App) ListAutomations() []Automation {
	return a.automationStoreOrDefault().list()
}

// CreateAutomation validates the input, persists a new automation, and emits
// the change event.
func (a *App) CreateAutomation(input AutomationInput) (Automation, error) {
	automation, err := newAutomationFromInput(input)
	if err != nil {
		return Automation{}, err
	}
	if err := a.automationStoreOrDefault().create(automation); err != nil {
		return Automation{}, err
	}
	a.emit("automation:updated", nil)
	a.resyncAutomations()
	return automation, nil
}

// UpdateAutomation applies the input to an existing automation.
func (a *App) UpdateAutomation(id string, input AutomationInput) (Automation, error) {
	automation, err := newAutomationFromInput(input)
	if err != nil {
		return Automation{}, err
	}
	err = a.automationStoreOrDefault().update(id, func(existing *Automation) {
		keep := *existing
		automation.ID = id
		automation.CreatedAt = keep.CreatedAt
		automation.LastRunAt = keep.LastRunAt
		automation.RunCount = keep.RunCount
		automation.Runs = keep.Runs
		*existing = automation
	})
	if err != nil {
		return Automation{}, fmt.Errorf("automation not found")
	}
	a.emit("automation:updated", nil)
	a.resyncAutomations()
	updated, _ := a.automationStoreOrDefault().get(id)
	return updated, nil
}

// DeleteAutomation removes an automation and emits the change event.
func (a *App) DeleteAutomation(id string) error {
	if strings.TrimSpace(id) == "" {
		return fmt.Errorf("automation id is required")
	}
	if err := a.automationStoreOrDefault().delete(id); err != nil {
		return fmt.Errorf("automation not found")
	}
	a.automationMu.Lock()
	runCancel := a.automationRunCancel
	isRunning := a.automationRunning && a.automationRunID == id
	a.automationMu.Unlock()
	if isRunning && runCancel != nil {
		runCancel()
	}
	a.emit("automation:updated", nil)
	a.resyncAutomations()
	return nil
}

// ToggleAutomation flips the enabled flag without touching other fields.
func (a *App) ToggleAutomation(id string, enabled bool) error {
	err := a.automationStoreOrDefault().update(id, func(existing *Automation) {
		existing.Enabled = enabled
	})
	if err != nil {
		return fmt.Errorf("automation not found")
	}
	a.emit("automation:updated", nil)
	a.resyncAutomations()
	return nil
}

// RunAutomationNow triggers an immediate manual run of one automation.
func (a *App) RunAutomationNow(id string) error {
	automation, ok := a.automationStoreOrDefault().get(id)
	if !ok {
		return fmt.Errorf("automation not found")
	}
	if a.automationRunActive() {
		return fmt.Errorf("another automation is already running")
	}
	if a.interactiveTurnActive() {
		return fmt.Errorf("wait for the current agent turn to finish first")
	}
	go func() {
		defer func() {
			if recovered := recover(); recovered != nil {
				a.recordAutomationFailure(automation, "manual", fmt.Errorf("automation panicked: %v", recovered))
			}
		}()
		a.runAutomation(automation, "manual")
	}()
	return nil
}

// ReadAutomationLog returns the transcript of one stored run. The path must
// point at a markdown log inside ~/.mncode/automation-runs.
func (a *App) ReadAutomationLog(path string) (string, error) {
	clean := filepath.Clean(strings.TrimSpace(path))
	root, err := filepath.Abs(automationRunsRoot())
	if err != nil {
		return "", err
	}
	absPath, err := filepath.Abs(clean)
	if err != nil {
		return "", err
	}
	if !strings.HasPrefix(absPath, root+string(filepath.Separator)) || !strings.HasSuffix(absPath, ".md") {
		return "", fmt.Errorf("invalid log path")
	}
	raw, err := os.ReadFile(absPath)
	if err != nil {
		return "", fmt.Errorf("log file not found")
	}
	return string(raw), nil
}

// SetKeepAwake persists the keep-awake preference for interactive chats.
func (a *App) SetKeepAwake(enabled bool) error {
	return a.automationStoreOrDefault().setKeepAwake(enabled)
}

// GetKeepAwake returns the keep-awake preference.
func (a *App) GetKeepAwake() bool {
	return a.automationStoreOrDefault().getKeepAwake()
}

func newAutomationFromInput(input AutomationInput) (Automation, error) {
	name := strings.TrimSpace(input.Name)
	prompt := strings.TrimSpace(input.Prompt)
	kind := strings.TrimSpace(input.Kind)
	schedule := strings.TrimSpace(input.Schedule)

	if name == "" || len(name) > 80 {
		return Automation{}, fmt.Errorf("automation name must be 1-80 characters")
	}
	if prompt == "" || len(prompt) > 20000 {
		return Automation{}, fmt.Errorf("automation prompt must be 1-20000 characters")
	}
	if kind != AutomationKindScheduled && kind != AutomationKindIdle {
		return Automation{}, fmt.Errorf("automation kind must be scheduled or idle")
	}
	if kind == AutomationKindScheduled {
		if schedule == "" {
			return Automation{}, fmt.Errorf("scheduled automations require a cron schedule")
		}
		if _, err := automationCronParser.Parse(schedule); err != nil {
			return Automation{}, fmt.Errorf("invalid cron schedule: %v", err)
		}
	}

	return Automation{
		ID:        newAutomationID(),
		Name:      name,
		Prompt:    prompt,
		Kind:      kind,
		Schedule:  schedule,
		Workspace: strings.TrimSpace(input.Workspace),
		Enabled:   input.Enabled,
		CreatedAt: timeNowMillis(),
		Runs:      []AutomationRun{},
	}, nil
}

func newAutomationID() string {
	raw := make([]byte, 6)
	if _, err := rand.Read(raw); err != nil {
		return fmt.Sprintf("auto-%d", timeNowMillis())
	}
	return "auto-" + hex.EncodeToString(raw)
}

func timeNowMillis() int64 {
	return timeNow().UnixMilli()
}
