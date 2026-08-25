package main

import (
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func newTestStore(t *testing.T) *automationStore {
	t.Helper()
	return newAutomationStore(filepath.Join(t.TempDir(), "automations.json"))
}

func validScheduledInput() AutomationInput {
	return AutomationInput{
		Name:     "Morning dev brief",
		Prompt:   "Summarize commits since the previous workday.",
		Kind:     AutomationKindScheduled,
		Schedule: "0 9 * * 1-5",
		Enabled:  true,
	}
}

func TestCreatePersistsAcrossReload(t *testing.T) {
	path := filepath.Join(t.TempDir(), "automations.json")
	store := newAutomationStore(path)

	automation := mustAutomation(t, validScheduledInput())
	if err := store.create(automation); err != nil {
		t.Fatalf("create: %v", err)
	}

	reloaded := newAutomationStore(path)
	list := reloaded.list()
	if len(list) != 1 {
		t.Fatalf("reloaded store has %d automations, want 1", len(list))
	}
	if list[0].ID != automation.ID {
		t.Fatalf("reloaded id = %s, want %s", list[0].ID, automation.ID)
	}
}

func TestUpdatePreservesRunHistory(t *testing.T) {
	store := newTestStore(t)
	created := mustAutomation(t, validScheduledInput())
	if err := store.create(created); err != nil {
		t.Fatalf("create: %v", err)
	}
	if err := store.appendRun(created.ID, AutomationRun{StartedAt: 42, Status: "success", Detail: "ok"}); err != nil {
		t.Fatalf("appendRun: %v", err)
	}

	if err := store.update(created.ID, func(existing *Automation) {
		existing.Name = "Renamed brief"
		existing.Enabled = false
	}); err != nil {
		t.Fatalf("update: %v", err)
	}

	updated, ok := store.get(created.ID)
	if !ok {
		t.Fatal("automation disappeared after update")
	}
	if updated.Name != "Renamed brief" || updated.Enabled {
		t.Fatalf("update not applied: %+v", updated)
	}
	if updated.CreatedAt != created.CreatedAt {
		t.Fatal("update must preserve CreatedAt")
	}
	if updated.RunCount != 1 || len(updated.Runs) != 1 || updated.LastRunAt != 42 {
		t.Fatalf("update must preserve run history: %+v", updated)
	}
}

func TestDeleteRemovesAutomation(t *testing.T) {
	store := newTestStore(t)
	created := mustAutomation(t, validScheduledInput())
	if err := store.create(created); err != nil {
		t.Fatalf("create: %v", err)
	}
	if err := store.delete(created.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if _, ok := store.get(created.ID); ok {
		t.Fatal("automation still present after delete")
	}
	if err := store.delete(created.ID); err == nil {
		t.Fatal("deleting a missing automation must fail")
	}
}

func TestAppendRunCapsHistoryAndBumpsCounters(t *testing.T) {
	store := newTestStore(t)
	created := mustAutomation(t, validScheduledInput())
	if err := store.create(created); err != nil {
		t.Fatalf("create: %v", err)
	}
	for index := 0; index < automationRunCap+5; index++ {
		if err := store.appendRun(created.ID, AutomationRun{
			StartedAt: int64(1000 + index),
			Status:    "success",
		}); err != nil {
			t.Fatalf("appendRun %d: %v", index, err)
		}
	}

	updated, _ := store.get(created.ID)
	if updated.RunCount != automationRunCap+5 {
		t.Fatalf("RunCount = %d, want %d", updated.RunCount, automationRunCap+5)
	}
	if len(updated.Runs) != automationRunCap {
		t.Fatalf("history length = %d, want cap %d", len(updated.Runs), automationRunCap)
	}
	if updated.Runs[0].StartedAt != int64(1000+automationRunCap+4) {
		t.Fatal("newest run must be first")
	}
	if updated.LastRunAt != int64(1000+automationRunCap+4) {
		t.Fatal("LastRunAt must track the newest run")
	}
}

func TestNewAutomationFromInputValidation(t *testing.T) {
	cases := []struct {
		name    string
		input   AutomationInput
		wantErr string
	}{
		{"empty name", AutomationInput{Prompt: "x", Kind: AutomationKindIdle}, "name"},
		{"long name", AutomationInput{Name: strings.Repeat("a", 81), Prompt: "x", Kind: AutomationKindIdle}, "name"},
		{"empty prompt", AutomationInput{Name: "n", Kind: AutomationKindIdle}, "prompt"},
		{"bad kind", AutomationInput{Name: "n", Prompt: "x", Kind: "whenever"}, "kind"},
		{"scheduled without cron", AutomationInput{Name: "n", Prompt: "x", Kind: AutomationKindScheduled}, "cron"},
		{
			"invalid cron",
			AutomationInput{Name: "n", Prompt: "x", Kind: AutomationKindScheduled, Schedule: "not a cron"},
			"invalid cron",
		},
	}
	for _, testCase := range cases {
		if _, err := newAutomationFromInput(testCase.input); err == nil || !strings.Contains(err.Error(), testCase.wantErr) {
			t.Fatalf("%s: expected error containing %q, got %v", testCase.name, testCase.wantErr, err)
		}
	}
}

func TestNewAutomationFromInputAcceptsDescriptorsAndIdle(t *testing.T) {
	idle := validScheduledInput()
	idle.Kind = AutomationKindIdle
	idle.Schedule = ""
	if _, err := newAutomationFromInput(idle); err != nil {
		t.Fatalf("idle automation must not require a schedule: %v", err)
	}

	descriptor := validScheduledInput()
	descriptor.Schedule = "@daily"
	if _, err := newAutomationFromInput(descriptor); err != nil {
		t.Fatalf("@daily descriptor must be accepted: %v", err)
	}
}

func TestStoreRoundTripKeepsFields(t *testing.T) {
	path := filepath.Join(t.TempDir(), "automations.json")
	store := newAutomationStore(path)
	created := mustAutomation(t, validScheduledInput())
	if err := store.create(created); err != nil {
		t.Fatalf("create: %v", err)
	}

	reloaded := newAutomationStore(path)
	got, ok := reloaded.get(created.ID)
	if !ok {
		t.Fatal("automation lost across reload")
	}
	if got.Name != created.Name || got.Schedule != created.Schedule || got.Kind != created.Kind || !got.Enabled {
		t.Fatalf("round-trip mismatch: %+v", got)
	}
	if got.CreatedAt != created.CreatedAt {
		t.Fatal("CreatedAt mismatch across reload")
	}
	if !time.UnixMilli(got.CreatedAt).Before(time.Now()) {
		t.Fatal("CreatedAt should be a past timestamp")
	}
}

func mustAutomation(t *testing.T, input AutomationInput) Automation {
	t.Helper()
	automation, err := newAutomationFromInput(input)
	if err != nil {
		t.Fatalf("newAutomationFromInput: %v", err)
	}
	return automation
}
