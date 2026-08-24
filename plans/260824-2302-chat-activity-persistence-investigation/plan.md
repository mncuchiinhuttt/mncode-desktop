# Chat activity persistence — implementation plan

Status: Proposed from read-only investigation. No source changes made.

## Goal

Preserve the activity timeline, subagents, edited files, tool events, and run summary when a user leaves and reopens a chat, without mixing events between chats or relying on backend replay that does not exist.

## Phase 1 — Make local snapshots reliable

Files: `frontend/src/App.tsx`, `frontend/src/types.ts`.

- Keep one normalized `ChatSnapshot` containing messages, activities, run summary, and usage.
- Centralize snapshot creation and persistence; use a latest-state ref so transition saves cannot capture an old React render.
- Flush on chat selection, keyboard selection, new task, branch, delete, `pagehide`, and shutdown; retain debounced autosave for normal updates.
- Normalize legacy `localStorage` records and handle write/quota errors.

## Phase 2 — Define run/chat ownership

Files: `app.go`, `desktop-events.go`, `desktop-session.go`, `frontend/src/lib/desktop.ts`, `frontend/src/App.tsx`.

- Preferred if background runs are supported: pass `chatID`/`runID` into `SendPrompt`, include them in every `agent:*` payload, and update a per-chat state map; ignore stale generations.
- Simpler alternative: cancel or disable chat switching while a run is active, then flush the final snapshot before changing chats.
- Fix subagent prompt propagation and tool-result correlation by tool-call ID while touching the event contract.

## Phase 3 — Backend session contract and artifact verification

Files: `desktop-session.go`, `app.go`, `frontend/src/lib/desktop.ts`, optionally `../mncode-cli/pkg/agent/session-store.go`.

- If chat IDs must restore agent context, add explicit list/load/restore APIs; otherwise document that backend `Session.History` is shared and local chat records are display snapshots.
- Build frontend before `wails build`; verify embedded assets and launch the new binary.

## Tests and definition of done

- Frontend tests cover A → B → A, reload, immediate transition after an event, legacy records, and storage failure.
- Go tests cover event identity, cancellation/stale generations, and backend session behavior if added.
- `pnpm exec tsc --noEmit`, `pnpm build`, `GOTOOLCHAIN=local go test ./...`, `wails build`, and a native smoke test all pass.
- Returning to a chat shows its prior timeline/subagents/edited files/tool results; a run from chat A never mutates chat B.
