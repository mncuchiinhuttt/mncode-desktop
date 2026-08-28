// MCP server configuration surface for the settings UI.
package main

import (
	"context"
	"fmt"
	"strings"
	"time"

	"mncode/pkg/mcp"
	"mncode/pkg/tools"
)

type builtinMCPDefinition struct {
	ID          string
	Name        string
	Description string
	EnvKey      string
}

var builtinMCPServers = []builtinMCPDefinition{
	{
		ID:          "notion",
		Name:        "Notion",
		Description: "Search, read, and update your Notion workspace through a local MCP server.",
		EnvKey:      "NOTION_TOKEN",
	},
	{
		ID:          "github",
		Name:        "GitHub",
		Description: "Work with repositories, issues, pull requests, and users through GitHub MCP.",
		EnvKey:      "GITHUB_PERSONAL_ACCESS_TOKEN",
	},
}

// GetMCPServers lists configured MCP servers for the settings UI.
func (a *App) GetMCPServers() []DesktopMCPServer {
	manager := a.mcpManager()
	servers := make([]DesktopMCPServer, 0, len(builtinMCPServers))
	for _, definition := range builtinMCPServers {
		server := DesktopMCPServer{
			ID:          definition.ID,
			Name:        definition.Name,
			Description: definition.Description,
		}
		cfg, configured := manager.GetServerConfig(definition.ID)
		server.Configured = configured
		server.TokenConfigured = mcpTokenConfigured(definition, cfg)
		server.Connected = manager.IsConnected(definition.ID)
		servers = append(servers, server)
	}
	return servers
}

// ConfigureMCPServer validates and persists an MCP server connection
// (Notion/GitHub).
func (a *App) ConfigureMCPServer(input DesktopMCPServerInput) ([]DesktopMCPServer, error) {
	definition, ok := findBuiltinMCP(input.ID)
	if !ok {
		return nil, fmt.Errorf("unsupported MCP server: %s", input.ID)
	}
	token := strings.TrimSpace(input.Token)
	if token == "" {
		return nil, fmt.Errorf("a %s token is required", definition.Name)
	}

	manager := a.mcpManager()
	serverConfig := builtinMCPConfig(definition, token)

	a.mu.RLock()
	activeSession := a.session
	a.mu.RUnlock()
	if activeSession == nil || activeSession.session == nil {
		if err := manager.UpsertServer(definition.ID, serverConfig); err != nil {
			return nil, err
		}
		return a.GetMCPServers(), nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := manager.AddServer(ctx, definition.ID, serverConfig); err != nil {
		return nil, err
	}

	if activeSession.session.Tools != nil {
		tools.RegisterMCPTools(activeSession.session.Tools, manager, ctx)
	}
	return a.GetMCPServers(), nil
}

func (a *App) mcpManager() *mcp.Manager {
	a.mu.RLock()
	if a.session != nil && a.session.session != nil && a.session.session.MCP != nil {
		manager := a.session.session.MCP
		a.mu.RUnlock()
		return manager
	}
	a.mu.RUnlock()
	return mcp.NewManager("")
}

func mcpTokenConfigured(definition builtinMCPDefinition, cfg mcp.ServerConfig) bool {
	if strings.TrimSpace(cfg.Env[definition.EnvKey]) != "" {
		return true
	}
	// The CLI used NOTION_API_KEY before the Desktop flow standardized on
	// NOTION_TOKEN. Treat both as configured so the UI reflects reality.
	return definition.ID == "notion" && strings.TrimSpace(cfg.Env["NOTION_API_KEY"]) != ""
}

func findBuiltinMCP(id string) (builtinMCPDefinition, bool) {
	for _, definition := range builtinMCPServers {
		if definition.ID == strings.ToLower(strings.TrimSpace(id)) {
			return definition, true
		}
	}
	return builtinMCPDefinition{}, false
}

func builtinMCPConfig(definition builtinMCPDefinition, token string) mcp.ServerConfig {
	if definition.ID == "github" {
		return mcp.ServerConfig{
			Command: "docker",
			Args: []string{
				"run", "-i", "--rm", "-e", definition.EnvKey,
				"ghcr.io/github/github-mcp-server",
			},
			Env: map[string]string{definition.EnvKey: token},
		}
	}
	return mcp.ServerConfig{
		Command: "npx",
		Args:    []string{"-y", "@notionhq/notion-mcp-server", "--transport", "stdio"},
		Env:     map[string]string{definition.EnvKey: token},
	}
}
