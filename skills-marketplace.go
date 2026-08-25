// Skill marketplace surface for the UI: thin wrappers over the shared
// implementation in the agent core (mncode/pkg/skills).
package main

import (
	"mncode/pkg/skills"
)

type DesktopSkill = skills.MarketplaceSkill
type DesktopSkillsMarketplace = skills.SkillsMarketplace

// reloadSessionSkills refreshes the running session's skill catalog after an
// install or delete.
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

// GetSkillsMarketplace returns installed skills plus the curated free catalog.
func (a *App) GetSkillsMarketplace() (DesktopSkillsMarketplace, error) {
	return skills.GetMarketplace()
}

// InstallMarketplaceSkill downloads a catalog skill's SKILL.md into the user
// skills directory and reloads the running session's catalog.
func (a *App) InstallMarketplaceSkill(slug string) (DesktopSkill, error) {
	installed, err := skills.InstallMarketplaceSkill(slug)
	if err != nil {
		return skills.MarketplaceSkill{}, err
	}
	a.reloadSessionSkills()
	return installed, nil
}

// DeleteInstalledSkill removes a user-installed skill by id; system skills are
// protected.
func (a *App) DeleteInstalledSkill(id string) error {
	if err := skills.DeleteInstalledSkill(id); err != nil {
		return err
	}
	a.reloadSessionSkills()
	return nil
}
