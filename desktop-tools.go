package main

import (
	"context"
	"fmt"
	"os"

	"mncode/pkg/drift"
	"mncode/pkg/index"
	"mncode/pkg/sandbox"
)

// GetDriftReport scans workspace architecture and compares against baseline.
func (a *App) GetDriftReport() (*drift.Report, error) {
	ws := a.currentWorkspaceDir()
	sentinel, err := drift.New(ws, drift.Policy{})
	if err != nil {
		return nil, fmt.Errorf("init drift sentinel: %w", err)
	}
	baseline, err := sentinel.Load()
	if err != nil {
		if os.IsNotExist(err) {
			b, capErr := sentinel.Capture(context.Background())
			if capErr != nil {
				return nil, fmt.Errorf("capture drift baseline: %w", capErr)
			}
			if saveErr := sentinel.Save(b); saveErr != nil {
				return nil, fmt.Errorf("save drift baseline: %w", saveErr)
			}
			baseline = &b
		} else {
			return nil, fmt.Errorf("load drift baseline: %w", err)
		}
	}
	report, err := sentinel.Check(context.Background(), baseline)
	if err != nil {
		return nil, fmt.Errorf("check drift: %w", err)
	}
	return &report, nil
}

// AcceptDriftBaseline captures and saves the current architecture as baseline.
func (a *App) AcceptDriftBaseline() (*drift.Baseline, error) {
	ws := a.currentWorkspaceDir()
	sentinel, err := drift.New(ws, drift.Policy{})
	if err != nil {
		return nil, fmt.Errorf("init drift sentinel: %w", err)
	}
	baseline, err := sentinel.Capture(context.Background())
	if err != nil {
		return nil, fmt.Errorf("capture drift baseline: %w", err)
	}
	if err := sentinel.Save(baseline); err != nil {
		return nil, fmt.Errorf("save drift baseline: %w", err)
	}
	return &baseline, nil
}

// ListSandboxFixtures returns all available sandbox fixtures.
func (a *App) ListSandboxFixtures() ([]sandbox.Fixture, error) {
	ws := a.currentWorkspaceDir()
	harness, err := sandbox.New(ws)
	if err != nil {
		return nil, fmt.Errorf("init sandbox harness: %w", err)
	}
	fixtures, err := harness.List(context.Background())
	if err != nil {
		return nil, fmt.Errorf("list fixtures: %w", err)
	}
	return fixtures, nil
}

// RunSandboxFixture executes a sandbox fixture safely in a copy workspace.
func (a *App) RunSandboxFixture(id string, args []string, keep bool) (*sandbox.RunResult, error) {
	ws := a.currentWorkspaceDir()
	harness, err := sandbox.New(ws)
	if err != nil {
		return nil, fmt.Errorf("init sandbox harness: %w", err)
	}
	req := sandbox.RunRequest{
		FixtureID: id,
		Args:      args,
		Keep:      keep,
	}
	result, err := harness.Run(context.Background(), req)
	if err != nil {
		return nil, fmt.Errorf("run sandbox fixture: %w", err)
	}
	return &result, nil
}

// QueryCodeIndex executes a local BM25 + AST search.
func (a *App) QueryCodeIndex(query string, kind string, pathGlob string, limit int) ([]index.Hit, error) {
	ws := a.currentWorkspaceDir()
	idx, err := index.Open(ws)
	if err != nil {
		ctx := context.Background()
		idx, err = index.Build(ctx, ws, index.Options{})
		if err != nil {
			return nil, fmt.Errorf("build code index: %w", err)
		}
		_ = idx.Save()
	}
	hits := idx.Search(index.Query{
		Text:     query,
		Kind:     kind,
		PathGlob: pathGlob,
		Limit:    limit,
	})
	return hits, nil
}

// RebuildCodeIndex forcefully rebuilds the local code index.
func (a *App) RebuildCodeIndex() error {
	ws := a.currentWorkspaceDir()
	ctx := context.Background()
	idx, err := index.Build(ctx, ws, index.Options{})
	if err != nil {
		return fmt.Errorf("rebuild index: %w", err)
	}
	return idx.Save()
}

func (a *App) currentWorkspaceDir() string {
	a.mu.RLock()
	defer a.mu.RUnlock()
	if a.workspace.Path != "" {
		return a.workspace.Path
	}
	return "."
}
