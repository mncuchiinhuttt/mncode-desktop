// Wire types shared with the React frontend. JSON field names are the contract.
package main

import "mncode/pkg/agent"

// LanguageStat is one detected workspace language with its file count.
type LanguageStat struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
}

// WorkspaceInfo describes the workspace currently mounted in the app.
type WorkspaceInfo struct {
	Path        string         `json:"path"`
	Name        string         `json:"name"`
	ProjectType string         `json:"projectType"`
	TotalFiles  int            `json:"totalFiles"`
	TotalLines  int            `json:"totalLines"`
	Languages   []LanguageStat `json:"languages"`
	Ready       bool           `json:"ready"`
}

// FileNode is a workspace file-tree entry (file or directory).
type FileNode struct {
	Name     string     `json:"name"`
	Path     string     `json:"path"`
	IsDir    bool       `json:"isDir"`
	Children []FileNode `json:"children,omitempty"`
}

// DesktopAccount mirrors the signed-in mncode account for the UI.
type DesktopAccount struct {
	Connected bool   `json:"connected"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	IsAdmin   bool   `json:"isAdmin"`
	Status    string `json:"status"`
}

type sessionRuntime struct {
	session *agent.Session
}

// DesktopModel is a model entry exposed by the active provider.
type DesktopModel struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Provider    string `json:"provider"`
	Tag         string `json:"tag"`
	Description string `json:"description"`
}

// DesktopMode is a selectable agent mode (workflow) entry.
type DesktopMode struct {
	ID          string `json:"id"`
	Label       string `json:"label"`
	Description string `json:"description"`
	Budget      int    `json:"budget,omitempty"`
}

// DesktopTheme is a selectable UI theme entry.
type DesktopTheme struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	IsDark      bool   `json:"isDark"`
}

// DesktopSettings is the resolved settings snapshot sent to the frontend.
type DesktopSettings struct {
	Model                  string  `json:"model"`
	Provider               string  `json:"provider"`
	Workflow               string  `json:"workflow"`
	Effort                 string  `json:"effort"`
	ThinkingBudget         int     `json:"thinkingBudget"`
	PermissionMode         string  `json:"permissionMode"`
	DefaultPermissionMode  string  `json:"defaultPermissionMode"`
	Theme                  string  `json:"theme"`
	UIFontSize             int     `json:"uiFontSize"`
	CodeFontSize           int     `json:"codeFontSize"`
	LightCodeTheme         string  `json:"lightCodeTheme"`
	DarkCodeTheme          string  `json:"darkCodeTheme"`
	ShowLineNumbers        bool    `json:"showLineNumbers"`
	WrapLines              bool    `json:"wrapLines"`
	ShowContextWindowUsage bool    `json:"showContextWindowUsage"`
	SuggestedPrompts       bool    `json:"suggestedPrompts"`
	SendShortcut           string  `json:"sendShortcut"`
	ContextWindow          string  `json:"contextWindow"`
	AutoCompact            bool    `json:"autoCompact"`
	Language               string  `json:"language"`
	Artifacts              bool    `json:"artifacts"`
	InterruptMode          string  `json:"interruptMode"`
	VerboseOutput          bool    `json:"verboseOutput"`
	ContextPercent         float64 `json:"contextPercent"`
	ContextUsed            int     `json:"contextUsed"`
	ContextLimit           int     `json:"contextLimit"`
}

// DesktopSettingsInput is a partial settings update from the UI.
type DesktopSettingsInput struct {
	Model                  string `json:"model"`
	Provider               string `json:"provider"`
	Workflow               string `json:"workflow"`
	Effort                 string `json:"effort"`
	PermissionMode         string `json:"permissionMode"`
	DefaultPermissionMode  string `json:"defaultPermissionMode"`
	Theme                  string `json:"theme"`
	UIFontSize             int    `json:"uiFontSize"`
	CodeFontSize           int    `json:"codeFontSize"`
	LightCodeTheme         string `json:"lightCodeTheme"`
	DarkCodeTheme          string `json:"darkCodeTheme"`
	ShowLineNumbers        *bool  `json:"showLineNumbers"`
	WrapLines              *bool  `json:"wrapLines"`
	ShowContextWindowUsage *bool  `json:"showContextWindowUsage"`
	SuggestedPrompts       *bool  `json:"suggestedPrompts"`
	SendShortcut           string `json:"sendShortcut"`
	ContextWindow          string `json:"contextWindow"`
	Language               string `json:"language"`
	InterruptMode          string `json:"interruptMode"`
	AutoCompact            *bool  `json:"autoCompact"`
	Artifacts              *bool  `json:"artifacts"`
	VerboseOutput          *bool  `json:"verboseOutput"`
}

// DesktopBrowserSettings reports built-in browser control state and availability.
type DesktopBrowserSettings struct {
	ControlEnabled          bool `json:"controlEnabled"`
	IgnoreCertificateErrors bool `json:"ignoreCertificateErrors"`
	ChromeProfileFound      bool `json:"chromeProfileFound"`
	BuiltInBrowserAvailable bool `json:"builtInBrowserAvailable"`
}

// DesktopBrowserSettingsInput updates built-in browser control preferences.
type DesktopBrowserSettingsInput struct {
	ControlEnabled          *bool `json:"controlEnabled"`
	IgnoreCertificateErrors *bool `json:"ignoreCertificateErrors"`
}

// DesktopMCPServer is a configured MCP server entry shown in settings.
type DesktopMCPServer struct {
	ID              string `json:"id"`
	Name            string `json:"name"`
	Description     string `json:"description"`
	TokenConfigured bool   `json:"tokenConfigured"`
	Configured      bool   `json:"configured"`
	Connected       bool   `json:"connected"`
}

// DesktopMCPServerInput creates or updates an MCP server connection.
type DesktopMCPServerInput struct {
	ID    string `json:"id"`
	Token string `json:"token"`
}

// DesktopRemoteDevice is a phone companion device paired with the session.
type DesktopRemoteDevice struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Platform string `json:"platform"`
	Status   string `json:"status"`
}

// DesktopRemoteSession is the remote companion session state.
type DesktopRemoteSession struct {
	Active           bool                  `json:"active"`
	SessionID        string                `json:"sessionId"`
	PairingURL       string                `json:"pairingUrl"`
	QRCode           string                `json:"qrCode"`
	Status           string                `json:"status"`
	ConnectedDevices int                   `json:"connectedDevices"`
	Devices          []DesktopRemoteDevice `json:"devices"`
}

// DesktopPersonalization is the user's custom instructions and memory state.
type DesktopPersonalization struct {
	CustomInstructions string `json:"customInstructions"`
	Personality        string `json:"personality"`
	BrainrotMode       bool   `json:"brainrotMode"`
	TrollMode          bool   `json:"trollMode"`
	MemoryEnabled      bool   `json:"memoryEnabled"`
	MemoryToolAssisted bool   `json:"memoryToolAssisted"`
	MemoryCount        int    `json:"memoryCount"`
}

// DesktopPersonalizationInput updates custom instructions or personality flags.
type DesktopPersonalizationInput struct {
	CustomInstructions *string `json:"customInstructions"`
	Personality        string  `json:"personality"`
	BrainrotMode       *bool   `json:"brainrotMode"`
	TrollMode          *bool   `json:"trollMode"`
	MemoryEnabled      *bool   `json:"memoryEnabled"`
	MemoryToolAssisted *bool   `json:"memoryToolAssisted"`
}

// DesktopPromptOption is a suggested slash command, skill, or context entry.
type DesktopPromptOption struct {
	ID         string `json:"id"`
	Label      string `json:"label"`
	Detail     string `json:"detail"`
	Category   string `json:"category"`
	Kind       string `json:"kind"`
	InsertText string `json:"insertText"`
}

// DesktopPromptCatalog groups prompt suggestions by kind for the composer.
type DesktopPromptCatalog struct {
	Context  []DesktopPromptOption `json:"context"`
	Commands []DesktopPromptOption `json:"commands"`
	Skills   []DesktopPromptOption `json:"skills"`
}

// DesktopUsageDay is one day of token usage telemetry.
type DesktopUsageDay struct {
	Date     string `json:"date"`
	Tokens   int64  `json:"tokens"`
	Sessions int64  `json:"sessions"`
}

// DesktopUsageSummary aggregates usage over a time range.
type DesktopUsageSummary struct {
	TotalTokens    int64 `json:"totalTokens"`
	InputTokens    int64 `json:"inputTokens"`
	OutputTokens   int64 `json:"outputTokens"`
	ThinkingTokens int64 `json:"thinkingTokens"`
	TotalSessions  int64 `json:"totalSessions"`
	RecordsCount   int64 `json:"recordsCount"`
}

// DesktopUsageStats is the full usage payload: summary, daily series, and model split.
type DesktopUsageStats struct {
	Summary    DesktopUsageSummary `json:"summary"`
	DailyUsage []DesktopUsageDay   `json:"dailyUsage"`
}

// DesktopProviderAccount is one account in a provider's rotation pool.
type DesktopProviderAccount struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	Provider  string `json:"provider"`
	Active    bool   `json:"active"`
	Available bool   `json:"available"`
	LastError string `json:"lastError,omitempty"`
}

// DesktopModelQuota is the quota headroom for a single model.
type DesktopModelQuota struct {
	ModelID             string  `json:"modelId"`
	DisplayName         string  `json:"displayName"`
	RemainingPercentage float64 `json:"remainingPercentage"`
	ResetIn             string  `json:"resetIn"`
}

// DesktopProviderQuota is the quota snapshot for a provider account.
type DesktopProviderQuota struct {
	AccountID       string              `json:"accountId"`
	Status          string              `json:"status"`
	Healthy         bool                `json:"healthy"`
	Tier            string              `json:"tier"`
	ExpiresIn       string              `json:"expiresIn"`
	ModelQuotas     []DesktopModelQuota `json:"modelQuotas"`
	AvailableModels []string            `json:"availableModels"`
	MaxContext      int                 `json:"maxContext"`
	RPMRemaining    string              `json:"rpmRemaining"`
	TPMRemaining    string              `json:"tpmRemaining"`
	ErrorMessage    string              `json:"errorMessage"`
}

// DesktopCustomModel is a user-defined model entry on a custom provider.
type DesktopCustomModel struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	ContextWindow int    `json:"contextWindow,omitempty"`
}

// DesktopCustomProvider is a user-defined OpenAI-compatible provider.
type DesktopCustomProvider struct {
	ID               string               `json:"id"`
	Name             string               `json:"name"`
	BaseURL          string               `json:"baseUrl"`
	APIFormat        string               `json:"apiFormat"`
	APIKeyConfigured bool                 `json:"apiKeyConfigured"`
	Models           []DesktopCustomModel `json:"models"`
}

// DesktopProviderSettings is the provider configuration surface for settings.
type DesktopProviderSettings struct {
	Accounts               []DesktopProviderAccount `json:"accounts"`
	CustomProviders        []DesktopCustomProvider  `json:"customProviders"`
	OpenCodeConfigured     bool                     `json:"openCodeConfigured"`
	ActiveAntigravityQuota *DesktopProviderQuota    `json:"activeAntigravityQuota,omitempty"`
}

// DesktopCustomProviderInput creates or updates a custom provider.
type DesktopCustomProviderInput struct {
	ID        string               `json:"id"`
	Name      string               `json:"name"`
	BaseURL   string               `json:"baseUrl"`
	APIFormat string               `json:"apiFormat"`
	APIKey    string               `json:"apiKey"`
	Models    []DesktopCustomModel `json:"models"`
}

// DesktopCatalog bundles everything the UI needs: models, modes, themes, settings,
// and prompt suggestions.
type DesktopCatalog struct {
	Models      []DesktopModel       `json:"models"`
	Workflows   []DesktopMode        `json:"workflows"`
	Efforts     []DesktopMode        `json:"efforts"`
	Permissions []DesktopMode        `json:"permissions"`
	Themes      []DesktopTheme       `json:"themes"`
	Settings    DesktopSettings      `json:"settings"`
	Prompt      DesktopPromptCatalog `json:"prompt"`
}
