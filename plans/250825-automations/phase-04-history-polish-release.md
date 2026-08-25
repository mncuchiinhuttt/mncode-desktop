# Phase 04 — Run History, Polish, Docs & Release

## Context Links

- `plans/250825-automations/plan.md`
- `CHANGELOG.md`, `README.md`, `docs/ARCHITECTURE.md`

## Overview

- **Priority:** P2
- **Status:** Pending
- Run-history UX depth, edge-case polish, documentation, and shipping the feature in a release.

## Requirements

### Functional

- **Run history view:** per-automation history expand shows last 5 runs (time, status, duration, digest); "Open log" reveals the full transcript (copy to clipboard — no external editor dependency).
- **Missed-run policy (v1):** on app start, scheduled automations whose `NextRunAt` passed while the app was closed are marked `skipped: missed` (no catch-up execution) — simple and predictable.
- **Badge:** sidebar Automations entry shows a small count chip when ≥1 automation ran while the sidebar was collapsed (optional, cheap).
- Edge cases: deleting an automation cancels its running job; disabling stops the cron entry; workspace deleted → automation falls back to standalone with a warning chip.

### Non-functional

- `gofmt`/`go vet` clean; Prettier pass on new TSX; both themes verified; reduced-motion respected.

## Implementation Steps

1. History expand UI + log viewer (reuse `DiffView`-style pre block).
2. Missed-run marking in scheduler startup path.
3. Delete-cancels-run + disabled-stops-entry edge cases.
4. Docs: README feature bullet, `docs/AUTOMATIONS.md` (model, schedule format, storage layout, keep-awake notes), CHANGELOG entry under a new version.
5. Release: bump patch version, tag, CI builds, attach macOS universal.

## Todo List

- [ ] History expand + log viewer
- [ ] Missed-run + delete/disable edge cases
- [ ] Docs + CHANGELOG
- [ ] Release tag + CI green

## Success Criteria

- Kill the app mid-schedule → relaunch → missed runs marked, nothing silently fires.
- Full lifecycle (create → fire → inspect history → delete) works without restarts.

## Risks

- Log files grow unbounded → cap per-automation logs at 20 files, prune oldest on append.
