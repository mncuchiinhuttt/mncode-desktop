# Phase 03 — Automations UI

## Context Links

- `plans/250825-automations/plan.md`
- ZCode reference screenshot (Automations: empty state, create buttons, keep-awake toggle, template galleries)
- `frontend/src/components/management-view.tsx` (placeholder to replace), `settings-view.tsx` (dialog patterns), RMIT utilities in `style.css`

## Overview

- **Priority:** P1
- **Status:** Pending
- Full Automations view following the ZCode reference structure, restyled with the RMIT token system. Design read: product UI, redesign-preserve, dials variance 4 / motion 3 / density 5.

## Requirements

### Functional

- Replace the `kind === "automations"` branch of `ManagementView` with a dedicated `AutomationsView` component (ManagementView keeps MCP only).
- **Header:** `[ AUTOMATIONS ]` eyebrow + title "Automations" + subtitle "Schedule recurring tasks or queue background work that runs during idle time."
- **Empty state:** "No automations yet." + `Create scheduled task` (primary, pink) + `Create idle-time task` (ghost).
- **Template galleries** (shown when empty, and as a collapsed "Templates" strip later): hardcoded presets —
  - Idle: Standup Git Summary, CI Failures & Flaky Test Report, Documentation sync check (each "Soonest available")
  - Scheduled: Morning dev brief (Weekdays 09:00), Risk scan (Daily 10:00), Release brief (Mondays 09:00)
  - Clicking a template opens the create dialog prefilled.
- **Keep-awake toggle** row (SettingRow pattern) wired to `SetKeepAwake`.
- **Automation list:** card per automation — name, kind badge (SCHEDULED/IDLE), cron humanized ("Weekdays at 09:00"), workspace name, enabled toggle, last-run status chip (success/error/skipped/running with pulse), actions: Run now, Edit, Delete (confirm dialog), history expand (last 5 runs).
- **Create/Edit dialog:** name input, kind segmented control, schedule picker (presets dropdown + custom cron input for scheduled), workspace selector (current workspace or standalone), prompt textarea (auto-grow pattern from custom instructions).
- Live updates: listen `automation:updated` + `automation:run` → refresh list; running automations show pulse + disable Run now.

### Non-functional

- All strings English, no emoji, lucide icons only.
- Empty/loading/error states for the list (skeleton cards while loading).

## Implementation Steps

1. `lib/desktop.ts` + `types.ts`: wrappers + `Automation`, `AutomationInput`, `AutomationRun` types.
2. `components/automations-view.tsx`: view shell, empty state, template galleries, keep-awake row.
3. `components/automation-dialog.tsx`: create/edit form with validation mirroring Go-side rules.
4. `components/automation-card.tsx`: list card with toggle/actions/history expand.
5. Wire events (`automation:updated`, `automation:run`) in `App.tsx` or inside the view via `listen`.
6. Route `ManagementView kind="automations"` → render `AutomationsView` instead.

## Todo List

- [ ] Types + lib wrappers
- [ ] AutomationsView shell + empty state + templates
- [ ] Create/edit dialog with schedule picker
- [ ] Automation cards + run history expand
- [ ] Event wiring + live running state
- [ ] Prettier pass + both themes checked

## Success Criteria

- Full CRUD flow works from the UI; templates prefill correctly; list reflects scheduler state live.

## Risks

- Cron input confusion → always show humanized preview under the cron input ("Next run: Tue 09:00") from a `NextRunPreview` binding if needed (optional).
