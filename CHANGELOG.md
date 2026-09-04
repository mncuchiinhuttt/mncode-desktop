# Changelog

All notable changes to **mncode Desktop** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

## [0.1.6-beta] - 2026-09-04

### Added
- Power Tools cockpit for Drift, Sandbox, Code Index, Red Team Arena, Flight Recorder, and Spec Contracts.
- Replay recording controls with trace inspection and completed-trace session forking.

### Fixed
- Corrected Power Tools wire types and prevented stale results across workspace changes and failed reruns.
- Persisted Drift Sentinel baselines before refreshing the report.
- Added explicit loading, empty, error, and busy states across the Power Tools UI.
- Added keyboard and screen-reader state announcements for searches, matrix results, alerts, and replay controls.

### Security
- Desktop workspace sessions no longer execute repository `.env` files during provider setup.
- Virtual artifact and scratchpad URIs enforce store and workspace boundaries.
- Workspace scanning and file preview reject symlinks, special files, and oversized reads.
- Arena redaction covers quoted and generic credential assignments.
- Sandbox copy isolation is labeled accurately; fixture commands retain host OS and network permissions.

### Changed
- Bumped the Desktop release to v0.1.6-beta.

## [0.1.5-beta] - 2026-09-04

### Added
- Desktop Power Tools views for Drift, Sandbox, Code Index, Red Team Arena, Flight Recorder, and Spec Contracts.
- Wails bindings for replay recording controls, trace inspection, and session forking.

### Fixed
- Corrected Desktop wire types for drift, arena, replay, index, sandbox, and spec responses.
- Prevented stale Power Tools results from surviving workspace changes or failed reruns.
- Serialized replay recording and workspace transitions to avoid cross-workspace session races.
- Made the Drift Sentinel baseline action persist before refreshing its report.
- Clarified loading, empty, and error states across the Power Tools cockpit.

### Security
- Desktop workspace sessions no longer execute repository `.env` files during provider setup.
- Virtual artifact and scratchpad URIs now enforce store and workspace boundaries.
- Workspace scanning and file preview reject symlinks, special files, and oversized reads.
- Arena redaction covers quoted and generic credential assignments.
- Sandbox copy isolation is now labeled accurately; fixture commands retain host OS and network permissions.

### Changed
- Bumped the Desktop release to v0.1.5-beta.

## [0.1.4-beta] — 2026-08-29

### Added
- **Visual Subagent Swarm Inspector (`subagent-swarm-visualizer`)**: Real-time visual tracking of active, pending, and completed subagents with token usage and live activity feeds.
- **In-App Code Editor & Diff Viewer (`in-app-code-editor`)**: Native file inspection and syntax-highlighted diff viewer for edits made by the agent.
- **Audio & OS Notifications System (`audio-notifications.ts`)**: Audible chimes and system notifications for agent completion, human-in-the-loop permission requests, and errors.
- **Persistent Chat Sessions in Local Storage**: Robust multi-chat persistence ensuring messages, tool runs, and summaries survive app restarts.
- **Dedicated Provider Settings**: Separated OpenAI Platform, Anthropic Messages, Google Gemini, OpenRouter, and Codex authentication flows with granular model selectors.
- **Skills Marketplace**: In-app marketplace interface for discovering and 1-click installing curated skills from MCP Market & skills.sh into `~/.mncode/skills`.

### Fixed
- Fixed replay comparison logic in release updater to correctly accept newer versions while blocking downgrade attacks.
- Closed discarded session tools on workspace switch to avoid lingering kernel and debugger background processes.
- Restored `terminal:ready` event listener to ensure embedded PTY updates current working directory accurately.
### Added

- Dedicated Notifications & Audio settings with OS notification toggle, test action, completion chime, and volume control.
- Codex (ChatGPT) provider UI separated from OpenAI Platform API, with official browser/device login actions.
- OpenAI API, OpenRouter, and Anthropic provider entries with distinct credential forms and model filtering.
- Swarm, editor, diff, and completion notification surfaces consumed from the shared agent runtime.


- Skills Marketplace shortcut in the left sidebar and command palette — opens settings directly on the skills section
- 19 curated skills from [skills.sh](https://skills.sh) (Anthropics docs/design suite, Supabase, Prisma, shadcn/ui, Playwright CLI, obra/superpowers, Remotion, Firebase, Vercel) — every `SKILL.md` path verified against the source repository before listing
- `Source` field on marketplace entries distinguishing MCP Market vs skills.sh
- "Open skills.sh" shortcut button in the marketplace banner
- `⌘ +` / `⌘ −` step the UI font size (11–20px) and `⌘ 0` resets to the 15px default, with toast feedback — persisted across restarts
- `⌘N` shortcut hint on the New chat button
- Unified diff viewer for edited-file snippets: LCS line diff, old/new line numbers, per-row add/remove highlighting, dependency-free syntax tinting
- Workspace empty-state polish: ambient accent glows, mono eyebrow greeting, extralight headline with gradient accent word, starter cards with icon chips, hover lift, and arrow reveal
- Configurable web search settings in Settings → General: engine selection plus Brave/Tavily password inputs
- Search credentials persist locally in the shared `~/.mncode/config.json`; settings responses expose configured flags only
- Composer gains a focus glow ring while typing; global `:focus-visible` accent ring for keyboard navigation

### Changed

- Default UI font size raised from 14px to 15px; all 121 fixed `px` text utilities converted to `rem` so every label scales with the font-size setting
- Skills Marketplace section renders full-width with responsive 2–3 column card grid
- Marketplace section renamed from "Skills marketplace" to "Skills Marketplace"

### Fixed

- Run summaries ("Worked for … / Used … tokens") are persisted immediately when a run finishes and are never overwritten by a zeroed snapshot, so quitting and reopening the app no longer resets old chats to `0s / 0 tokens`
- Restored chats without a stored summary no longer show a fake `Worked for 0s` row
- Custom-instructions editor auto-grows to fit its content instead of reserving a tall fixed block
- Stripped the shadcn Card default `py-6`/`gap-6` on surfaces that manage their own padding (marketplace banner, skill cards, management/insights empty states, sidebar activity cards) — no more double vertical padding

### Removed

- GitHub repository card from Settings → App info

## [0.1.2-beta] — 2026-08-25

### Added

- **Automations** (phase 1–4 of plans/250825-automations): scheduled (cron) and idle-time agent tasks with a dedicated view — template galleries, create/edit dialog with schedule presets and custom cron, enable toggles, run-now, and per-automation run history with copyable transcripts
- Scheduler with next-run bookkeeping, idle dispatcher (30-minute minimum gap, busy-skip), 15-minute run timeout, and serialized execution
- Keep-awake toggle: holds a caffeinate assertion while any agent turn runs (macOS)
- Missed-run marking: scheduled fires that pass while the app is closed are recorded as skipped, never silently executed
- Deleting a running automation cancels the in-flight run; deleted workspaces fall back to standalone runs

### Changed

- Version bump to v0.1.2-beta

## [0.1.1-beta] — 2026-08-25

### Added

- In-app updater: the update dialog now shows the release notes (version, date, and change sections), downloads the asset built for the running OS/architecture with a live progress bar, and swaps it in via **Restart to update** — no manual download or version picking
- Release feed (`/api/releases/desktop/latest`) serves the latest GitHub release with notes and per-platform assets

### Changed

- Version bump to v0.1.1-beta

## [0.1.0-beta] — 2026-08-24

### Added

- Initial public snapshot of the desktop client
- Wails v2 shell around the `mncode-cli` Go agent core with streaming agent turns
- RMIT-inspired design system: dark-void tokens, hairline grids, bracket eyebrows, pulse beacons, pink/cyan accents, light & dark themes (light default)
- Workspace chat: centered composer with `@`/`/` autocomplete, context ring, attachments, permission prompts, and interactive questions
- Right workspace sidecar: file tree, agent activity feed, side notes, usage telemetry
- Built-in PTY terminal panel (`⌘J`)
- Skills Marketplace with curated MCP Market catalog and install into `~/.mncode/skills`
- Settings shell: General, Models (provider pools, quotas, custom providers), Appearance (themes, UI/code font sizes, code themes), Account, Personalization, Browser control, MCP & Plugins, Skills Marketplace, App info
- Phone companion pairing (remote session with QR pairing URL)
- Usage insights with daily/weekly/cumulative heatmap
- Update checks against the mncode-web release feed
- Secure workspace MCP trust flow and sanitized child-process environment

[unreleased]: https://github.com/mncuchiinhuttt/mncode-desktop/compare/0.1.6-beta...HEAD
[0.1.6-beta]: https://github.com/mncuchiinhuttt/mncode-desktop/releases/tag/v0.1.6-beta
[0.1.5-beta]: https://github.com/mncuchiinhuttt/mncode-desktop/releases/tag/v0.1.5-beta
[0.1.4-beta]: https://github.com/mncuchiinhuttt/mncode-desktop/releases/tag/v0.1.4-beta
[0.1.0-beta]: https://github.com/mncuchiinhuttt/mncode-desktop/releases/tag/v0.1.0-beta
