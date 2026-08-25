// Builds and owns the agent session: workspace context, tools, and lifecycle.
package main

import (
	"context"
	"strings"

	"mncode/pkg/accounts"
	"mncode/pkg/agent"
	"mncode/pkg/config"
	"mncode/pkg/mcp"
	"mncode/pkg/provider"
	"mncode/pkg/skills"
	"mncode/pkg/stats"
	"mncode/pkg/tools"
)

type sessionBuildOptions struct {
	// ui overrides the default chat-streaming UI bridge (used by automation runs).
	ui agent.UIEventListener
	// interactive wires the Ask tool to the UI question flow; headless runs
	// omit it so nothing can block on user input.
	interactive bool
}

func (a *App) buildSession(workspace string) (*sessionRuntime, error) {
	return a.buildSessionWithOptions(workspace, sessionBuildOptions{interactive: true})
}

// buildSessionWithOptions assembles a full agent session. Automation runs pass
// their own UI listener and interactive=false.
func (a *App) buildSessionWithOptions(workspace string, options sessionBuildOptions) (*sessionRuntime, error) {
	cfg, err := config.LoadConfig(workspace)
	if err != nil {
		return nil, err
	}
	standalone := strings.TrimSpace(workspace) == ""
	if standalone {
		cfg.WorkspaceDir = ""
		cfg.ClaudeDir = ""
	}

	// Token-saving preferences apply to every new session (chat + automations).
	applyTokenSaverDirectives(cfg)
	if settingBool(cfg, "token_saver_cap_thinking", false) && cfg.ThinkingBudget > 4096 {
		cfg.ThinkingBudget = 4096
	}

	accStore, err := accounts.NewStore("")
	if err != nil {
		return nil, err
	}
	accRouter := accounts.NewRouter(accStore)
	catalog, _ := skills.LoadCatalog(cfg.ClaudeDir)
	mcpManager := mcp.NewManager(workspace)
	registry := tools.NewRegistry()
	if !standalone {
		registry = tools.DefaultRegistry(workspace, cfg.AutoApprove)
	}
	tracker := stats.NewTracker()

	var llmProvider provider.Provider
	if cfg.APIKey != "" && !shouldUseStoredAntigravity(cfg, accStore) {
		llmProvider, _ = provider.NewProvider(cfg)
	}

	ui := options.ui
	if ui == nil {
		ui = &desktopUI{app: a, workspace: workspace, pending: make(map[string][]pendingToolCall)}
	}

	session := &agent.Session{
		ID:           "mncode-desktop",
		WorkspaceDir: workspace,
		Config:       cfg,
		Provider:     llmProvider,
		Tools:        registry,
		Catalog:      catalog,
		Accounts:     accStore,
		Router:       accRouter,
		Tracker:      tracker,
		Subagents:    agent.NewSubagentRegistry(),
		MCP:          mcpManager,
		UI:           ui,
	}

	if !standalone && options.interactive {
		registry.Register(&tools.AskTool{
			AutoApprove: cfg.AutoApprove,
			Prompter: func(question string, askOptions []string, multi bool) string {
				return a.waitForQuestion(question, askOptions, multi)
			},
		})
	}
	if !standalone {
		registry.Register(&tools.SkillTool{Catalog: catalog})
		registry.Register(&tools.SubagentTool{
			Invoker: (&agent.SubagentRunner{ParentSession: session}).Run,
		})
		go func() {
			mcpContext := context.Background()
			mcpManager.StartAll(mcpContext)
			tools.RegisterMCPTools(registry, mcpManager, mcpContext)
		}()
	}

	return &sessionRuntime{session: session}, nil
}

func shouldUseStoredAntigravity(cfg *config.Config, store *accounts.Store) bool {
	if cfg == nil || store == nil {
		return false
	}
	if store.GetActiveAccount(accounts.ProviderTypeAntigravity) == nil {
		return false
	}
	return cfg.Provider == config.ProviderAntigravity || strings.HasPrefix(cfg.APIKey, "ya29.")
}
