// Custom instructions, personality flags, and local memory management.
package main
import (
	"fmt"
	"strings"
	"time"

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

// GetPersonalization loads custom instructions, personality, and memory state.
func (a *App) GetPersonalization() (DesktopPersonalization, error) {
	cfg, err := a.browserConfig()
	if err != nil {
		return DesktopPersonalization{}, err
	}
	return personalizationFromConfig(cfg), nil
}

// SavePersonalization persists personalization and returns the saved snapshot.
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

// DeleteLocalMemories removes every locally stored memory.
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
type DesktopMemoryItem struct {
	ID           string `json:"id"`
	Topic        string `json:"topic"`
	Category     string `json:"category"`
	Tier         string `json:"tier"`
	Summary      string `json:"summary"`
	Mistake      string `json:"mistake,omitempty"`
	Correction   string `json:"correction,omitempty"`
	Confidence   int    `json:"confidence"`
	HitCount     int    `json:"hitCount"`
	SupersedesID string `json:"supersedesId,omitempty"`
	CreatedAt    string `json:"createdAt"`
	UpdatedAt    string `json:"updatedAt"`
}

// GetSharedMemories returns all memories across workspace and global tiers.
func (a *App) GetSharedMemories() ([]DesktopMemoryItem, error) {
	ws := a.GetWorkspace().Path
	store, err := memory.NewHierarchicalStore(ws)
	if err != nil {
		return nil, err
	}
	all := store.ListAll()
	res := make([]DesktopMemoryItem, 0, len(all))
	for _, it := range all {
		res = append(res, DesktopMemoryItem{
			ID:           it.ID,
			Topic:        it.Topic,
			Category:     string(it.Category),
			Tier:         string(it.Tier),
			Summary:      it.Summary,
			Mistake:      it.Mistake,
			Correction:   it.Correction,
			Confidence:   it.Confidence,
			HitCount:     it.HitCount,
			SupersedesID: it.SupersedesID,
			CreatedAt:    it.CreatedAt.Format(time.RFC3339),
			UpdatedAt:    it.UpdatedAt.Format(time.RFC3339),
		})
	}
	return res, nil
}

// SaveSharedMemory persists or evolves a shared memory entry.
func (a *App) SaveSharedMemory(item DesktopMemoryItem) error {
	ws := a.GetWorkspace().Path
	store, err := memory.NewHierarchicalStore(ws)
	if err != nil {
		return err
	}
	tier := memory.TierWorkspace
	if item.Tier == "global" {
		tier = memory.TierGlobal
	}
	lesson := memory.ReflectiveLesson{
		Topic:      item.Topic,
		Category:   memory.MemoryCategory(item.Category),
		Summary:    item.Summary,
		Mistake:    item.Mistake,
		Correction: item.Correction,
		Confidence: item.Confidence,
		Source:     "desktop-ui",
	}
	_, _, err = memory.EvolveMemory(store, lesson, tier)
	return err
}

// DeleteSharedMemory deletes a memory entry by ID.
func (a *App) DeleteSharedMemory(id string) error {
	ws := a.GetWorkspace().Path
	store, err := memory.NewHierarchicalStore(ws)
	if err != nil {
		return err
	}
	return store.Delete(id)
}
