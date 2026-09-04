// File preview for the workspace tree: reads a workspace-relative file's
// contents so the frontend can show it without opening a full editor.
package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"mncode/pkg/tools"
)

// DesktopFilePreview is the content and metadata for a workspace file shown
// in the read-only preview pane.
type DesktopFilePreview struct {
	Path      string `json:"path"`
	Name      string `json:"name"`
	Language  string `json:"language"`
	Content   string `json:"content"`
	Size      int64  `json:"size"`
	Lines     int    `json:"lines"`
	Truncated bool   `json:"truncated"`
	Binary    bool   `json:"binary"`
}

// maxPreviewBytes caps how much of a file is read into the preview pane —
// large files are truncated rather than freezing the UI or the IPC bridge.
const maxPreviewBytes = 512 * 1024

// ReadWorkspaceFile reads a file inside the active workspace for the
// read-only preview pane. Rejects paths outside the workspace (including via
// symlink escape) using the same guard the agent's own file tools enforce.
func (a *App) ReadWorkspaceFile(path string) (DesktopFilePreview, error) {
	a.mu.RLock()
	root := a.workspace.Path
	a.mu.RUnlock()
	if root == "" {
		return DesktopFilePreview{}, fmt.Errorf("workspace is not open")
	}

	resolved, err := tools.ResolveWorkspacePath(root, path, false)
	if err != nil {
		return DesktopFilePreview{}, err
	}

	info, err := os.Stat(resolved)
	if err != nil {
		return DesktopFilePreview{}, fmt.Errorf("failed to read file: %w", err)
	}
	if !info.Mode().IsRegular() {
		return DesktopFilePreview{}, fmt.Errorf("%s is not a regular file", path)
	}

	displayPath := path
	if relative, relErr := filepath.Rel(root, resolved); relErr == nil {
		displayPath = filepath.ToSlash(relative)
	}
	name := filepath.Base(resolved)

	file, err := os.Open(resolved)
	if err != nil {
		return DesktopFilePreview{}, fmt.Errorf("failed to open file: %w", err)
	}
	openedInfo, err := file.Stat()
	if err != nil || !openedInfo.Mode().IsRegular() || !os.SameFile(info, openedInfo) {
		return DesktopFilePreview{}, fmt.Errorf("workspace file changed during open")
	}
	info = openedInfo
	defer file.Close()

	buf := make([]byte, maxPreviewBytes+1)
	n, readErr := file.Read(buf)
	if readErr != nil && n == 0 && readErr.Error() != "EOF" {
		return DesktopFilePreview{}, fmt.Errorf("failed to read file: %w", readErr)
	}
	data := buf[:n]

	if looksBinary(data) {
		return DesktopFilePreview{
			Path: displayPath, Name: name, Size: info.Size(), Binary: true,
		}, nil
	}

	truncated := n > maxPreviewBytes
	if truncated {
		data = data[:maxPreviewBytes]
	}
	content := string(data)

	return DesktopFilePreview{
		Path:      displayPath,
		Name:      name,
		Language:  languageForExt(filepath.Ext(name)),
		Content:   content,
		Size:      info.Size(),
		Lines:     strings.Count(content, "\n") + 1,
		Truncated: truncated,
	}, nil
}

// looksBinary applies the same heuristic as most editors: a NUL byte
// anywhere in the sampled prefix means "don't try to render this as text".
func looksBinary(sample []byte) bool {
	limit := len(sample)
	if limit > 8000 {
		limit = 8000
	}
	for _, b := range sample[:limit] {
		if b == 0 {
			return true
		}
	}
	return false
}

var extLanguages = map[string]string{
	".go":         "go",
	".ts":         "typescript",
	".tsx":        "tsx",
	".js":         "javascript",
	".jsx":        "jsx",
	".mjs":        "javascript",
	".cjs":        "javascript",
	".json":       "json",
	".md":         "markdown",
	".mdx":        "markdown",
	".yaml":       "yaml",
	".yml":        "yaml",
	".toml":       "toml",
	".css":        "css",
	".scss":       "scss",
	".html":       "html",
	".py":         "python",
	".rs":         "rust",
	".rb":         "ruby",
	".java":       "java",
	".kt":         "kotlin",
	".c":          "c",
	".h":          "c",
	".cpp":        "cpp",
	".hpp":        "cpp",
	".cs":         "csharp",
	".php":        "php",
	".sh":         "bash",
	".bash":       "bash",
	".zsh":        "bash",
	".sql":        "sql",
	".proto":      "protobuf",
	".graphql":    "graphql",
	".dockerfile": "dockerfile",
	".xml":        "xml",
	".swift":      "swift",
	".vue":        "vue",
	".svelte":     "svelte",
}

func languageForExt(ext string) string {
	if lang, ok := extLanguages[strings.ToLower(ext)]; ok {
		return lang
	}
	return "text"
}
