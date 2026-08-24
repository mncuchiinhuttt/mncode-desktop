package main

import (
	"fmt"
	"strings"

	"mncode/pkg/agent"
	"mncode/pkg/config"
	"mncode/pkg/ui"
)

func (a *App) GetUsageStats() (DesktopUsageStats, error) {
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
			return DesktopUsageStats{}, err
		}
	}
	if cfg.GetTelemetryKey() == "" {
		return DesktopUsageStats{}, fmt.Errorf("sign in to mncode-web to view usage")
	}

	stats, err := ui.FetchUsageStats(&agent.Session{Config: cfg})
	if err != nil {
		if strings.Contains(err.Error(), "server returned 401") || strings.Contains(err.Error(), "server returned 403") {
			if _, identityErr := ui.FetchWhoAmI(&agent.Session{Config: cfg}); identityErr == nil {
				return DesktopUsageStats{}, fmt.Errorf("usage service needs an update; your sync key is valid, but the deployed stats service still rejects API-key access")
			}
			return DesktopUsageStats{}, fmt.Errorf("mncode-web sync key is expired or revoked; sign in again to refresh usage access")
		}
		return DesktopUsageStats{}, err
	}
	result := DesktopUsageStats{
		Summary: DesktopUsageSummary{
			TotalTokens: stats.Summary.TotalTokens, InputTokens: stats.Summary.InputTokens,
			OutputTokens: stats.Summary.OutputTokens, ThinkingTokens: stats.Summary.ThinkingTokens,
			TotalSessions: stats.Summary.TotalSessions, RecordsCount: stats.Summary.RecordsCount,
		},
		DailyUsage: make([]DesktopUsageDay, 0, len(stats.DailyUsage)),
	}
	for _, day := range stats.DailyUsage {
		result.DailyUsage = append(result.DailyUsage, DesktopUsageDay{Date: day.Date, Tokens: day.Tokens, Sessions: day.Sessions})
	}
	return result, nil
}
