// Resolution of interactive agent prompts: tool permissions and questions.
package main

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"mncode/pkg/provider"
	"mncode/pkg/remote"
)

func (a *App) waitForPermission(call *provider.ToolCall) bool {
	id := call.ID
	if id == "" {
		id = fmt.Sprintf("permission-%d", time.Now().UnixNano())
	}
	response := make(chan bool, 1)
	a.mu.Lock()
	a.permissions[id] = response
	a.mu.Unlock()
	tool := call.Name
	a.emit("agent:permission", map[string]string{
		"id": id, "tool": tool,
		"summary": permissionSummary(call),
	})

	select {
	case allowed := <-response:
		return allowed
	case <-time.After(10 * time.Minute):
		a.mu.Lock()
		delete(a.permissions, id)
		a.mu.Unlock()
		return false
	}
}

func permissionSummary(call *provider.ToolCall) string {
	if call == nil {
		return "Tool execution requested."
	}
	for _, key := range []string{"command", "cmd", "path", "TargetFile", "target_file"} {
		if value, ok := call.Arguments[key].(string); ok && strings.TrimSpace(value) != "" {
			return fmt.Sprintf("%s: %s", call.Name, truncate(value, 140))
		}
	}
	if len(call.Arguments) > 0 {
		if data, err := json.Marshal(call.Arguments); err == nil {
			return fmt.Sprintf("%s with %s", call.Name, truncate(string(data), 140))
		}
	}
	return fmt.Sprintf("Allow %s to run in this workspace?", call.Name)
}

func truncate(value string, max int) string {
	value = strings.TrimSpace(value)
	if len(value) <= max {
		return value
	}
	return value[:max-1] + "…"
}

// ResolvePermission answers a pending tool-permission request from the UI.
func (a *App) ResolvePermission(id string, allowed bool) {
	a.mu.Lock()
	response, ok := a.permissions[id]
	delete(a.permissions, id)
	a.mu.Unlock()
	if ok {
		response <- allowed
	}
}

func (a *App) waitForQuestion(question string, options []string, multi bool) string {
	id := fmt.Sprintf("question-%d", time.Now().UnixNano())
	response := make(chan string, 1)
	a.mu.Lock()
	a.questions[id] = response
	a.mu.Unlock()
	a.emit("agent:question", map[string]interface{}{
		"id": id, "question": question,
		"options": options, "multi": multi,
	})
	if manager := a.activeRemoteManager(); manager != nil {
		manager.PushQuestion(remote.QuestionPayload{
			Question:      question,
			Options:       options,
			IsMultiSelect: multi,
		})
		defer manager.PushQuestionResolved()
	}

	select {
	case answer := <-response:
		return answer
	case <-time.After(10 * time.Minute):
		a.mu.Lock()
		delete(a.questions, id)
		a.mu.Unlock()
		return "User skipped this question."
	}
}

// AnswerQuestion resolves a pending agent question with the user's answer.
func (a *App) AnswerQuestion(id, answer string) {
	a.mu.Lock()
	response, ok := a.questions[id]
	delete(a.questions, id)
	a.mu.Unlock()
	if ok {
		response <- strings.TrimSpace(answer)
	}
}
