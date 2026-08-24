# Changelog

All notable changes to **mncode Desktop** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Skills Marketplace shortcut in the left sidebar and command palette — opens settings directly on the skills section
- 19 curated skills from [skills.sh](https://skills.sh) (Anthropics docs/design suite, Supabase, Prisma, shadcn/ui, Playwright CLI, obra/superpowers, Remotion, Firebase, Vercel) — every `SKILL.md` path verified against the source repository before listing
- `Source` field on marketplace entries distinguishing MCP Market vs skills.sh
- "Open skills.sh" shortcut button in the marketplace banner
- `⌘ +` / `⌘ −` step the UI font size (11–20px) and `⌘ 0` resets to the 15px default, with toast feedback — persisted across restarts
- `⌘N` shortcut hint on the New chat button

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

[unreleased]: https://github.com/mncuchiinhuttt/mncode-desktop/compare/0.1.0-beta...HEAD
[0.1.0-beta]: https://github.com/mncuchiinhuttt/mncode-desktop/releases/tag/v0.1.0-beta
