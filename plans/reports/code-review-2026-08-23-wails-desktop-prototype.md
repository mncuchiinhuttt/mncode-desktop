# Wails desktop prototype review

Date: 2026-08-23  
Scope: `/Users/vominhlong/mncode/mncode-desktop` plus imported `mncode-cli` paths needed to verify lifecycle and credential behavior. Product code was not modified.

## Findings

### [Critical] Opening a workspace can execute MCP commands with all process secrets

- `desktop-session.go:63-67` starts every configured MCP server automatically with `context.Background()` before any agent/tool permission decision.
- `mncode-cli/pkg/mcp/manager.go:33-47` accepts workspace `.claude/mcp.json`; `mncode-cli/pkg/mcp/client.go:28-50` executes its command.
- `mncode-cli/pkg/config/dotenv.go:9-46` loads workspace `.env` values into the process environment, and `mncode-cli/pkg/mcp/client.go:33-37` passes `os.Environ()` to the child.

Opening an untrusted repository can therefore run arbitrary configured commands and expose `ANTHROPIC_API_KEY`, cloud tokens, and other environment secrets. MCP startup needs explicit trust/confirmation, a restricted environment, and a cancellable/owned process group.

### [P1] Turn admission and cancellation ownership are racy

- `app.go:128-156` checks `Session.IsExecuting()` before starting a goroutine, but `ProcessUserInput` only sets that flag inside the goroutine (`mncode-cli/pkg/agent/engine.go:13-15`). Two quick Wails calls can start two loops against the same `Session.History` and provider.
- Each accepted turn overwrites `a.cancel`; any finishing turn then unconditionally clears it at `app.go:154-156`. An older turn can therefore disable cancellation for a newer turn, including after `OpenWorkspace` swaps sessions (`app.go:81-88`).

Reserve a run atomically under the app mutex and associate cancel/wait state with a run or session generation. Do not publish `agent:done/error` from stale runs.

### [P1] Only the explicit CancelTurn path releases prompt waits

- `app.go:189-205` now drains permission/question channels for an explicit `CancelTurn`, but workspace replacement at `app.go:83-91` only calls `a.cancel()` and does not drain them.
- `desktop-prompts.go:22-29` and `desktop-prompts.go:54-62` wait only for a response or a ten-minute timer; neither observes the turn context.
- `mncode-cli/pkg/agent/engine.go:182-193` calls the synchronous UI confirmation without passing context.

If the user switches workspace or closes the window while a permission/question is visible, the old backend can remain `IsProcessing` for up to ten minutes, blocking cleanup and retaining the old session. Make both brokers context-aware and resolve pending requests on every cancellation/shutdown path. Also suppress the stale `agent:error` that can follow `agent:cancelled`.

### [P1] The question bridge is exposed but not usable

`desktop-session.go:52-57` wires `AskTool` to `waitForQuestion`, which emits `agent:question` at `desktop-prompts.go:49-52`. `App.tsx:47-64` never subscribes to that event, and `frontend/src/lib/desktop.ts:23-34` has no `answerQuestion` wrapper even though generated bindings expose it (`frontend/wailsjs/go/main/App.d.ts:5`). Any `ask_question` call waits for the timeout instead of reaching the user.

### [P1] Workspace/session/MCP lifecycle has no shutdown or ownership cleanup

- `app.go:75-91` replaces the active session after only calling the current turn cancel; it does not close the old session's `MCP` manager or wait for the old agent.
- `desktop-session.go:63-67` starts MCP asynchronously and never retains a startup cancel function.
- `main.go:19-32` registers no `OnShutdown`/`OnBeforeClose` cleanup.
- The imported manager/client do provide `Close` (`mncode-cli/pkg/mcp/manager.go:166-174`, `mncode-cli/pkg/mcp/client.go:246-259`).

Switching workspaces can leak MCP child processes and allow stale agent events to arrive after the new workspace is active; closing the window has no graceful cancellation path.

### [P1] The permission UI does not represent the actual safety boundary

- `desktop-prompts.go:17-20` sends only a tool name and generic summary; it drops the command/path/arguments from the `ToolCall`.
- `workspace-view.tsx:58-59` asks the user to “Allow once” without showing the operation or diff.
- `desktop-session.go:29` honors `cfg.AutoApprove`, including persisted settings loaded by `mncode-cli/pkg/config/store.go:91-101`, while the UI always says “ask before tools” (`workspace-view.tsx:53`, `activity-panel.tsx:19`).

The user can approve an opaque `bash`/write/edit operation, or see no prompt at all while the UI claims permission-aware execution. Show a sanitized preview and make the desktop permission policy authoritative.

### [P1] Credential and session privacy are inherited from plaintext stores

- `app.go:94-115` accepts a raw API key over the JS bridge and retains it in `cfg.APIKey` and the provider object; there is no OS keychain integration or explicit zeroing on workspace close.
- `desktop-session.go:16-34` calls `config.LoadConfig`, which loads `~/.mncode/config.json`; that store serializes `APIKey` (`mncode-cli/pkg/config/store.go:23-33,52-59`). Account access/refresh tokens are also JSON fields (`mncode-cli/pkg/accounts/types.go:19-31`) in `~/.mncode/accounts.json`.
- Every completed turn calls `Session.Save` (`mncode-cli/pkg/agent/engine.go:142`), which writes conversation/tool history with mode `0644` (`mncode-cli/pkg/agent/session-store.go:25-33,69-75`).
- `settings-view.tsx:18-24` clears the key only after a successful save; cancel/escape leaves it in React state while the view remains mounted.

The “not written to disk” copy is true only for this specific configure path, not for the desktop's overall credential/session surface. Use OS secret storage, restrictive session permissions, and clear transient key state on every close/error path.

### [P2] React/Wails async effects can apply stale workspace data

`App.tsx:42-45` starts `refreshFiles()` without a request/generation guard. `App.tsx:47-67` also starts an initial `GetWorkspace` call while startup/default workspace loading and native workspace selection can be in flight. A slower tree response from an older workspace can overwrite the current tree. Add an operation id/abort policy and ignore stale completions.

`frontend/src/lib/desktop.ts:36-42` also discards the unsubscribe returned by `EventsOn` and calls `EventsOff(eventName)`, which removes every listener for that event rather than only this subscription.

### [P2] Token streaming causes avoidable render/repaint amplification

`App.tsx:56-59` updates React state for every token/thinking/tool event; token updates map the entire message array, and `workspace-view.tsx:34` re-renders every message on each update. Messages are unbounded and there is no virtualization, frame batching, or auto-scroll strategy. Long responses will increasingly compete with the Wails event stream, especially with the repeated `backdrop-filter`/animation styling in `style.css:116-153`.

`workspace-tree.go:45-79` and `file-tree.tsx:11-45` likewise render an unbounded returned tree without virtualization or a result cap.

### [P2] Important controls lack accessible state/announcement semantics

- The main composer textarea has no label or `aria-label` (`workspace-view.tsx:52-53`).
- Permission requests are inline content without `role="alertdialog"`, `aria-live`, or focus management (`workspace-view.tsx:58-59`); running state and toast notifications are also not announced (`App.tsx:61-64,99`).
- Raw navigation/tree/action buttons have no consistent `focus-visible` styling (`app-sidebar.tsx:62,69`, `file-tree.tsx:25-40`, `command-palette.tsx:17`).

Keyboard and assistive-technology users may miss a blocking permission request or lose context during a streaming turn.

### [P2] Model selection is not a reliable bridge contract

`App.tsx:26` stores a frontend-only model; `top-bar.tsx:32-35` and `workspace-view.tsx:53` write hard-coded values such as `claude-sonnet`/`gemini-pro`, while `frontend/src/lib/models.ts:1-4` defines different provider model ids. `desktop.ts` has no model-setting method, and the agent reads `session.Config.Model` (`mncode-cli/pkg/agent/engine.go:43-49`). Selecting a model after provider setup changes the label only; it does not change the running Go session.

## Verification

- `go test ./...` — pass; the current snapshot has two small workspace/provider tests, but no lifecycle tests.
- `go test -race ./...` — pass; no concurrent behavior tests exercised.
- `go vet ./...` — pass.
- `pnpm build` — pass (`tsc -b` and Vite production build).
- Wails runtime smoke test was not run because the `wails` CLI is not installed in this environment.

## Review priority

Before adding more UI polish, fix the MCP trust/environment boundary, atomic turn lifecycle, context-aware prompt cancellation, and the missing question/permission flows. Then add integration tests that exercise two simultaneous `SendPrompt` calls, workspace switching during a turn, cancel while permission/question is pending, and Wails shutdown with live MCP children.
