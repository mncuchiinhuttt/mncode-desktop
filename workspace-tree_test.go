// Tests for workspace tree scanning.
package main

import (
	"os"
	"path/filepath"
	"testing"

	"mncode/pkg/config"
)

// TestValidProvider checks provider name validation.
func TestValidProvider(t *testing.T) {
	valid := []config.ProviderType{config.ProviderAnthropic, config.ProviderOpenAI, config.ProviderGemini, config.ProviderOpenRouter}
	for _, provider := range valid {
		if !validProvider(provider) {
			t.Errorf("expected provider %q to be valid", provider)
		}
	}
	if validProvider(config.ProviderType("unknown")) {
		t.Fatal("unknown provider should be rejected")
	}
}

// TestReadDirectorySkipsIgnoredFolders ensures ignored directories are pruned
// from the tree.
func TestReadDirectorySkipsIgnoredFolders(t *testing.T) {
	root := t.TempDir()
	if err := os.MkdirAll(filepath.Join(root, ".git"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(root, "pkg", "agent"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "README.md"), []byte("readme"), 0o644); err != nil {
		t.Fatal(err)
	}

	nodes := readDirectory(root, 0)
	if len(nodes) != 2 || nodes[0].Name != "pkg" || nodes[1].Name != "README.md" {
		t.Fatalf("unexpected tree: %#v", nodes)
	}
	if len(nodes[0].Children) != 1 || nodes[0].Children[0].Name != "agent" {
		t.Fatalf("nested directory was not preserved: %#v", nodes[0])
	}
}
