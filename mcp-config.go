package main

import (
	"fmt"
	"strings"

	"mncode/pkg/mcp"
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
		server.TokenConfigured = strings.TrimSpace(cfg.Env[definition.EnvKey]) != ""
		server.Connected = manager.IsConnected(definition.ID)
		servers = append(servers, server)
	}
	return servers
}

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
	if err := manager.UpsertServer(definition.ID, builtinMCPConfig(definition, token)); err != nil {
		return nil, err
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
