package main

import (
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
