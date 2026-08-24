package main

import (
	"path/filepath"
	"testing"

	"mncode/pkg/accounts"
	"mncode/pkg/config"
)

func TestShouldUseStoredAntigravityWithRefreshToken(t *testing.T) {
	store, err := accounts.NewStore(filepath.Join(t.TempDir(), "accounts.json"))
	if err != nil {
		t.Fatal(err)
	}
	if err := store.AddOrUpdate(&accounts.Account{
		ID: "user@example.com", Provider: accounts.ProviderTypeAntigravity,
		AccessToken: "expired-access-token", RefreshToken: "refresh-token", IsActive: true,
	}); err != nil {
		t.Fatal(err)
	}

	if !shouldUseStoredAntigravity(&config.Config{
		Provider: config.ProviderAntigravity, APIKey: "expired-access-token",
	}, store) {
		t.Fatal("expected account-backed Antigravity provider resolution")
	}
}

func TestShouldNotUseStoredAntigravityForGeminiAPIKey(t *testing.T) {
	store, err := accounts.NewStore(filepath.Join(t.TempDir(), "accounts.json"))
	if err != nil {
		t.Fatal(err)
	}
	if err := store.AddOrUpdate(&accounts.Account{
		ID: "user@example.com", Provider: accounts.ProviderTypeAntigravity,
		AccessToken: "oauth-token", RefreshToken: "refresh-token", IsActive: true,
	}); err != nil {
		t.Fatal(err)
	}

	if shouldUseStoredAntigravity(&config.Config{
		Provider: config.ProviderGemini, APIKey: "AIza-api-key",
	}, store) {
		t.Fatal("did not expect a Gemini API key to use Antigravity account auth")
	}
}

func TestBuildStandaloneSessionHasNoWorkspaceTools(t *testing.T) {
	app := NewApp()
	runtimeState, err := app.buildSession("")
	if err != nil {
		t.Fatal(err)
	}
	if runtimeState.session.WorkspaceDir != "" {
		t.Fatalf("expected empty workspace, got %q", runtimeState.session.WorkspaceDir)
	}
	if tools := runtimeState.session.Tools.All(); len(tools) != 0 {
		t.Fatalf("expected no workspace tools, got %d", len(tools))
	}
}
