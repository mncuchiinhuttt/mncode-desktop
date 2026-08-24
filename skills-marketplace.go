package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"mncode/pkg/skills"
)

type DesktopSkill struct {
	ID             string `json:"id"`
	Slug           string `json:"slug"`
	Name           string `json:"name"`
	Description    string `json:"description"`
	Category       string `json:"category"`
	Source         string `json:"source"`
	System         bool   `json:"system"`
	Installed      bool   `json:"installed"`
	Free           bool   `json:"free"`
	MarketplaceURL string `json:"marketplaceUrl"`
}

type DesktopSkillsMarketplace struct {
	SystemSkills    []DesktopSkill `json:"systemSkills"`
	UserSkills      []DesktopSkill `json:"userSkills"`
	AvailableSkills []DesktopSkill `json:"availableSkills"`
	SourceURL       string         `json:"sourceUrl"`
}

func (a *App) GetSkillsMarketplace() (DesktopSkillsMarketplace, error) {
	system, user := installedSkills()
	installed := make(map[string]bool)
	for _, skill := range append(append([]DesktopSkill{}, system...), user...) {
		installed[strings.ToLower(skill.Name)] = true
		installed[skill.Slug] = true
	}
	available := make([]DesktopSkill, 0, len(freeMarketplaceSkills))
	for _, definition := range freeMarketplaceSkills {
		available = append(available, DesktopSkill{
			ID: "market:" + definition.Slug, Slug: definition.Slug,
			Name: definition.Name, Description: definition.Description,
			Category: definition.Category, Source: "MCP Market",
			Free: true, Installed: installed[definition.Slug],
			MarketplaceURL: definition.MarketURL,
		})
	}
	return DesktopSkillsMarketplace{SystemSkills: system, UserSkills: user, AvailableSkills: available, SourceURL: mcpMarketSkillsURL}, nil
}

func (a *App) InstallMarketplaceSkill(slug string) (DesktopSkill, error) {
	definition, ok := findMarketplaceSkill(slug)
	if !ok {
		return DesktopSkill{}, fmt.Errorf("marketplace skill not found: %s", slug)
	}
	content, err := downloadSkill(definition)
	if err != nil {
		return DesktopSkill{}, err
	}
	root, err := userSkillsRoot()
	if err != nil {
		return DesktopSkill{}, err
	}
	directory := filepath.Join(root, safeSkillFolder(definition.Slug))
	if err := os.MkdirAll(directory, 0700); err != nil {
		return DesktopSkill{}, err
	}
	if err := os.WriteFile(filepath.Join(directory, "SKILL.md"), content, 0600); err != nil {
		return DesktopSkill{}, err
	}
	a.reloadSessionSkills()
	return DesktopSkill{ID: "user:" + safeSkillFolder(definition.Slug), Slug: definition.Slug, Name: definition.Name, Description: definition.Description, Category: definition.Category, Source: "Installed", Installed: true, Free: true, MarketplaceURL: definition.MarketURL}, nil
}

func (a *App) DeleteInstalledSkill(id string) error {
	if !strings.HasPrefix(id, "user:") {
		return fmt.Errorf("system skills cannot be deleted")
	}
	folder := safeSkillFolder(strings.TrimPrefix(id, "user:"))
	if folder == "" || folder != strings.TrimPrefix(id, "user:") {
		return fmt.Errorf("invalid skill id")
	}
	root, err := userSkillsRoot()
	if err != nil {
		return err
	}
	directory := filepath.Join(root, folder)
	if _, err := os.Stat(filepath.Join(directory, "SKILL.md")); err != nil {
		return fmt.Errorf("installed skill not found")
	}
	if err := os.RemoveAll(directory); err != nil {
		return err
	}
	a.reloadSessionSkills()
	return nil
}

func installedSkills() (system, user []DesktopSkill) {
	catalog, _ := skills.LoadCatalog("")
	root, _ := userSkillsRoot()
	seen := make(map[string]bool)
	for _, skill := range catalog.Skills {
		if skill == nil || skill.FilePath == "" || seen[skill.FilePath] {
			continue
		}
		seen[skill.FilePath] = true
		isUser := isInside(skill.Directory, root)
		item := DesktopSkill{ID: "system:" + skill.Name, Slug: strings.ToLower(skill.Name), Name: skill.Name, Description: skill.Description, Source: "System", System: !isUser, Installed: true, Free: true}
		if isUser {
			item.ID = "user:" + filepath.Base(skill.Directory)
			item.Source = "Installed"
			user = append(user, item)
		} else {
			system = append(system, item)
		}
	}
	return system, user
}

func (a *App) reloadSessionSkills() {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.session == nil || a.session.session == nil || a.session.session.Config == nil {
		return
	}
	catalog, err := skills.LoadCatalog(a.session.session.Config.ClaudeDir)
	if err == nil {
		a.session.session.Catalog = catalog
	}
}

func findMarketplaceSkill(slug string) (marketplaceSkillDefinition, bool) {
	for _, definition := range freeMarketplaceSkills {
		if definition.Slug == strings.TrimSpace(slug) {
			return definition, true
		}
	}
	return marketplaceSkillDefinition{}, false
}

func downloadSkill(definition marketplaceSkillDefinition) ([]byte, error) {
	client := &http.Client{}
	var lastErr error
	for _, branch := range []string{"main", "master"} {
		path := strings.Trim(definition.SkillPath, "/")
		rawURL := fmt.Sprintf("https://raw.githubusercontent.com/%s/%s/%s/SKILL.md", definition.Repository, branch, path)
		if path == "" {
			rawURL = fmt.Sprintf("https://raw.githubusercontent.com/%s/%s/SKILL.md", definition.Repository, branch)
		}
		request, _ := http.NewRequest(http.MethodGet, rawURL, nil)
		request.Header.Set("User-Agent", "mncode-desktop-skills")
		response, err := client.Do(request)
		if err != nil {
			lastErr = err
			continue
		}
		body, readErr := io.ReadAll(io.LimitReader(response.Body, 2<<20))
		response.Body.Close()
		if readErr == nil && response.StatusCode >= 200 && response.StatusCode < 300 && len(body) > 0 {
			return body, nil
		}
		lastErr = fmt.Errorf("source returned status %d", response.StatusCode)
	}
	return nil, fmt.Errorf("could not download %s: %w", definition.Name, lastErr)
}

func userSkillsRoot() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".mncode", "skills"), nil
}

func safeSkillFolder(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	value = strings.ReplaceAll(value, " ", "-")
	for _, char := range []string{"/", "\\", ".."} {
		value = strings.ReplaceAll(value, char, "")
	}
	return value
}

func isInside(path, root string) bool {
	if path == "" || root == "" {
		return false
	}
	relative, err := filepath.Rel(root, path)
	return err == nil && relative != ".." && !strings.HasPrefix(relative, ".."+string(filepath.Separator))
}
