package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"

	"mncode/pkg/drift"
	"mncode/pkg/index"
	"mncode/pkg/sandbox"
)

// GetDriftReport scans workspace architecture and compares against baseline.
func (a *App) GetDriftReport() (*drift.Report, error) {
	a.powerToolsMu.Lock()
	defer a.powerToolsMu.Unlock()
	ws, err := a.requireWorkspaceDir()
	if err != nil {
		return nil, err
	}
	policy, _, err := drift.LoadPolicy(ws, "")
	if err != nil {
		return nil, fmt.Errorf("load drift policy: %w", err)
	}
	sentinel, err := drift.New(ws, policy)
	if err != nil {
		return nil, fmt.Errorf("init drift sentinel: %w", err)
	}
	baseline, err := sentinel.Load()
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
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
	a.powerToolsMu.Lock()
	defer a.powerToolsMu.Unlock()
	ws, err := a.requireWorkspaceDir()
	if err != nil {
		return nil, err
	}
	policy, _, err := drift.LoadPolicy(ws, "")
	if err != nil {
		return nil, fmt.Errorf("load drift policy: %w", err)
	}
	sentinel, err := drift.New(ws, policy)
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
	a.powerToolsMu.Lock()
	defer a.powerToolsMu.Unlock()
	ws, err := a.requireWorkspaceDir()
	if err != nil {
		return nil, err
	}
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

// RunSandboxFixture executes a bounded fixture in a temporary workspace copy.
func (a *App) RunSandboxFixture(id string, args []string, keep bool) (*sandbox.RunResult, error) {
	a.powerToolsMu.Lock()
	defer a.powerToolsMu.Unlock()
	ws, err := a.requireWorkspaceDir()
	if err != nil {
		return nil, err
	}
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
	a.powerToolsMu.Lock()
	defer a.powerToolsMu.Unlock()
	ws, err := a.requireWorkspaceDir()
	if err != nil {
		return nil, err
	}
	idx, err := index.Open(ws)
	if err != nil && !errors.Is(err, os.ErrNotExist) && !errors.Is(err, index.ErrStale) {
		return nil, fmt.Errorf("open code index: %w", err)
	}
	if err != nil {
		idx, err = index.Build(context.Background(), ws, index.Options{})
		if err != nil {
			return nil, fmt.Errorf("build code index: %w", err)
		}
		if err := idx.Save(); err != nil {
			return nil, fmt.Errorf("save code index: %w", err)
		}
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
	a.powerToolsMu.Lock()
	defer a.powerToolsMu.Unlock()
	ws, err := a.requireWorkspaceDir()
	if err != nil {
		return err
	}
	idx, err := index.Build(context.Background(), ws, index.Options{})
	if err != nil {
		return fmt.Errorf("rebuild index: %w", err)
	}
	if err := idx.Save(); err != nil {
		return fmt.Errorf("save rebuilt index: %w", err)
	}
	return nil
}

func (a *App) requireWorkspaceDir() (string, error) {
	if a == nil {
		return "", fmt.Errorf("desktop app is required")
	}
	a.mu.RLock()
	defer a.mu.RUnlock()
	if !a.workspace.Ready || strings.TrimSpace(a.workspace.Path) == "" {
		return "", fmt.Errorf("workspace is not open")
	}
	return a.workspace.Path, nil
}
