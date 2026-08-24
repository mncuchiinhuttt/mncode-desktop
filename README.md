# mncode Desktop

Native desktop cockpit for the [mncode](https://github.com/mncuchiinhuttt/mncode) Go agent core — visual subagent swarms, PTY multi-terminal, sidecar chat, and real-time quota HUD, wrapped in a Wails v2 shell.

![platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue) ![license](https://img.shields.io/badge/license-MIT-green) ![channel](https://img.shields.io/badge/channel-v0.1--beta-pink)

## Highlights

- **Streaming agent chat** — token-level streaming with tool/subagent activity feed, run summaries (duration + token usage persisted across restarts), and steering support
- **Workspace inspector sidecar** — file tree, agent activity, side notes, and usage telemetry in a resizable right panel
- **Built-in PTY terminal** — real terminal session rooted at the workspace (`⌘J`)
- **Skills Marketplace** — curated free skills from MCP Market & [skills.sh](https://skills.sh), installed into the shared `~/.mncode/skills` directory
- **Multi-provider models** — Antigravity, OpenAI Codex, OpenCode, OpenRouter, and custom OpenAI-compatible providers with account pools and quota HUD
- **Remote companion** — pair a phone to steer runs from the couch
- **Personalization** — custom instructions, personality modes (including Brainrot 🧠), and local memories
- **RMIT-inspired design system** — dark-void surfaces, hairline grids, bracket eyebrows, pink/cyan HUD accents, light & dark themes

## Stack

| Layer    | Tech                                                        |
| -------- | ----------------------------------------------------------- |
| Shell    | Wails v2.12 (Go ↔ webview bridge)                           |
| Core     | `mncode-cli` Go agent core (via `replace mncode => ../mncode-cli`) |
| Frontend | React 19 + Vite + TypeScript                                |
| Styling  | Tailwind CSS v4 + shadcn-style components on Radix primitives |

## Keyboard shortcuts

| Keys     | Action                              |
| -------- | ----------------------------------- |
| `⌘N`     | New chat                            |
| `⌘K`     | Command palette                     |
| `⌘,`     | Open settings                       |
| `⌘J`     | Toggle terminal                     |
| `⌘1–9`   | Open the matching chat              |
| `⌘ +` / `⌘ −` | Step UI font size (11–20px)    |
| `⌘0`     | Reset UI font size to 15px          |
| `?`      | Keyboard shortcuts dialog           |
| `Esc`    | Close the active menu or dialog     |

## Development

Requirements: Go 1.24+, [Wails CLI v2](https://wails.io) (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`), Node 20+ with pnpm.

```bash
pnpm install
wails dev
```

The Wails browser dev bridge is available at `http://localhost:34115`. For a frontend-only preview, run `pnpm --dir frontend dev`.

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

The packaged app lands in `build/bin`.

## Project structure

```
mncode-desktop/
├── main.go                  # Wails bootstrap and window setup
├── app.go                   # App facade: workspace, providers, agent turns
├── app-types.go             # JSON wire types shared with the frontend
├── desktop-session.go       # Agent session construction and lifecycle
├── desktop-events.go        # Agent-core callbacks → Wails DOM events
├── catalog.go               # Settings, themes, models, prompt catalog
├── providers.go             # Provider accounts, quotas, custom providers
├── skills-marketplace.go    # Skill install/delete + curated catalog bridge
├── terminal.go              # PTY terminal panel bridge
├── remote.go                # Phone companion session management
├── usage.go                 # Local usage telemetry aggregation
├── version.go               # Version metadata and update checks
├── docs/                    # Architecture and skills documentation
└── frontend/
    └── src/
        ├── App.tsx          # Root shell, views, event wiring, chat history
        ├── style.css        # Design tokens + RMIT utility classes
        ├── components/      # Sidebar, composer, inspector, settings, ...
        └── lib/             # Wails bindings and helpers
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the layers talk to each other and [docs/SKILLS.md](docs/SKILLS.md) for how the marketplace catalog works.

## Privacy

Everything runs locally: workspace scanning, agent turns, and usage telemetry stay on this machine. Provider keys entered in settings are held in memory for the current process and are not persisted to disk. Optional mncode account sign-in only syncs settings and usage summaries you explicitly push.

## License

[MIT](LICENSE) © 2026 mncode
