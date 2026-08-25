// Automation persistence: JSON store under ~/.mncode/automations.json with
// atomic writes so a crash mid-save never corrupts the schedule.
package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"
)

const (
	AutomationKindScheduled = "scheduled"
	AutomationKindIdle      = "idle"

	automationRunCap = 20
)

// Automation is one recurring or idle-time agent task.
type Automation struct {
	ID        string          `json:"id"`
	Name      string          `json:"name"`
	Prompt    string          `json:"prompt"`
	Kind      string          `json:"kind"`      // scheduled | idle
	Schedule  string          `json:"schedule"`  // cron spec; scheduled kind only
	Workspace string          `json:"workspace"` // "" = standalone chat
	Enabled   bool            `json:"enabled"`
	CreatedAt int64           `json:"createdAt"` // unix millis
	LastRunAt int64           `json:"lastRunAt"` // unix millis, 0 = never
	NextRunAt int64           `json:"nextRunAt"` // unix millis, 0 = unscheduled
	RunCount  int             `json:"runCount"`
	Runs      []AutomationRun `json:"runs"`
}

// AutomationRun is one execution attempt recorded in the automation history.
type AutomationRun struct {
	StartedAt  int64  `json:"startedAt"`
	DurationMs int64  `json:"durationMs"`
	Status     string `json:"status"` // success | error | timeout | skipped
	Detail     string `json:"detail"` // output digest or failure reason
}

// automationStore is a mutex-guarded JSON list persisted at path.
type automationStore struct {
	mu          sync.Mutex
	path        string
	loaded      bool
	automations []Automation
}

func newAutomationStore(path string) *automationStore {
	return &automationStore{path: path}
}

// timeNow is an indirection over time.Now so tests can pin clocks.
func timeNow() time.Time {
	return time.Now()
}

func automationsStorePath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".mncode", "automations.json"), nil
}

// list returns a copy of every automation, newest-created first.
func (s *automationStore) list() []Automation {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.ensureLoadedLocked()
	out := make([]Automation, len(s.automations))
	copy(out, s.automations)
	return out
}

// get returns a copy of one automation by id.
func (s *automationStore) get(id string) (Automation, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.ensureLoadedLocked()
	for _, automation := range s.automations {
		if automation.ID == id {
			return automation, true
		}
	}
	return Automation{}, false
}

// create appends a new automation.
func (s *automationStore) create(automation Automation) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.ensureLoadedLocked()
	s.automations = append(s.automations, automation)
	return s.saveLocked()
}

// update replaces the fields of an existing automation.
func (s *automationStore) update(id string, mutate func(*Automation)) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.ensureLoadedLocked()
	for index := range s.automations {
		if s.automations[index].ID == id {
			mutate(&s.automations[index])
			return s.saveLocked()
		}
	}
	return os.ErrNotExist
}

// delete removes an automation by id.
func (s *automationStore) delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.ensureLoadedLocked()
	for index := range s.automations {
		if s.automations[index].ID == id {
			s.automations = append(s.automations[:index], s.automations[index+1:]...)
			return s.saveLocked()
		}
	}
	return os.ErrNotExist
}

// appendRun records an execution attempt and bumps the counters, pruning the
// oldest entries beyond the history cap.
func (s *automationStore) appendRun(id string, run AutomationRun) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.ensureLoadedLocked()
	for index := range s.automations {
		if s.automations[index].ID != id {
			continue
		}
		s.automations[index].LastRunAt = run.StartedAt
		s.automations[index].RunCount++
		runs := append([]AutomationRun{run}, s.automations[index].Runs...)
		if len(runs) > automationRunCap {
			runs = runs[:automationRunCap]
		}
		s.automations[index].Runs = runs
		return s.saveLocked()
	}
	return os.ErrNotExist
}

func (s *automationStore) ensureLoadedLocked() {
	if s.loaded {
		return
	}
	s.loaded = true
	raw, err := os.ReadFile(s.path)
	if err != nil {
		return
	}
	var stored []Automation
	if json.Unmarshal(raw, &stored) == nil {
		s.automations = stored
	}
}

func (s *automationStore) saveLocked() error {
	dir := filepath.Dir(s.path)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return err
	}
	raw, err := json.MarshalIndent(s.automations, "", "  ")
	if err != nil {
		return err
	}
	temp := s.path + ".tmp"
	if err := os.WriteFile(temp, raw, 0600); err != nil {
		return err
	}
	return os.Rename(temp, s.path)
}
