package main

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"mncode/pkg/persistence"
)

func TestMigrateDesktopLocalStorageIsCopyOnWriteAndIdempotent(t *testing.T) {
	ctx := context.Background()
	dir := t.TempDir()
	store, err := persistence.Open(ctx, persistence.StoreConfig{Path: filepath.Join(dir, "state.db")})
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	chatJSON := `[{"id":"chat-a","title":"Old chat","updatedAt":1700000000000,"messages":[{"id":"m-1","role":"user","content":"hello"}]}]`
	notesJSON := `["remember this"]`
	automationJSON := `{"automations":[{"id":"automation-a","name":"Daily","prompt":"run checks","workspace":"/tmp/project"}]}`

	first, err := migrateDesktopLocalStorage(ctx, store, chatJSON, notesJSON, automationJSON, "/tmp/project", dir)
	if err != nil {
		t.Fatal(err)
	}
	if first.Status != "complete" || first.AlreadyImported {
		t.Fatalf("unexpected first report: %+v", first)
	}
	if first.SourceCount != 3 || first.ImportedCount != 3 || first.SourceHash == "" || first.ImportedHash == "" {
		t.Fatalf("missing count/hash metadata: %+v", first)
	}
	backup, err := os.ReadFile(first.BackupPath)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(backup), "chat-a") {
		t.Fatalf("backup does not contain source export: %s", backup)
	}
	if mode := func() os.FileMode { info, _ := os.Stat(first.BackupPath); return info.Mode().Perm() }(); mode != 0o600 {
		t.Fatalf("backup mode = %o, want 600", mode)
	}

	second, err := migrateDesktopLocalStorage(ctx, store, chatJSON, notesJSON, automationJSON, "/tmp/project", dir)
	if err != nil {
		t.Fatal(err)
	}
	if !second.AlreadyImported || second.Status != "complete" || second.SourceFingerprint != first.SourceFingerprint {
		t.Fatalf("rerun was not idempotent: %+v", second)
	}
	sessions, err := store.ListSessions(ctx, persistence.SearchFilter{})
	if err != nil {
		t.Fatal(err)
	}
	if len(sessions) != 3 {
		t.Fatalf("canonical session count = %d, want 3", len(sessions))
	}
}

func TestMigrateDesktopReportDoesNotEchoLegacySecrets(t *testing.T) {
	ctx := context.Background()
	dir := t.TempDir()
	store, err := persistence.Open(ctx, persistence.StoreConfig{Path: filepath.Join(dir, "state.db")})
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	secret := "legacy-secret-value"
	report, err := migrateDesktopLocalStorage(ctx, store, `[]`, `[]`, `{"automations":[{"id":"a","prompt":"`+secret+`"}]}`, "", dir)
	if err != nil {
		t.Fatal(err)
	}
	wire, err := json.Marshal(report)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(wire), secret) {
		t.Fatalf("migration report leaked source secret: %s", wire)
	}
}
