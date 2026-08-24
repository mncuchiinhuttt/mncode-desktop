package main

const mcpMarketSkillsURL = "https://mcpmarket.com/tools/skills/all"

type marketplaceSkillDefinition struct {
	Slug        string
	Name        string
	Description string
	Category    string
	Repository  string
	SkillPath   string
	MarketURL   string
}

var freeMarketplaceSkills = []marketplaceSkillDefinition{
	{
		Slug: "diagram-maker-visualizer", Name: "Diagram Maker & Visualizer",
		Description: "Create SVG, HTML, and Excalidraw diagrams for architecture, flows, and whiteboards.",
		Category:    "Learning & Documentation", Repository: "openclaw/openclaw", SkillPath: "skills/diagram-maker",
		MarketURL: "https://mcpmarket.com/tools/skills/diagram-maker-visualizer",
	},
	{
		Slug: "gh-issues-auto-fixer", Name: "GH Issues Auto-Fixer",
		Description: "Automate GitHub issue triage, implementation, pull requests, and review follow-ups.",
		Category:    "Collaboration Tools", Repository: "openclaw/openclaw", SkillPath: "skills/gh-issues",
		MarketURL: "https://mcpmarket.com/tools/skills/gh-issues-auto-fixer",
	},
	{
		Slug: "discord-integration", Name: "Discord Integration",
		Description: "Manage Discord messages, reactions, and channel workflows from the agent.",
		Category:    "Collaboration Tools", Repository: "openclaw/openclaw", SkillPath: "skills/discord",
		MarketURL: "https://mcpmarket.com/tools/skills/discord-integration",
	},
	{
		Slug: "react-code-fix-linter", Name: "React Code Fix & Linter",
		Description: "Run focused React formatting, linting, and code-quality fixes before commits.",
		Category:    "Developer Tools", Repository: "facebook/react", SkillPath: ".claude/skills/fix",
		MarketURL: "https://mcpmarket.com/tools/skills/react-code-fix-linter",
	},
	{
		Slug: "github-integration", Name: "GitHub Integration",
		Description: "Work with GitHub issues, pull requests, CI checks, releases, and repository APIs.",
		Category:    "Collaboration Tools", Repository: "openclaw/openclaw", SkillPath: "skills/github",
		MarketURL: "https://mcpmarket.com/tools/skills/github-integration-3",
	},
	{
		Slug: "ordercli-food-delivery-manager", Name: "ordercli Food Delivery Manager",
		Description: "Track Foodora delivery orders and monitor delivery status from the terminal.",
		Category:    "Productivity & Workflow", Repository: "openclaw/openclaw", SkillPath: "skills/ordercli",
		MarketURL: "https://mcpmarket.com/tools/skills/ordercli-food-delivery-manager",
	},
	{
		Slug: "google-workspace-cli-assistant", Name: "Google Workspace CLI Assistant",
		Description: "Use Gmail, Calendar, Drive, and Sheets from a focused command-line workflow.",
		Category:    "Productivity & Workflow", Repository: "openclaw/openclaw", SkillPath: "skills/gog",
		MarketURL: "https://mcpmarket.com/tools/skills/google-workspace-cli-assistant",
	},
	{
		Slug: "coding-agent-orchestrator", Name: "Coding Agent Orchestrator",
		Description: "Delegate complex development tasks to specialized background coding agents.",
		Category:    "Developer Tools", Repository: "openclaw/openclaw", SkillPath: "skills/coding-agent",
		MarketURL: "https://mcpmarket.com/tools/skills/coding-agent-orchestrator-1",
	},
	{
		Slug: "ecc-repository-conventions", Name: "ECC Repository Conventions",
		Description: "Apply consistent development conventions across Everything Claude Code repositories.",
		Category:    "Developer Tools", Repository: "affaan-m/ecc", SkillPath: ".agents/skills/everything-claude-code",
		MarketURL: "https://mcpmarket.com/tools/skills/ecc-repository-conventions",
	},
}
