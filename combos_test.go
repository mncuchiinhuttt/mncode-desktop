package main

import (
	"testing"
)

func TestDesktopComboCRUD(t *testing.T) {
	app := &App{}
	roles := app.GetStandardRoles()
	if len(roles) != 16 {
		t.Fatalf("expected 16 standard roles, got %d", len(roles))
	}

	combosList, err := app.GetCombos()
	if err != nil {
		t.Fatalf("GetCombos() error = %v", err)
	}
	if len(combosList) < 4 {
		t.Fatalf("expected at least 4 presets, got %d", len(combosList))
	}

	customCombo := DesktopCombo{
		ID:          "custom-unit-test-combo",
		Name:        "Custom Test Combo",
		Description: "A test combo for unit verification",
		Mode:        "pipeline",
		Members: []DesktopComboMember{
			{ID: "m1", Role: "planner", BaseAgent: "planner", Model: "auto", FallbackModel: "auto"},
			{ID: "m2", Role: "coder", BaseAgent: "coder", Model: "auto", FallbackModel: "none"},
		},
	}

	if err := app.SaveCombo(customCombo); err != nil {
		t.Fatalf("SaveCombo() error = %v", err)
	}

	retrieved, err := app.GetCombos()
	if err != nil {
		t.Fatalf("GetCombos() after save error = %v", err)
	}

	found := false
	for _, c := range retrieved {
		if c.ID == customCombo.ID {
			found = true
			if len(c.Members) != 2 {
				t.Fatalf("expected 2 members, got %d", len(c.Members))
			}
			break
		}
	}
	if !found {
		t.Fatalf("saved combo %q not found in list", customCombo.ID)
	}

	if err := app.DeleteCombo(customCombo.ID); err != nil {
		t.Fatalf("DeleteCombo() error = %v", err)
	}
}
