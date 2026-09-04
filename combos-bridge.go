package main

import (
	"context"
	"fmt"
	"time"

	"mncode/pkg/agent"
	"mncode/pkg/combos"
	"mncode/pkg/skills"
)

type desktopComboExecutor struct {
	app     *App
	session *agent.Session
}

func (e *desktopComboExecutor) ExecuteMember(ctx context.Context, member combos.ComboMember, model string, prompt string) (string, error) {
	if e.session == nil {
		return "", fmt.Errorf("active session is required")
	}

	baseAgent := member.BaseAgent
	if baseAgent == "" {
		baseAgent = "coder"
	}

	if member.PromptOverlay != "" && e.session.Catalog != nil {
		customAgent := &skills.Agent{
			Name:        member.Role,
			Role:        member.Role,
			Description: fmt.Sprintf("Combo role %s", member.Role),
			Prompt:      member.PromptOverlay,
		}
		e.session.Catalog.Agents[member.Role] = customAgent
		baseAgent = member.Role
	}

	runner := &agent.SubagentRunner{ParentSession: e.session}
	return runner.Run(ctx, baseAgent, prompt)
}

type desktopComboListener struct {
	app *App
}

func (l *desktopComboListener) OnModelFallback(role, fromModel, toModel string, cause error) {
	if l.app != nil {
		l.app.emit("combo:fallback", map[string]interface{}{
			"role":      role,
			"fromModel": fromModel,
			"toModel":   toModel,
			"error":     cause.Error(),
		})
	}
}

func (l *desktopComboListener) OnComboStart(comboID, name string, mode combos.ExecutionMode, memberCount int) {
	if l.app != nil {
		l.app.emit("combo:start", map[string]interface{}{
			"comboId":     comboID,
			"name":        name,
			"mode":        string(mode),
			"memberCount": memberCount,
		})
	}
}

func (l *desktopComboListener) OnComboStepStart(comboID, role, model string, stepIndex, totalSteps int) {
	if l.app != nil {
		l.app.emit("combo:step:start", map[string]interface{}{
			"comboId":    comboID,
			"role":       role,
			"model":      model,
			"stepIndex":  stepIndex,
			"totalSteps": totalSteps,
		})
	}
}

func (l *desktopComboListener) OnComboStepDone(comboID, role, modelUsed string, duration time.Duration, output string) {
	if l.app != nil {
		l.app.emit("combo:step:done", map[string]interface{}{
			"comboId":   comboID,
			"role":      role,
			"modelUsed": modelUsed,
			"duration":  duration.Milliseconds(),
			"output":    output,
		})
	}
}

func (l *desktopComboListener) OnComboStepError(comboID, role string, err error) {
	if l.app != nil {
		l.app.emit("combo:step:error", map[string]interface{}{
			"comboId": comboID,
			"role":    role,
			"error":   err.Error(),
		})
	}
}

func (l *desktopComboListener) OnComboComplete(comboID string, duration time.Duration, output string) {
	if l.app != nil {
		l.app.emit("combo:complete", map[string]interface{}{
			"comboId":  comboID,
			"duration": duration.Milliseconds(),
			"output":   output,
		})
	}
}
