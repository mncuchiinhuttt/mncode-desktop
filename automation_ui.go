// Headless UI shim for automation runs: captures the agent transcript into a
// log buffer instead of streaming into the chat, and never blocks on prompts.
package main

import (
	"fmt"
	"strings"
	"sync"

	"mncode/pkg/provider"
)

// automationUI implements the agent UIEventListener contract for background
// runs: everything is appended to a transcript buffer, tool confirmations are
// denied (headless runs must not silently execute gated tools), and progress
// is mirrored to the UI through automation:run events.
type automationUI struct {
	app          *App
	automationID string

	mu        sync.Mutex
	toolCalls int
	err       error
	log       strings.Builder
}

func (ui *automationUI) append(format string, args ...any) {
	ui.mu.Lock()
	defer ui.mu.Unlock()
	ui.log.WriteString(fmt.Sprintf(format, args...))
}

func (ui *automationUI) emitStatus(status string) {
	if ui.app != nil {
		ui.app.emit("automation:run", map[string]any{
			"id":     ui.automationID,
			"status": status,
		})
	}
}

func (ui *automationUI) OnQueryStart() {
	ui.emitStatus("running")
}

func (ui *automationUI) OnToken(token string) {
	ui.append("%s", token)
}

func (ui *automationUI) OnThinking(thinking string) {
	ui.append("\n[thinking] %s", thinking)
}

func (ui *automationUI) OnToolCallStart(tc *provider.ToolCall) {
	ui.toolCalls++
	ui.append("\n[tool %d] %s — ", ui.toolCalls, tc.Name)
}

func (ui *automationUI) OnToolCallResult(name string, result string, isError bool) {
	digest := strings.TrimSpace(result)
	if len(digest) > 160 {
		digest = digest[:160] + "…"
	}
	status := "ok"
	if isError {
		status = "error"
	}
	ui.append("(%s) %s\n", status, digest)
}

func (ui *automationUI) OnSubagentStart(agentName, role, prompt string) {
	ui.append("\n[subagent] %s (%s) spawned\n", agentName, role)
}

func (ui *automationUI) OnSubagentComplete(agentName string, summary string) {
	ui.append("\n[subagent] %s completed: %s\n", agentName, summary)
}

func (ui *automationUI) OnGoalDone(goal string, elapsedSecs float64, turns int, toolCount int) {
	ui.append("\n[goal] %s — %.1fs, %d turns, %d tools\n", goal, elapsedSecs, turns, toolCount)
}

func (ui *automationUI) OnError(err error) {
	ui.mu.Lock()
	ui.err = err
	ui.mu.Unlock()
	ui.append("\n[error] %v\n", err)
}

// ConfirmToolExecution denies gated tools: automation runs are headless, so
// nothing may execute without having been explicitly auto-approved in config.
func (ui *automationUI) ConfirmToolExecution(tc *provider.ToolCall) bool {
	ui.append("\n[blocked] %s — tool confirmation is unavailable in automation runs\n", tc.Name)
	return false
}

func (ui *automationUI) Flush() {}

// transcript returns the captured output and any terminal error.
func (ui *automationUI) transcript() (string, error) {
	ui.mu.Lock()
	defer ui.mu.Unlock()
	return ui.log.String(), ui.err
}
