# QA Report — 2026-08-24 — Chat-agent persistence

## Scope

- Work context: `/Users/vominhlong/mncode/mncode-desktop`
- Read-only verification of frontend/TypeScript build, Go tests, race/vet, and chat-session persistence/switching.
- No product source files were edited. The target directory has no `.git` metadata, so no source diff or commit baseline was available.

## Build and test results

| Area | Exact command | Result |
|---|---|---|
| Frontend TypeScript + production build | `pnpm --dir frontend build` | PASS, exit 0. `tsc --noEmit` passed; Vite transformed 1,725 modules and built successfully in 13.82s. |
| Go unit tests | `GOTOOLCHAIN=local go test ./...` | PASS, exit 0. `ok mncode-desktop (cached)`. |
| Go race tests | `GOTOOLCHAIN=local go test -race ./...` | PASS, exit 0. `ok mncode-desktop`. |
| Go vet | `GOTOOLCHAIN=local go vet ./...` | PASS, exit 0; no output. |

Frontend build warning: Vite reported the JavaScript chunk is 561.70 kB after minification (>500 kB). This is non-blocking and unrelated to persistence behavior.

## Browser verification

Started the frontend-only preview with:

```text
pnpm --dir frontend dev --host 127.0.0.1
```

Vite served `http://127.0.0.1:5173/`. `agent-browser` checks returned:

- Error overlay check: `"OK"`
- Page content check: `"HAS_CONTENT"`
- Browser errors: none
- Screenshot: `/tmp/mncode-desktop-qa-final.png`

Legacy fixture used valid pre-activity `ChatSession` records containing only `id`, `title`, `messages`, and `updatedAt` (no `activities`, `runSummary`, or `runUsage`). After reload, both records rendered in the sidebar without a crash.

- Sidebar click on the second legacy record displayed its saved prompt and marked it active.
- Real `Meta+2` switching displayed the first legacy record and marked it active after the list reordered by updated time.
- A nine-record fixture rendered `⌘1` through `⌘9`.
- Real `Meta+1` through `Meta+9` presses all exited 0 and selected the corresponding saved record; each assertion returned `expected: true`.

The first click attempt was correctly blocked by the onboarding overlay; after `Close onboarding`, the same sidebar click passed. This was test-harness state, not an application error.

## Flow inspection

- `readChatHistory` safely handles malformed JSON and accepts valid legacy records with the newer optional fields absent.
- Opening a saved chat defaults missing `activities` and `runUsage`, preserving compatibility with the old record shape.
- Persistence preserves existing record fields such as `pinned`, updates the active snapshot, sorts pinned records first, and caps history at nine entries.
- Sidebar click order and keyboard order both use pinned-first ordering; tested behavior matched the displayed shortcuts.

## Advisory findings

1. `frontend/src/App.tsx:1181-1182` calls `.sort()` directly on the React `chatSessions` array in the keyboard handler. The sidebar uses a copied array, so the shortcut path mutates state in place. No failure was observed, but this is a maintainability/regression risk for future state updates.
2. `readChatHistory` validates only `id`; a malformed stored record with a missing/non-array `messages` field could still fail when opened. Valid old `ChatSession` records were verified successfully.

## Final status

PASS with the two non-blocking static advisories above. Requested build, Go tests, race, vet, legacy persistence, click switching, and `⌘1…9` switching checks completed successfully.
