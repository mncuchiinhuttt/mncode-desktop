// Local usage telemetry aggregation for the insights dashboard.
package main

import (
	"mncode/pkg/agent"
	"mncode/pkg/config"
	"mncode/pkg/stats"
	"mncode/pkg/ui"
)

// GetUsageStats aggregates local and cloud token telemetry for the dashboard.
func (a *App) GetUsageStats() (DesktopUsageStats, error) {
	a.mu.RLock()
	var session *sessionRuntime
	if a.session != nil {
		session = a.session
	}
	a.mu.RUnlock()

	var cfg *config.Config
	var tracker *stats.Tracker
	if session != nil && session.session != nil {
		cfg = session.session.Config
		if tr, ok := session.session.Tracker.(*stats.Tracker); ok {
			tracker = tr
		}
	}
	if tracker == nil {
		tracker = stats.NewTracker()
	}
	if cfg == nil {
		var err error
		cfg, err = config.LoadConfig("")
		if err != nil {
			return localUsageStats(tracker), nil
		}
	}

	// If cloud sync key is available, attempt fetching latest synced stats from cloud
	if cfg.GetTelemetryKey() != "" {
		statsRes, err := ui.FetchUsageStats(&agent.Session{Config: cfg})
		if err == nil && statsRes != nil && statsRes.Success {
			result := DesktopUsageStats{
				Summary: DesktopUsageSummary{
					TotalTokens:    statsRes.Summary.TotalTokens,
					InputTokens:    statsRes.Summary.InputTokens,
					OutputTokens:   statsRes.Summary.OutputTokens,
					ThinkingTokens: statsRes.Summary.ThinkingTokens,
					TotalSessions:  statsRes.Summary.TotalSessions,
					RecordsCount:   statsRes.Summary.RecordsCount,
				},
				DailyUsage: make([]DesktopUsageDay, 0, len(statsRes.DailyUsage)),
			}
			for _, day := range statsRes.DailyUsage {
				result.DailyUsage = append(result.DailyUsage, DesktopUsageDay{
					Date:     day.Date,
					Tokens:   day.Tokens,
					Sessions: day.Sessions,
				})
			}
			return result, nil
		}
	}

	// Seamless fallback to local tracker data if offline or remote unreachable
	return localUsageStats(tracker), nil
}

func localUsageStats(tracker *stats.Tracker) DesktopUsageStats {
	if tracker == nil {
		tracker = stats.NewTracker()
	}
	lifetime := tracker.GetLifetime()
	history := tracker.GetDailyHistory(30)
	streak := tracker.GetStreakStats()
	daily := make([]DesktopUsageDay, 0, len(history))
	for _, pt := range history {
		daily = append(daily, DesktopUsageDay{
			Date:     pt.DateKey,
			Tokens:   pt.Tokens,
			Sessions: 1,
		})
	}

	return DesktopUsageStats{
		Summary: DesktopUsageSummary{
			TotalTokens:    lifetime.TotalTokens,
			InputTokens:    lifetime.InputTokens,
			OutputTokens:   lifetime.OutputTokens,
			ThinkingTokens: lifetime.ThinkingTokens,
			TotalSessions:  int64(streak.Sessions),
			RecordsCount:   int64(len(tracker.Records())),
		},
		DailyUsage: daily,
	}
}
