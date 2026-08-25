# Automations

Automations let the Desktop run agent tasks on a schedule or during idle time — a morning dev brief at 09:00, a weekly standup summary whenever the app is free — without touching the chat.

## Kinds

| Kind     | When it runs                                                            | Example                     |
| -------- | ----------------------------------------------------------------------- | --------------------------- |
| `scheduled` | Fires on a cron schedule, even while the app sits in the background | `0 9 * * 1-5` — weekdays at 09:00 |
| `idle`   | Fires when the app is open and no agent turn is active, at most once per 30 minutes | "Soonest available" |

## Creating one

Sidebar → **Automations** → pick a template or start from scratch:

- **Name** — 1–80 characters.
- **Schedule** (scheduled kind) — pick a preset or write a custom 5-field cron / `@descriptor` (`@daily`, `@every 1h`). Validated on save.
- **Prompt** — the instruction the agent runs each time (up to 20,000 characters).
- **Workspace** — automations run in the workspace that is open when they are created. If that folder no longer exists at run time, the run falls back to standalone mode.

## How runs work

- Each run is a **headless agent turn**: it uses the same provider, tools, skills, and MCP servers as the chat, but the transcript is captured to a log file instead of streaming into the conversation.
- Runs are **serialized** — one automation at a time, never overlapping an interactive chat turn. A run that fires while busy is skipped and noted in history.
- Timeout: 15 minutes per run.
- Tool confirmations are **denied** in headless runs. Tools that require approval only execute if the workspace config has auto-approve enabled.
- Transcripts: `~/.mncode/automation-runs/<automation-id>/<timestamp>.md` (last 20 kept per automation). Open a run's history in the UI and use **Copy transcript**.
- **Missed runs**: if the app is closed at a scheduled fire time, the run is marked `skipped: missed` on next launch — there is no catch-up execution.

## Keep-awake

The **Keep your computer awake** toggle holds a `caffeinate` assertion (macOS) while any agent turn — chat or automation — is running, so an idle-timed task is never cut short by system sleep.

## Storage

```
~/.mncode/automations.json      # definitions + keep-awake preference
~/.mncode/automation-runs/      # per-automation transcript logs
```

## Security notes

- Automation prompts execute with the same permissions as chat: workspace MCP trust and tool approval rules apply unchanged.
- Headless runs never auto-confirm tool execution; gated tools are skipped and noted in the transcript.
- Deleting an automation cancels an in-flight run and removes its history (logs stay on disk until pruned).
