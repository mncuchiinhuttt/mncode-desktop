export type ViewName =
  | "workspace"
  | "insights"
  | "settings"
  | "skills"
  | "automations"
  | "mcp"
  | "drift"
  | "sandbox"
  | "index"
  | "arena"
  | "replay"
  | "spec";
export interface LanguageStat {
  name: string;
  count: number;
}

export interface WorkspaceInfo {
  path: string;
  name: string;
  projectType: string;
  totalFiles: number;
  totalLines: number;
  languages: LanguageStat[];
  ready: boolean;
}

export interface DesktopAccount {
  connected: boolean;
  name: string;
  email: string;
  isAdmin: boolean;
  status: "guest" | "connected" | "offline";
}

export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
}

export interface DesktopFilePreview {
  path: string;
  name: string;
  language: string;
  content: string;
  size: number;
  lines: number;
  truncated: boolean;
  binary: boolean;
}
export interface DriftFinding {
  severity: "info" | "warning" | "error";
  code: string;
  path: string;
  message: string;
  before?: unknown;
  after?: unknown;
}

export interface DriftReport {
  schema_version: number;
  baseline_id: string;
  workspace_root: string;
  generated_at: string;
  changed_files: number;
  fail_on?: string[];
  findings: DriftFinding[];
  drifted: boolean;
}

export interface DriftBaseline {
  schema_version: number;
  id: string;
  workspace_root: string;
  workspace_id: string;
  tool_version: string;
  created_at: string;
  policy: unknown;
  files: Array<{
    path: string;
    sha256: string;
    size: number;
    symbols?: unknown[];
    imports?: string[];
  }>;
}

export interface SandboxFixture {
  schema_version: number;
  id: string;
  name: string;
  description?: string;
  root: string;
  command: string[];
  env?: Record<string, string>;
  timeout_seconds: number;
  max_output_bytes?: number;
}

export interface SandboxRunResult {
  schema_version: number;
  id: string;
  fixture_id: string;
  workspace: string;
  started_at: string;
  ended_at: string;
  exit_code: number;
  stdout: string;
  stderr: string;
  error?: string;
  timed_out: boolean;
  truncated: boolean;
}

export interface CodeIndexHit {
  path: string;
  language: string;
  score: number;
  symbol?: string;
  kind?: string;
  signature?: string;
  line?: number;
}

export interface ArenaSource {
  base?: string;
  head?: string;
  diff_sha256: string;
  changed_files: string[];
  repo_root: string;
}

export interface ArenaFinding {
  id: string;
  role?: string;
  roles?: string[];
  severity: "high" | "medium" | "low";
  category: string;
  file: string;
  line: number;
  evidence: string;
  impact: string;
  recommendation: string;
  confidence: number;
}

export interface ArenaReport {
  schema_version: number;
  id: string;
  source: ArenaSource;
  findings: ArenaFinding[];
  verdict: "block" | "warn" | "pass";
  started_at: string;
  ended_at: string;
}

export interface ReplayEvent {
  seq: number;
  kind: string;
  at: string;
  turn: number;
  data: unknown;
}

export interface ReplayTrace {
  schema_version: number;
  id: string;
  session_id: string;
  workspace_root: string;
  workspace_id: string;
  started_at: string;
  ended_at?: string;
  events: number;
  complete: boolean;
  checksum?: string;
  model?: string;
  provider?: string;
}

export interface ReplayTraceDetail {
  trace: ReplayTrace;
  events: ReplayEvent[];
}

export interface SpecCase {
  id: string;
  name: string;
  kind: "command" | "file_exists" | "file_contains" | "invariant";
  input?: unknown;
  expected?: unknown;
  command?: string[];
  tags?: string[];
}

export interface SpecInvariant {
  id: string;
  description: string;
  kind: string;
  value?: unknown;
}

export interface SpecContract {
  schema_version: number;
  id: string;
  title: string;
  description: string;
  version: number;
  invariants: SpecInvariant[];
  cases: SpecCase[];
  created_at: string;
}

export interface SpecCaseResult {
  case_id: string;
  status: "pass" | "fail" | "skipped" | "invalid";
  duration: number;
  actual?: string;
  message?: string;
}

export interface SpecMatrix {
  contract_id: string;
  generated_at: string;
  results: SpecCaseResult[];
  passed: number;
  failed: number;
  skipped: number;
  invalid: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
  feedback?: "like" | "dislike";
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
  pinned?: boolean;
  unread?: boolean;
  activities?: ActivityItem[];
  runSummary?: AgentRunSummary;
  runUsage?: AgentRunUsage;
  activeRunID?: number;
}
export interface DesktopComboMember {
  id: string;
  role: string;
  baseAgent: string;
  promptOverlay?: string;
  model?: string;
  fallbackModel?: string;
  thinkingBudget?: number;
  permissions?: string[];
  isolatedWorktree?: boolean;
}

export interface DesktopCombo {
  id: string;
  name: string;
  description: string;
  mode: "pipeline" | "debate" | "fan_out";
  maxDebateRounds?: number;
  members: DesktopComboMember[];
  isBuiltin?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DesktopRoleMeta {
  role: string;
  title: string;
  description: string;
  defaultBaseAgent: string;
  autoPrimaryModel: string;
  autoFallbackModel: string;
  defaultPermissions?: string[];
  requiresWorktreeBase?: boolean;
}
export interface DesktopMemoryItem {
  id: string;
  topic: string;
  category: string;
  tier: "workspace" | "global";
  summary: string;
  mistake?: string;
  correction?: string;
  confidence: number;
  hitCount: number;
  supersedesId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRunUsage {
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  totalTokens: number;
}

export interface AgentRunSummary {
  durationMs: number;
  usage: AgentRunUsage;
}

export type ActivityKind = "system" | "thinking" | "tool" | "file" | "command" | "subagent";
export type ActivityStatus = "running" | "complete" | "error" | "cancelled";

export interface ActivityItem {
  id: string;
  label: string;
  detail: string;
  tone: "pink" | "cyan" | "green" | "muted";
  active?: boolean;
  kind?: ActivityKind;
  status?: ActivityStatus;
  toolName?: string;
  subagentName?: string;
  subagentRole?: string;
  subagentPrompt?: string;
  subagentResult?: string;
  createdAt?: number;
  filePath?: string;
  linesAdded?: number;
  linesRemoved?: number;
  beforeSnippet?: string;
  afterSnippet?: string;
}

export interface PermissionRequest {
  id: string;
  tool: string;
  summary: string;
  runID: number;
}

export interface QuestionRequest {
  id: string;
  question: string;
  options: string[];
  multi: boolean;
  runID: number;
}

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  tag: string;
  description: string;
}

export interface ModeOption {
  id: string;
  label: string;
  description: string;
  budget?: number;
}

export interface ThemeOption {
  id: "light" | "dark";
  name: string;
  description: string;
  isDark: boolean;
}

export interface DesktopSettings {
  model: string;
  provider: string;
  workflow: string;
  effort: string;
  thinkingBudget: number;
  permissionMode: string;
  defaultPermissionMode: string;
  theme: "system" | "light" | "dark";
  uiFontSize: number;
  codeFontSize: number;
  lightCodeTheme: string;
  darkCodeTheme: string;
  showLineNumbers: boolean;
  wrapLines: boolean;
  showContextWindowUsage: boolean;
  suggestedPrompts: boolean;
  sendShortcut: "enter" | "command-enter";
  contextWindow: string;
  autoCompact: boolean;
  tokenSaverConcise: boolean;
  tokenSaverCapThinking: boolean;
  tokenSaverCompressOutput: boolean;
  tokenSaverTargetedEdits: boolean;
  tokenSaverRtk: boolean;
  tokenSaverHeadroom: boolean;
	language: string;
	searchEngine: "auto" | "antigravity" | "brave" | "tavily" | "duckduckgo";
	braveSearchConfigured: boolean;
	tavilySearchConfigured: boolean;
	artifacts: boolean;
	interruptMode: "queue" | "steer";
	verboseOutput: boolean;
	contextPercent: number;
	contextUsed: number;
	contextLimit: number;
	/** Write-only credentials; the backend never returns their values. */
	braveApiKey?: string;
	tavilyApiKey?: string;
	sharedMemoryEnabled?: boolean;
	hermesReflectionEnabled?: boolean;
}

export interface DesktopBrowserSettings {
  controlEnabled: boolean;
  ignoreCertificateErrors: boolean;
  chromeProfileFound: boolean;
  builtInBrowserAvailable: boolean;
  sessionRunning: boolean;
  profileDataDir: string;
}

export interface DesktopBrowserSettingsInput {
  controlEnabled?: boolean;
  ignoreCertificateErrors?: boolean;
}

export interface DesktopMCPServer {
  id: string;
  name: string;
  description: string;
  tokenConfigured: boolean;
  configured: boolean;
  connected: boolean;
}

export interface DesktopMCPServerInput {
  id: string;
  token: string;
}

export interface DesktopRemoteDevice {
  id: string;
  name: string;
  platform: string;
  status: string;
}

export interface DesktopRemoteSession {
  active: boolean;
  sessionId: string;
  pairingUrl: string;
  qrCode: string;
  status: string;
  connectedDevices: number;
  devices: DesktopRemoteDevice[];
}

export interface DesktopPersonalization {
  customInstructions: string;
  personality: string;
  brainrotMode: boolean;
  trollMode: boolean;
  memoryEnabled: boolean;
  memoryToolAssisted: boolean;
  memoryCount: number;
}

export interface DesktopPersonalizationInput {
  customInstructions?: string;
  personality?: string;
  brainrotMode?: boolean;
  trollMode?: boolean;
  memoryEnabled?: boolean;
  memoryToolAssisted?: boolean;
}

export interface PromptOption {
  id: string;
  label: string;
  detail: string;
  category: string;
  kind: string;
  insertText: string;
}

export interface PromptCatalog {
  context: PromptOption[];
  commands: PromptOption[];
  skills: PromptOption[];
}

export interface UsageDay {
  date: string;
  tokens: number;
  sessions: number;
}

export interface UsageSummary {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  totalSessions: number;
  recordsCount: number;
}

export interface UsageStats {
  summary: UsageSummary;
  dailyUsage: UsageDay[];
}

export interface ProviderAccount {
  id: string;
  email: string;
  provider: string;
  active: boolean;
  available: boolean;
  lastError?: string;
}

export interface DesktopCodexLoginResult {
  type: string;
  authUrl?: string;
  verificationUri?: string;
  userCode?: string;
  expiresIn?: number;
  runtimeVersion?: string;
}

export interface ProviderModelQuota {
  modelId: string;
  displayName: string;
  remainingPercentage: number;
  resetIn: string;
}

export interface ProviderQuota {
  accountId: string;
  status: string;
  healthy: boolean;
  tier: string;
  expiresIn: string;
  modelQuotas: ProviderModelQuota[];
  availableModels: string[];
  maxContext: number;
  rpmRemaining: string;
  tpmRemaining: string;
  errorMessage: string;
}

export interface CustomModel {
  id: string;
  name: string;
  contextWindow?: number;
}

export interface CustomProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiFormat: string;
  apiKeyConfigured: boolean;
  models: CustomModel[];
}

export interface ProviderSettings {
  accounts: ProviderAccount[];
  customProviders: CustomProvider[];
  openCodeConfigured: boolean;
  activeAntigravityQuota?: ProviderQuota;
}

export interface CustomProviderInput {
  id?: string;
  name: string;
  baseUrl: string;
  apiFormat: string;
  apiKey: string;
  models: CustomModel[];
}

export interface AppInfo {
  version: string;
  channel: string;
  description: string;
  repository: string;
  copyright: string;
}

export interface DesktopSkill {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  source: string;
  system: boolean;
  installed: boolean;
  free: boolean;
  marketplaceUrl: string;
}

export interface DesktopSkillsMarketplace {
  systemSkills: DesktopSkill[];
  userSkills: DesktopSkill[];
  availableSkills: DesktopSkill[];
  sourceUrl: string;
}

export interface AutomationRun {
  startedAt: number;
  durationMs: number;
  status: string;
  detail: string;
  logPath: string;
}

export interface Automation {
  id: string;
  name: string;
  prompt: string;
  kind: "scheduled" | "idle";
  schedule: string;
  workspace: string;
  enabled: boolean;
  createdAt: number;
  lastRunAt: number;
  nextRunAt: number;
  runCount: number;
  runs: AutomationRun[];
}

export interface AutomationInput {
  name: string;
  prompt: string;
  kind: "scheduled" | "idle";
  schedule: string;
  workspace: string;
  enabled: boolean;
}

export interface UpdateAsset {
  name: string;
  url: string;
  size: number;
}

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  releaseDate: string;
  channel: string;
  releaseUrl: string;
  notes: string;
  assets: UpdateAsset[];
  updateAvailable: boolean;
}

export interface DesktopCatalog {
  models: ModelOption[];
  workflows: ModeOption[];
  efforts: ModeOption[];
  permissions: ModeOption[];
  themes: ThemeOption[];
  settings: DesktopSettings;
  prompt: PromptCatalog;
}

export interface DesktopMigrationInput {
  chatJson?: string;
  notesJson?: string;
  automationJson?: string;
  workspaceDir?: string;
}

export interface DesktopMigrationReport {
  status: string;
  alreadyImported: boolean;
  sourceFingerprint: string;
  sourceCount: number;
  importedCount: number;
  sourceHash: string;
  importedHash: string;
  backupPath?: string;
  backupStatus: string;
  recoveryStatus: string;
}
