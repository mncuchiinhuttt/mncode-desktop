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
	Source      string
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

	// ── skills.sh directory (verified SKILL.md paths) ────────────────

	{
		Slug: "docx", Name: "DOCX Documents",
		Description: "Comprehensive document creation and editing: formatting, templates, and tracked changes in .docx files.",
		Category:    "Documents & Office", Repository: "anthropics/skills", SkillPath: "skills/docx",
		MarketURL: "https://skills.sh/anthropics/skills/docx", Source: "skills.sh",
	},
	{
		Slug: "pdf", Name: "PDF Processing",
		Description: "Extract, merge, split, and generate PDF documents with forms, tables, and text processing.",
		Category:    "Documents & Office", Repository: "anthropics/skills", SkillPath: "skills/pdf",
		MarketURL: "https://skills.sh/anthropics/skills/pdf", Source: "skills.sh",
	},
	{
		Slug: "pptx", Name: "PPTX Presentations",
		Description: "Create, edit, and analyze PowerPoint presentations with layouts, templates, and charts.",
		Category:    "Documents & Office", Repository: "anthropics/skills", SkillPath: "skills/pptx",
		MarketURL: "https://skills.sh/anthropics/skills/pptx", Source: "skills.sh",
	},
	{
		Slug: "xlsx", Name: "XLSX Spreadsheets",
		Description: "Spreadsheet creation, editing, and analysis with formulas, charts, and data formatting.",
		Category:    "Documents & Office", Repository: "anthropics/skills", SkillPath: "skills/xlsx",
		MarketURL: "https://skills.sh/anthropics/skills/xlsx", Source: "skills.sh",
	},
	{
		Slug: "frontend-design", Name: "Frontend Design",
		Description: "Production-grade frontend interfaces with distinctive typography, color, motion, and layout taste.",
		Category:    "Design & UI", Repository: "anthropics/skills", SkillPath: "skills/frontend-design",
		MarketURL: "https://skills.sh/anthropics/skills/frontend-design", Source: "skills.sh",
	},
	{
		Slug: "webapp-testing", Name: "WebApp Testing",
		Description: "Test web apps end-to-end with Playwright: snapshots, console and network capture, and user flows.",
		Category:    "Testing & QA", Repository: "anthropics/skills", SkillPath: "skills/webapp-testing",
		MarketURL: "https://skills.sh/anthropics/skills/webapp-testing", Source: "skills.sh",
	},
	{
		Slug: "skill-creator", Name: "Skill Creator",
		Description: "Author effective agent skills with clear descriptions, progressive disclosure, and reliable triggers.",
		Category:    "Workflow & Planning", Repository: "anthropics/skills", SkillPath: "skills/skill-creator",
		MarketURL: "https://skills.sh/anthropics/skills/skill-creator", Source: "skills.sh",
	},
	{
		Slug: "web-design-guidelines", Name: "Web Design Guidelines",
		Description: "Checklist for accessible, fast, and polished web UI: interactions, forms, details, and performance.",
		Category:    "Design & UI", Repository: "vercel-labs/agent-skills", SkillPath: "skills/web-design-guidelines",
		MarketURL: "https://skills.sh/vercel-labs/agent-skills/web-design-guidelines", Source: "skills.sh",
	},
	{
		Slug: "agent-browser", Name: "Agent Browser",
		Description: "Control a real browser from the agent: navigate, snapshot, click, fill forms, and extract content.",
		Category:    "Browser & Automation", Repository: "vercel-labs/agent-browser", SkillPath: "skills/agent-browser",
		MarketURL: "https://skills.sh/vercel-labs/agent-browser/agent-browser", Source: "skills.sh",
	},
	{
		Slug: "supabase", Name: "Supabase",
		Description: "Create and manage Supabase projects: auth, storage, edge functions, and Postgres schemas.",
		Category:    "Backend & Data", Repository: "supabase/agent-skills", SkillPath: "skills/supabase",
		MarketURL: "https://skills.sh/supabase/agent-skills/supabase", Source: "skills.sh",
	},
	{
		Slug: "supabase-postgres-best-practices", Name: "Supabase Postgres Best Practices",
		Description: "Postgres schema design, RLS policies, indexes, and performance rules for Supabase projects.",
		Category:    "Backend & Data", Repository: "supabase/agent-skills", SkillPath: "skills/supabase-postgres-best-practices",
		MarketURL: "https://skills.sh/supabase/agent-skills/supabase-postgres-best-practices", Source: "skills.sh",
	},
	{
		Slug: "prisma-cli", Name: "Prisma CLI",
		Description: "Prisma ORM workflow: schema migrations, db push, Studio, and generated client usage.",
		Category:    "Backend & Data", Repository: "prisma/skills", SkillPath: "prisma-cli",
		MarketURL: "https://skills.sh/prisma/skills/prisma-cli", Source: "skills.sh",
	},
	{
		Slug: "shadcn", Name: "shadcn/ui",
		Description: "Build UIs with shadcn/ui components, theming, and the MCP-powered component registry.",
		Category:    "Design & UI", Repository: "shadcn/ui", SkillPath: "skills/shadcn",
		MarketURL: "https://skills.sh/shadcn/ui/shadcn", Source: "skills.sh",
	},
	{
		Slug: "playwright-cli", Name: "Playwright CLI",
		Description: "Drive Playwright from the terminal: record flows, generate tests, and run browser automation.",
		Category:    "Testing & QA", Repository: "microsoft/playwright-cli", SkillPath: "skills/playwright-cli",
		MarketURL: "https://skills.sh/microsoft/playwright-cli/playwright-cli", Source: "skills.sh",
	},
	{
		Slug: "systematic-debugging", Name: "Systematic Debugging",
		Description: "Root-cause debugging discipline: reproduce, isolate, hypothesize, and verify before fixing.",
		Category:    "Workflow & Planning", Repository: "obra/superpowers", SkillPath: "skills/systematic-debugging",
		MarketURL: "https://skills.sh/obra/superpowers/systematic-debugging", Source: "skills.sh",
	},
	{
		Slug: "test-driven-development", Name: "Test-Driven Development",
		Description: "Strict red-green-refactor TDD loop: write the failing test first, then minimal implementation.",
		Category:    "Testing & QA", Repository: "obra/superpowers", SkillPath: "skills/test-driven-development",
		MarketURL: "https://skills.sh/obra/superpowers/test-driven-development", Source: "skills.sh",
	},
	{
		Slug: "brainstorming", Name: "Brainstorming",
		Description: "Structured ideation before building: explore requirements, alternatives, and design decisions.",
		Category:    "Workflow & Planning", Repository: "obra/superpowers", SkillPath: "skills/brainstorming",
		MarketURL: "https://skills.sh/obra/superpowers/brainstorming", Source: "skills.sh",
	},
	{
		Slug: "remotion-best-practices", Name: "Remotion Best Practices",
		Description: "Programmatic videos in React with Remotion: compositions, timelines, and rendering pipelines.",
		Category:    "Media & Video", Repository: "remotion-dev/skills", SkillPath: "skills/remotion-best-practices",
		MarketURL: "https://skills.sh/remotion-dev/skills/remotion-best-practices", Source: "skills.sh",
	},
	{
		Slug: "firebase-basics", Name: "Firebase Basics",
		Description: "Initialize and use Firebase services: auth, Firestore, hosting, and project setup.",
		Category:    "Backend & Data", Repository: "firebase/agent-skills", SkillPath: "skills/firebase-basics",
		MarketURL: "https://skills.sh/firebase/agent-skills/firebase-basics", Source: "skills.sh",
	},
}
