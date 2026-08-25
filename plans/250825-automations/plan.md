---
title: "Automations — scheduled & idle-time agent tasks"
description: "Add a working Automations feature to mncode-desktop: cron-scheduled and idle-time agent runs with history, templates, and keep-awake, replacing the Coming Soon placeholder."
status: pending
priority: P1
effort: 12h
branch: main
tags: [feature, backend, frontend, desktop]
created: 2026-08-25
---

# Automations Feature Plan

## Overview

Turn the Automations sidebar entry from a "Coming soon" placeholder into a working feature, modeled on the ZCode reference: users create **scheduled tasks** (cron-style, e.g. "Weekdays at 09:00") and **idle-time tasks** (run when the app is free), each executing a real agent turn against a workspace. Includes a keep-awake toggle, run history, and live status in the UI. All styling follows the existing RMIT token system (`--mn-*`).

## Current State (Codebase Facts)

- `frontend/src/components/management-view.tsx` renders an explicit "Coming soon" card when `kind === "automations"`; the sidebar + command palette already navigate to `view === "automations"`.
- `desktop-session.go` → `buildSession(workspace)` builds a full `agent.Session` (provider, tools, accounts router, MCP). `app.go` → `SendPrompt` runs `session.ProcessUserInput(ctx, text)` guarded by a single-turn mutex (`a.activeRun`).
- The `desktopUI` bridge emits chat events; automation runs must NOT spam the chat transcript — they need a separate quiet UI shim.
- Persistence convention: JSON under `~/.mncode/` (config store pattern in `mncode-cli/pkg/config/store.go`).
- Wails bindings are called by name from `frontend/src/lib/desktop.ts` (`window.go.main.App[...]`) — new Go methods need only lib wrappers + types.
- Events pattern: `a.emit(name, payload)` + `listen(...)` in `App.tsx` cleanups.

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | Automation model, store & CRUD bindings | Pending | 2.5h | [phase-01](./phase-01-automation-engine.md) |
| 2 | Scheduler, runner & keep-awake | Pending | 3.5h | [phase-02-scheduler-runner.md](./phase-02-scheduler-runner.md) |
| 3 | Automations UI (list, templates, create/edit dialog) | Pending | 4h | [phase-03-automations-ui.md](./phase-03-automations-ui.md) |
| 4 | Run history, polish, docs & release | Pending | 2h | [phase-04-history-polish-release.md](./phase-04-history-polish-release.md) |

## Key Dependencies

- `robfig/cron/v3` (new Go dep) — battle-tested cron parsing + next-run computation.
- Agent core (`mncode/pkg/agent`) — already a module dependency.
- No new frontend deps.

## Non-Goals (v1 — YAGNI)

- No CLI parity, no cloud sync, no per-automation model override (uses the active provider config).
- No system notifications (Wails toast + in-app badge only).
- Idle detection = "app is running and no agent turn is active" (matches ZCode's "Soonest available"), not OS-level input idle.

## Risks

- Automation turns share provider quotas with interactive use → serialize runs (queue), surface "skipped: busy" in history.
- Cron goroutine lifecycle on workspace switching → scheduler owns its own standalone sessions per run; independent of the UI session.

## Success Criteria

- A scheduled task fires at its next cron tick without the app in the foreground, runs the agent, and appears in run history.
- An idle-time task runs when the app is free, and is skipped (with a history entry) when busy.
- CRUD + toggle persist across app restarts (`~/.mncode/automations.json`).
- UI matches the ZCode reference structure with the RMIT design system; no "Coming soon" remains.
