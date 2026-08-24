package main

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"

	"mncode/pkg/accounts"
	"mncode/pkg/agent"
	"mncode/pkg/config"
	"mncode/pkg/ui"
)

func (a *App) GetCatalog() DesktopCatalog {
	a.mu.RLock()
	var session *sessionRuntime
	if a.session != nil {
		session = a.session
	}
	a.mu.RUnlock()
	catalogSession := session
	if catalogSession == nil {
		if cfg, err := config.LoadConfig(""); err == nil {
			store, _ := accounts.NewStore("")
			catalogSession = &sessionRuntime{session: &agent.Session{Config: cfg, Accounts: store}}
		}
	}

	result := DesktopCatalog{
		Models:      []DesktopModel{},
		Workflows:   []DesktopMode{},
		Efforts:     []DesktopMode{},
		Permissions: permissionCatalog(),
		Themes:      []DesktopTheme{},
		Prompt:      promptCatalog(session),
	}

	if catalogSession != nil && catalogSession.session != nil {
		for _, model := range ui.GetAvailableModels(catalogSession.session) {
			providerName := string(model.Provider)
			if model.Provider == config.ProviderCustom {
				providerName = "custom:" + model.ProviderID
			}
			result.Models = append(result.Models, DesktopModel{
				ID: model.ID, Name: model.Name, Provider: providerName,
				Tag: model.Tag, Description: model.Description,
			})
		}
	}
	for _, option := range ui.GetWorkflowOptions() {
		result.Workflows = append(result.Workflows, DesktopMode{ID: option.ID, Label: option.Label, Description: option.Description})
	}
	for _, option := range ui.GetEffortOptions() {
		result.Efforts = append(result.Efforts, DesktopMode{ID: option.ID, Label: option.Label, Budget: option.Budget, Description: option.Description})
	}
	for _, theme := range ui.GetThemeCatalog() {
		if theme.ID == "light" || theme.ID == "dark" {
			result.Themes = append(result.Themes, DesktopTheme{ID: theme.ID, Name: theme.Name, Description: theme.Description, IsDark: theme.IsDark})
		}
	}
	if catalogSession != nil && catalogSession.session != nil && catalogSession.session.Config != nil {
		result.Settings = settingsFromConfig(catalogSession.session.Config, catalogSession.session)
	}
	return result
}

func (a *App) UpdateSettings(input DesktopSettingsInput) (DesktopSettings, error) {
	a.mu.Lock()
	if a.session != nil && a.session.session != nil && a.session.session.Config != nil {
		session := a.session.session
		settings, err := applySettings(session.Config, session, input)
		a.mu.Unlock()
		return settings, err
	}
	a.mu.Unlock()

	cfg, err := config.LoadConfig("")
	if err != nil {
		return DesktopSettings{}, err
	}
	return applySettings(cfg, &agent.Session{Config: cfg}, input)
}

func applySettings(cfg *config.Config, session *agent.Session, input DesktopSettingsInput) (DesktopSettings, error) {
	if value := strings.TrimSpace(input.Model); value != "" {
		cfg.Model = value
	}
	if value := strings.TrimSpace(input.Provider); value != "" {
		if strings.HasPrefix(value, "custom:") {
			providerID := strings.TrimPrefix(value, "custom:")
			custom, ok := cfg.GetCustomProvider(providerID)
			if !ok {
				return DesktopSettings{}, fmt.Errorf("unknown custom provider: %s", providerID)
			}
			cfg.Provider = config.ProviderCustom
			cfg.CustomProviderID = providerID
			cfg.APIKey = custom.APIKey
			cfg.BaseURL = custom.BaseURL
		} else {
			providerType := config.ProviderType(value)
			if !validProvider(providerType) {
				return DesktopSettings{}, fmt.Errorf("unknown provider: %s", value)
			}
			cfg.Provider = providerType
			cfg.CustomProviderID = ""
			cfg.BaseURL = providerBaseURL(providerType)
		}
	}
	if value := strings.TrimSpace(input.Effort); value != "" {
		option, ok := findEffort(value)
		if !ok {
			return DesktopSettings{}, fmt.Errorf("unknown effort: %s", value)
		}
		cfg.Effort = option.ID
		cfg.ThinkingBudget = option.Budget
	}
	if value := strings.TrimSpace(input.Workflow); value != "" {
		if !findWorkflow(value) {
			return DesktopSettings{}, fmt.Errorf("unknown workflow: %s", value)
		}
		cfg.Workflow = value
	}
	if value := strings.TrimSpace(input.PermissionMode); value != "" {
		switch config.PermissionMode(value) {
		case config.PermissionModeAsk:
			cfg.PermissionMode, cfg.AutoApprove = config.PermissionModeAsk, false
		case config.PermissionModeAuto:
			cfg.PermissionMode, cfg.AutoApprove = config.PermissionModeAuto, true
		case config.PermissionModeBypass:
			cfg.PermissionMode, cfg.AutoApprove = config.PermissionModeBypass, true
		case config.PermissionModePlan:
			cfg.PermissionMode, cfg.AutoApprove = config.PermissionModePlan, false
		default:
			return DesktopSettings{}, fmt.Errorf("unknown permission mode: %s", value)
		}
	}
	if value := strings.TrimSpace(input.DefaultPermissionMode); value != "" {
		if value != "latest" && !isPermissionMode(value) {
			return DesktopSettings{}, fmt.Errorf("unknown default permission mode: %s", value)
		}
		cfg.SetSetting("default_permission_mode", value)
	}
	if value := strings.TrimSpace(input.Theme); value != "" {
		if value != "light" && value != "dark" && value != "system" {
			return DesktopSettings{}, fmt.Errorf("desktop supports system, light, or dark theme")
		}
		cfg.SetSetting("theme", value)
	}
	if input.UIFontSize != 0 {
		if input.UIFontSize < 11 || input.UIFontSize > 20 {
			return DesktopSettings{}, fmt.Errorf("UI font size must be between 11 and 20")
		}
		cfg.SetSetting("ui_font_size", strconv.Itoa(input.UIFontSize))
	}
	if input.CodeFontSize != 0 {
		if input.CodeFontSize < 10 || input.CodeFontSize > 24 {
			return DesktopSettings{}, fmt.Errorf("code font size must be between 10 and 24")
		}
		cfg.SetSetting("code_font_size", strconv.Itoa(input.CodeFontSize))
	}
	if value := strings.TrimSpace(input.LightCodeTheme); value != "" {
		cfg.SetSetting("light_code_theme", value)
	}
	if value := strings.TrimSpace(input.DarkCodeTheme); value != "" {
		cfg.SetSetting("dark_code_theme", value)
	}
	if input.ShowLineNumbers != nil {
		cfg.SetSetting("show_line_numbers", strconv.FormatBool(*input.ShowLineNumbers))
	}
	if input.WrapLines != nil {
		cfg.SetSetting("wrap_lines", strconv.FormatBool(*input.WrapLines))
	}
	if input.ShowContextWindowUsage != nil {
		cfg.SetSetting("show_context_window_usage", strconv.FormatBool(*input.ShowContextWindowUsage))
	}
	if input.SuggestedPrompts != nil {
		cfg.SetSetting("suggested_prompts", strconv.FormatBool(*input.SuggestedPrompts))
	}
	if value := strings.TrimSpace(input.SendShortcut); value != "" {
		if value != "enter" && value != "command-enter" {
			return DesktopSettings{}, fmt.Errorf("unknown send shortcut: %s", value)
		}
		cfg.SetSetting("send_shortcut", value)
	}
	if value := strings.TrimSpace(input.ContextWindow); value != "" {
		if value != "200K" && value != "300K" && value != "500K" && value != "1M" {
			return DesktopSettings{}, fmt.Errorf("unknown context window: %s", value)
		}
		cfg.ContextWindow = value
		cfg.SetSetting("context_window", value)
	}
	if input.AutoCompact != nil {
		cfg.SetSetting("auto_compact", strconv.FormatBool(*input.AutoCompact))
	}
	if value := strings.TrimSpace(input.Language); value != "" {
		allowed := map[string]bool{"Default (English)": true, "Vietnamese": true, "Japanese": true, "Chinese": true, "Spanish": true, "French": true, "German": true}
		if !allowed[value] {
			return DesktopSettings{}, fmt.Errorf("unknown language: %s", value)
		}
		cfg.SetSetting("language", value)
	}
	if input.Artifacts != nil {
		cfg.SetSetting("artifacts", strconv.FormatBool(*input.Artifacts))
	}
	if value := strings.TrimSpace(input.InterruptMode); value != "" {
		if value != "queue" && value != "steer" {
			return DesktopSettings{}, fmt.Errorf("unknown interrupt mode: %s", value)
		}
		cfg.SetSetting("interrupt_mode", value)
	}
	if input.VerboseOutput != nil {
		cfg.Verbose = *input.VerboseOutput
		cfg.SetSetting("verbose_output", strconv.FormatBool(*input.VerboseOutput))
	}
	if err := config.SaveConfig(cfg); err != nil {
		return DesktopSettings{}, err
	}
	if session != nil {
		session.Provider = nil
	}
	return settingsFromConfig(cfg, session), nil
}

func providerBaseURL(providerType config.ProviderType) string {
	switch providerType {
	case config.ProviderOpenCode:
		return "https://opencode.ai/zen/v1"
	case config.ProviderOpenRouter:
		return "https://openrouter.ai/api/v1"
	case config.ProviderOpenAI:
		return "https://api.openai.com/v1"
	default:
		return ""
	}
}

func settingsFromConfig(cfg *config.Config, session *agent.Session) DesktopSettings {
	theme := cfg.GetSetting("theme", "light")
	if theme != "light" && theme != "dark" && theme != "system" {
		theme = "light"
	}
	permission := string(cfg.PermissionMode)
	if permission == "" {
		permission = string(config.PermissionModeAsk)
	}
	defaultPermission := cfg.GetSetting("default_permission_mode", "latest")
	if defaultPermission != "latest" && !isPermissionMode(defaultPermission) {
		defaultPermission = "latest"
	}
	workflow := cfg.Workflow
	if workflow == "" {
		workflow = "auto"
	}
	effort := cfg.Effort
	if effort == "" {
		effort = "high"
	}
	uiFontSize := settingInt(cfg, "ui_font_size", 14)
	codeFontSize := settingInt(cfg, "code_font_size", 12)
	lightCodeTheme := cfg.GetSetting("light_code_theme", "catppuccin-latte")
	darkCodeTheme := cfg.GetSetting("dark_code_theme", "github-dark")
	showLineNumbers := settingBool(cfg, "show_line_numbers", true)
	wrapLines := settingBool(cfg, "wrap_lines", false)
	showContextWindowUsage := settingBool(cfg, "show_context_window_usage", true)
	suggestedPrompts := settingBool(cfg, "suggested_prompts", true)
	sendShortcut := cfg.GetSetting("send_shortcut", "command-enter")
	if sendShortcut != "enter" && sendShortcut != "command-enter" {
		sendShortcut = "command-enter"
	}
	contextWindow := cfg.GetContextWindowLabel()
	autoCompact := settingBool(cfg, "auto_compact", true)
	language := cfg.GetSetting("language", "Default (English)")
	artifacts := settingBool(cfg, "artifacts", true)
	interruptMode := cfg.GetSetting("interrupt_mode", "queue")
	if interruptMode != "queue" && interruptMode != "steer" {
		interruptMode = "queue"
	}
	verboseOutput := cfg.Verbose || settingBool(cfg, "verbose_output", false)
	provider := string(cfg.Provider)
	if cfg.Provider == config.ProviderCustom && cfg.CustomProviderID != "" {
		provider = "custom:" + cfg.CustomProviderID
	}
	usage := session.GetContextUsage()
	return DesktopSettings{
		Model: cfg.Model, Provider: provider, Workflow: workflow,
		Effort: effort, ThinkingBudget: cfg.ThinkingBudget,
		PermissionMode: permission, DefaultPermissionMode: defaultPermission,
		Theme: theme, UIFontSize: uiFontSize,
		CodeFontSize: codeFontSize, LightCodeTheme: lightCodeTheme,
		DarkCodeTheme: darkCodeTheme, ShowLineNumbers: showLineNumbers,
		WrapLines: wrapLines, ShowContextWindowUsage: showContextWindowUsage,
		SuggestedPrompts: suggestedPrompts, SendShortcut: sendShortcut,
		ContextWindow: contextWindow, AutoCompact: autoCompact, Language: language,
		Artifacts: artifacts, InterruptMode: interruptMode, VerboseOutput: verboseOutput,
		ContextPercent: usage.PercentUsed, ContextUsed: usage.TotalUsed, ContextLimit: usage.Limit,
	}
}

func settingInt(cfg *config.Config, key string, fallback int) int {
	value, err := strconv.Atoi(cfg.GetSetting(key, strconv.Itoa(fallback)))
	if err != nil || value <= 0 {
		return fallback
	}
	return value
}

func settingBool(cfg *config.Config, key string, fallback bool) bool {
	value, err := strconv.ParseBool(cfg.GetSetting(key, strconv.FormatBool(fallback)))
	if err != nil {
		return fallback
	}
	return value
}

func isPermissionMode(value string) bool {
	switch config.PermissionMode(value) {
	case config.PermissionModeAsk, config.PermissionModeAuto, config.PermissionModeBypass, config.PermissionModePlan:
		return true
	default:
		return false
	}
}

func (a *App) GetBrowserSettings() (DesktopBrowserSettings, error) {
	cfg, err := a.browserConfig()
	if err != nil {
		return DesktopBrowserSettings{}, err
	}
	return browserSettingsFromConfig(cfg), nil
}

func (a *App) UpdateBrowserSettings(input DesktopBrowserSettingsInput) (DesktopBrowserSettings, error) {
	cfg, err := a.browserConfig()
	if err != nil {
		return DesktopBrowserSettings{}, err
	}
	if input.ControlEnabled != nil {
		cfg.SetSetting("browser_control_enabled", strconv.FormatBool(*input.ControlEnabled))
	}
	if input.IgnoreCertificateErrors != nil {
		cfg.SetSetting("browser_ignore_cert_errors", strconv.FormatBool(*input.IgnoreCertificateErrors))
	}
	if err := config.SaveConfig(cfg); err != nil {
		return DesktopBrowserSettings{}, err
	}
	return browserSettingsFromConfig(cfg), nil
}

func (a *App) browserConfig() (*config.Config, error) {
	a.mu.RLock()
	if a.session != nil && a.session.session != nil && a.session.session.Config != nil {
		cfg := a.session.session.Config
		a.mu.RUnlock()
		return cfg, nil
	}
	a.mu.RUnlock()
	return config.LoadConfig("")
}

func browserSettingsFromConfig(cfg *config.Config) DesktopBrowserSettings {
	return DesktopBrowserSettings{
		ControlEnabled:          settingBool(cfg, "browser_control_enabled", false),
		IgnoreCertificateErrors: settingBool(cfg, "browser_ignore_cert_errors", false),
		ChromeProfileFound:      chromeProfilePath() != "",
		BuiltInBrowserAvailable: false,
	}
}

func chromeProfilePath() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	var candidates []string
	switch runtime.GOOS {
	case "darwin":
		candidates = []string{filepath.Join(home, "Library", "Application Support", "Google", "Chrome", "Default")}
	case "windows":
		if localAppData := os.Getenv("LOCALAPPDATA"); localAppData != "" {
			candidates = []string{filepath.Join(localAppData, "Google", "Chrome", "User Data", "Default")}
		}
	default:
		candidates = []string{filepath.Join(home, ".config", "google-chrome", "Default")}
	}
	for _, candidate := range candidates {
		if info, err := os.Stat(candidate); err == nil && info.IsDir() {
			return candidate
		}
	}
	return ""
}

func permissionCatalog() []DesktopMode {
	return []DesktopMode{
		{ID: string(config.PermissionModeAsk), Label: "Ask before changes", Description: "Ask before file changes"},
		{ID: string(config.PermissionModeAuto), Label: "Edit automatically", Description: "Edit files automatically"},
		{ID: string(config.PermissionModePlan), Label: "Plan mode", Description: "Plan before editing"},
		{ID: string(config.PermissionModeBypass), Label: "Full access", Description: "Run with fewer confirmations"},
	}
}

func findWorkflow(id string) bool {
	for _, option := range ui.GetWorkflowOptions() {
		if option.ID == id {
			return true
		}
	}
	return false
}

func findEffort(id string) (ui.EffortOption, bool) {
	for _, option := range ui.GetEffortOptions() {
		if option.ID == id {
			return option, true
		}
	}
	return ui.EffortOption{}, false
}
