package main

import (
	"context"
	"fmt"
	"sync"
	"time"

	"mncode/pkg/accounts"
	"mncode/pkg/agent"
	"mncode/pkg/arena"
	"mncode/pkg/spec"
)

type arenaDesktopReviewer struct {
	session *agent.Session
	model   string
	mu      sync.Mutex
}

func (r *arenaDesktopReviewer) Review(ctx context.Context, source arena.Source, role string) ([]arena.Finding, error) {
	instructions := map[string]string{
		"security adversary":        "Find secrets, injection, auth, path traversal, and unsafe process behavior.",
		"correctness adversary":     "Find logic errors, error handling gaps, races, and broken edge cases.",
		"maintainability adversary": "Find API compatibility, regression, observability, and operability risks.",
	}
	prompt := fmt.Sprintf("Review this git diff as the %s. %s\nReturn only zero or more lines in this exact format:\nFINDING|severity|file|line|category|evidence|impact|recommendation\nUse severity high, medium, or low. Do not edit files or run mutating tools.\n\nDIFF:\n%s", role, instructions[role], source.Diff)
	r.mu.Lock()
	runner := &agent.SubagentRunner{ParentSession: r.session, ModelOverride: r.model, ReadOnly: true}
	r.mu.Unlock()
	output, err := runner.Run(ctx, "code-reviewer", prompt)
	if err != nil {
		return nil, err
	}
	return arena.ParseFindings(output, role), nil
}

// RunArenaReview executes a multi-adversary red-team review.
func (a *App) RunArenaReview(baseRef string, headRef string, model string, rounds int) (*arena.Report, error) {
	a.powerToolsMu.Lock()
	defer a.powerToolsMu.Unlock()
	ws, err := a.requireWorkspaceDir()
	if err != nil {
		return nil, err
	}
	sess, err := a.requireAgentSession()
	if err != nil {
		return nil, err
	}
	source, err := arena.CollectSource(context.Background(), ws, baseRef, headRef, true, 512*1024)
	if err != nil {
		return nil, fmt.Errorf("collect source diff: %w", err)
	}

	reviewer := &arenaDesktopReviewer{session: sess, model: model}
	engine, err := arena.New(ws, reviewer)
	if err != nil {
		return nil, fmt.Errorf("init arena: %w", err)
	}
	if rounds <= 0 || rounds > 3 {
		rounds = 1
	}
	report, err := engine.Review(context.Background(), source, arena.Options{
		Rounds:           rounds,
		Models:           []string{model},
		Timeout:          90 * time.Second,
		IncludeUntracked: true,
	})
	if err != nil {
		return nil, fmt.Errorf("run arena review: %w", err)
	}
	if _, err := engine.Save(report); err != nil {
		return nil, fmt.Errorf("save arena report: %w", err)
	}
	return &report, nil
}

// ListSpecContracts returns all defined specification contracts.
func (a *App) ListSpecContracts() ([]spec.Contract, error) {
	ws, err := a.requireWorkspaceDir()
	if err != nil {
		return nil, err
	}
	st, err := spec.New(ws)
	if err != nil {
		return nil, fmt.Errorf("init spec store: %w", err)
	}
	ids, err := st.List(context.Background())
	if err != nil {
		return nil, fmt.Errorf("list spec contracts: %w", err)
	}
	contracts := make([]spec.Contract, 0, len(ids))
	for _, id := range ids {
		contract, loadErr := st.Load(context.Background(), id)
		if loadErr != nil {
			return nil, fmt.Errorf("load spec contract %s: %w", id, loadErr)
		}
		contracts = append(contracts, contract)
	}
	return contracts, nil
}

// RunSpecMatrix evaluates a specification contract against the codebase.
func (a *App) RunSpecMatrix(id string) (*spec.Matrix, error) {
	ws, err := a.requireWorkspaceDir()
	if err != nil {
		return nil, err
	}
	st, err := spec.New(ws)
	if err != nil {
		return nil, fmt.Errorf("init spec store: %w", err)
	}
	contract, err := st.Load(context.Background(), id)
	if err != nil {
		return nil, fmt.Errorf("load spec contract: %w", err)
	}
	matrix, err := st.Check(context.Background(), contract)
	if err != nil {
		return nil, fmt.Errorf("check spec matrix: %w", err)
	}
	return &matrix, nil
}
func (a *App) requireSession() (*agent.Session, error) {
	if a == nil {
		return nil, fmt.Errorf("desktop app is required")
	}
	a.mu.RLock()
	defer a.mu.RUnlock()
	if a.session == nil || a.session.session == nil {
		return nil, fmt.Errorf("agent session is not ready")
	}
	return a.session.session, nil
}

func (a *App) requireAgentSession() (*agent.Session, error) {
	session, err := a.requireSession()
	if err != nil {
		return nil, err
	}
	if session.Provider == nil {
		hasAccount := session.Accounts != nil &&
			(session.Accounts.GetActiveAccount(accounts.ProviderTypeAntigravity) != nil ||
				session.Accounts.GetActiveAccount(accounts.ProviderTypeCodex) != nil)
		if !hasAccount || session.Router == nil {
			return nil, fmt.Errorf("agent provider is not configured")
		}
		if err := session.EnsureProvider(); err != nil {
			return nil, fmt.Errorf("initialize agent provider: %w", err)
		}
	}
	if session.Provider == nil {
		return nil, fmt.Errorf("agent provider is not configured")
	}
	return session, nil
}
