# Phase 01 — Automation Model, Store & CRUD Bindings

## Context Links

- `plans/250825-automations/plan.md`
- `desktop-session.go` (sessionRuntime), `skills-marketplace.go` (store pattern), `../mncode-cli/pkg/config/store.go` (~/.mncode path)

## Overview

- **Priority:** P1
- **Status:** Pending
- Data model + JSON persistence + Wails CRUD bindings for automations. No scheduling yet.

## Requirements

### Functional

- `Automation` model: `ID`, `Name`, `Prompt`, `Kind` (`scheduled` | `idle`), `Schedule` (cron string, scheduled-kind only), `Workspace` (path, "" = standalone), `Enabled`, `CreatedAt`, `LastRunAt`, `NextRunAt`, `RunCount`.
- Store at `~/.mncode/automations.json`; load lazily on first access; save on every mutation; mutex-guarded.
- Wails bindings: `ListAutomations() []Automation`, `CreateAutomation(AutomationInput)`, `UpdateAutomation(id, AutomationInput)`, `DeleteAutomation(id)`, `ToggleAutomation(id, enabled)`.
- Input validation: name + prompt non-empty; scheduled kind requires a parseable cron spec (validate with `robfig/cron` parser at creation).

### Non-functional

- File writes atomic (write temp + rename) to survive crashes mid-save.
- Cap prompt at 20k chars (same as custom instructions).

## Architecture

```
automations.go        → Automation types + App bindings + emit helpers
automation_store.go   → load/save/list under ~/.mncode/automations.json
```

`App` gains `automationMu sync.Mutex` + `automationStore *automationStore` (lazy init in `NewApp` or first binding call).

## Implementation Steps

1. `go get github.com/robfig/cron/v3`.
2. Create `automation_store.go`: types, `loadAutomations()`, `saveAutomations()`, path helper `automationsStorePath()` (`~/.mncode/automations.json`).
3. Create `automations.go`: `AutomationInput` type, CRUD bindings with validation + `a.emit("automation:updated", nil)` after each mutation.
4. Register nothing new in `main.go` — exported `App` methods are auto-bound by Wails.
5. Unit tests: store round-trip, validation rejections, atomic-save behavior (`automations_store_test.go`).

## Todo List

- [ ] Add cron dependency
- [ ] Store + path helper + atomic save
- [ ] Types + CRUD bindings + validation
- [ ] Emit `automation:updated` on mutations
- [ ] Unit tests green (`go test ./...`)

## Success Criteria

- Creating an automation via the Wails bridge persists it; restart keeps it.
- Invalid cron or empty prompt returns a clear error to the UI.

## Risks

- Concurrent writes from bindings → single store mutex; keep critical sections tiny.
