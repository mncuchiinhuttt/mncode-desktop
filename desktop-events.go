package main

import (
	"strings"
	"sync"

	"mncode/pkg/provider"
)

type desktopUI struct {
	app       *App
	workspace string
	toolMu    sync.Mutex
	pending   map[string][]pendingToolCall
}

func (ui *desktopUI) OnQueryStart() {
	ui.app.emit("agent:query-start", map[string]string{"message": "Thinking"})
	if manager := ui.app.activeRemoteManager(); manager != nil {
		manager.PushAgentStatus("Lead Orchestrator", "Thinking", "")
	}
}

func (ui *desktopUI) OnToken(token string) {
	ui.app.emit("agent:token", map[string]string{"text": token})
}

func (ui *desktopUI) OnThinking(thinking string) {
	ui.app.emit("agent:thinking", map[string]string{"text": thinking})
	if manager := ui.app.activeRemoteManager(); manager != nil {
		manager.PushAgentStatus("Lead Orchestrator", "Reasoning", thinking)
	}
}

func (ui *desktopUI) OnUsage(inputTokens, outputTokens, thinkingTokens int) {
	ui.app.emit("agent:usage", map[string]int{
		"inputTokens": inputTokens, "outputTokens": outputTokens,
		"thinkingTokens": thinkingTokens,
	})
}

func (ui *desktopUI) OnToolCallStart(call *provider.ToolCall) {
	if call == nil {
		return
	}
	ui.rememberToolCall(call.Name, call.Arguments)
	ui.app.markToolUsed()
	ui.app.emit("agent:tool-start", map[string]interface{}{
		"id": call.ID, "name": call.Name, "args": summarizeToolArguments(call.Arguments),
	})
	if manager := ui.app.activeRemoteManager(); manager != nil {
		manager.PushAgentStatus("Tool", "Running "+call.Name, "")
	}
}

func (ui *desktopUI) OnToolCallResult(name, result string, isError bool) {
	payload := map[string]interface{}{
		"name": name, "result": result, "isError": isError,
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

func (ui *desktopUI) OnSubagentStart(name, role, prompt string) {
	ui.app.emit("agent:subagent-start", map[string]string{
		"name": name, "role": role, "prompt": prompt,
	})
}

func (ui *desktopUI) OnSubagentComplete(name, summary string) {
	ui.app.emit("agent:subagent-complete", map[string]string{
		"name": name, "summary": summary, "result": ui.subagentResult(name),
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

func (ui *desktopUI) OnGoalDone(goal string, elapsed float64, turns, tools int) {
	ui.app.emit("agent:goal-done", map[string]interface{}{
		"goal": goal, "elapsed": elapsed, "turns": turns, "tools": tools,
	})
}

func (ui *desktopUI) OnError(err error) {
	if err != nil {
		ui.app.emit("agent:error", map[string]string{"message": err.Error()})
		if manager := ui.app.activeRemoteManager(); manager != nil {
			manager.PushAgentStatus("Lead Orchestrator", "Error", err.Error())
		}
	}
}

func (ui *desktopUI) ConfirmToolExecution(call *provider.ToolCall) bool {
	if call == nil {
		return false
	}
	return ui.app.waitForPermission(call)
}

func (ui *desktopUI) Flush() {
	ui.app.emit("agent:flush", map[string]string{"message": "ready"})
}
