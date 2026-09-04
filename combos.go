package main

import (
	"context"
	"fmt"
	"strings"
	"time"

	"mncode/pkg/combos"
)

// DesktopComboMember is the frontend-compatible member definition.
type DesktopComboMember struct {
	ID               string   `json:"id"`
	Role             string   `json:"role"`
	BaseAgent        string   `json:"baseAgent"`
	PromptOverlay    string   `json:"promptOverlay,omitempty"`
	Model            string   `json:"model,omitempty"`
	FallbackModel    string   `json:"fallbackModel,omitempty"`
	ThinkingBudget   int      `json:"thinkingBudget,omitempty"`
	Permissions      []string `json:"permissions,omitempty"`
	IsolatedWorktree bool     `json:"isolatedWorktree,omitempty"`
}

// DesktopCombo is the frontend-compatible combo definition.
type DesktopCombo struct {
	ID              string               `json:"id"`
	Name            string               `json:"name"`
	Description     string               `json:"description"`
	Mode            string               `json:"mode"`
	MaxDebateRounds int                  `json:"maxDebateRounds,omitempty"`
	Members         []DesktopComboMember `json:"members"`
	IsBuiltin       bool                 `json:"isBuiltin"`
	CreatedAt       string               `json:"createdAt"`
	UpdatedAt       string               `json:"updatedAt"`
}

// GetCombos returns all built-in and custom combos.
func (a *App) GetCombos() ([]DesktopCombo, error) {
	ws := a.GetWorkspace().Path
	store, err := combos.NewStore(ws)
	if err != nil {
		return nil, err
	}

	list := store.List()
	res := make([]DesktopCombo, 0, len(list))
	for _, c := range list {
		members := make([]DesktopComboMember, 0, len(c.Members))
		for _, m := range c.Members {
			members = append(members, DesktopComboMember{
				ID:               m.ID,
				Role:             m.Role,
				BaseAgent:        m.BaseAgent,
				PromptOverlay:    m.PromptOverlay,
				Model:            m.Model,
				FallbackModel:    m.FallbackModel,
				ThinkingBudget:   m.ThinkingBudget,
				Permissions:      m.Permissions,
				IsolatedWorktree: m.IsolatedWorktree,
			})
		}
		res = append(res, DesktopCombo{
			ID:              c.ID,
			Name:            c.Name,
			Description:     c.Description,
			Mode:            string(c.Mode),
			MaxDebateRounds: c.MaxDebateRounds,
			Members:         members,
			IsBuiltin:       c.IsBuiltin,
			CreatedAt:       c.CreatedAt.Format(time.RFC3339),
			UpdatedAt:       c.UpdatedAt.Format(time.RFC3339),
		})
	}
	return res, nil
}

// SaveCombo saves or updates a custom combo.
func (a *App) SaveCombo(c DesktopCombo) error {
	ws := a.GetWorkspace().Path
	store, err := combos.NewStore(ws)
	if err != nil {
		return err
	}

	members := make([]combos.ComboMember, 0, len(c.Members))
	for _, m := range c.Members {
		members = append(members, combos.ComboMember{
			ID:               m.ID,
			Role:             m.Role,
			BaseAgent:        m.BaseAgent,
			PromptOverlay:    m.PromptOverlay,
			Model:            m.Model,
			FallbackModel:    m.FallbackModel,
			ThinkingBudget:   m.ThinkingBudget,
			Permissions:      m.Permissions,
			IsolatedWorktree: m.IsolatedWorktree,
		})
	}

	coreCombo := combos.Combo{
		ID:              strings.TrimSpace(c.ID),
		Name:            strings.TrimSpace(c.Name),
		Description:     strings.TrimSpace(c.Description),
		Mode:            combos.ExecutionMode(c.Mode),
		MaxDebateRounds: c.MaxDebateRounds,
		Members:         members,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	if err := store.Save(coreCombo); err != nil {
		return err
	}

	a.emit("combos:updated", map[string]string{"action": "save", "id": coreCombo.ID})
	return nil
}

// DeleteCombo deletes a custom combo by ID.
func (a *App) DeleteCombo(id string) error {
	ws := a.GetWorkspace().Path
	store, err := combos.NewStore(ws)
	if err != nil {
		return err
	}
	if err := store.Delete(id); err != nil {
		return err
	}
	a.emit("combos:updated", map[string]string{"action": "delete", "id": id})
	return nil
}

// GetStandardRoles returns the 16 official role templates.
func (a *App) GetStandardRoles() []combos.RoleMeta {
	return combos.StandardRoles()
}

// RunCombo executes a combo against a user prompt.
func (a *App) RunCombo(comboID, userPrompt string) error {
	a.mu.RLock()
	sessionState := a.session
	a.mu.RUnlock()

	if sessionState == nil || sessionState.session == nil {
		return fmt.Errorf("active workspace session required")
	}

	ws := a.GetWorkspace().Path
	store, err := combos.NewStore(ws)
	if err != nil {
		return err
	}

	exec := &desktopComboExecutor{app: a, session: sessionState.session}
	listener := &desktopComboListener{app: a}
	runner := combos.NewRunner(store, exec, listener)

	go func() {
		_, _ = runner.Run(context.Background(), comboID, userPrompt)
	}()
	return nil
}
