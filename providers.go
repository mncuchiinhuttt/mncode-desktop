package main

import (
	"fmt"
	"regexp"
	"sort"
	"strings"

	"mncode/pkg/accounts"
	"mncode/pkg/config"
)

var providerIDCleaner = regexp.MustCompile(`[^a-z0-9]+`)

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

func (a *App) LoginProvider(providerID, accountID, token string) error {
	store, err := accounts.NewStore("")
	if err != nil {
		return err
	}
	var account *accounts.Account
	switch strings.ToLower(strings.TrimSpace(providerID)) {
	case "antigravity":
		account, err = accounts.StartAntigravityWebLogin(store)
	case "codex", "openai":
		if strings.TrimSpace(token) == "" {
			return fmt.Errorf("a Codex/OpenAI token is required")
		}
		account, err = accounts.AddCodexAccount(store, strings.TrimSpace(accountID), token)
	default:
		return fmt.Errorf("unsupported login provider: %s", providerID)
	}
	if err != nil {
		return err
	}
	return a.activateProviderAccount(store, account)
}

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
	cfg.APIKey = account.AccessToken
	cfg.CustomProviderID = ""
	switch account.Provider {
	case accounts.ProviderTypeAntigravity:
		cfg.Provider = config.ProviderAntigravity
		cfg.BaseURL = ""
	case accounts.ProviderTypeCodex, accounts.ProviderTypeOpenAI:
		cfg.Provider = config.ProviderOpenAI
		cfg.BaseURL = "https://api.openai.com/v1"
	default:
		return fmt.Errorf("unsupported account provider: %s", account.Provider)
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
