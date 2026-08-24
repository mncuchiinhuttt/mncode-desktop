# Chat persistence fix review

Date: 2026-08-24  
Scope: `/Users/vominhlong/mncode/mncode-desktop/frontend/src/App.tsx` and `frontend/src/types.ts`, with the Wails event/session bridge inspected where needed. Source was not modified.

## Verdict

Completed chats restore their messages, activities, summary, and usage on the normal open-chat path, and valid legacy entries remain readable because the new `ChatSession` fields are optional. The fix is not race-safe or context-safe enough to approve: switching chats while a run is live can write the old run into the newly selected chat, and the backend still uses one shared agent session for all UI chats.

## Findings

### [P1] Live agent events are not scoped to a chat or run

- `App.tsx:1469-1480` changes the visible chat and forces `running` false, but does not cancel/await the active run or install a run/chat generation guard.
- The listeners at `App.tsx:749-1120` update the current `messages`, `activities`, usage, summary, permission, and question state unconditionally. A late token, tool result, subagent completion, usage event, or `agent:done` from the previous run therefore lands in whichever chat is currently selected.
- `openChat` restores React state at `App.tsx:1473-1478` but does not restore `runStartedAtRef`, `runUsageRef`, `providerUsageRef`, or `hasProviderUsageRef` (`App.tsx:391-394`). A stale completion can finalize the selected chat with the previous run's timing/usage.
- `newTask` and active-chat deletion have the same cancel-and-switch-without-awaiting exposure (`App.tsx:1534-1553`, `1703-1717`).

This is the primary regression. Use a per-run/per-chat identity on every event and ignore stale events, or serialize/cancel-and-await before changing the active snapshot; restore/reset the refs together with state.

### [P1] UI chat switching does not switch the agent conversation

`openChat` only swaps frontend snapshots (`App.tsx:1469-1487`). There is no bridge call to load the selected transcript into the backend or create a backend session per chat. `SendPrompt` continues to use the single `a.session` (`app.go:232-252`), whose session ID is always `mncode-desktop` (`desktop-session.go:46-58`). Thus an old chat can display the correct restored transcript while the next prompt is still sent with another chat's backend history.

### [P1] Subagent delegation text is persisted from the wrong variable

The subagent-start listener declares an event `prompt` but destructures only `{ name, role }` (`App.tsx:954-967`), then stores `subagentPrompt: prompt` from the outer composer state. `agent:start` clears that state at `App.tsx:751-754`, so the persisted subagent card normally has an empty or unrelated prompt instead of the delegation prompt.

### [P2] Tool/file timeline completion is name-matched, not event-matched

Tool start records the provider call ID (`App.tsx:868-887`), but `agent:tool-result` has no ID and resolves the first active item with the same tool name (`App.tsx:908-945`). The backend likewise emits only `name` for results (`desktop-events.go:56-63`). This can attach a late/stale result or file diff to the wrong call, especially across a chat switch or repeated tool calls. Subagent completion has the same name-only matching (`App.tsx:978-994`).

### [P2] `create_file` is not classified as a file activity

The backend file-summary path supports `create_file` (`desktop-tool-summary.go:69-109`), but `describeToolAction` only treats `write_to_file`, `replace_file_content`, and `edit_file_content` as `kind: "file"` (`App.tsx:245-267`). A `create_file` result is therefore stored as a generic tool, so the edited-file summary/panel filters do not count or display it.

### [P2] In-flight snapshots restore as permanently active after restart

The debounced save persists activities while a run is active (`App.tsx:643-659`), but `readChatHistory` and `openChat` leave `active: true`/`status: "running"` unchanged (`App.tsx:163-173`, `1474-1479`). Since the app restores `running` as false, a crash/close during a run can reopen a chat with spinner-like active activities, partial usage, and no completed summary. There is no interrupted-run normalization.

### [P2] Legacy compatibility is permissive but not validated

Valid old records are compatible: `activities` and `runUsage` are optional in `types.ts:46-56`, and open-chat fallbacks use `[]`/`emptyRunUsage` (`App.tsx:1474-1477`). However, `readChatHistory` validates only `id` (`App.tsx:163-169`); malformed or partial legacy `messages`, usage, or activity objects can pass the cast and later render invalid values. The write path also has no quota/error handling (`App.tsx:639-641`), while the new snippets and subagent results materially increase localStorage size. The 450 ms debounce is cleared on unmount (`App.tsx:643-658`), so the latest snapshot can also be lost if the app closes before the timer fires.

## Verification

- `npm run build` in `frontend` — pass; TypeScript and Vite build completed successfully. Vite emitted only the existing large-chunk warning.
- `go test ./...` in `mncode-desktop` — pass (`ok mncode-desktop`, cached).
- No focused browser/Wails test exists for switching during a live run, restoring an in-flight snapshot, repeated tool names, or backend context isolation.

## Final status

Review complete. No source edits were made. The report is saved at `/Users/vominhlong/mncode/mncode-desktop/plans/reports/code-review-2026-08-24-chat-persistence.md`. The persistence fix should be treated as not ready for approval until the P1 issues are addressed and the listed interaction tests are added.
