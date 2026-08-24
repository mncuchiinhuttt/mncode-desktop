# Scout report — mncode desktop Zcode redesign

Date: 2026-08-23
Work context: `/Users/vominhlong/mncode/mncode-desktop`
CLI source: `/Users/vominhlong/mncode/mncode-cli`
Product code modified: none

## Current desktop surface

- Go/Wails facade: `app.go`, `app-types.go`, `desktop-session.go`,
  `desktop-events.go`, `desktop-prompts.go`, `workspace-tree.go`.
- Current exported bridge methods are workspace selection/tree, provider setup,
  `SetModel`, prompt/steer/cancel, permission resolution, and question answer.
- Frontend shell: `App.tsx` owns view, workspace, messages, activities, prompt,
  model, permission, and question state. `top-bar.tsx`, `app-sidebar.tsx`,
  `workspace-view.tsx`, `activity-panel.tsx`, `settings-view.tsx`, and
  `style.css` are the main UI surfaces.
- `frontend/src/lib/models.ts` currently hard-codes only three models and does
  not match the CLI IDs. `SetModel` changes the Go config but currently does not
  persist or apply provider/base URL mapping.
- `frontend/index.html` hard-codes `class="dark"`; `style.css` defines only a
  dark root token set and most components use literal dark colors.

## CLI catalogs found

| Capability | Source | Values/behavior |
|---|---|---|
| Models | `pkg/ui/model-catalog.go` | 24 curated entries, grouped by Antigravity, OpenCode/OpenRouter free, direct APIs, and custom; `GetAvailableModels` filters by accounts/env/current config. |
| Effort | `pkg/ui/effort-slider.go` | low, medium, high, xhigh, max, pro max; selecting one writes budget and workflow. |
| Workflow | `pkg/ui/workflow-slider.go` | direct, auto, plan-first, ultra-workflow. |
| Permissions | `pkg/config/types.go`, `pkg/ui/settings-catalog.go`, `pkg/ui/inline-prompt-utils.go` | ask, auto, bypass, plan; CLI settings list omits Plan but engine enforces it. |
| Themes | `pkg/ui/theme.go` | pastel-pink, pastel-pink-light, dark, light, cyberpunk, monokai, tokyo-night. Request should expose light/dark first. |

## Recommended contract

Do not copy catalog rows into React. Add read-only exported getters where the
CLI options are currently private, then have a single Wails `GetCatalog`/current
config response map the CLI structs into desktop JSON DTOs. Keep the filtering
inside Go so authenticated-account and free-tier visibility cannot drift.

The desktop setter layer should centralize config mutations:

1. model → model ID, provider, base URL, provider instance;
2. effort → effort ID, thinking budget, associated workflow;
3. workflow → workflow ID;
4. permission → `PermissionMode` plus `AutoApprove` consistency;
5. theme → non-secret setting/UI theme state.

The desktop session currently overwrites loaded permission settings with Ask in
`desktop-session.go`. That is safer than silently inheriting auto-approval, but
it means the new UI must make the selected mode explicit and must not claim a
mode that the engine is ignoring.

## UI direction from the supplied reference

Use a quiet, mostly neutral shell rather than the current neon glass treatment:

- left rail for New task/Search/Workspace/history/settings;
- centered welcome state and composer with project selector above it;
- permission picker beside attachment/action controls;
- model picker aligned to the composer’s right edge;
- optional activity panel instead of a permanently dominant right column;
- light theme as warm off-white/graphite; dark theme as near-black/soft-white;
  keep pink/orange as a restrained brand accent.

The UI/UX search recommends semantic `:root` + `.dark` tokens, visible focus,
4.5:1 contrast, 150–300ms micro-interactions, transform/opacity animation, and
reduced-motion support. These align with the existing Tailwind/shadcn setup and
should replace literal `bg-[#...]`/`text-white` styling across the shell.

## Integration risks

1. **Catalog coupling:** the model catalog lives in the CLI `ui` package and
   effort/workflow option slices are private. Export read-only accessors or move
   shared data later; do not duplicate it in `frontend/src/lib/models.ts`.
2. **Model/provider drift:** selecting a frontend label without applying the
   CLI provider/base URL rules leaves the running agent on the old provider.
3. **Permission mismatch:** persisted CLI config can contain Auto/Bypass while
   desktop currently forces Ask. The UI, `Config`, and `engine.go` must agree,
   with explicit warnings for Auto/Bypass and Plan’s read-only behavior.
4. **Stale runs:** old agent callbacks can arrive after a workspace switch;
   generation IDs and cancellation-aware prompt brokers are required before
   changing the visible workspace.
5. **Wails listener cleanup:** `EventsOff(eventName)` is broad and can remove
   unrelated listeners; retain the unsubscribe returned by `EventsOn`.
6. **MCP trust boundary:** keep MCP from auto-starting. Existing review found
   workspace MCP config can execute child commands with inherited environment
   secrets if startup is re-enabled without trust/sandboxing.
7. **Secrets/persistence:** `config.SaveConfig` serializes API keys. Do not use
   it for new theme/mode setters until preferences are separated from secrets.
8. **Build reproducibility:** `wails.json` asks for `pnpm install --frozen-lockfile`
   but the desktop snapshot lacks `frontend/pnpm-lock.yaml`; clean Wails builds
   need the lockfile and sequential frontend→Go embedding.
9. **Streaming performance:** per-token React state updates and repeated blur/
   glow effects can repaint heavily on long responses; batch tokens and keep
   expensive visual effects off the idle shell.

## Validation checklist

- Backend: catalog DTOs, model mapping, effort/workflow/permission updates,
  cancel/switch/shutdown, stale-event and prompt-broker tests; Go race/vet.
- Frontend: light/dark persistence, keyboard/focus behavior, grouped model
  search, mode pickers, permission/question semantics, responsive shell, and
  reduced motion; TypeScript/Vite build.
- Native: sequential Wails production build, macOS frameless window, custom
  controls, workspace switch while streaming, and activity drawer lifecycle.

## Unresolved decisions

- Whether desktop should expose all seven CLI themes later or permanently keep
  only `light`/`dark`.
- Whether non-secret mode/model preferences should be saved globally or scoped
  to each workspace/session.
- Whether Plan permission mode and plan-first workflow should be separate UI
  controls (recommended: yes; they affect different engine behaviors).
