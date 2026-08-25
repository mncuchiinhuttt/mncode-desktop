// Scheduler for automations: cron entries for scheduled tasks, an idle-time
// dispatcher for "soonest available" tasks, and next-run bookkeeping.
package main

import (
	"sync"
	"time"

	"github.com/robfig/cron/v3"
)

const (
	automationRunTimeout    = 15 * time.Minute
	idleDispatchInterval    = 5 * time.Minute
	idleMinimumGap          = 30 * time.Minute
	automationBusySkipNote  = "skipped: an interactive agent turn was running"
	idleGapSkipNote         = "skipped: ran less than 30 minutes ago"
	automationTimeoutDetail = "stopped: automation exceeded the 15 minute time limit"
)

// automationScheduler owns the cron instance, idle dispatcher, and keep-awake
// state for all automations.
type automationScheduler struct {
	mu        sync.Mutex
	cron      *cron.Cron
	entries   map[string]cron.EntryID
	stopIdle  chan struct{}
	stopped   bool
	keepAwake automationKeepAwake
}

func newAutomationScheduler() *automationScheduler {
	return &automationScheduler{
		cron:     cron.New(cron.WithParser(automationCronParser)),
		entries:  make(map[string]cron.EntryID),
		stopIdle: make(chan struct{}),
	}
}

// start begins the cron loop and the idle dispatcher.
func (s *automationScheduler) start(onFire func(id string, trigger string)) {
	s.cron.Start()
	go func() {
		ticker := time.NewTicker(idleDispatchInterval)
		defer ticker.Stop()
		for {
			select {
			case <-s.stopIdle:
				return
			case <-ticker.C:
				onFire("", "idle-tick")
			}
		}
	}()
}

// stop helps the cron loop and idle dispatcher.
func (s *automationScheduler) stop() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.stopped {
		return
	}
	s.stopped = true
	ctx := s.cron.Stop()
	<-ctx.Done()
	close(s.stopIdle)
}

// resyncAutomations rebuilds cron entries from the store and refreshes
// NextRunAt. Called on CRUD mutations, startup, and after each run.
func (a *App) resyncAutomations() {
	if a.automationSched == nil {
		return
	}
	automations := a.automationStoreOrDefault().list()
	now := timeNow()

	a.automationSched.mu.Lock()
	for _, entryID := range a.automationSched.entries {
		a.automationSched.cron.Remove(entryID)
	}
	a.automationSched.entries = make(map[string]cron.EntryID)
	a.automationSched.mu.Unlock()

	for _, automation := range automations {
		if !automation.Enabled {
			a.automationStoreOrDefault().update(automation.ID, func(existing *Automation) {
				existing.NextRunAt = 0
			})
			continue
		}
		if automation.Kind != AutomationKindScheduled || automation.Schedule == "" {
			continue
		}
		next, err := nextRunFor(automation.Schedule, now)
		if err != nil {
			continue
		}
		a.automationSched.mu.Lock()
		entryID, addErr := a.automationSched.cron.AddFunc(automation.Schedule, func() {
			a.triggerAutomation(automation.ID, "schedule")
		})
		if addErr == nil {
			a.automationSched.entries[automation.ID] = entryID
		}
		a.automationSched.mu.Unlock()
		if addErr == nil {
			a.automationStoreOrDefault().update(automation.ID, func(existing *Automation) {
				existing.NextRunAt = next.UnixMilli()
			})
		}
	}
}

// nextRunFor computes the next fire time of a cron spec after now.
func nextRunFor(spec string, now time.Time) (time.Time, error) {
	schedule, err := automationCronParser.Parse(spec)
	if err != nil {
		return time.Time{}, err
	}
	return schedule.Next(now), nil
}

// idleDue reports whether an idle automation is due: it has never run, or its
// last run is older than the minimum gap.
func idleDue(lastRunAt int64, now time.Time) bool {
	if lastRunAt == 0 {
		return true
	}
	return now.Sub(time.UnixMilli(lastRunAt)) >= idleMinimumGap
}
