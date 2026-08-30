package main

import (
	"context"
	"fmt"
	"sync"
	"time"

	"mncode/pkg/agent"
	"mncode/pkg/arena"
	"mncode/pkg/replay"
	"mncode/pkg/spec"
)

type arenaDesktopReviewer struct {
	session *agent.Session
	model   string
	mu      sync.Mutex
}

func (r *arenaDesktopReviewer) Review(ctx context.Context, source arena.Source, role string) ([]arena.Finding, error) {
	instructions := map[string]string{
		"security adversary":       "Find secrets, injection, auth, path traversal, and unsafe process behavior.",
		"correctness adversary":    "Find logic errors, error handling gaps, races, and broken edge cases.",
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
	ws := a.currentWorkspaceDir()
	ctx := context.Background()
	source, err := arena.CollectSource(ctx, ws, baseRef, headRef, true, 512*1024)
	if err != nil {
		return nil, fmt.Errorf("collect source diff: %w", err)
	}

	a.mu.RLock()
	var sess *agent.Session
	if a.session != nil {
		sess = a.session.session
	}
	a.mu.RUnlock()

	reviewer := &arenaDesktopReviewer{session: sess, model: model}
	engine, err := arena.New(ws, reviewer)
	if err != nil {
		return nil, fmt.Errorf("init arena: %w", err)
	}

	if rounds <= 0 || rounds > 3 {
		rounds = 1
	}
	opts := arena.Options{
		Rounds:           rounds,
		Models:           []string{model},
		Timeout:          90 * time.Second,
		IncludeUntracked: true,
	}
	report, err := engine.Review(ctx, source, opts)
	if err != nil {
		return nil, fmt.Errorf("run arena review: %w", err)
	}
	_, _ = engine.Save(report)
	return &report, nil
}

// DesktopTraceDetail combines trace manifest and events for UI inspection.
type DesktopTraceDetail struct {
	Trace  replay.Trace   `json:"trace"`
	Events []replay.Event `json:"events"`
}

// ListReplayTraces returns all recorded flight recorder traces.
func (a *App) ListReplayTraces() ([]replay.Trace, error) {
	ws := a.currentWorkspaceDir()
	st, err := replay.NewStore(ws)
	if err != nil {
		return nil, fmt.Errorf("init replay store: %w", err)
	}
	return st.List(context.Background())
}

// GetReplayTrace loads a specific flight recorder trace and its events.
func (a *App) GetReplayTrace(traceID string) (*DesktopTraceDetail, error) {
	ws := a.currentWorkspaceDir()
	st, err := replay.NewStore(ws)
	if err != nil {
		return nil, fmt.Errorf("init replay store: %w", err)
	}
	trace, events, err := st.Load(context.Background(), traceID)
	if err != nil {
		return nil, fmt.Errorf("load replay trace: %w", err)
	}
	return &DesktopTraceDetail{Trace: trace, Events: events}, nil
}

// ForkReplaySession forks a new active session from a specific trace step.
func (a *App) ForkReplaySession(traceID string, atStep int, newID string) error {
	ws := a.currentWorkspaceDir()
	st, err := replay.NewStore(ws)
	if err != nil {
		return fmt.Errorf("init replay store: %w", err)
	}
	forkRes, err := st.Fork(context.Background(), replay.ForkRequest{
		TraceID:      traceID,
		At:           int64(atStep),
		NewSessionID: newID,
	})
	if err != nil {
		return fmt.Errorf("fork trace: %w", err)
	}

	a.mu.RLock()
	var sess *agent.Session
	if a.session != nil {
		sess = a.session.session
	}
	a.mu.RUnlock()

	if sess != nil {
		return sess.ActivateFork(forkRes.History, forkRes.SessionID)
	}
	return nil
}

// ListSpecContracts returns all defined specification contracts.
func (a *App) ListSpecContracts() ([]spec.Contract, error) {
	ws := a.currentWorkspaceDir()
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
		if c, err := st.Load(context.Background(), id); err == nil {
			contracts = append(contracts, c)
		}
	}
	return contracts, nil
}

// RunSpecMatrix evaluates a specification contract against the codebase.
func (a *App) RunSpecMatrix(id string) (*spec.Matrix, error) {
	ws := a.currentWorkspaceDir()
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
