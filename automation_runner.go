// Runner: executes an automation as a headless agent turn, records history,
// writes the transcript log, and serializes against interactive turns.
package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"mncode/pkg/agent"
)

// startAutomationScheduler boots the cron loop and idle dispatcher. Called
// from startup once the Wails context is available.
func (a *App) startAutomationScheduler() {
	a.markMissedAutomations()
	a.automationSched.start(func(id string, trigger string) {
		if trigger == "idle-tick" {
			a.dispatchIdleAutomations()
			return
		}
		a.triggerAutomation(id, trigger)
	})
	a.resyncAutomations()
}

// stopAutomationScheduler halts scheduling and cancels any in-flight run.
func (a *App) stopAutomationScheduler() {
	a.automationSched.stop()
	a.automationMu.Lock()
	cancel := a.automationRunCancel
	a.automationRunCancel = nil
	a.automationMu.Unlock()
	if cancel != nil {
		cancel()
	}
}

// markMissedAutomations records a skipped entry for scheduled runs whose fire
// time passed while the app was closed. v1 policy: no catch-up execution.
func (a *App) markMissedAutomations() {
	now := timeNow()
	for _, automation := range a.automationStoreOrDefault().list() {
		if !automation.Enabled || automation.Kind != AutomationKindScheduled {
			continue
		}
		if automation.NextRunAt > 0 && automation.NextRunAt < now.UnixMilli() {
			_ = a.automationStoreOrDefault().appendRun(automation.ID, AutomationRun{
				StartedAt: automation.NextRunAt,
				Status:    "skipped",
				Detail:    "missed: the app was closed at the scheduled time",
			})
		}
	}
}

// dispatchIdleAutomations runs due idle-time automations, newest consideration
// first. Busy states skip silently (no history spam) and surface as a
// "waiting" status event instead.
func (a *App) dispatchIdleAutomations() {
	now := timeNow()
	for _, automation := range a.automationStoreOrDefault().list() {
		if !automation.Enabled || automation.Kind != AutomationKindIdle {
			continue
		}
		if !idleDue(automation.LastRunAt, now) {
			continue
		}
		if a.interactiveTurnActive() {
			a.emit("automation:run", map[string]any{"id": automation.ID, "status": "waiting"})
			continue
		}
		a.triggerAutomation(automation.ID, "idle")
		return // one idle run per tick
	}
}

// triggerAutomation launches a run in the background if the automation still
// exists, is enabled, and nothing else is running.
func (a *App) triggerAutomation(id string, trigger string) {
	automation, ok := a.automationStoreOrDefault().get(id)
	if !ok || !automation.Enabled {
		return
	}
	if a.automationRunActive() {
		return
	}
	go func() {
		defer func() {
			if recovered := recover(); recovered != nil {
				a.recordAutomationFailure(automation, trigger, fmt.Errorf("automation panicked: %v", recovered))
			}
		}()
		a.runAutomation(automation, trigger)
	}()
}

// interactiveTurnActive reports whether the user is running an agent turn in
// the chat UI.
func (a *App) interactiveTurnActive() bool {
	a.mu.RLock()
	defer a.mu.RUnlock()
	if a.activeRun != 0 {
		return true
	}
	return a.session != nil && a.session.session.IsExecuting()
}

// automationRunActive reports whether an automation run is in flight.
func (a *App) automationRunActive() bool {
	a.automationMu.Lock()
	defer a.automationMu.Unlock()
	return a.automationRunning
}

// runAutomation executes one automation end to end.
func (a *App) runAutomation(automation Automation, trigger string) {
	a.automationMu.Lock()
	if a.automationRunning {
		a.automationMu.Unlock()
		return
	}
	a.automationRunning = true
	a.automationRunID = automation.ID
	a.automationMu.Unlock()

	a.automationSched.keepAwake.acquire()
	defer func() {
		a.automationSched.keepAwake.release()
		a.automationMu.Lock()
		a.automationRunning = false
		a.automationMu.Unlock()
		a.resyncAutomations()
	}()

	a.emit("automation:run", map[string]any{"id": automation.ID, "status": "running"})

	// A deleted or unmounted workspace falls back to a standalone run.
	effectiveWorkspace := automation.Workspace
	if effectiveWorkspace != "" {
		if _, statErr := os.Stat(effectiveWorkspace); statErr != nil {
			effectiveWorkspace = ""
		}
	}

	runtimeState, err := a.buildSessionWithOptions(effectiveWorkspace, sessionBuildOptions{ui: &automationUI{
		app:          a,
		automationID: automation.ID,
	}})
	if err != nil {
		a.recordAutomationFailure(automation, trigger, fmt.Errorf("could not build session: %w", err))
		return
	}
	if runtimeState.session.MCP != nil {
		defer runtimeState.session.MCP.Close()
	}

	ctx, cancel := context.WithTimeout(context.Background(), automationRunTimeout)
	defer cancel()
	a.automationMu.Lock()
	a.automationRunCancel = cancel
	a.automationMu.Unlock()

	shim := &automationUI{app: a, automationID: automation.ID}
	runtimeState.session.UI = shim

	startedAt := timeNow()
	turnErr := runtimeState.session.ProcessUserInput(ctx, automation.Prompt)
	duration := timeNow().Sub(startedAt).Milliseconds()
	transcript, transcriptErr := shim.transcript()
	if turnErr == nil && transcriptErr != nil {
		turnErr = transcriptErr
	}

	status, detail := automationRunOutcome(turnErr, ctx, transcript)
	run := AutomationRun{
		StartedAt:  startedAt.UnixMilli(),
		DurationMs: duration,
		Status:     status,
		Detail:     detail,
	}
	logPath := a.writeAutomationRunLog(automation.ID, startedAt, trigger, transcript)
	run.LogPath = logPath

	if err := a.automationStoreOrDefault().appendRun(automation.ID, run); err != nil {
		// The automation may have been deleted mid-run; keep the log, drop the history.
		a.emit("automation:run", map[string]any{"id": automation.ID, "status": status})
		return
	}
	a.emit("automation:run", map[string]any{
		"id":         automation.ID,
		"status":     status,
		"durationMs": duration,
		"detail":     detail,
	})
}

// recordAutomationFailure stores a failed attempt for an automation that could
// not even start (session build failure, panic, …).
func (a *App) recordAutomationFailure(automation Automation, trigger string, cause error) {
	startedAt := timeNow()
	run := AutomationRun{
		StartedAt: startedAt.UnixMilli(),
		Status:    "error",
		Detail:    cause.Error(),
	}
	if err := a.automationStoreOrDefault().appendRun(automation.ID, run); err != nil {
		return
	}
	a.writeAutomationRunLog(automation.ID, startedAt, trigger, cause.Error())
	a.emit("automation:run", map[string]any{
		"id":     automation.ID,
		"status": "error",
		"detail": cause.Error(),
	})
}

// automationRunOutcome classifies a finished turn.
func automationRunOutcome(turnErr error, ctx context.Context, transcript string) (status string, detail string) {
	if turnErr != nil && errors.Is(ctx.Err(), context.DeadlineExceeded) {
		return "timeout", automationTimeoutDetail
	}
	if turnErr != nil {
		return "error", turnErr.Error()
	}
	detail = strings.TrimSpace(transcript)
	if detail == "" {
		detail = "completed with no output"
	}
	if len(detail) > 200 {
		detail = detail[:200] + "…"
	}
	return "success", detail
}

// writeAutomationRunLog persists the full transcript and prunes old logs.
func (a *App) writeAutomationRunLog(automationID string, startedAt time.Time, trigger string, transcript string) string {
	dir := filepath.Join(automationRunsRoot(), automationID)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return ""
	}
	logPath := filepath.Join(dir, fmt.Sprintf("%d.md", startedAt.UnixMilli()))
	content := fmt.Sprintf(
		"# Automation run\n\n- Started: %s\n- Trigger: %s\n\n---\n\n%s\n",
		startedAt.Format(time.RFC3339), trigger, transcript,
	)
	if err := os.WriteFile(logPath, []byte(content), 0600); err != nil {
		return ""
	}
	pruneAutomationRunLogs(dir, automationRunCap)
	return logPath
}

func pruneAutomationRunLogs(dir string, keep int) {
	entries, err := os.ReadDir(dir)
	if err != nil || len(entries) <= keep {
		return
	}
	// Entries are named by unix-milli timestamps, so a sort by name is a sort by time.
	for index := 0; index < len(entries)-keep; index++ {
		_ = os.Remove(filepath.Join(dir, entries[index].Name()))
	}
}

func automationRunsRoot() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return filepath.Join(os.TempDir(), "mncode-automation-runs")
	}
	return filepath.Join(home, ".mncode", "automation-runs")
}

// compile-time assertion that the shim satisfies the agent listener contract.
var _ agent.UIEventListener = (*automationUI)(nil)
