// Bridges agent-core UI callbacks to Wails DOM events consumed by the frontend.
package main

import (
	"strings"
	"sync"

	"mncode/pkg/provider"
)

type desktopUI struct {
	app       *App
	workspace string
	runID     uint64
	toolMu    sync.Mutex
	pending   map[string][]pendingToolCall
}

func newDesktopUI(app *App, workspace string, runID uint64) *desktopUI {
	return &desktopUI{
		app:       app,
		workspace: workspace,
		runID:     runID,
		pending:   make(map[string][]pendingToolCall),
	}
}

func (ui *desktopUI) eventRunID() uint64 {
	return ui.runID
}

// OnQueryStart emits agent:start so the UI can open a new streaming turn.
func (ui *desktopUI) OnQueryStart() {
	runID := ui.eventRunID()
	ui.app.emit("agent:query-start", map[string]interface{}{"message": "Thinking", "runID": runID})
	if manager := ui.app.activeRemoteManager(); manager != nil {
		manager.PushAgentStatus("Lead Orchestrator", "Thinking", "")
	}
}

// OnToken streams one assistant text chunk to the UI.
func (ui *desktopUI) OnToken(token string) {
	runID := ui.eventRunID()
	ui.app.emit("agent:token", map[string]interface{}{"text": token, "runID": runID})
}

// OnThinking streams a reasoning chunk to the UI activity feed.
func (ui *desktopUI) OnThinking(thinking string) {
	runID := ui.eventRunID()
	ui.app.emit("agent:thinking", map[string]interface{}{"text": thinking, "runID": runID})
	if manager := ui.app.activeRemoteManager(); manager != nil {
		manager.PushAgentStatus("Lead Orchestrator", "Reasoning", thinking)
	}
}

// OnUsage reports provider token usage for the active turn.
func (ui *desktopUI) OnUsage(inputTokens, outputTokens, thinkingTokens int) {
	runID := ui.eventRunID()
	ui.app.emit("agent:usage", map[string]interface{}{
		"inputTokens": inputTokens, "outputTokens": outputTokens,
		"thinkingTokens": thinkingTokens, "runID": runID,
	})
}

// OnToolCallStart announces a tool invocation as it begins.
func (ui *desktopUI) OnToolCallStart(call *provider.ToolCall) {
	if call == nil {
		return
	}
	ui.rememberToolCall(call.Name, call.Arguments)
	ui.app.markToolUsed()
	runID := ui.eventRunID()
	ui.app.emit("agent:tool-start", map[string]interface{}{
		"id": call.ID, "name": call.Name, "args": summarizeToolArguments(call.Arguments),
		"runID": runID,
	})
	if manager := ui.app.activeRemoteManager(); manager != nil {
		manager.PushAgentStatus("Tool", "Running "+call.Name, "")
	}
}

// OnToolCallResult completes a tool invocation with its (possibly errored) result.
func (ui *desktopUI) OnToolCallResult(name, result string, isError bool) {
	runID := ui.eventRunID()
	payload := map[string]interface{}{
		"name": name, "result": result, "isError": isError, "runID": runID,
	}
	if summary := ui.toolResultSummary(name, result, isError); summary != nil {
		payload["summary"] = summary
	}
	ui.app.emit("agent:tool-result", payload)
	if manager := ui.app.activeRemoteManager(); manager != nil {
		phase := "Completed " + name
		if isError {
			phase = "Failed " + name
		}
		manager.PushAgentStatus("Tool", phase, "")
	}
}

// OnSubagentStart announces a spawned subagent and opens the activity panel.
func (ui *desktopUI) OnSubagentStart(name, role, prompt string) {
	runID := ui.eventRunID()
	ui.app.emit("agent:subagent-start", map[string]interface{}{
		"name": name, "role": role, "prompt": prompt, "runID": runID,
	})
}

// OnSubagentComplete closes a subagent run with its summary.
func (ui *desktopUI) OnSubagentComplete(name, summary string) {
	runID := ui.eventRunID()
	ui.app.emit("agent:subagent-complete", map[string]interface{}{
		"name": name, "summary": summary, "result": ui.subagentResult(name), "runID": runID,
	})
}

func (ui *desktopUI) subagentResult(name string) string {
	ui.app.mu.RLock()
	activeSession := ui.app.session
	ui.app.mu.RUnlock()
	if activeSession == nil || activeSession.session == nil || activeSession.session.Subagents == nil {
		return ""
	}
	records := activeSession.session.Subagents.List()
	for index := len(records) - 1; index >= 0; index-- {
		if records[index].Name != name {
			continue
		}
		result := strings.TrimSpace(records[index].Result)
		if len(result) > 6000 {
			return result[:6000] + "…"
		}
		return result
	}
	return ""
}

// OnGoalDone reports overall goal completion stats for the turn.
func (ui *desktopUI) OnGoalDone(goal string, elapsed float64, turns, tools int) {
	runID := ui.eventRunID()
	ui.app.emit("agent:goal-done", map[string]interface{}{
		"goal": goal, "elapsed": elapsed, "turns": turns, "tools": tools, "runID": runID,
	})
}

// OnError surfaces a fatal turn error to the UI.
func (ui *desktopUI) OnError(err error) {
	if err != nil {
		runID := ui.eventRunID()
		ui.app.emit("agent:error", map[string]interface{}{"message": err.Error(), "runID": runID})
		if manager := ui.app.activeRemoteManager(); manager != nil {
			manager.PushAgentStatus("Lead Orchestrator", "Error", err.Error())
		}
	}
}

// ConfirmToolExecution resolves the permission prompt from the UI for one tool call.
func (ui *desktopUI) ConfirmToolExecution(call *provider.ToolCall) bool {
	if call == nil {
		return false
	}
	return ui.app.waitForPermission(call)
}

// Flush is a no-op sink for provider UI flush hooks.
func (ui *desktopUI) Flush() {
	runID := ui.eventRunID()
	ui.app.emit("agent:flush", map[string]interface{}{"message": "ready", "runID": runID})
}
