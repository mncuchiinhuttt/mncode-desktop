# Final QA Report — 2026-08-23 — ZCode-style redesign

Scope: `/Users/vominhlong/mncode/mncode-desktop` and imported
`/Users/vominhlong/mncode/mncode-cli`. QA did not edit product source. Build
commands regenerated frontend/build artifacts only.

## Verification

| Area | Command / check | Result |
|---|---|---|
| CLI tests | `go test -count=1 ./...` | PASS |
| CLI static check | `go vet ./...` | PASS |
| Desktop tests | `go test -count=1 ./...` | PASS |
| Desktop race | `go test -race -count=1 ./...` | PASS |
| Desktop static check | `go vet ./...` | PASS |
| Desktop compile | `go build ./...` | PASS |
| Frontend type/build | `pnpm build` (`tsc --noEmit` + Vite) | PASS; 1,705 modules |
| Wails production package | Wails v2.12, `darwin/arm64`, production mode | PASS |
| Native artifact | `codesign --verify --deep --strict` | PASS |

Wails CLI was invoked through `go run .../wails@v2.12.0`; the production
package used the separately verified frontend build (`-s -skipbindings`) so
QA did not rewrite generated bindings or source files.

## Native UI smoke test

Opened the production `.app` with `MNCODE_WORKSPACE` pointing to `mncode-cli`.

- Workspace loaded successfully: `mncode-cli`, 209 files, real file tree.
- Light theme rendered; sidebar control changed to dark mode.
- Dark theme rendered; sidebar control changed back to light mode.
- Settings page rendered in both app states and was restored to the initial
  light theme before shutdown.
- Permission menu exposed: Ask, Auto, Plan, Bypass.
- Workflow menu exposed: direct, auto, plan-first, ultra workflow.
- Effort menu exposed: low, medium, high, xhigh, max, pro max.
- Model menu read the live CLI catalog and showed 17 currently available
  entries, including Antigravity, OpenCode/OpenRouter free entries, and Custom.
- Native close/shutdown completed without a lingering process.

## Important risks

1. **P1 — Activity panel permission label is hard-coded.**
   `frontend/src/components/activity-panel.tsx` always displays “Ask before
   tools”, while the live workspace in QA reported `Bypass permissions`. This
   can misrepresent the actual safety policy.

2. **P1 — Lifecycle edge cases remain untested and appear unsafe.**
   `app.go` resets the active run and swaps sessions without waiting for the
   old `ProcessUserInput` goroutine; `desktop-events.go` emits stream events
   without a workspace/run generation. Workspace switching can therefore
   deliver stale tokens or tool events to the new workspace.

3. **P1 — Settings persistence inherits plaintext credential risk.**
   `catalog.go:UpdateSettings` calls `config.SaveConfig`, which is shared with
   the CLI config store. Theme/mode changes can therefore rewrite a config
   containing API credentials. Separate non-secret preferences from secrets
   and use OS keychain storage before release.

4. **P2 — Coverage gap.**
   Desktop tests cover workspace-tree behavior only. There are no automated
   tests for catalog mapping, settings setters, concurrent turns, cancellation
   while a permission/question is pending, stale events, or MCP shutdown.

5. **P2 — Reproducibility.**
   `frontend/pnpm-lock.yaml` is absent. Local `pnpm install --frozen-lockfile
   --offline` and builds pass with pnpm 10.28, but CI/clean-machine behavior
   remains tool-version dependent until a lockfile is committed.

## Final status

Build and native UI smoke gates pass. No release-blocking compile/test failure
was found. Fix the permission display mismatch and lifecycle/credential risks
before calling the desktop app production-ready.
