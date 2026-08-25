# Phase 02 — Scheduler, Runner & Keep-Awake

## Context Links

- `plans/250825-automations/phase-01-automation-engine.md`
- `desktop-session.go` (`buildSession`), `app.go` (`SendPrompt` guard pattern), `desktop-events.go` (UI shim pattern)

## Overview

- **Priority:** P1
- **Status:** Pending
- Cron scheduler + idle dispatcher + the runner that executes an automation as a real headless agent turn, isolated from the chat transcript.

## Requirements

### Functional

- **Scheduled kind:** cron spec via `robfig/cron/v3`; scheduler goroutine started in `NewApp`, entries re-registered on CRUD (`automation:updated` triggers resync).
- **Idle kind:** dispatcher ticker (every 5 min) — fires when `Enabled` && no active agent turn && last run older than 30 min; otherwise records a `skipped: busy` history entry (matches "Soonest available").
- **Runner:** for each fire → `buildSession(automation.Workspace)` → wrap with `automationUI` shim → `ProcessUserInput` with a 15-min timeout context → record run (status: success/error/timeout, duration, output digest).
- **Serialization:** one automation run at a time; a global `automationRunning` flag; interactive `SendPrompt` and automation runner must not overlap (share the existing turn guard or a dedicated mutex).
- **Keep-awake:** toggle binding `SetKeepAwake(bool)`; while any automation runs on macOS, hold a `caffeinate -i` child process; other platforms no-op in v1.
- Run log: full transcript written to `~/.mncode/automation-runs/<automationID>/<unixNano>.md`; history entry keeps digest (first 200 chars) + log path.

### Non-functional

- Runner sessions are fully independent of the UI session (own MCP lifecycle, closed after run).
- Panics in a run recovered; recorded as error status.

## Architecture

```
automation_scheduler.go  → cron loop, idle ticker, resync, next-run computation
automation_runner.go     → run execution, automationUI shim, history recording
automation_keepawake.go  → caffeinate wrapper (darwin), no-op others
```

Events emitted: `automation:updated` (list data changed), `automation:run` (per-run status: running/finished with automationID + status).

## Implementation Steps

1. `automation_scheduler.go`: cron instance (`cron.New()`), `resyncSchedule()` mapping enabled scheduled automations → entries; idle dispatcher goroutine.
2. `automation_runner.go`: `runAutomation(a *App, automation)` — session build, `automationUI` (implements the `ui.UI` interface; captures tokens/tool events into a strings buffer + emits `automation:run`), `ProcessUserInput`, history append (cap 20), log file write.
3. `automation_keepawake.go`: `startKeepAwake()`/`stopKeepAwake()` — darwin: `exec.Command("caffeinate", "-i")` started/stopped around runs (build-tagged); others: no-op.
4. Wire scheduler start into `NewApp`; stop on app shutdown.
5. Tests: cron next-run computation, idle dispatcher skip-when-busy, runner history append (with a stub session where possible).

## Todo List

- [ ] Cron scheduler + resync on CRUD
- [ ] Idle dispatcher with busy-skip
- [ ] Runner + automationUI shim + run logs
- [ ] Keep-awake (macOS caffeinate)
- [ ] Serialization vs interactive turns
- [ ] Tests green

## Success Criteria

- An automation with `*/2 * * * *` fires within its window while the app idles, produces a run log on disk, and the UI receives `automation:run` events.

## Risks

- MCP start goroutine leaks per run → reuse `buildSession` but ensure `MCP.Close()` in a defer (pattern exists in `app.go`).
- Long-running turn blocks app quit → runner respects ctx cancel on shutdown.
