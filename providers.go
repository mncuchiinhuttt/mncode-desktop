// Provider accounts, quotas, and custom OpenAI-compatible providers.
package main

import (
	"context"
	"fmt"
	"regexp"
	"sort"
	"strings"
	"time"

	"mncode/pkg/accounts"
	"mncode/pkg/codex"
	"mncode/pkg/config"
)

var providerIDCleaner = regexp.MustCompile(`[^a-z0-9]+`)

// GetProviderSettings returns provider accounts, quotas, and custom providers.
func (a *App) GetProviderSettings() (DesktopProviderSettings, error) {
	cfg, _, err := a.providerConfig()
	if err != nil {
		return DesktopProviderSettings{}, err
	}
	store, err := accounts.NewStore("")
	if err != nil {
		return DesktopProviderSettings{}, err
	}
	result := DesktopProviderSettings{Accounts: make([]DesktopProviderAccount, 0), CustomProviders: make([]DesktopCustomProvider, 0)}
	var activeAntigravity *accounts.Account
	for _, account := range store.Accounts {
		result.Accounts = append(result.Accounts, DesktopProviderAccount{ID: account.ID, Email: account.Email, Provider: string(account.Provider), Active: account.IsActive, Available: account.IsAvailable(), LastError: account.LastError})
		if account.IsActive && account.Provider == accounts.ProviderTypeAntigravity {
			activeAntigravity = account
		}
	}
	if activeAntigravity != nil {
		result.ActiveAntigravityQuota = desktopProviderQuota(accounts.CheckAccountQuota(store, activeAntigravity))
	}
	sort.Slice(result.Accounts, func(i, j int) bool { return result.Accounts[i].Email < result.Accounts[j].Email })
	for _, custom := range cfg.CustomProviders {
		models := make([]DesktopCustomModel, 0, len(custom.Models))
		for _, model := range custom.Models {
			models = append(models, DesktopCustomModel{ID: model.ID, Name: model.Name, ContextWindow: model.ContextWindow})
		}
		result.CustomProviders = append(result.CustomProviders, DesktopCustomProvider{ID: custom.ID, Name: custom.Name, BaseURL: custom.BaseURL, APIFormat: custom.APIFormat, APIKeyConfigured: custom.APIKey != "", Models: models})
	}
	sort.Slice(result.CustomProviders, func(i, j int) bool { return result.CustomProviders[i].Name < result.CustomProviders[j].Name })
	result.OpenCodeConfigured = cfg.GetOpenCodeAPIKey() != ""
	return result, nil
}

// GetActiveAntigravityQuota fetches live quota headroom for the active Antigravity
// account.
func (a *App) GetActiveAntigravityQuota() (*DesktopProviderQuota, error) {
	store, err := accounts.NewStore("")
	if err != nil {
		return nil, err
	}
	for _, account := range store.Accounts {
		if account.IsActive && account.Provider == accounts.ProviderTypeAntigravity {
			return desktopProviderQuota(accounts.CheckAccountQuota(store, account)), nil
		}
	}
	return nil, nil
}

// LoginProvider stores a credential for a provider and refreshes the session pool.
func (a *App) LoginProvider(providerID, accountID, token string) error {
	store, err := accounts.NewStore("")
	if err != nil {
		return err
	}
	var account *accounts.Account
	token = strings.TrimSpace(token)
	id := strings.TrimSpace(accountID)
	p := strings.ToLower(strings.TrimSpace(providerID))

	switch p {
	case "antigravity":
		account, err = accounts.StartAntigravityWebLogin(store)
	case "codex":
		if token == "" {
			return fmt.Errorf("a Codex session token is required")
		}
		account, err = accounts.AddCodexAccount(store, id, token)
	case "openai":
		if token == "" {
			return fmt.Errorf("an OpenAI API key is required")
		}
		if id == "" {
			id = fmt.Sprintf("openai-%d", time.Now().Unix())
		}
		account = &accounts.Account{
			ID:          id,
			Email:       id,
			Provider:    accounts.ProviderTypeOpenAI,
			AccessToken: token,
			IsActive:    true,
			CreatedAt:   time.Now(),
		}
		err = store.AddOrUpdate(account)
	case "openrouter":
		if token == "" {
			return fmt.Errorf("an OpenRouter API key is required")
		}
		if id == "" {
			id = fmt.Sprintf("openrouter-%d", time.Now().Unix())
		}
		account = &accounts.Account{
			ID:          id,
			Email:       id,
			Provider:    accounts.ProviderTypeOpenRouter,
			AccessToken: token,
			IsActive:    true,
			CreatedAt:   time.Now(),
		}
		err = store.AddOrUpdate(account)
	case "anthropic":
		if token == "" {
			return fmt.Errorf("an Anthropic API key is required")
		}
		if id == "" {
			id = fmt.Sprintf("anthropic-%d", time.Now().Unix())
		}
		account = &accounts.Account{
			ID:          id,
			Email:       id,
			Provider:    accounts.ProviderTypeAnthropic,
			AccessToken: token,
			IsActive:    true,
			CreatedAt:   time.Now(),
		}
		err = store.AddOrUpdate(account)
	case "gemini":
		if token == "" {
			return fmt.Errorf("a Google Gemini API key is required")
		}
		if id == "" {
			id = fmt.Sprintf("gemini-%d", time.Now().Unix())
		}
		account = &accounts.Account{
			ID:          id,
			Email:       id,
			Provider:    accounts.ProviderTypeGemini,
			AccessToken: token,
			IsActive:    true,
			CreatedAt:   time.Now(),
		}
		err = store.AddOrUpdate(account)
	default:
		return fmt.Errorf("unsupported login provider: %s", providerID)
	}
	if err != nil {
		return err
	}
	return a.activateProviderAccount(store, account)
}

// CheckCodexInstalled verifies if official Codex binary is installed.
func (a *App) CheckCodexInstalled() (DesktopCodexLoginResult, error) {
	rt, err := codex.DiscoverRuntime(context.Background())
	if err != nil {
		return DesktopCodexLoginResult{}, err
	}
	return DesktopCodexLoginResult{
		RuntimeVersion: rt.Version,
	}, nil
}

// StartCodexOAuthLogin starts the official browser or device-code login flow.
func (a *App) StartCodexOAuthLogin(mode string) (DesktopCodexLoginResult, error) {
	a.codexMu.Lock()
	if a.codexClient != nil {
		_ = a.codexClient.Close()
		a.codexClient = nil
	}

	client, err := codex.StartAppServer(context.Background(), "", "")
	if err != nil {
		a.codexMu.Unlock()
		return DesktopCodexLoginResult{}, fmt.Errorf("could not launch official codex app-server: %w", err)
	}
	a.codexClient = client
	a.codexMu.Unlock()

	mode = strings.ToLower(strings.TrimSpace(mode))
	if mode == "device" {
		res, err := codex.LoginDeviceCodeFlow(context.Background(), client)
		if err != nil {
			return DesktopCodexLoginResult{}, err
		}
		return DesktopCodexLoginResult{
			Type:            "device",
			VerificationURI: res.VerificationURI,
			UserCode:        res.UserCode,
			ExpiresIn:       res.ExpiresIn,
		}, nil
	}

	res, err := codex.LoginBrowserFlow(context.Background(), client)
	if err != nil {
		return DesktopCodexLoginResult{}, err
	}
	return DesktopCodexLoginResult{
		Type:    "browser",
		AuthURL: res.AuthURL,
	}, nil
}

// CompleteCodexOAuthLogin waits/checks for login completion, records the account, and activates it.
func (a *App) CompleteCodexOAuthLogin() (*DesktopProviderAccount, error) {
	a.codexMu.Lock()
	client := a.codexClient
	a.codexMu.Unlock()

	if client == nil {
		return nil, fmt.Errorf("no active Codex login in progress")
	}

	accInfo, err := codex.WaitForLoginComplete(context.Background(), client, 8*time.Second)
	if err != nil {
		return nil, fmt.Errorf("login check failed: %w", err)
	}
	if accInfo == nil || accInfo.AccountID == "" {
		return nil, fmt.Errorf("login not yet completed; please finish authentication in your browser")
	}

	store, err := accounts.NewStore("")
	if err != nil {
		return nil, err
	}

	acc := &accounts.Account{
		ID:          accInfo.AccountID,
		Email:       accInfo.Email,
		Provider:    accounts.ProviderTypeCodex,
		AccessToken: "codex-appserver-session",
		IsActive:    true,
	}
	if err := store.AddOrUpdate(acc); err != nil {
		return nil, err
	}
	_ = a.activateProviderAccount(store, acc)

	return &DesktopProviderAccount{
		ID:        acc.ID,
		Email:     acc.Email,
		Provider:  "codex",
		Active:    true,
		Available: true,
	}, nil
}

// UseProviderAccount promotes one pooled account to the active slot.
func (a *App) UseProviderAccount(accountID string) error {
	store, err := accounts.NewStore("")
	if err != nil {
		return err
	}
	for _, account := range store.Accounts {
		if account.ID == accountID || account.Email == accountID {
			return a.activateProviderAccount(store, account)
		}
	}
	return fmt.Errorf("provider account not found: %s", accountID)
}

// ConfigureOpenCode connects the OpenCode provider with the given API key.
func (a *App) ConfigureOpenCode(apiKey string) error {
	key := strings.TrimSpace(apiKey)
	if key == "" {
		return fmt.Errorf("OpenCode API key is required")
	}
	cfg, session, err := a.providerConfig()
	if err != nil {
		return err
	}
	cfg.Provider = config.ProviderOpenCode
	cfg.CustomProviderID = ""
	cfg.APIKey = key
	cfg.OpenCodeAPIKey = key
	cfg.BaseURL = "https://opencode.ai/zen/v1"
	if err := config.SaveConfig(cfg); err != nil {
		return err
	}
	return a.refreshSessionProvider(session)
}

// SaveCustomProvider persists a custom OpenAI-compatible provider.
func (a *App) SaveCustomProvider(input DesktopCustomProviderInput) (DesktopCustomProvider, error) {
	cfg, session, err := a.providerConfig()
	if err != nil {
		return DesktopCustomProvider{}, err
	}
	name := strings.TrimSpace(input.Name)
	baseURL := strings.TrimRight(strings.TrimSpace(input.BaseURL), "/")
	if name == "" || baseURL == "" {
		return DesktopCustomProvider{}, fmt.Errorf("provider name and base URL are required")
	}
	format := strings.TrimSpace(input.APIFormat)
	if format != config.APIFormatAnthropic && format != config.APIFormatChatCompletions && format != config.APIFormatResponses {
		return DesktopCustomProvider{}, fmt.Errorf("unsupported API format: %s", format)
	}
	id := strings.ToLower(strings.TrimSpace(input.ID))
	if id == "" {
		id = providerIDCleaner.ReplaceAllString(strings.ToLower(name), "-")
		id = strings.Trim(id, "-")
	}
	if id == "" {
		return DesktopCustomProvider{}, fmt.Errorf("provider id is required")
	}
	if cfg.CustomProviders == nil {
		cfg.CustomProviders = make(map[string]config.CustomProvider)
	}
	previous := cfg.CustomProviders[id]
	key := strings.TrimSpace(input.APIKey)
	if key == "" {
		key = previous.APIKey
	}
	models := make([]config.CustomModel, 0, len(input.Models))
	for _, model := range input.Models {
		modelID := strings.TrimSpace(model.ID)
		if modelID == "" {
			continue
		}
		modelName := strings.TrimSpace(model.Name)
		if modelName == "" {
			modelName = modelID
		}
		models = append(models, config.CustomModel{ID: modelID, Name: modelName, ContextWindow: model.ContextWindow})
	}
	cfg.CustomProviders[id] = config.CustomProvider{ID: id, Name: name, BaseURL: baseURL, APIFormat: format, APIKey: key, Models: models}
	if err := config.SaveConfig(cfg); err != nil {
		return DesktopCustomProvider{}, err
	}
	if session != nil && session.session != nil && session.session.Accounts != nil && cfg.Provider == config.ProviderCustom && cfg.CustomProviderID == id {
		_ = session.session.Accounts.Load()
		_ = a.refreshSessionProvider(session)
	}
	return DesktopCustomProvider{ID: id, Name: name, BaseURL: baseURL, APIFormat: format, APIKeyConfigured: key != "", Models: input.Models}, nil
}

// DeleteCustomProvider removes a custom provider by id.
func (a *App) DeleteCustomProvider(providerID string) error {
	cfg, session, err := a.providerConfig()
	if err != nil {
		return err
	}
	delete(cfg.CustomProviders, strings.TrimSpace(providerID))
	if cfg.Provider == config.ProviderCustom && cfg.CustomProviderID == providerID {
		cfg.Provider = config.ProviderOpenCode
		cfg.CustomProviderID = ""
		cfg.BaseURL = "https://opencode.ai/zen/v1"
	}
	if err := config.SaveConfig(cfg); err != nil {
		return err
	}
	return a.refreshSessionProvider(session)
}

func (a *App) providerConfig() (*config.Config, *sessionRuntime, error) {
	a.mu.RLock()
	var session *sessionRuntime
	if a.session != nil {
		session = a.session
	}
	a.mu.RUnlock()
	if session != nil && session.session != nil && session.session.Config != nil {
		return session.session.Config, session, nil
	}
	cfg, err := config.LoadConfig("")
	return cfg, nil, err
}

func (a *App) activateProviderAccount(store *accounts.Store, account *accounts.Account) error {
	if account == nil {
		return fmt.Errorf("provider account is empty")
	}
	for _, other := range store.Accounts {
		if other.Provider == account.Provider {
			other.IsActive = other.ID == account.ID
		}
	}
	if err := store.Save(); err != nil {
		return err
	}
	cfg, session, err := a.providerConfig()
	if err != nil {
		return err
	}
	if account.AccessToken != "codex-appserver-session" {
		cfg.APIKey = account.AccessToken
	}
	cfg.CustomProviderID = ""
	switch account.Provider {
	case accounts.ProviderTypeAntigravity:
		cfg.Provider = config.ProviderAntigravity
		cfg.BaseURL = ""
	case accounts.ProviderTypeCodex:
		if cfg.Provider == "" {
			cfg.Provider = config.ProviderOpenAI
		}
	case accounts.ProviderTypeOpenAI:
		cfg.Provider = config.ProviderOpenAI
		cfg.BaseURL = "https://api.openai.com/v1"
	case accounts.ProviderTypeOpenRouter:
		cfg.Provider = config.ProviderOpenRouter
		cfg.BaseURL = "https://openrouter.ai/api/v1"
	case accounts.ProviderTypeAnthropic:
		cfg.Provider = config.ProviderAnthropic
		cfg.BaseURL = "https://api.anthropic.com/v1"
	case accounts.ProviderTypeGemini:
		cfg.Provider = config.ProviderGemini
		cfg.BaseURL = ""
	default:
		cfg.Provider = config.ProviderType(account.Provider)
	}
	if err := config.SaveConfig(cfg); err != nil {
		return err
	}
	if session != nil && session.session != nil && session.session.Accounts != nil {
		_ = session.session.Accounts.Load()
	}
	return a.refreshSessionProvider(session)
}

func (a *App) refreshSessionProvider(session *sessionRuntime) error {
	if session == nil || session.session == nil {
		return nil
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	session.session.Provider = nil
	return session.session.EnsureProvider()
}

func desktopProviderQuota(info *accounts.AccountQuotaInfo) *DesktopProviderQuota {
	if info == nil {
		return nil
	}
	quotas := make([]DesktopModelQuota, 0, len(info.ModelQuotas))
	for _, quota := range info.ModelQuotas {
		quotas = append(quotas, DesktopModelQuota{
			ModelID:             quota.ModelID,
			DisplayName:         quota.DisplayName,
			RemainingPercentage: quota.RemainingPercentage,
			ResetIn:             quota.ResetInStr,
		})
	}
	return &DesktopProviderQuota{
		AccountID:       info.AccountID,
		Status:          info.Status,
		Healthy:         info.IsHealthy,
		Tier:            info.Tier,
		ExpiresIn:       info.ExpiresInStr,
		ModelQuotas:     quotas,
		AvailableModels: append([]string(nil), info.AvailableModels...),
		MaxContext:      info.MaxContext,
		RPMRemaining:    info.RPMRemaining,
		TPMRemaining:    info.TPMRemaining,
		ErrorMessage:    info.ErrorMessage,
	}
}
