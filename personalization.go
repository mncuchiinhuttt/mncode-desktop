package main

import (
	"fmt"
	"strings"

	"mncode/pkg/config"
	"mncode/pkg/memory"
)

var supportedPersonalities = map[string]bool{
	"pragmatic": true,
	"concise":   true,
	"friendly":  true,
	"mentor":    true,
	"direct":    true,
}

func (a *App) GetPersonalization() (DesktopPersonalization, error) {
	cfg, err := a.browserConfig()
	if err != nil {
		return DesktopPersonalization{}, err
	}
	return personalizationFromConfig(cfg), nil
}

func (a *App) SavePersonalization(input DesktopPersonalizationInput) (DesktopPersonalization, error) {
	cfg, err := a.browserConfig()
	if err != nil {
		return DesktopPersonalization{}, err
	}
	if input.CustomInstructions != nil {
		instructions := strings.TrimSpace(*input.CustomInstructions)
		if len(instructions) > 20000 {
			return DesktopPersonalization{}, fmt.Errorf("custom instructions cannot exceed 20,000 characters")
		}
		cfg.SetSetting("custom_instructions", instructions)
	}
	if personality := strings.ToLower(strings.TrimSpace(input.Personality)); personality != "" {
		if !supportedPersonalities[personality] {
			return DesktopPersonalization{}, fmt.Errorf("unknown personality: %s", personality)
		}
		cfg.SetSetting("personality", personality)
	}
	if input.BrainrotMode != nil {
		cfg.SetSetting("brainrot_mode", fmt.Sprintf("%t", *input.BrainrotMode))
	}
	if input.TrollMode != nil {
		cfg.SetSetting("troll_mode", fmt.Sprintf("%t", *input.TrollMode))
	}
	if settingBool(cfg, "brainrot_mode", false) {
		cfg.SetSetting("troll_mode", "true")
	}
	if input.MemoryEnabled != nil {
		cfg.SetSetting("memory_enabled", fmt.Sprintf("%t", *input.MemoryEnabled))
	}
	if input.MemoryToolAssisted != nil {
		cfg.SetSetting("memory_tool_assisted", fmt.Sprintf("%t", *input.MemoryToolAssisted))
	}
	if err := config.SaveConfig(cfg); err != nil {
		return DesktopPersonalization{}, err
	}
	return personalizationFromConfig(cfg), nil
}

func (a *App) DeleteLocalMemories() (DesktopPersonalization, error) {
	if _, err := memory.Clear(); err != nil {
		return DesktopPersonalization{}, err
	}
	cfg, err := a.browserConfig()
	if err != nil {
		return DesktopPersonalization{}, err
	}
	return personalizationFromConfig(cfg), nil
}

func personalizationFromConfig(cfg *config.Config) DesktopPersonalization {
	personality := strings.ToLower(cfg.GetSetting("personality", "pragmatic"))
	if !supportedPersonalities[personality] {
		personality = "pragmatic"
	}
	entries, _ := memory.Load()
	return DesktopPersonalization{
		CustomInstructions: cfg.GetSetting("custom_instructions", ""),
		Personality:        personality,
		BrainrotMode:       settingBool(cfg, "brainrot_mode", false),
		TrollMode:          settingBool(cfg, "troll_mode", false),
		MemoryEnabled:      settingBool(cfg, "memory_enabled", false),
		MemoryToolAssisted: settingBool(cfg, "memory_tool_assisted", true),
		MemoryCount:        len(entries),
	}
}

func (a *App) markToolUsed() {
	a.mu.Lock()
	if a.activeRun != 0 {
		a.activeRunHadTool = true
	}
	a.mu.Unlock()
}

func (a *App) captureMemoryPrompt(prompt string, toolAssisted bool) {
	a.mu.RLock()
	if a.session == nil || a.session.session == nil || a.session.session.Config == nil {
		a.mu.RUnlock()
		return
	}
	cfg := a.session.session.Config
	a.mu.RUnlock()
	if cfg.GetSetting("memory_enabled", "false") != "true" {
		return
	}
	if toolAssisted && cfg.GetSetting("memory_tool_assisted", "true") != "true" {
		return
	}
	if candidate := memoryCandidate(prompt); candidate != "" {
		_, _ = memory.Add(candidate, "explicit chat instruction")
	}
}

func memoryCandidate(prompt string) string {
	trimmed := strings.TrimSpace(prompt)
	lower := strings.ToLower(trimmed)
	for _, prefix := range []string{"remember that ", "remember: ", "remember "} {
		if strings.HasPrefix(lower, prefix) {
			return strings.TrimSpace(trimmed[len(prefix):])
		}
	}
	return ""
}
