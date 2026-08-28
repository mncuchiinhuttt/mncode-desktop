# Skills Marketplace

The Skills Marketplace lets users install free community **agent skills** — single `SKILL.md` instruction files — into the shared mncode skill directory at `~/.mncode/skills/`. Installed skills are picked up by both the desktop app and the CLI on the next agent turn.

## Sources

| Source         | What it provides                                                     |
| -------------- | -------------------------------------------------------------------- |
| MCP Market     | Community skills indexed at `mcpmarket.com/tools/skills/all`          |
| [skills.sh](https://skills.sh) | The agent skills directory (Anthropics, Vercel, Supabase, Prisma, Microsoft, obra/superpowers, …) |

Both source buttons are available in the marketplace banner inside the app.

## How installation works

1. The UI lists the curated catalog from `pkg/skills/marketplace-catalog.go` plus what is already installed.
2. On install, `InstallMarketplaceSkill` fetches:
   ```
   https://raw.githubusercontent.com/{Repository}/{main|master}/{SkillPath}/SKILL.md
   ```
3. The content (capped at 2 MiB) is written to `~/.mncode/skills/{slug}/SKILL.md` with `0600` permissions.
4. The running session's skill catalog reloads immediately — no restart needed.

Deleting a user-installed skill removes its folder. System skills (shipped with the local agent environment) are protected and cannot be deleted.

## Catalog entry format

Each entry in `skills-marketplace-catalog.go` is a `marketplaceSkillDefinition`:

```go
{
    Slug:        "supabase",
    Name:        "Supabase",
    Description: "Create and manage Supabase projects: auth, storage, edge functions, and Postgres schemas.",
    Category:    "Backend & Data",
    Repository:  "supabase/agent-skills", // GitHub owner/repo
    SkillPath:   "skills/supabase",      // folder containing SKILL.md ("" = repo root)
    MarketURL:   "https://skills.sh/supabase/agent-skills/supabase",
    Source:      "skills.sh",            // empty defaults to "MCP Market"
}
```

### Adding a new entry

1. Find the skill on skills.sh or MCP Market and note its GitHub `owner/repo`.
2. Verify the raw `SKILL.md` URL resolves (try `skills/{name}/`, `{name}/`, `.claude/skills/{name}/`, then the repo root, on `main` then `master`):
   ```bash
   curl -fsSL "https://raw.githubusercontent.com/{owner}/{repo}/main/skills/{name}/SKILL.md" | head -5
   ```
3. Add the definition with an accurate one-line description and a sensible `Category`.
4. Run `go build ./...` and smoke-test Install from the Skills Marketplace.

Only add entries whose `SKILL.md` you have actually inspected — the marketplace ships instructions that the agent will follow.

## Security notes

- Skills are **instruction files**, not code — but the agent will act on them, so treat an install like granting influence over future turns.
- The marketplace only ever fetches a single `SKILL.md` over HTTPS from `raw.githubusercontent.com`; it never executes install scripts.
- Review the "Installed" tab and delete anything you no longer trust.
