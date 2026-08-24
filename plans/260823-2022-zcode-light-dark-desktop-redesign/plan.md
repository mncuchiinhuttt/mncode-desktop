# mncode desktop — Zcode-inspired light/dark redesign

Status: Implemented · native smoke-tested

## Goal

Make the separate Wails app feel like the supplied Zcode reference: calm left
rail, centered first-task composer, compact model/permission controls, and
polished light/dark themes. Keep the Go agent real and make catalogs come from
`mncode-cli`, never from a second frontend list.

## Source of truth

- Models: `mncode-cli/pkg/ui/model-catalog.go:10-257` — `ModelChoice` and
  `GetAvailableModels` (credential-aware, free tiers, current custom model).
- Effort: `mncode-cli/pkg/ui/effort-slider.go:13-64` — six levels and budgets.
- Workflow: `mncode-cli/pkg/ui/workflow-slider.go:13-40` — direct/auto/
  plan-first/ultra-workflow.
- Permission: `mncode-cli/pkg/config/types.go:20-27` — ask/auto/bypass/plan;
  Plan enforcement is in `mncode-cli/pkg/agent/engine.go:148-176`.
- Theme: `mncode-cli/pkg/ui/theme.go:8-157`; expose `light` and `dark` first.

## Phases and exact files

1. **Catalog contract.** Update `app-types.go`, `app.go`, `desktop-session.go`,
   `frontend/src/types.ts`, and `frontend/src/lib/desktop.ts`. Add one typed
   catalog read API plus setters for model, effort, workflow, permission, and
   theme. Model setters must apply CLI provider/base-URL mapping and
   `EnsureProvider`; effort setters update effort, budget, and paired workflow.
2. **Safety/lifecycle.** Update `app.go`, `desktop-events.go`,
   `desktop-prompts.go`, `workspace-tree.go`, `desktop-session.go`, `main.go`,
   `frontend/src/App.tsx`, and `frontend/src/lib/desktop.ts` for run generations,
   stale-event suppression, cancellation-aware prompt waits, staged workspace
   switches, and per-listener Wails cleanup. Keep MCP disabled on open.
3. **Zcode shell.** Refactor `App.tsx`, `app-sidebar.tsx`, `top-bar.tsx`,
   `workspace-view.tsx`, `activity-panel.tsx`, and `settings-view.tsx`: left
   rail, calm center canvas, project selector, suggestion cards, optional
   activity drawer, permission picker left, model picker right.
4. **Themes/modes.** Update `frontend/index.html`, `frontend/src/style.css`,
   `App.tsx`, `settings-view.tsx`, `top-bar.tsx`, and existing `components/ui`.
   Replace hard-coded dark colors with `:root`/`.dark` semantic tokens, add a
   light/dark toggle, grouped searchable model picker, effort/workflow cards,
   Ask/Auto/Bypass/Plan warnings, and theme swatches. Keep motion 150–300ms,
   transform/opacity based, focus-visible, contrast-safe, and reduced-motion
   aware. Replace `frontend/src/lib/models.ts` hard-coded options.
5. **Verification.** Add tests for DTOs, model mapping, effort budgets,
   permission semantics, cancellation, workspace switching, and stale events.
   Run sequentially: Go tests/race/vet, `pnpm --dir frontend build`, then
   `wails build`; smoke-test native theme/model/mode/dialog/lifecycle paths.
   Add `frontend/pnpm-lock.yaml` before relying on frozen Wails installs.

## Implementation notes

- Catalog sync is implemented through `GetCatalog` and `UpdateSettings`; the
  desktop reads the live model list and mode catalogs from the CLI package.
- The left rail no longer contains Group/Project tabs or a file tree. Files,
  side chat, and run activity live in the right workspace sidecar.
- Automations and MCP/plugins are now primary left-rail views; the right
  sidecar is limited to Files, Chat, and Run. The native macOS titlebar is
  hidden/transparent so traffic lights and edge resizing remain available.
- Native smoke tests covered light/dark toggling, context menu actions, model,
  permission and effort selectors, side-note promotion, file selection, help,
  starter prompts, and workspace-picker cancellation.
- Context ring focus/hover card shows the live model, used tokens, configured
  context budget, remaining tokens, percentage, and progress bar.
- The composer now uses compact typography, `Effort`/`Models` labels, title-case
  effort names, and the mncode-web terminal logo asset in the left rail.
- The profile menu now uses the shared CLI mncode-web login key, resolves live
  identity through `/api/keys/whoami`, supports offline cached identity, and
  exposes sign-out instead of a hardcoded local name.
- Settings now opens as a dedicated animated shell with General, Appearance,
  and Account sections; the main left rail uses New chat and no longer shows
  the separate Search item.
- Automations intentionally shows a Coming soon state until the scheduler
  bridge is implemented.
- Composer autocomplete now reads CLI context files, slash commands, and loaded
  skills; it supports filtering, keyboard selection, Escape dismissal, and
  reports the full match count even when the visible list is capped.
- The top-bar `⌘K` hint sits next to Search, while the right sidecar remains
  mounted during close/open transitions for a smooth width-and-opacity motion.
- The collapsed left rail now removes its expanded titlebar padding and logo,
  keeping the reopen control inside the 68px rail and the workspace title clear.
- The collapsed reopen control also receives a vertical macOS titlebar safe
  inset so it does not sit against the native traffic lights.
- Account auth no longer depends on an open workspace; the landing greeting is
  account-aware and transient notices use the top-center toast placement.
- Catalog hydration now builds a lightweight CLI session from shared config, so
  models, efforts, workflows, and permissions remain available on the guest
  landing screen before a project is selected.
- Account now keeps identity and usage together; the usage heatmap supports
  daily, weekly, cumulative views and per-day token/session hover details.
- Models now has dedicated provider management for Antigravity, Codex/OpenAI,
  OpenCode, and persisted custom providers with three API format choices. The
  active Antigravity account also exposes the CLI quota checker data and reset
  times in the Models view.
- General no longer contains the legacy in-memory Provider connection card;
  provider credentials are managed from Models alongside their catalogs.
- Appearance now includes system-aware theme selection, typography controls,
  code display toggles, code-theme selectors, and paired live previews.
- Settings row cards now remove the shadcn card's default inter-row gap and
  excess vertical padding; shared switches stay clipped inside their tracks.
- The bottom terminal panel now follows the active light/dark surface tokens
  and only mounts after a workspace terminal session opens successfully.
- Remote companion now reuses the CLI remote bridge: QR pairing, copyable
  session links, steer/cancel/question routing, agent status pushes, and live
  phone heartbeat/device status are available from the sidebar phone control.
- Remote pairing now explains the workspace prerequisite and preserves the
  backend error message instead of collapsing it into a generic failure toast.
- The sidebar phone control now polls the remote session even while the dialog
  is closed and turns green only when a companion heartbeat is fresh.
- Antigravity account switching now updates the account list in place and
  refreshes only a two-group quota skeleton for Gemini and GPT/Claude models.
- Account usage now surfaces expired/revoked mncode-web sync keys with a
  re-authentication action; Account and App info cards no longer double-pad
  their outer shells.
- App info's inset icon now stays inside the edge-to-edge card shell instead of
  overlapping the rounded border.
- Settings now animate out to the left before returning to workspace, matching
  the existing settings enter transition.
- General now exposes the CLI-backed context window, auto-compact, language,
  interrupt mode, artifacts, and verbose logging preferences through shared
  config persistence.
- MCP setup dialogs now link directly to official Notion and GitHub token
  documentation and use real brand logo assets with an offline fallback.
- Settings now use compact row rhythm, shadcn inputs for numeric controls,
  readable section typography, corrected light/dark code previews, and fuller
  personality descriptions backed by the CLI's per-style prompt guidance.
- App info now reports `v0.1-beta` and performs a background/manual release
  check, asking before opening the update page.

## Guardrails

Shared model/mode/theme preferences are persisted through the CLI config;
provider credentials are managed through the Models provider flows. Do not add
unsupported automation/plugin trust flows. Full MCP trust/start flow remains
out of scope.
