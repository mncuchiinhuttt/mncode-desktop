package main

import (
	"fmt"

	"mncode/pkg/agent"
	"mncode/pkg/config"
	"mncode/pkg/ui"
)

const (
	cachedAccountName  = "mncode_account_name"
	cachedAccountEmail = "mncode_account_email"
	cachedAccountAdmin = "mncode_account_admin"
)

func guestAccount() DesktopAccount {
	return DesktopAccount{Status: "guest"}
}

func (a *App) GetAccount() DesktopAccount {
	a.mu.RLock()
	var session *sessionRuntime
	if a.session != nil {
		session = a.session
	}
	a.mu.RUnlock()
	if session != nil && session.session != nil && session.session.Config != nil {
		return a.accountForSession(session)
	}

	cfg, err := config.LoadConfig("")
	if err != nil {
		return guestAccount()
	}
	return accountFromConfig(cfg)
}

func (a *App) accountForSession(session *sessionRuntime) DesktopAccount {
	if session == nil || session.session == nil || session.session.Config == nil {
		return guestAccount()
	}
	account := accountFromConfig(session.session.Config)
	if account.Status == "connected" {
		a.cacheAccount(session, account)
	}
	return account
}

func accountFromConfig(cfg *config.Config) DesktopAccount {
	if cfg == nil || cfg.GetTelemetryKey() == "" {
		return guestAccount()
	}

	if identity, err := ui.FetchWhoAmI(&agent.Session{Config: cfg}); err == nil {
		account := DesktopAccount{Connected: true, Name: identity.User.Name, Email: identity.User.Email, IsAdmin: identity.IsAdmin, Status: "connected"}
		return account
	}

	name := cfg.GetSetting(cachedAccountName, "")
	email := cfg.GetSetting(cachedAccountEmail, "")
	if name == "" && email == "" {
		return DesktopAccount{Connected: true, Name: "mncode account", Status: "offline"}
	}
	return DesktopAccount{Connected: true, Name: name, Email: email, IsAdmin: cfg.GetSetting(cachedAccountAdmin, "false") == "true", Status: "offline"}
}

func (a *App) LoginAccount() (DesktopAccount, error) {
	a.mu.RLock()
	var session *sessionRuntime
	if a.session != nil {
		session = a.session
	}
	a.mu.RUnlock()
	if session != nil && session.session != nil && session.session.Config != nil {
		if !ui.HandleMncodeLoginCommand([]string{"/login"}, session.session) {
			return a.accountForSession(session), fmt.Errorf("mncode-web login was cancelled or failed")
		}
		account := a.accountForSession(session)
		if !account.Connected {
			return account, fmt.Errorf("mncode-web login completed but the account could not be verified")
		}
		return account, nil
	}

	cfg, err := config.LoadConfig("")
	if err != nil {
		return guestAccount(), fmt.Errorf("could not load account configuration: %w", err)
	}
	authSession := &agent.Session{Config: cfg}
	if !ui.HandleMncodeLoginCommand([]string{"/login"}, authSession) {
		return accountFromConfig(cfg), fmt.Errorf("mncode-web login was cancelled or failed")
	}
	account := accountFromConfig(cfg)
	if !account.Connected {
		return account, fmt.Errorf("mncode-web login completed but the account could not be verified")
	}
	return account, nil
}

func (a *App) LogoutAccount() (DesktopAccount, error) {
	a.mu.RLock()
	var session *sessionRuntime
	if a.session != nil {
		session = a.session
	}
	a.mu.RUnlock()

	var cfg *config.Config
	if session != nil && session.session != nil && session.session.Config != nil {
		cfg = session.session.Config
	} else {
		var err error
		cfg, err = config.LoadConfig("")
		if err != nil {
			return guestAccount(), err
		}
	}

	cfg.TelemetryKey = ""
	cfg.SetSetting("telemetry_key", "")
	cfg.SetSetting(cachedAccountName, "")
	cfg.SetSetting(cachedAccountEmail, "")
	cfg.SetSetting(cachedAccountAdmin, "")
	if err := config.SaveConfig(cfg); err != nil {
		return DesktopAccount{}, err
	}
	return guestAccount(), nil
}

func (a *App) cacheAccount(session *sessionRuntime, account DesktopAccount) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.session != session || session == nil || session.session == nil || session.session.Config == nil {
		return
	}
	cfg := session.session.Config
	cfg.SetSetting(cachedAccountName, account.Name)
	cfg.SetSetting(cachedAccountEmail, account.Email)
	admin := "false"
	if account.IsAdmin {
		admin = "true"
	}
	cfg.SetSetting(cachedAccountAdmin, admin)
	_ = config.SaveConfig(cfg)
}
