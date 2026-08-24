package main

import (
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

type pendingToolCall struct {
	arguments       map[string]interface{}
	originalLines   int
	originalSnippet string
}

func summarizeToolArguments(arguments map[string]interface{}) map[string]interface{} {
	result := make(map[string]interface{})
	for _, key := range []string{"TargetFile", "path", "Command", "command", "Overwrite", "url"} {
		if value, ok := arguments[key]; ok {
			if text, ok := value.(string); ok && len(text) > 240 {
				result[key] = text[:240] + "…"
			} else {
				result[key] = value
			}
		}
	}
	return result
}

func (ui *desktopUI) rememberToolCall(name string, arguments map[string]interface{}) {
	if name == "" {
		return
	}
	originalLines := -1
	originalSnippet := ""
	if target := toolString(arguments, "TargetFile", "path"); target != "" {
		if content, err := os.ReadFile(ui.resolveToolPath(target)); err == nil {
			text := string(content)
			originalLines = lineCount(text)
			originalSnippet = codeSnippet(text)
		}
	}
	ui.toolMu.Lock()
	defer ui.toolMu.Unlock()
	if ui.pending == nil {
		ui.pending = make(map[string][]pendingToolCall)
	}
	ui.pending[name] = append(ui.pending[name], pendingToolCall{
		arguments: arguments, originalLines: originalLines, originalSnippet: originalSnippet,
	})
}

func (ui *desktopUI) takeToolCall(name string) pendingToolCall {
	ui.toolMu.Lock()
	defer ui.toolMu.Unlock()
	items := ui.pending[name]
	if len(items) == 0 {
		return pendingToolCall{originalLines: -1}
	}
	item := items[0]
	if len(items) == 1 {
		delete(ui.pending, name)
	} else {
		ui.pending[name] = items[1:]
	}
	return item
}

func (ui *desktopUI) toolResultSummary(name, result string, isError bool) map[string]interface{} {
	if !isFileTool(name) {
		return nil
	}
	pending := ui.takeToolCall(name)
	if isError {
		return nil
	}
	target := toolString(pending.arguments, "TargetFile", "path")
	if target == "" {
		return nil
	}
	added, removed := 0, 0
	beforeSnippet, afterSnippet := pending.originalSnippet, ""
	switch name {
	case "write_to_file", "create_file":
		afterSnippet = codeSnippet(toolString(pending.arguments, "CodeContent", "content"))
		added = lineCount(toolString(pending.arguments, "CodeContent", "content"))
		if toolBool(pending.arguments, "Overwrite") && pending.originalLines >= 0 {
			removed = pending.originalLines
		}
	case "replace_file_content", "edit_file_content":
		beforeSnippet = codeSnippet(toolString(pending.arguments, "TargetContent", "target"))
		afterSnippet = codeSnippet(toolString(pending.arguments, "ReplacementContent", "replacement"))
		occurrences := replacementOccurrences(result)
		if occurrences == 0 {
			occurrences = 1
		}
		added = lineCount(toolString(pending.arguments, "ReplacementContent", "replacement")) * occurrences
		removed = lineCount(toolString(pending.arguments, "TargetContent", "target")) * occurrences
	}
	return map[string]interface{}{
		"kind": "file", "filePath": ui.displayToolPath(target),
		"linesAdded": added, "linesRemoved": removed,
		"beforeSnippet": beforeSnippet, "afterSnippet": afterSnippet,
	}
}

func isFileTool(name string) bool {
	return name == "write_to_file" || name == "create_file" || name == "replace_file_content" || name == "edit_file_content"
}

func toolString(arguments map[string]interface{}, keys ...string) string {
	for _, key := range keys {
		if value, ok := arguments[key].(string); ok && strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func toolBool(arguments map[string]interface{}, key string) bool {
	value, _ := arguments[key].(bool)
	return value
}

func (ui *desktopUI) resolveToolPath(path string) string {
	if filepath.IsAbs(path) || ui.workspace == "" {
		return path
	}
	return filepath.Join(ui.workspace, path)
}

func (ui *desktopUI) displayToolPath(path string) string {
	resolved := filepath.Clean(ui.resolveToolPath(path))
	if filepath.IsAbs(resolved) && ui.workspace != "" {
		if relative, err := filepath.Rel(ui.workspace, resolved); err == nil && relative != ".." && !strings.HasPrefix(relative, ".."+string(filepath.Separator)) {
			return filepath.ToSlash(relative)
		}
	}
	return filepath.ToSlash(path)
}

func lineCount(value string) int {
	value = strings.ReplaceAll(value, "\r\n", "\n")
	if value == "" {
		return 0
	}
	count := strings.Count(value, "\n")
	if !strings.HasSuffix(value, "\n") {
		count++
	}
	return count
}

func codeSnippet(value string) string {
	value = strings.TrimSpace(strings.ReplaceAll(value, "\r\n", "\n"))
	if value == "" {
		return ""
	}
	runes := []rune(value)
	if len(runes) > 1600 {
		return string(runes[:1600]) + "\n…"
	}
	return value
}

func replacementOccurrences(result string) int {
	fields := strings.Fields(result)
	for index, field := range fields {
		if field != "replaced" || index+1 >= len(fields) {
			continue
		}
		digits := strings.TrimFunc(fields[index+1], func(r rune) bool {
			return r < '0' || r > '9'
		})
		if count, err := strconv.Atoi(digits); err == nil {
			return count
		}
	}
	return 0
}
