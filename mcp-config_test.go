package main

import (
	"testing"

	"mncode/pkg/mcp"
)

func TestMCPTokenConfiguredAcceptsNotionLegacyKey(t *testing.T) {
	definition := builtinMCPDefinition{ID: "notion", EnvKey: "NOTION_TOKEN"}
	if !mcpTokenConfigured(definition, mcp.ServerConfig{Env: map[string]string{
		"NOTION_API_KEY": "legacy-token",
	}}) {
		t.Fatal("expected legacy Notion token key to count as configured")
	}
}

func TestMCPTokenConfiguredDoesNotAcceptLegacyKeyForOtherServers(t *testing.T) {
	definition := builtinMCPDefinition{ID: "github", EnvKey: "GITHUB_PERSONAL_ACCESS_TOKEN"}
	if mcpTokenConfigured(definition, mcp.ServerConfig{Env: map[string]string{
		"NOTION_API_KEY": "legacy-token",
	}}) {
		t.Fatal("did not expect a Notion token to configure GitHub")
	}
}
