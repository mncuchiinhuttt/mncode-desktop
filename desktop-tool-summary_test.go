// Tests for tool result summaries.
package main

import (
	"os"
	"path/filepath"
	"testing"
)

// TestToolResultSummaryForReplacement checks diff summaries for in-place edits.
func TestToolResultSummaryForReplacement(t *testing.T) {
	workspace := t.TempDir()
	target := filepath.Join(workspace, "src", "app.tsx")
	if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(target, []byte("old\ncontent\n"), 0644); err != nil {
		t.Fatal(err)
	}

	ui := &desktopUI{workspace: workspace, pending: make(map[string][]pendingToolCall)}
	ui.rememberToolCall("replace_file_content", map[string]interface{}{
		"TargetFile":         "src/app.tsx",
		"TargetContent":      "old\ncontent",
		"ReplacementContent": "new\ncontent\nwith more",
	})
	summary := ui.toolResultSummary(
		"replace_file_content",
		"Successfully replaced 1 occurrence(s) in src/app.tsx.",
		false,
	)

	if summary["filePath"] != "src/app.tsx" {
		t.Fatalf("unexpected file path: %v", summary["filePath"])
	}
	if summary["linesAdded"] != 3 || summary["linesRemoved"] != 2 {
		t.Fatalf("unexpected line diff: +%v -%v", summary["linesAdded"], summary["linesRemoved"])
	}
}

// TestToolResultSummaryForOverwrite checks summaries for full-file overwrites.
func TestToolResultSummaryForOverwrite(t *testing.T) {
	workspace := t.TempDir()
	target := filepath.Join(workspace, "README.md")
	if err := os.WriteFile(target, []byte("one\ntwo\n"), 0644); err != nil {
		t.Fatal(err)
	}

	ui := &desktopUI{workspace: workspace, pending: make(map[string][]pendingToolCall)}
	ui.rememberToolCall("write_to_file", map[string]interface{}{
		"TargetFile": "README.md", "CodeContent": "a\nb\nc", "Overwrite": true,
	})
	summary := ui.toolResultSummary("write_to_file", "Successfully wrote 5 bytes to README.md.", false)
	if summary["linesAdded"] != 3 || summary["linesRemoved"] != 2 {
		t.Fatalf("unexpected overwrite diff: +%v -%v", summary["linesAdded"], summary["linesRemoved"])
	}
}
