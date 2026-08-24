# mncode desktop

Separate Wails desktop client for the `mncode-cli` Go agent core.

## Stack

- Wails v2.12
- Go facade importing `mncode-cli` through `replace mncode => ../mncode-cli`
- React + Vite + TypeScript
- Tailwind CSS v4
- shadcn-style source components with Radix primitives

## UI

- ZCode-inspired task sidebar and centered composer
- Right workspace sidecar for files, side chat, run activity, automations, and MCP/plugins
- Automations and MCP/plugins are full left-sidebar tabs; the right sidecar stays focused on inspection
- Automations currently presents an explicit Coming soon state while the scheduler bridge is being built
- Settings opens as a standalone animated shell with its own navigation and Back to workspace action
- Composer context menu with attachment picker plus `@` and `/` shortcuts
- Composer `@`/`/` autocomplete reads the CLI file, command, and skill catalogs with keyboard selection and Escape dismissal
- Context ring hover card with live used/budget/remaining token counts
- Compact composer controls with title-cased effort labels and model menus
- Light/dark theme toggle with local persistence
- CLI-synced model, workflow, effort, permission, and theme catalogs
- Mode and model catalogs also hydrate from shared config before a workspace is opened
- Model selection updates the shared provider/model configuration
- Native hidden titlebar with macOS traffic lights and edge-resizable window
- Double-clicking the top bar toggles the native zoom/maximise state
- Search shortcut stays beside the top-bar Search action, and the right sidecar opens/closes with width and opacity motion
- Collapsed left rail keeps its toggle below the macOS traffic lights and gives the workspace title a small safe inset
- Account menu reuses the CLI mncode-web login flow and resolves the live name/email via `/api/keys/whoami`
- Account sign-in/sign-out can run before a workspace is opened; guest landing copy does not assume a user name
- Toast notifications use a top-center, compact notice treatment
- Settings > Account includes daily/weekly/cumulative usage activity with per-day hover details from mncode-web
- Settings > Models manages Antigravity and Codex account pools, OpenCode API keys, and custom providers with Anthropic, Chat Completions, or Responses formats
- Appearance settings include System/Light/Dark theme, UI and code font sizes, light/dark code themes, line numbers, wrapping, and live code previews
- App info shows the current `v0.1-beta` channel and checks mncode-web for newer releases with an explicit update dialog

## Development

From this directory:

```bash
pnpm install
wails dev
```

The Wails browser dev bridge is available at `http://localhost:34115`.
For a frontend-only preview, run `pnpm --dir frontend dev`.

Set `MNCODE_WORKSPACE` to open a workspace automatically:

```bash
MNCODE_WORKSPACE=/absolute/path/to/project wails dev
```

## Build

```bash
GOTOOLCHAIN=local go test ./...
pnpm --dir frontend build
wails build
```

Provider keys entered in the prototype settings dialog are held in memory for
the current process and are not persisted to disk.
