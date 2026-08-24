# Chat activity disappears after chat switch — investigation report

Date: 2026-08-24 23:02 (+07:00)  
Scope: `/Users/vominhlong/mncode/mncode-desktop` and its `../mncode-cli` dependency  
Mode: read-only; no source files changed

## Executive summary

- **Issue:** Returning to a previously opened chat loses the activity timeline, subagents, edited-file cards, and tool events.
- **Confirmed persistence gap:** These records are UI-only React state. The desktop history model originally persisted only `messages`; the Go session store persists provider messages/tool-call messages, not UI activity records, and the Wails facade has no activity-history API.
- **Current tree status:** `frontend/src/App.tsx` now contains a partial `ChatSnapshot`/`localStorage` implementation (`App.tsx:181-208, 643-659, 1458-1477`). It is not covered by tests. The standalone `mncode-desktop` binary is older and does not contain the snapshot markers; `main.go:12` embeds `frontend/dist`, so a stale build can still reproduce the original behavior.
- **Remaining live risk:** Chat switching is not tied to a run/session identity. If a run continues after leaving chat A, later global Wails events can update chat B; chat A has no backend replay path when reopened.
- **Recommended fix:** Make per-chat snapshots the canonical UI state, flush them on every transition, and either cancel/disable switching during a run or add `chatID`/`runID` to `SendPrompt` and every agent event. Rebuild the Wails artifact and add regression tests before shipping.

## State and event flow

1. `desktop-session.go:46-59` creates one `agent.Session` with one `desktopUI` listener and one in-memory `SubagentRegistry`.
2. `desktop-events.go:17-129` converts CLI callbacks into Wails events: `agent:start` is emitted from `app.go:254-275`; token, thinking, tool-start/result, subagent, goal, and error events are emitted without a chat ID or run ID.
3. `App.tsx:723-1110` subscribes once and writes all event data into one global `activities` array plus one global `messages`, `runSummary`, and `runUsage` state.
4. `agent-run-panel.tsx:122-176` derives subagents and edited files from `activities`; `workspace-view.tsx:169-177, 923-940` derives the run summary/action feed from the same state. There is no independent data source.
5. The browser persistence key is `mncode-chat-history` (`App.tsx:153, 639-641`). `ChatSession` has optional `activities`, `runSummary`, and `runUsage` fields (`types.ts:46-56`). The current `ChatSnapshot` writer stores them (`App.tsx:188-207`), and current `openChat`/keyboard selection reads them (`App.tsx:1180-1195, 1469-1477`).
6. The Go/Wails bridge exposes prompt/workspace/settings methods in `frontend/src/lib/desktop.ts:46-108`, but no list/load/restore chat or activity method.

## Findings

### 1. Original root cause: activity state was not part of chat persistence — confirmed

The activity UI is derived entirely from transient `activities` state. Before the current snapshot code, switching chat replaced messages and explicitly reset activities; an old embedded bundle/binary still follows that behavior. Once that state is cleared, no Wails event is replayed and no backend API can reconstruct it.

The current source appears to contain an unverified partial mitigation: `ChatSnapshot` writes activity fields and `openChat` reads them. Treat this as a pending fix, not proof of resolution: there is no frontend persistence test, and the shipped `mncode-desktop` binary was built on 2026-08-23 and lacks `mncode-chat-history`, `runSummary`, and `selected.activities` when inspected with `grep -a`.

### 2. Go persistence cannot repair the missing UI records — confirmed

- `../mncode-cli/pkg/agent/session-store.go:14-23, 35-75` saves `SavedSession.Messages` and metadata only.
- `../mncode-cli/pkg/agent/types.go:44-62` keeps `History` and `Subagents` in memory; `SubagentRegistry` records are not part of `SavedSession` (`subagent-registry.go:8-23`).
- `../mncode-cli/pkg/agent/engine.go:105-143` appends provider assistant/tool messages and calls `Session.Save`, but does not persist desktop activity DTOs, file diff summaries, or subagent cards.
- `frontend/src/lib/desktop.ts` has no call to `ListSavedSessions`, `LoadSavedSession`, or a desktop equivalent. `SendPrompt` accepts only `prompt` (`desktop.ts:96`, `app.go:217-275`).

Therefore the browser snapshot is currently the only viable source for the desktop activity timeline.

### 3. Active runs can still cross-contaminate chats — confirmed code path / likely symptom amplifier

`openChat` (`App.tsx:1469-1477`) does not cancel an active run. It swaps the single global `activities` state to the selected chat, while `desktop-events.go` continues emitting callbacks from the old `agent.Session`. Late `agent:tool-*`, `agent:subagent-*`, `agent:done`, or `agent:error` events then update whichever chat is active. When the user returns to chat A, it can only load A's snapshot from the time of the switch; events received while B was selected were never associated with A and cannot be replayed.

This is independent of the snapshot patch and must be resolved if switching away while an agent is running is supported.

### 4. Persistence is debounced and has no unload/error path — risk

`App.tsx:643-659` writes after 450 ms and only when `messages.length > 0`; `localStorage.setItem` at `639-641` is not guarded for quota/storage errors. `persistCurrentChat` is called on explicit chat/new-task/branch transitions, but it captures React render state. A very fast event-to-click transition can save a stale activity array, and closing the WebView before the timer fires can lose the last snapshot.

### 5. Event payload matching has adjacent correctness gaps — not primary cause

- `desktop-events.go:73-83` emits subagent prompt data, but `App.tsx:939-960` destructures only `name` and `role` and stores the outer composer `prompt` instead of the event's prompt. Rehydrated subagent cards can therefore show the wrong prompt.
- `App.tsx:895-937` completes a tool activity by `toolName` plus `active`, not the emitted tool-call `id`; repeated same-name calls can attach a result to the wrong card.
- `frontend/src/lib/desktop.ts:110-116` calls `EventsOff(eventName)` rather than the unsubscribe returned by Wails `EventsOn`. This can remove unrelated listeners and there is no event replay after cleanup. It is not the direct persistence cause, but it makes event loss harder to diagnose.

## Recommended implementation plan

1. **Ship the current snapshot concept correctly.** Normalize old `ChatSession` records to empty activity/usage defaults; centralize `snapshotForChat`/`persistChatSnapshot`; update a `latestSnapshotRef` on every state change; synchronously flush the current snapshot on chat switch, new task, branch, delete, `pagehide`, and shutdown. Keep activity fields bounded and handle `localStorage` failures visibly.
2. **Choose run lifecycle semantics.**
   - If background runs across chat switches are not required: cancel the active turn or disable chat selection while `running`; flush its final snapshot before switching.
   - If background runs are required: add `chatID` and `runID` to `SendPrompt`; carry the identity in `desktopUI`/`App.emit`; include it in every `agent:*` payload; store state in a `Map<chatID, ChatSnapshot>` and ignore stale run generations. Do not route events by whichever chat happens to be visible.
3. **Decide whether chats are truly separate agent sessions.** The current Go app has one `agent.Session`/`History` (`desktop-session.go:46-59`) for all frontend chat IDs. If selecting a chat must restore agent context, add backend chat/session list/load/restore APIs or explicitly document that chat history is display-only.
4. **Rebuild and verify the artifact.** Run the frontend build before `wails build`; assert `frontend/dist/index.html` asset references exist; launch the newly built binary, not the 2026-08-23 executable. `main.go:12` makes `frontend/dist` the embedded runtime source.

## Required regression tests

- Frontend unit tests for snapshot upsert/read/normalize: preserve messages, tool activity, subagent prompt/result/status, edited-file path/line counts/snippets, run summary, and usage across A → B → A and reload from `localStorage`.
- Transition test that switches immediately after a tool/subagent event and proves the latest activity snapshot—not the previous render—is saved.
- Lifecycle test for A running → switch to B → late tool/result/done event: either the run is cancelled and no late event mutates B, or events remain keyed to A and are visible when returning.
- Frontend test for old records without optional activity fields and for `localStorage` quota/write failure.
- Go tests for run/chat identity on `SendPrompt` and all `desktopUI` event payloads, plus stale-generation suppression after `OpenWorkspace`/`CancelTurn`.
- Build smoke test: `pnpm exec tsc --noEmit`, `pnpm build`, `GOTOOLCHAIN=local go test ./...`, then `wails build`; verify the launched binary contains the current frontend behavior.

## Verification performed

- `pnpm exec tsc --noEmit` — passed.
- `GOTOOLCHAIN=local go test ./...` — passed (`mncode-desktop`).
- Read-only inspection of frontend source/dist, Wails bindings, desktop Go facade, and `../mncode-cli` session/event code.
- No source edits made.

## Unresolved questions

- Was the report reproduced in `wails dev`, the current `frontend/dist`, or the older standalone `mncode-desktop` binary?
- Should an agent continue running when the user selects another chat, or should switching cancel/disable during a run?
- Are frontend chat IDs intended to represent separate backend conversations, or only local display snapshots?
