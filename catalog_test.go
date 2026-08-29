package main

import (
	"encoding/json"
	"strings"
	"testing"

	"mncode/pkg/agent"
	"mncode/pkg/config"
	"mncode/pkg/provider"
)

func TestApplySettingsKeepsProviderForNonProviderChanges(t *testing.T) {
	t.Setenv("HOME", t.TempDir())
	cfg := config.DefaultConfig()
	cfg.APIKey = "sk-ant-test-key"
	active, err := provider.NewProvider(cfg)
	if err != nil {
		t.Fatalf("NewProvider() error = %v", err)
	}
	session := &agent.Session{Config: cfg, Provider: active}

	if _, err := applySettings(cfg, session, DesktopSettingsInput{Theme: "dark"}); err != nil {
		t.Fatalf("applySettings() error = %v", err)
	}
	if session.Provider != active {
		t.Fatal("non-provider setting unexpectedly invalidated the active provider")
	}
}

func TestApplySettingsRebuildsProviderWhenProviderChanges(t *testing.T) {
	t.Setenv("HOME", t.TempDir())
	cfg := config.DefaultConfig()
	cfg.Provider = config.ProviderAnthropic
	cfg.APIKey = "sk-test-key"
	active, err := provider.NewProvider(cfg)
	if err != nil {
		t.Fatalf("NewProvider() error = %v", err)
	}
	session := &agent.Session{Config: cfg, Provider: active}

	if _, err := applySettings(cfg, session, DesktopSettingsInput{Provider: string(config.ProviderOpenAI)}); err != nil {
		t.Fatalf("applySettings() error = %v", err)
	}
	if session.Provider == nil || session.Provider.Name() != string(config.ProviderOpenAI) {
		t.Fatalf("provider after change = %v, want %s", session.Provider, config.ProviderOpenAI)
	}
}

func TestApplySettingsPersistsSearchCredentialsWithoutReturningSecrets(t *testing.T) {
	t.Setenv("HOME", t.TempDir())
	cfg := config.DefaultConfig()
	session := &agent.Session{Config: cfg}

	settings, err := applySettings(cfg, session, DesktopSettingsInput{
		SearchEngine: "brave",
		BraveAPIKey:  "brave-secret",
		TavilyAPIKey: "tavily-secret",
	})
	if err != nil {
		t.Fatalf("applySettings() error = %v", err)
	}
	if !settings.BraveSearchConfigured || !settings.TavilySearchConfigured {
		t.Fatalf("configured flags = brave:%v tavily:%v", settings.BraveSearchConfigured, settings.TavilySearchConfigured)
	}
	encoded, err := json.Marshal(settings)
	if err != nil {
		t.Fatalf("marshal settings: %v", err)
	}
	if strings.Contains(string(encoded), "brave-secret") || strings.Contains(string(encoded), "tavily-secret") {
		t.Fatalf("settings response contains a search credential: %s", encoded)
	}

	loaded := config.DefaultConfig()
	if err := config.LoadUserConfig(loaded); err != nil {
		t.Fatalf("LoadUserConfig() error = %v", err)
	}
	if loaded.GetSearchEngine() != "brave" || loaded.GetBraveAPIKey() != "brave-secret" || loaded.GetTavilyAPIKey() != "tavily-secret" {
		t.Fatalf("saved search settings not restored: engine=%q brave=%q tavily=%q", loaded.GetSearchEngine(), loaded.GetBraveAPIKey(), loaded.GetTavilyAPIKey())
	}
}
