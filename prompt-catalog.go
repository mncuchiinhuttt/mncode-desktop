// Prompt suggestions (commands, skills, context) for the composer.
package main

import (
	"sort"
	"strings"

	"mncode/pkg/ui"
)

func promptCatalog(session *sessionRuntime) DesktopPromptCatalog {
	result := DesktopPromptCatalog{
		Context:  make([]DesktopPromptOption, 0),
		Commands: make([]DesktopPromptOption, 0),
		Skills:   make([]DesktopPromptOption, 0),
	}

	for _, option := range ui.GetSlashOptions() {
		result.Commands = append(result.Commands, DesktopPromptOption{
			ID: option.Command, Label: option.Command, Detail: option.Description,
			Category: option.Category, Kind: "command", InsertText: option.Command,
		})
	}

	if session == nil || session.session == nil {
		return result
	}

	if session.session.WorkspaceDir != "" {
		for _, option := range ui.ScanWorkspaceContext(session.session.WorkspaceDir) {
			result.Context = append(result.Context, DesktopPromptOption{
				ID: option.Tag, Label: option.Label, Detail: option.Detail,
				Category: "Context", Kind: option.Type, InsertText: option.Tag,
			})
		}
	}

	if session.session.Catalog == nil {
		return result
	}

	type skillOption struct {
		name        string
		description string
		filePath    string
	}
	seen := make(map[string]bool)
	skills := make([]skillOption, 0, len(session.session.Catalog.Skills))
	for _, skill := range session.session.Catalog.Skills {
		if skill == nil || strings.TrimSpace(skill.Name) == "" {
			continue
		}
		key := skill.FilePath
		if key == "" {
			key = skill.Name
		}
		if seen[key] {
			continue
		}
		seen[key] = true
		description := strings.TrimSpace(skill.Description)
		if description == "" {
			description = "Activate this CLI skill for the next turn"
		}
		skills = append(skills, skillOption{name: skill.Name, description: description, filePath: key})
	}
	sort.Slice(skills, func(i, j int) bool { return strings.ToLower(skills[i].name) < strings.ToLower(skills[j].name) })
	for _, skill := range skills {
		insert := "/ck:" + skill.name
		result.Skills = append(result.Skills, DesktopPromptOption{
			ID: skill.filePath, Label: insert, Detail: skill.description,
			Category: "Skills", Kind: "skill", InsertText: insert,
		})
	}

	return result
}
