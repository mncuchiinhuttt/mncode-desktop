// Workspace file-tree scanning for the inspector sidebar.
package main

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"mncode/pkg/agent"
)

func (a *App) loadWorkspace(path string) (WorkspaceInfo, *sessionRuntime, error) {
	absolute, err := filepath.Abs(strings.TrimSpace(path))
	if err != nil {
		return WorkspaceInfo{}, nil, err
	}
	stat, err := os.Stat(absolute)
	if err != nil || !stat.IsDir() {
		return WorkspaceInfo{}, nil, fmt.Errorf("workspace is not a directory: %s", absolute)
	}

	summary, err := agent.ScanCodebase(absolute)
	if err != nil {
		return WorkspaceInfo{}, nil, err
	}
	runtimeState, err := a.buildSession(absolute)
	if err != nil {
		return WorkspaceInfo{}, nil, err
	}

	languages := make([]LanguageStat, 0, len(summary.Languages))
	for name, count := range summary.Languages {
		languages = append(languages, LanguageStat{Name: name, Count: count})
	}
	sort.Slice(languages, func(i, j int) bool { return languages[i].Count > languages[j].Count })

	return WorkspaceInfo{
		Path: absolute, Name: filepath.Base(absolute), ProjectType: summary.ProjectType,
		TotalFiles: summary.TotalFiles, TotalLines: summary.TotalLines,
		Languages: languages, Ready: true,
	}, runtimeState, nil
}

// ListWorkspaceTree returns the workspace file tree for the inspector sidebar.
func (a *App) ListWorkspaceTree() ([]FileNode, error) {
	a.mu.RLock()
	root := a.workspace.Path
	a.mu.RUnlock()
	if root == "" {
		return nil, fmt.Errorf("workspace is not open")
	}
	return readDirectory(root, 0), nil
}

func readDirectory(root string, depth int) []FileNode {
	entries, err := os.ReadDir(root)
	if err != nil {
		return nil
	}
	ignored := map[string]bool{".git": true, "node_modules": true, ".mncode": true, "dist": true, "bin": true}
	nodes := make([]FileNode, 0, len(entries))
	for _, entry := range entries {
		if ignored[entry.Name()] || strings.HasPrefix(entry.Name(), ".") {
			continue
		}
		path := filepath.Join(root, entry.Name())
		node := FileNode{Name: entry.Name(), Path: path, IsDir: entry.IsDir()}
		if entry.IsDir() && depth < 2 {
			node.Children = readDirectory(path, depth+1)
		}
		nodes = append(nodes, node)
	}
	sort.Slice(nodes, func(i, j int) bool {
		if nodes[i].IsDir != nodes[j].IsDir {
			return nodes[i].IsDir
		}
		return strings.ToLower(nodes[i].Name) < strings.ToLower(nodes[j].Name)
	})
	return nodes
}
