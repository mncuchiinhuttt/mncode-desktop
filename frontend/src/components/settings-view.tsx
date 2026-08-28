import { useCallback, useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import {
  ArrowLeft,
  BarChart3,
  Blocks,
  BrainCircuit,
  Check,
  Chrome,
  CircleDot,
  Database,
  ExternalLink,
  Globe2,
  Info,
  Loader2,
  Monitor,
  PowerOff,
  RefreshCw,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  UserRound,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { desktop, listen } from "@/lib/desktop";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  AppInfo,
  CustomProviderInput,
  DesktopAccount,
  DesktopBrowserSettings,
  DesktopBrowserSettingsInput,
  DesktopCatalog,
  DesktopMCPServer,
  DesktopMCPServerInput,
  DesktopPersonalization,
  DesktopPersonalizationInput,
  DesktopSettings,
  ProviderQuota,
  ProviderSettings,
  UpdateInfo,
  UsageStats,
} from "@/types";
import { ModelsSettingsView } from "./models-settings-view";
import { McpProviders } from "./mcp-providers";
import { SkillsMarketplace } from "./skills-marketplace";
import { UsageHeatmap } from "./usage-heatmap";

export type SettingsSection =
  | "general"
  | "token-saving"
  | "models"
  | "appearance"
  | "account"
  | "personalization"
  | "browser"
  | "mcp"
  | "skills"
  | "app-info";
type AppTheme = "system" | "light" | "dark";

const defaultCustomInstructions = `# Working style
- Keep explanations concise and practical.
- Use Vietnamese for prose unless I ask for another language.
- Inspect the existing codebase before proposing or making changes.
- Prefer small, focused changes and call out important trade-offs.
- Include a quick verification step or test whenever code changes.`;

interface SettingsViewProps {
  catalog: DesktopCatalog;
  settings: DesktopSettings;
  initialSection?: SettingsSection;
  account: DesktopAccount;
  accountBusy: boolean;
  appInfo: AppInfo;
  browserSettings: DesktopBrowserSettings;
  mcpServers: DesktopMCPServer[];
  personalization: DesktopPersonalization;
  onBack: () => void;
  onLoginAccount: () => void;
  onLogoutAccount: () => void;
  onLoadUsage: () => Promise<UsageStats>;
  onLoadProviderSettings: () => Promise<ProviderSettings>;
  onLoadProviderQuota: () => Promise<ProviderQuota | null>;
  onLoadBrowserSettings: () => Promise<DesktopBrowserSettings>;
  onUpdateBrowserSettings: (input: DesktopBrowserSettingsInput) => Promise<DesktopBrowserSettings>;
  onImportChromeBrowserData: () => Promise<DesktopBrowserSettings>;
  onClearBrowserCacheData: () => Promise<DesktopBrowserSettings>;
  onClearAllBrowserData: () => Promise<DesktopBrowserSettings>;
  onCloseBrowserSession: () => Promise<DesktopBrowserSettings>;
  onConfigureMCP: (input: DesktopMCPServerInput) => Promise<void>;
  onLoadPersonalization: () => Promise<DesktopPersonalization>;
  onSavePersonalization: (input: DesktopPersonalizationInput) => Promise<DesktopPersonalization>;
  onDeleteLocalMemories: () => Promise<DesktopPersonalization>;
  onLoginProvider: (provider: string, accountID: string, token: string) => Promise<void>;
  onUseProviderAccount: (accountID: string) => Promise<void>;
  onConfigureOpenCode: (apiKey: string) => Promise<void>;
  onSaveCustomProvider: (input: CustomProviderInput) => Promise<void>;
  onDeleteCustomProvider: (providerID: string) => Promise<void>;
  onLoadSkillsMarketplace: () => Promise<import("@/types").DesktopSkillsMarketplace>;
  onInstallSkill: (slug: string) => Promise<import("@/types").DesktopSkill>;
  onDeleteSkill: (id: string) => Promise<void>;
  onOpenURL: (url: string) => void;
  onCheckForUpdate: () => Promise<UpdateInfo>;
  onOpenUpdate: (url: string) => void;
  onThemeChange: (theme: AppTheme) => void;
  onSettingsChange: (input: Partial<DesktopSettings>) => void;
}
const sectionMeta: Record<SettingsSection, { label: string; description: string }> = {
  general: {
    label: "General",
    description: "Workspace behavior and agent controls.",
  },
  models: {
    label: "Models",
    description: "Providers, accounts, API keys, and model catalogs.",
  },
  appearance: {
    label: "Appearance",
    description: "Theme, typography, and code display preferences.",
  },
  account: {
    label: "Account",
    description: "Manage your identity, usage, and connected sessions.",
  },
  personalization: {
    label: "Personalization",
    description: "Custom instructions, personality, and local memory.",
  },
  browser: {
    label: "Browser",
    description: "Built-in browser control, security, and browser data.",
  },
  mcp: {
    label: "MCP & Plugins",
    description: "Connect external tools and services to the agent.",
  },
  skills: {
    label: "Skills Marketplace",
    description: "Discover, install, and manage agent skills.",
  },
  "token-saving": {
    label: "Token saving",
    description: "Cut token consumption on every agent turn.",
  },
  "app-info": {
    label: "App info",
    description: "Version, release channel, and update preferences.",
  },
};

export function SettingsView({
  catalog,
  settings,
  initialSection,
  account,
  accountBusy,
  appInfo,
  browserSettings,
  mcpServers,
  personalization,
  onBack,
  onLoginAccount,
  onLogoutAccount,
  onLoadUsage,
  onLoadProviderSettings,
  onLoadProviderQuota,
  onLoadBrowserSettings,
  onUpdateBrowserSettings,
  onImportChromeBrowserData,
  onClearBrowserCacheData,
  onClearAllBrowserData,
  onCloseBrowserSession,
  onConfigureMCP,
  onLoadPersonalization,
  onSavePersonalization,
  onDeleteLocalMemories,
  onLoginProvider,
  onUseProviderAccount,
  onConfigureOpenCode,
  onSaveCustomProvider,
  onDeleteCustomProvider,
  onLoadSkillsMarketplace,
  onInstallSkill,
  onDeleteSkill,
  onOpenURL,
  onCheckForUpdate,
  onOpenUpdate,
  onThemeChange,
  onSettingsChange,
}: SettingsViewProps) {
  const [section, setSection] = useState<SettingsSection>(initialSection ?? "general");
  const [modelsRefreshKey, setModelsRefreshKey] = useState(0);

  // Follow the entry point (sidebar shortcut) when it changes between mounts.
  useEffect(() => {
    if (initialSection) setSection(initialSection);
  }, [initialSection]);
  const width =
    section === "models" ? "max-w-6xl" : section === "skills" ? "max-w-none" : "max-w-4xl";
  return (
    <div className="mn-settings-shell flex min-h-0 flex-1">
      <aside className="mn-settings-nav flex w-[248px] shrink-0 flex-col border-r border-[var(--mn-line)] bg-[var(--mn-sidebar)] px-4 pb-5 pt-16">
        <button
          type="button"
          onClick={onBack}
          className="mb-7 flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-muted-foreground transition-colors hover:bg-[var(--mn-surface-muted)] hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to workspace
        </button>
        <div className="mb-6 px-2">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Settings
          </p>
        </div>
        <nav className="space-y-1" aria-label="Settings sections">
          <SettingsNavItem
            active={section === "general"}
            icon={Settings2}
            label="General"
            onClick={() => setSection("general")}
          />
          <SettingsNavItem
            active={section === "models"}
            icon={BrainCircuit}
            label="Models"
            onClick={() => setSection("models")}
          />
          <SettingsNavItem
            active={section === "appearance"}
            icon={Sun}
            label="Appearance"
            onClick={() => setSection("appearance")}
          />
          <SettingsNavItem
            active={section === "account"}
            icon={UserRound}
            label="Account"
            onClick={() => setSection("account")}
          />
          <SettingsNavItem
            active={section === "token-saving"}
            icon={Zap}
            label="Token saving"
            onClick={() => setSection("token-saving")}
          />
          <SettingsNavItem
            active={section === "personalization"}
            icon={Sparkles}
            label="Personalization"
            onClick={() => setSection("personalization")}
          />
          <SettingsNavItem
            active={section === "browser"}
            icon={Globe2}
            label="Browser"
            onClick={() => setSection("browser")}
          />
          <SettingsNavItem
            active={section === "mcp"}
            icon={Blocks}
            label="MCP & Plugins"
            onClick={() => setSection("mcp")}
          />
          <SettingsNavItem
            active={section === "skills"}
            icon={Sparkles}
            label="Skills Marketplace"
            onClick={() => setSection("skills")}
          />
          <SettingsNavItem
            active={section === "app-info"}
            icon={Info}
            label="App info"
            onClick={() => setSection("app-info")}
          />
        </nav>
        <div className="mt-auto rounded-lg border border-dashed border-[var(--mn-line)] p-3">
          <p className="text-[0.75rem] font-medium">Settings sync with CLI</p>
          <p className="mt-1 text-[0.6875rem] leading-4 text-muted-foreground">
            Model and agent modes use the shared mncode config.
          </p>
        </div>
      </aside>
      <section className="min-w-0 flex-1 overflow-y-auto">
        <div key={section} className={"mn-settings-section-in mx-auto " + width + " px-8 py-10"}>
          <div className="flex items-end justify-between gap-6">
            <div className="min-w-0">
              <Badge
                variant="outline"
                className="border-[var(--mn-line)] bg-[var(--mn-surface)] text-[0.6875rem] uppercase tracking-[0.16em]"
              >
                {sectionMeta[section].label}
              </Badge>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight">
                {sectionMeta[section].label}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {sectionMeta[section].description}
              </p>
            </div>
            {section === "models" && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Refresh models"
                title="Refresh models"
                onClick={() => setModelsRefreshKey((key) => key + 1)}
                className="mb-0.5 shrink-0 text-muted-foreground hover:bg-[var(--mn-surface-muted)] hover:text-foreground"
              >
                <RefreshCw className="size-4" />
              </Button>
            )}
          </div>
          {section === "token-saving" && (
            <TokenSavingSection
              settings={settings}
              onSettingsChange={onSettingsChange}
            />
          )}
          {section === "general" && (
            <GeneralSection
              catalog={catalog}
              settings={settings}
              onSettingsChange={onSettingsChange}
            />
          )}
          {section === "models" && (
            <ModelsSettingsView
              catalog={catalog}
              refreshKey={modelsRefreshKey}
              onLoad={onLoadProviderSettings}
              onLoadQuota={onLoadProviderQuota}
              onLogin={onLoginProvider}
              onUseAccount={onUseProviderAccount}
              onOpenCode={onConfigureOpenCode}
              onSaveCustom={onSaveCustomProvider}
              onDeleteCustom={onDeleteCustomProvider}
            />
          )}
          {section === "appearance" && (
            <AppearanceSection
              theme={settings.theme}
              settings={settings}
              onThemeChange={onThemeChange}
              onSettingsChange={onSettingsChange}
            />
          )}
          {section === "account" && (
            <AccountSection
              account={account}
              accountBusy={accountBusy}
              onLogin={onLoginAccount}
              onLogout={onLogoutAccount}
              onLoadUsage={onLoadUsage}
            />
          )}
          {section === "personalization" && (
            <PersonalizationSection
              personalization={personalization}
              onLoad={onLoadPersonalization}
              onSave={onSavePersonalization}
              onDeleteMemories={onDeleteLocalMemories}
            />
          )}
          {section === "browser" && (
            <BrowserSection
              settings={browserSettings}
              onLoad={onLoadBrowserSettings}
              onUpdate={onUpdateBrowserSettings}
              onImportChrome={onImportChromeBrowserData}
              onClearCache={onClearBrowserCacheData}
              onClearAll={onClearAllBrowserData}
              onCloseSession={onCloseBrowserSession}
            />
          )}
          {section === "mcp" && (
            <div className="mt-8">
              <McpProviders
                servers={mcpServers}
                onConfigure={onConfigureMCP}
                onOpenURL={onOpenURL}
              />
            </div>
          )}
          {section === "skills" && (
            <SkillsMarketplace
              onLoad={onLoadSkillsMarketplace}
              onInstall={onInstallSkill}
              onDelete={onDeleteSkill}
              onOpenURL={onOpenURL}
            />
          )}
          {section === "app-info" && (
            <AppInfoSection info={appInfo} onCheck={onCheckForUpdate} onOpenUpdate={onOpenUpdate} />
          )}
        </div>
      </section>
    </div>
  );
}

function SettingsNavItem({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors " +
        (active
          ? "bg-[var(--mn-surface)] font-medium text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-[var(--mn-surface-muted)] hover:text-foreground")
      }
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}
function TokenSavingSection({
  settings,
  onSettingsChange,
}: {
  settings: DesktopSettings;
  onSettingsChange: (input: Partial<DesktopSettings>) => void;
}) {
  const [rtkInstalled, setRtkInstalled] = useState<boolean | null>(null);
  const [rtkInstalling, setRtkInstalling] = useState(false);
  const [headroomInstalledState, setHeadroomInstalled] = useState<boolean | null>(null);
  const [headroomInstalling, setHeadroomInstalling] = useState(false);
  useEffect(() => {
    desktop
      .checkRtkInstalled()
      .then(setRtkInstalled)
      .catch(() => setRtkInstalled(null));
    const off = listen("rtk:install", (payload: { status?: string }) => {
      if (payload?.status === "installing") setRtkInstalling(true);
      if (payload?.status === "done") {
        setRtkInstalling(false);
        desktop
          .checkRtkInstalled()
          .then((installed) => {
            setRtkInstalled(installed);
            if (installed && !settings.tokenSaverRtk) {
              onSettingsChange({ tokenSaverRtk: true });
            }
          })
          .catch(() => undefined);
      }
      if (payload?.status === "error") setRtkInstalling(false);
    });
    const offHeadroom = listen("headroom:install", (payload: { status?: string }) => {
      if (payload?.status === "installing") setHeadroomInstalling(true);
      if (payload?.status === "done") {
        setHeadroomInstalling(false);
        desktop
          .checkHeadroomInstalled()
          .then((installed) => {
            setHeadroomInstalled(installed);
            if (installed && !settings.tokenSaverHeadroom) {
              onSettingsChange({ tokenSaverHeadroom: true });
            }
          })
          .catch(() => undefined);
      }
      if (payload?.status === "error") setHeadroomInstalling(false);
    });
    desktop
      .checkHeadroomInstalled()
      .then(setHeadroomInstalled)
      .catch(() => setHeadroomInstalled(null));
    return () => {
      off();
      offHeadroom();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.tokenSaverRtk, settings.tokenSaverHeadroom]);
  return (
    <div className="space-y-5">
      <section>
        <div className="mb-3">
          <h2 className="text-sm font-semibold">Token saving</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Reduce token consumption on every agent turn — chat and automations.
            Each discipline applies to new sessions; no stored instructions are
            modified.
          </p>
        </div>
        <Card className="mn-surface mn-settings-rows shadow-none">
          <SettingRow
            title="Concise responses"
            description="Shorter, denser answers. Injects a brevity directive into every session."
            prominent
            control={
              <ToggleButton
                checked={settings.tokenSaverConcise}
                onChange={(value) => onSettingsChange({ tokenSaverConcise: value })}
              />
            }
          />
          <SettingRow
            title="Cap thinking budget"
            description="Limits reasoning to 4,096 tokens per turn instead of the configured budget."
            prominent
            control={
              <ToggleButton
                checked={settings.tokenSaverCapThinking}
                onChange={(value) => onSettingsChange({ tokenSaverCapThinking: value })}
              />
            }
          />
          <SettingRow
            title="Compress command output"
            description="Instructs the agent to filter and truncate long command output with head, tail, and grep."
            prominent
            control={
              <ToggleButton
                checked={settings.tokenSaverCompressOutput}
                onChange={(value) => onSettingsChange({ tokenSaverCompressOutput: value })}
              />
            }
          />
          <SettingRow
            title="Prefer targeted edits"
            description="Search-and-replace edits instead of full-file rewrites — far fewer output tokens."
            prominent
            control={
              <ToggleButton
                checked={settings.tokenSaverTargetedEdits}
                onChange={(value) => onSettingsChange({ tokenSaverTargetedEdits: value })}
              />
            }
          />
          <SettingRow
            title="RTK shell compression"
            description={
              rtkInstalled === false
                ? "Routes dev commands through the rtk CLI for 60–90% smaller outputs. rtk was not found on PATH — install it from github.com/rtk-ai/rtk."
                : "Routes dev commands through the rtk CLI (60–90% smaller outputs). Detected on PATH."
            }
            prominent
            control={
              <div className="flex items-center gap-2.5">
                {rtkInstalled !== null && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[0.5625rem] uppercase tracking-widest",
                      rtkInstalled
                        ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                        : "border-[var(--mn-line)] text-muted-foreground",
                    )}
                  >
                    {rtkInstalling
                      ? "Installing…"
                      : rtkInstalled
                        ? "Detected"
                        : "Not installed"}
                  </Badge>
                )}
                {rtkInstalled === false && (
                  <Button
                    size="sm"
                    className="mn-accent-button"
                    disabled={rtkInstalling}
                    onClick={() => void desktop.installRtk().catch(() => undefined)}
                  >
                    {rtkInstalling ? "Installing…" : "Install rtk"}
                  </Button>
                )}
                {rtkInstalled && (
                  <ToggleButton
                    checked={settings.tokenSaverRtk}
                    disabled={rtkInstalling}
                    onChange={(value) => onSettingsChange({ tokenSaverRtk: value })}
                  />
                )}
              </div>
            }
          />
          <SettingRow
            title="Headroom context compression"
            description={
              headroomInstalledState === false
                ? "Local proxy that compresses tool outputs, files, and history before they reach the model (15–20% fewer tokens). Install the headroom CLI, then the proxy starts automatically on port 8787."
                : "Local proxy that compresses tool outputs, files, and history before they reach the model (15–20% fewer tokens). The proxy starts automatically on port 8787."
            }
            prominent
            control={
              <div className="flex items-center gap-2.5">
                {headroomInstalledState !== null && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[0.5625rem] uppercase tracking-widest",
                      headroomInstalledState
                        ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                        : "border-[var(--mn-line)] text-muted-foreground",
                    )}
                  >
                    {headroomInstalling
                      ? "Installing…"
                      : headroomInstalledState
                        ? "Detected"
                        : "Not installed"}
                  </Badge>
                )}
                {headroomInstalledState === false && (
                  <Button
                    size="sm"
                    className="mn-accent-button"
                    disabled={headroomInstalling}
                    onClick={() =>
                      void desktop.installHeadroom().catch(() => undefined)
                    }
                  >
                    {headroomInstalling ? "Installing…" : "Install headroom"}
                  </Button>
                )}
                {headroomInstalledState && (
                  <ToggleButton
                    checked={settings.tokenSaverHeadroom}
                    disabled={headroomInstalling}
                    onChange={(value) =>
                      onSettingsChange({ tokenSaverHeadroom: value })
                    }
                  />
                )}
              </div>
            }
          />
        </Card>
      </section>
    </div>
  );
}

function GeneralSection({
  catalog,
  settings,
  onSettingsChange,
}: {
  catalog: DesktopCatalog;
  settings: DesktopSettings;
  onSettingsChange: (input: Partial<DesktopSettings>) => void;
}) {
  return (
    <div className="mt-8 space-y-5">
      <GeneralPreferences
        catalog={catalog}
        settings={settings}
        onSettingsChange={onSettingsChange}
      />
      <ComposerPreferences settings={settings} onSettingsChange={onSettingsChange} />
    </div>
  );
}
function GeneralPreferences({
  catalog,
  settings,
  onSettingsChange,
}: {
  catalog: DesktopCatalog;
  settings: DesktopSettings;
  onSettingsChange: (input: Partial<DesktopSettings>) => void;
}) {
  return (
    <section>
      <SectionHeading
        title="General"
        description="Choose defaults used when starting a new workspace chat."
      />
      <Card className="mn-surface mn-settings-rows shadow-none">
        <SettingRow
          title="Default permission"
          description="Permission mode used when creating a new chat. The latest choice keeps your last selection."
          prominent
          control={
            <Select
              value={settings.defaultPermissionMode || "latest"}
              onValueChange={(value) => onSettingsChange({ defaultPermissionMode: value })}
            >
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">The latest choice</SelectItem>
                {catalog.permissions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
        <SettingRow
          title="Context window"
          description="Maximum context token threshold before compression. Shared with the CLI."
          prominent
          control={
            <Select
              value={settings.contextWindow || "200K"}
              onValueChange={(value) => onSettingsChange({ contextWindow: value })}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["200K", "300K", "500K", "1M"].map((value) => (
                  <SelectItem key={value} value={value}>
                    {value} tokens
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
        <SettingRow
          title="Language"
          description="Natural language used by the system prompt and responses."
          prominent
          control={
            <Select
              value={settings.language || "Default (English)"}
              onValueChange={(value) => onSettingsChange({ language: value })}
            >
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  "Default (English)",
                  "Vietnamese",
                  "Japanese",
                  "Chinese",
                  "Spanish",
                  "French",
                  "German",
                ].map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
        <SettingRow
          title="Default message action"
          description="Queue a follow-up after the current turn or steer the active thought loop."
          prominent
          control={
            <Select
              value={settings.interruptMode || "queue"}
              onValueChange={(value) =>
                onSettingsChange({
                  interruptMode: value as DesktopSettings["interruptMode"],
                })
              }
            >
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="queue">Queue after current turn</SelectItem>
                <SelectItem value="steer">Steer current turn</SelectItem>
              </SelectContent>
            </Select>
          }
        />
        <SettingRow
          title="Structured artifacts"
          description="Ask the agent to save substantial plans and documents as markdown artifacts."
          prominent
          control={
            <ToggleButton
              checked={settings.artifacts}
              onChange={(value) => onSettingsChange({ artifacts: value })}
            />
          }
        />
        <SettingRow
          title="Verbose debug logging"
          description="Include raw provider and tool traces in the desktop runtime logs."
          prominent
          control={
            <ToggleButton
              checked={settings.verboseOutput}
              onChange={(value) => onSettingsChange({ verboseOutput: value })}
            />
          }
        />
        <SettingRow
          title="Suggested prompts"
          description="Show starter prompt suggestions on a new chat."
          prominent
          control={
            <ToggleButton
              checked={settings.suggestedPrompts}
              onChange={(value) => onSettingsChange({ suggestedPrompts: value })}
            />
          }
        />
      </Card>
    </section>
  );
}
function ComposerPreferences({
  settings,
  onSettingsChange,
}: {
  settings: DesktopSettings;
  onSettingsChange: (input: Partial<DesktopSettings>) => void;
}) {
  return (
    <section>
      <SectionHeading
        title="Composer"
        description="Control how the chat composer sends prompts and displays context."
      />
      <Card className="mn-surface mn-settings-rows shadow-none">
        <SettingRow
          title="Show context window usage"
          description="Show the context ring beside the model selector."
          prominent
          control={
            <ToggleButton
              checked={settings.showContextWindowUsage}
              onChange={(value) => onSettingsChange({ showContextWindowUsage: value })}
            />
          }
        />
        <SettingRow
          title="Send shortcut"
          description="Choose whether Enter sends a prompt or inserts a new line."
          prominent
          control={
            <Select
              value={settings.sendShortcut || "command-enter"}
              onValueChange={(value) =>
                onSettingsChange({
                  sendShortcut: value as DesktopSettings["sendShortcut"],
                })
              }
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="enter">Enter</SelectItem>
                <SelectItem value="command-enter">⌘ Enter</SelectItem>
              </SelectContent>
            </Select>
          }
        />
      </Card>
    </section>
  );
}
function AppearanceSection({
  theme,
  settings,
  onThemeChange,
  onSettingsChange,
}: {
  theme: AppTheme;
  settings: DesktopSettings;
  onThemeChange: (theme: AppTheme) => void;
  onSettingsChange: (input: Partial<DesktopSettings>) => void;
}) {
  return (
    <div className="mt-8 space-y-5">
      <InterfaceAppearance
        theme={theme}
        settings={settings}
        onThemeChange={onThemeChange}
        onSettingsChange={onSettingsChange}
      />
      <CodeAppearance settings={settings} onSettingsChange={onSettingsChange} />
    </div>
  );
}
function InterfaceAppearance({
  theme,
  settings,
  onThemeChange,
  onSettingsChange,
}: {
  theme: AppTheme;
  settings: DesktopSettings;
  onThemeChange: (theme: AppTheme) => void;
  onSettingsChange: (input: Partial<DesktopSettings>) => void;
}) {
  return (
    <section>
      <SectionHeading
        title="Interface Setting"
        description="Choose the app theme and interface text size."
      />
      <Card className="mn-surface mn-settings-rows shadow-none">
        <SettingRow
          title="App theme"
          description="Choose light, dark, or follow the system theme."
          prominent
          control={
            <SelectWithIcon
              icon={Monitor}
              value={theme}
              onValueChange={(value) => onThemeChange(value as AppTheme)}
              className="w-48"
            >
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </SelectWithIcon>
          }
        />
        <SettingRow
          title="UI font size"
          description="Adjust interface text without changing the content itself. Anywhere in the app: ⌘ + / ⌘ − to step, ⌘ 0 to reset."
          prominent
          control={
            <FontSizeInput
              value={settings.uiFontSize || 15}
              min={11}
              max={20}
              onChange={(value) => onSettingsChange({ uiFontSize: value })}
            />
          }
        />
      </Card>
    </section>
  );
}
function CodeAppearance({
  settings,
  onSettingsChange,
}: {
  settings: DesktopSettings;
  onSettingsChange: (input: Partial<DesktopSettings>) => void;
}) {
  const lightThemes = [
    { id: "catppuccin-latte", label: "Catppuccin Latte" },
    { id: "github-light", label: "GitHub Light" },
    { id: "nord-light", label: "Nord Light" },
  ];
  const darkThemes = [
    { id: "github-dark", label: "GitHub Dark" },
    { id: "dracula", label: "Dracula" },
    { id: "monokai", label: "Monokai" },
  ];
  return (
    <section>
      <SectionHeading
        title="Code settings"
        description="Choose code themes, font size, and display options independently from the interface font size."
      />
      <Card className="mn-surface mn-settings-rows shadow-none">
        <SettingRow
          title="Light code theme"
          description="Highlighting theme used for code content in the light interface."
          prominent
          control={
            <ThemeSelect
              value={settings.lightCodeTheme}
              options={lightThemes}
              onChange={(value) => onSettingsChange({ lightCodeTheme: value })}
            />
          }
        />
        <SettingRow
          title="Dark code theme"
          description="Highlighting theme used for code content in the dark interface."
          prominent
          control={
            <ThemeSelect
              value={settings.darkCodeTheme}
              options={darkThemes}
              onChange={(value) => onSettingsChange({ darkCodeTheme: value })}
            />
          }
        />
        <SettingRow
          title="Show line numbers"
          description="Display line numbers in code and diff views."
          prominent
          control={
            <ToggleButton
              checked={settings.showLineNumbers}
              onChange={(value) => onSettingsChange({ showLineNumbers: value })}
            />
          }
        />
        <SettingRow
          title="Wrap long lines"
          description="Wrap long code lines automatically."
          prominent
          control={
            <ToggleButton
              checked={settings.wrapLines}
              onChange={(value) => onSettingsChange({ wrapLines: value })}
            />
          }
        />
        <SettingRow
          title="Code font size"
          description="Adjust the default font size for code blocks, file previews, and diff views."
          prominent
          control={
            <FontSizeInput
              value={settings.codeFontSize || 12}
              min={10}
              max={24}
              onChange={(value) => onSettingsChange({ codeFontSize: value })}
            />
          }
        />
      </Card>
      <div className="mt-5">
        <SectionHeading
          title="Code preview"
          description="Preview the light and dark code themes together."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <CodePreview
            title="Light preview"
            theme={settings.lightCodeTheme}
            dark={false}
            settings={settings}
          />
          <CodePreview
            title="Dark preview"
            theme={settings.darkCodeTheme}
            dark
            settings={settings}
          />
        </div>
      </div>
    </section>
  );
}
function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}
function SettingRow({
  title,
  description,
  control,
  prominent = false,
}: {
  title: string;
  description: string;
  control: ReactNode;
  prominent?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--mn-line)] px-4 py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p
          className={
            prominent
              ? "text-[15px] font-medium text-foreground"
              : "text-sm font-medium text-foreground"
          }
        >
          {title}
        </p>
        {description && (
          <p
            className={
              prominent
                ? "mt-1 text-sm leading-5 text-muted-foreground"
                : "mt-1 text-xs leading-5 text-muted-foreground"
            }
          >
            {description}
          </p>
        )}
      </div>
      <div className="w-full sm:w-auto sm:shrink-0">{control}</div>
    </div>
  );
}
function SelectWithIcon({
  icon: Icon,
  value,
  onValueChange,
  className,
  children,
}: {
  icon: ElementType;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <Icon className="size-3.5 text-muted-foreground" />
        <span className="min-w-0 flex-1 text-left">
          <SelectValue />
        </span>
      </SelectTrigger>
      {children}
    </Select>
  );
}
function FontSizeInput({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="relative block w-28">
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-9 w-28 pr-8 text-right text-sm"
        aria-label="Font size"
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
        px
      </span>
    </label>
  );
}
function ThemeSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ id: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function ToggleButton({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={
        "relative inline-flex h-6 w-11 shrink-0 items-center overflow-hidden rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mn-accent)]/40 " +
        (checked ? "bg-foreground" : "bg-muted-foreground/35")
      }
    >
      <span
        className={
          "pointer-events-none block size-4 shrink-0 rounded-full bg-background shadow-sm transition-transform " +
          (checked ? "translate-x-6" : "translate-x-1")
        }
      />
    </button>
  );
}
function CodePreview({
  title,
  theme,
  dark,
  settings,
}: {
  title: string;
  theme: string;
  dark: boolean;
  settings: DesktopSettings;
}) {
  const lines = [
    "const themePreview: ThemeConfig = {",
    '  surface: "sidebar",',
    '  accent: "#f472b6",',
    "  contrast: 45,",
    "};",
  ];
  return (
    <Card
      className={
        (dark ? "bg-[#171719] text-[#f4f2f0]" : "bg-[var(--mn-surface)] text-[var(--mn-code)]") +
        " gap-0 overflow-hidden border-[var(--mn-line)] py-0 shadow-none"
      }
    >
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-[var(--mn-line)] p-4 sm:p-5">
        <div>
          <CardTitle className="text-sm">{title}</CardTitle>
          <CardDescription className={dark ? "text-[#aaa4ae]" : "text-[var(--mn-code)]"}>
            {theme}
          </CardDescription>
        </div>
        <span className="rounded-md bg-current/10 px-2 py-1 text-[0.6875rem] font-medium">
          {dark ? "Dark" : "Active"}
        </span>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        <pre
          className={
            "overflow-auto rounded-lg p-3 font-mono text-[0.8125rem] leading-5 " +
            (dark
              ? "bg-black/25 text-[#f4f2f0]/85"
              : "bg-[var(--mn-surface-muted)] text-[var(--mn-code)]")
          }
          style={{
            fontSize: `${settings.codeFontSize || 12}px`,
            whiteSpace: settings.wrapLines ? "pre-wrap" : "pre",
          }}
        >
          {lines.map((line, index) => (
            <div key={line}>
              {settings.showLineNumbers && (
                <span className="mr-4 inline-block w-5 select-none text-right opacity-45">
                  {index + 1}
                </span>
              )}
              <code>{line}</code>
            </div>
          ))}
        </pre>
      </CardContent>
    </Card>
  );
}
function PersonalizationSection({
  personalization,
  onLoad,
  onSave,
  onDeleteMemories,
}: {
  personalization: DesktopPersonalization;
  onLoad: () => Promise<DesktopPersonalization>;
  onSave: (input: DesktopPersonalizationInput) => Promise<DesktopPersonalization>;
  onDeleteMemories: () => Promise<DesktopPersonalization>;
}) {
  const [instructions, setInstructions] = useState(personalization.customInstructions);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState("");
  const instructionsRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-grow the editor to fit its content instead of reserving a tall
  // fixed block with a large empty area under short instructions.
  useEffect(() => {
    const el = instructionsRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(480, Math.max(160, el.scrollHeight))}px`;
  }, [instructions, loading]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void onLoad()
      .then((next) => {
        if (active) {
          setInstructions(next.customInstructions || defaultCustomInstructions);
        }
      })
      .catch((reason) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Could not load personalization");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [onLoad]);

  async function saveInstructions() {
    setSaving(true);
    setError("");
    try {
      const next = await onSave({ customInstructions: instructions });
      setInstructions(next.customInstructions);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save instructions");
    } finally {
      setSaving(false);
    }
  }

  async function update(input: DesktopPersonalizationInput) {
    setError("");
    try {
      await onSave(input);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save personalization");
    }
  }

  async function deleteMemories() {
    setDeleting(true);
    try {
      await onDeleteMemories();
      setDeleteOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete local memories");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="mt-8 space-y-5">
        <div className="h-72 animate-pulse rounded-lg bg-[var(--mn-surface-muted)]" />
        <div className="h-56 animate-pulse rounded-lg bg-[var(--mn-surface-muted)]" />
      </div>
    );
  }

  const personalityOptions = [
    {
      value: "pragmatic",
      label: "Pragmatic",
      description: "Actionable and technical, with clear trade-offs.",
      fit: "day-to-day engineering work",
    },
    {
      value: "concise",
      label: "Concise",
      description: "Short answers, focused diffs, and minimal repetition.",
      fit: "quick fixes and terminal sessions",
    },
    {
      value: "friendly",
      label: "Friendly",
      description: "Warm and approachable while staying precise.",
      fit: "collaborative planning and pair work",
    },
    {
      value: "mentor",
      label: "Mentor",
      description: "Patient explanations that teach the key concept.",
      fit: "learning unfamiliar code or APIs",
    },
    {
      value: "direct",
      label: "Direct",
      description: "Decisive guidance that calls out risk without filler.",
      fit: "incident response and hard decisions",
    },
  ];
  const selectedPersonality =
    personalityOptions.find((option) => option.value === personalization.personality) ||
    personalityOptions[0];

  return (
    <div className="mt-8 space-y-5">
      {error && (
        <div className="rounded-lg border border-rose-500/25 bg-rose-500/8 px-4 py-3 text-xs text-rose-700 dark:text-rose-200">
          {error}
        </div>
      )}
      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">Custom instructions</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Give mncode extra instructions and context for all chats on this computer.
            </p>
          </div>
          <Button
            variant="outline"
            disabled={saving || instructions === personalization.customInstructions}
            onClick={() => void saveInstructions()}
            className="border-[var(--mn-line)]"
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
        <Card className="mn-surface gap-0 overflow-hidden py-0 shadow-none">
          <CardContent className="p-0">
            <textarea
              ref={instructionsRef}
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              className="block max-h-96 min-h-40 w-full resize-none overflow-y-auto rounded-[inherit] border-0 bg-transparent px-4 py-4 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-inset focus:ring-[var(--mn-accent)]/20"
              maxLength={20000}
              aria-label="Custom instructions"
            />
            <p className="border-t border-[var(--mn-line)] px-4 py-2 text-[0.6875rem] text-muted-foreground">
              {instructions.length.toLocaleString()} / 20,000 characters · Applied to future agent
              turns.
            </p>
          </CardContent>
        </Card>
      </section>
      <section>
        <SectionHeading
          title="Memory"
          description="Configure how local memories are collected, retained, and used on this computer."
        />
        <Card className="mn-surface mn-settings-rows shadow-none">
          <SettingRow
            title="Enable local memories"
            description="Use approved memories to personalize future chats on this computer."
            prominent
            control={
              <ToggleButton
                checked={personalization.memoryEnabled}
                onChange={(value) => void update({ memoryEnabled: value })}
              />
            }
          />
          <SettingRow
            title="Allow local memory generation from tool-assisted chats"
            description="Allow explicit ‘Remember that…’ instructions from chats that used tools to be saved locally."
            prominent
            control={
              <ToggleButton
                checked={personalization.memoryToolAssisted}
                onChange={(value) => void update({ memoryToolAssisted: value })}
              />
            }
          />
          <SettingRow
            title="Delete local memories"
            description={`${personalization.memoryCount} memor${personalization.memoryCount === 1 ? "y" : "ies"} stored locally on this computer.`}
            prominent
            control={
              <Button
                variant="destructive"
                disabled={deleting || personalization.memoryCount === 0}
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            }
          />
        </Card>
      </section>
      <section>
        <SectionHeading
          title="Personality"
          description="Choose a default tone for mncode responses. Custom instructions take priority."
        />
        <Card className="mn-surface mn-settings-rows shadow-none">
          <SettingRow
            title="Personality"
            description=""
            prominent
            control={
              <Select
                value={personalization.personality}
                onValueChange={(value) => void update({ personality: value })}
              >
                <SelectTrigger className="w-44">
                  <span className="truncate text-sm font-medium">{selectedPersonality.label}</span>
                </SelectTrigger>
                <SelectContent>
                  {personalityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} textValue={option.label}>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-sm font-medium">{option.label}</span>
                        <span className="text-[0.75rem] leading-4 text-muted-foreground">
                          {option.description} Best for {option.fit}.
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />
          <SettingRow
            title="Brainrot mode"
            description="Use the CLI’s Gen Z / Sigma developer persona and meme-style commentary."
            prominent
            control={
              <ToggleButton
                checked={personalization.brainrotMode}
                onChange={(value) => void update({ brainrotMode: value })}
              />
            }
          />
          <SettingRow
            title="Troll mode"
            description="Allow occasional harmless prank-style status phrasing while keeping real tool calls safe."
            prominent
            control={
              <ToggleButton
                checked={personalization.trollMode}
                onChange={(value) => void update({ trollMode: value })}
              />
            }
          />
        </Card>
      </section>
      <div className="flex items-start gap-2 rounded-lg border border-[var(--mn-line)] bg-[var(--mn-surface-muted)] px-4 py-3 text-xs leading-5 text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-[var(--mn-accent-strong)]" />
        Personalization is applied locally by mncode. Memories are only stored when you explicitly
        ask the agent to remember something.
      </div>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="border-[var(--mn-line)] bg-[var(--mn-surface)] text-foreground">
          <DialogHeader>
            <DialogTitle>Delete local memories?</DialogTitle>
            <DialogDescription>
              This permanently removes all memories stored in the local mncode memory file. It does
              not delete chat sessions or workspace files.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={deleting} onClick={() => void deleteMemories()}>
              {deleting ? "Deleting…" : "Delete memories"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BrowserSection({
  settings,
  onLoad,
  onUpdate,
  onImportChrome,
  onClearCache,
  onClearAll,
  onCloseSession,
}: {
  settings: DesktopBrowserSettings;
  onLoad: () => Promise<DesktopBrowserSettings>;
  onUpdate: (input: DesktopBrowserSettingsInput) => Promise<DesktopBrowserSettings>;
  onImportChrome: () => Promise<DesktopBrowserSettings>;
  onClearCache: () => Promise<DesktopBrowserSettings>;
  onClearAll: () => Promise<DesktopBrowserSettings>;
  onCloseSession: () => Promise<DesktopBrowserSettings>;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [busyAction, setBusyAction] = useState<"import" | "cache" | "clear-all" | "close" | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    void onLoad()
      .catch((reason) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Could not load browser settings");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [onLoad]);

  async function update(input: DesktopBrowserSettingsInput) {
    setError("");
    try {
      await onUpdate(input);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update browser settings");
    }
  }

  async function runAction(kind: "import" | "cache" | "clear-all" | "close") {
    setError("");
    setBusyAction(kind);
    try {
      if (kind === "import") await onImportChrome();
      else if (kind === "cache") await onClearCache();
      else if (kind === "clear-all") await onClearAll();
      else await onCloseSession();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Browser action failed");
    } finally {
      setBusyAction(null);
      setConfirmClearAll(false);
    }
  }

  if (loading) {
    return (
      <div className="mt-8 space-y-5">
        <div className="h-24 animate-pulse rounded-lg bg-[var(--mn-surface-muted)]" />
        <div className="h-24 animate-pulse rounded-lg bg-[var(--mn-surface-muted)]" />
        <div className="h-52 animate-pulse rounded-lg bg-[var(--mn-surface-muted)]" />
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-5">
      {error && (
        <div className="rounded-lg border border-rose-500/25 bg-rose-500/8 px-4 py-3 text-xs text-rose-700 dark:text-rose-200">
          {error}
        </div>
      )}
      <section>
        <SectionHeading
          title="Browser control"
          description="Let the agent navigate, click, type, and read real web pages using a dedicated, isolated Chrome instance."
        />
        <Card className="mn-surface mn-settings-rows shadow-none">
          <SettingRow
            title="Enable agent browser control"
            description="Adds a control_browser tool the agent can use to drive a real Chrome window — navigate, click, type, read pages, and screenshot."
            control={
              <ToggleButton
                checked={settings.controlEnabled}
                onChange={(value) => void update({ controlEnabled: value })}
              />
            }
          />
          <div className="flex items-center justify-between gap-3 border-t border-[var(--mn-line)] px-5 py-3 text-[0.75rem] text-muted-foreground">
            <div className="flex items-center gap-2">
              <CircleDot
                className={cn(
                  "size-3.5",
                  settings.sessionRunning ? "text-emerald-500" : "text-muted-foreground/50",
                )}
              />
              {settings.sessionRunning
                ? "The agent's browser session is currently open."
                : "No browser session is currently open."}
            </div>
            {settings.sessionRunning && (
              <Button
                variant="outline"
                size="sm"
                disabled={busyAction !== null}
                onClick={() => void runAction("close")}
                className="h-7 gap-1.5 border-[var(--mn-line)] text-xs"
              >
                {busyAction === "close" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <PowerOff className="size-3.5" />
                )}
                Close browser
              </Button>
            )}
          </div>
        </Card>
      </section>
      <section>
        <SectionHeading
          title="Security"
          description="Certificate handling applies to the agent's controlled browser only."
        />
        <Card className="mn-surface mn-settings-rows shadow-none">
          <SettingRow
            title="Ignore certificate errors"
            description="Stops verifying HTTPS certificates in the controlled browser. Restart the session to take effect."
            control={
              <ToggleButton
                checked={settings.ignoreCertificateErrors}
                onChange={(value) => void update({ ignoreCertificateErrors: value })}
              />
            }
          />
        </Card>
      </section>
      <section>
        <SectionHeading
          title="Browser data"
          description="Import and manage data for the agent's isolated browser profile."
        />
        <Card className="mn-surface mn-settings-rows shadow-none">
          <BrowserActionRow
            icon={Chrome}
            title="Import Chrome browser data"
            description={
              settings.chromeProfileFound
                ? "Copy cookies, bookmarks, and history from your default Chrome profile so the agent stays logged into sites. Saved passwords are never copied."
                : "No default Chrome profile was detected on this computer."
            }
            actionLabel="Import"
            disabled={!settings.chromeProfileFound}
            busy={busyAction === "import"}
            onRun={() => void runAction("import")}
          />
          <BrowserActionRow
            icon={Database}
            title="Clear built-in browser cache"
            description="Clear HTTP cache, Cache Storage, and service workers. Cookies and history are kept."
            actionLabel="Clear cache"
            busy={busyAction === "cache"}
            onRun={() => void runAction("cache")}
          />
          <BrowserActionRow
            icon={ShieldAlert}
            title="Clear all browser data"
            description="Delete cookies, site data, history, and cache from the agent's isolated browser profile."
            actionLabel="Clear all data"
            destructive
            busy={busyAction === "clear-all"}
            onRun={() => setConfirmClearAll(true)}
          />
          <div className="border-t border-[var(--mn-line)] px-5 py-3 text-[0.75rem] text-muted-foreground">
            These actions only ever touch mncode's isolated browser profile at{" "}
            <code className="rounded bg-[var(--mn-surface-muted)] px-1 py-0.5">
              {settings.profileDataDir || "~/.mncode/browser-profile"}
            </code>
            . Your real Chrome profile is never modified.
          </div>
        </Card>
      </section>

      <Dialog open={confirmClearAll} onOpenChange={setConfirmClearAll}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear all browser data?</DialogTitle>
            <DialogDescription>
              This deletes cookies, history, bookmarks, and cache from the agent's isolated
              browser profile. You'll need to log back into any sites the agent visits. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmClearAll(false)}
              disabled={busyAction === "clear-all"}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void runAction("clear-all")}
              disabled={busyAction === "clear-all"}
            >
              {busyAction === "clear-all" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Clear all data"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BrowserActionRow({
  icon: Icon,
  title,
  description,
  actionLabel,
  destructive = false,
  disabled = false,
  busy = false,
  onRun,
}: {
  icon: ElementType;
  title: string;
  description: string;
  actionLabel: string;
  destructive?: boolean;
  disabled?: boolean;
  busy?: boolean;
  onRun: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--mn-line)] px-4 py-3 last:border-b-0">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--mn-accent-soft)] text-[var(--mn-accent-strong)]">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
      <Button
        variant={destructive ? "destructive" : "outline"}
        disabled={disabled || busy}
        onClick={onRun}
        className={destructive ? "shrink-0" : "shrink-0 border-[var(--mn-line)]"}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : actionLabel}
      </Button>
    </div>
  );
}


function AccountSection({
  account,
  accountBusy,
  onLogin,
  onLogout,
  onLoadUsage,
}: {
  account: DesktopAccount;
  accountBusy: boolean;
  onLogin: () => Promise<boolean | void> | boolean | void;
  onLogout: () => void;
  onLoadUsage: () => Promise<UsageStats>;
}) {
  const connected = account.connected;
  return (
    <div className="mt-8 space-y-5">
      <Card className="mn-surface mn-settings-rows shadow-none">
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <div className="grid size-11 place-items-center rounded-full bg-[var(--mn-accent-soft)] text-sm font-semibold text-[var(--mn-accent-strong)]">
            {connected ? (
              (account.name || account.email || "?").slice(0, 1).toUpperCase()
            ) : (
              <UserRound className="size-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {connected ? account.name || "mncode account" : "Guest mode"}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {connected
                ? account.email || "Connected"
                : "Sign in to sync your identity and usage."}
            </p>
          </div>
          {connected ? (
            <Button
              variant="outline"
              disabled={accountBusy}
              onClick={onLogout}
              className="border-[var(--mn-line)]"
            >
              Sign out
            </Button>
          ) : (
            <Button disabled={accountBusy} onClick={onLogin} className="mn-accent-button">
              {accountBusy ? "Opening browser…" : "Sign in"}
            </Button>
          )}
        </CardContent>
      </Card>
      <UsageSection connected={connected} onLogin={onLogin} onLoadUsage={onLoadUsage} />
    </div>
  );
}
function UsageSection({
  connected,
  onLogin,
  onLoadUsage,
}: {
  connected: boolean;
  onLogin: () => Promise<boolean | void> | boolean | void;
  onLoadUsage: () => Promise<UsageStats>;
}) {
  const [usage, setUsage] = useState<UsageStats>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setUsage(await onLoadUsage());
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : reason && typeof reason === "object" && "message" in reason
              ? String(reason.message)
              : "Could not load usage";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [onLoadUsage]);
  useEffect(() => {
    if (connected) void load();
    else {
      setUsage(undefined);
      setError("");
    }
  }, [connected, load]);
  async function reauthenticate() {
    try {
      const loggedIn = await onLogin();
      if (loggedIn === false) return;
      await load();
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "Could not sign in again";
      setError(message);
    }
  }
  if (!connected)
    return (
      <Card className="mn-surface mn-settings-rows shadow-none">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <BarChart3 className="size-7 text-[var(--mn-accent-strong)]" />
          <p className="text-sm font-medium">Usage is linked to your account</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Sign in to see daily token activity across your CLI and desktop sessions.
          </p>
          <Button onClick={onLogin} className="mn-accent-button">
            Sign in to view usage
          </Button>
        </CardContent>
      </Card>
    );
  if (loading)
    return (
      <Card className="mn-surface mn-settings-rows shadow-none">
        <CardContent className="flex items-center justify-center gap-2 p-10 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading usage…
        </CardContent>
      </Card>
    );
  if (error)
    return (
      <Card className="mn-surface mn-settings-rows shadow-none">
        <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
          <p className="text-sm font-medium">Could not load usage</p>
          <p className="text-xs text-muted-foreground">{error}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {/expired|revoked|401|403|sign in/i.test(error) && (
              <Button onClick={() => void reauthenticate()} className="mn-accent-button">
                Sign in again
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => void load()}
              className="border-[var(--mn-line)]"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  return usage ? <UsageHeatmap usage={usage} /> : null;
}
function AppInfoSection({
  info,
  onCheck,
  onOpenUpdate,
}: {
  info: AppInfo;
  onCheck: () => Promise<UpdateInfo>;
  onOpenUpdate: (url: string) => void;
}) {
  const [checking, setChecking] = useState(false);
  const [update, setUpdate] = useState<UpdateInfo>();
  async function check() {
    setChecking(true);
    try {
      const result = await onCheck();
      setUpdate(result.updateAvailable ? result : undefined);
    } finally {
      setChecking(false);
    }
  }
  return (
    <div className="mt-8 space-y-5">
      <Card className="mn-surface mn-settings-rows shadow-none">
        <CardContent className="space-y-1 p-0">
          <div className="px-4 pt-4">
            <Info className="size-5 text-[var(--mn-accent-strong)]" />
          </div>
          <InfoRow label="Version" value={info.version} />
          <InfoRow label="Release channel" value={info.channel} />
          <InfoRow label="About" value={info.description} />
          <InfoRow label="Copyright" value={info.copyright} />
        </CardContent>
      </Card>
      <Card className="mn-surface mn-settings-rows shadow-none">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm font-medium">Updates</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Check mncode releases for a newer desktop version.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => void check()}
            disabled={checking}
            className="border-[var(--mn-line)]"
          >
            {checking ? (
              <Loader2 className="mr-2 size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 size-3.5" />
            )}
            {checking ? "Checking…" : "Check for updates"}
          </Button>
        </CardContent>
      </Card>
      {update && (
        <Card className="mn-settings-rows border-[var(--mn-accent)]/40 bg-[var(--mn-accent-soft)] shadow-none">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div>
              <p className="text-sm font-medium">{update.latestVersion} is available</p>
              <p className="mt-1 text-xs text-muted-foreground">
                You are running {update.currentVersion}.
              </p>
            </div>
            <Button onClick={() => onOpenUpdate(update.releaseUrl)} className="mn-accent-button">
              <ExternalLink className="mr-2 size-3.5" />
              View release
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--mn-line)] px-4 py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
