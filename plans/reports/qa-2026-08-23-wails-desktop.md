# QA Report — 2026-08-23 — mncode-desktop

Scope: `/Users/vominhlong/mncode/mncode-desktop` only. QA did not manually modify product source. The requested build commands regenerated `frontend/dist` and Wails-generated bindings.

## Results

| Check | Result | Evidence |
|---|---|---|
| Frontend build | PASS | `pnpm build`; TypeScript check + Vite, 1,704 modules |
| Go tests | PASS | `go test -race -v ./...`; 2 tests passed |
| Go vet/build | PASS | `go vet ./...`; `go build` |
| Wails doctor | PASS | Wails v2.12.0; system ready for development |
| Wails production build | PASS | Bindings, frontend, app compile, packaging, self-sign all completed |
| Native package | PASS | arm64 Mach-O; `codesign --verify --deep --strict` passed |
| Standalone browser | PASS with limitation | Vite preview returned HTTP 200; UI smoke paths passed |

Frontend browser smoke verified:

- Workspace renders without `window.go`/`window.runtime`.
- Workspace → Insights transition applies `.mn-page-in`.
- Model dropdown opens and changes model label.
- Command palette opens and navigates to Settings.
- Sending a prompt without Wails shows the connection error instead of crashing.

Browser console reported one low-priority issue: `/favicon.ico` returns 404.

## Generated Wails contract

- 11 exported `App` methods match `frontend/wailsjs/go/main/App.d.ts` and `.js`, including `SetModel`.
- Generated models cover `WorkspaceInfo`, `FileNode`, and `LanguageStat` fields.
- `main.go` embeds `frontend/dist`, binds `App`, and registers startup/shutdown hooks.
- `wails.json` frontend install/build commands completed successfully.

## Event lifecycle review

Positive changes observed:

- `activeRun`/`runSeq` reserve turns under the app mutex and suppress stale final `agent:done/error` events.
- Cancel, workspace replacement, and shutdown resolve pending permission/question channels.
- Workspace replacement and shutdown close the old MCP manager.
- Wails `OnShutdown` is registered.

Remaining risks:

1. **P1 — stale stream events after workspace replacement.** `desktopUI` emits token/tool/thinking events through the app without a run/session generation. `OpenWorkspace` cancels and closes the old session but does not wait for `ProcessUserInput`; old callbacks can still update the new workspace UI. Add generation checks to every UI event or wait for the old run before swapping.
2. **P2 — event cleanup is event-wide.** `frontend/src/lib/desktop.ts:38-44` cleans up with `EventsOff(eventName)`, which removes every listener for that event. Use the unsubscribe returned by `EventsOn` so multiple consumers and React StrictMode cannot interfere.
3. **P2 — failed workspace switch tears down the current session first.** `app.go:77-104` closes the old MCP manager before `loadWorkspace` succeeds. An invalid/new unreadable path can leave the previous session present but with closed MCP state. Stage the new session before committing teardown.
4. **P2 — question multi-select is not represented.** Go passes `multi` in `desktop-prompts.go:73-82`, but `QuestionCard` treats every option as a single answer. Confirm whether multi-answer questions are required and implement matching UI semantics if so.
5. **P2 — MCP parity is currently unclear.** `desktop-session.go` creates an MCP manager but does not start it or register MCP tools. This is safer than implicit execution, but MCP functionality is unavailable unless intentional; add an explicit trust/start flow if parity is required.
6. **P2 — standalone browser is visual-only.** Bridge calls fail clearly, but there is no mock/local backend; model selection is only local UI state when opened outside Wails.

## Test coverage gap

The two Go tests cover provider validation and directory filtering only. No automated test covers concurrent `SendPrompt`, cancel while permission/question is pending, workspace switching during a turn, stale events, MCP shutdown, or Wails runtime event subscription cleanup.

## QA caveat

Running Vite build concurrently with a Go `go:embed` build can transiently fail because Vite replaces `frontend/dist` while Go is compiling. Sequential Wails orchestration passes; CI should keep frontend generation and Go embedding sequential.
