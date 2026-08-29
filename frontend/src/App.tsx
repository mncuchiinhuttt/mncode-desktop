import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Download, Keyboard, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { desktop, listen } from "@/lib/desktop";
import { sounds } from "@/lib/audio-notifications";
import { useActiveRunID } from "@/hooks/useActiveRunID";
import type {
  ActivityItem,
  AgentRunSummary,
  AgentRunUsage,
  AppInfo,
  ChatMessage,
  ChatSession,
  CustomProviderInput,
  DesktopAccount,
  DesktopBrowserSettings,
  DesktopBrowserSettingsInput,
  DesktopCatalog,
  DesktopMigrationInput,
  DesktopMigrationReport,
  DesktopSettings,
  DesktopMCPServer,
  DesktopMCPServerInput,
  DesktopPersonalization,
  DesktopPersonalizationInput,
  DesktopRemoteSession,
  FileNode,
  PermissionRequest,
  PromptCatalog,
  QuestionRequest,
  UpdateAsset,
  UpdateInfo,
  ViewName,
  WorkspaceInfo,
} from "@/types";
import { AppSidebar } from "./components/app-sidebar";
import { AppBootScreen } from "./components/app-boot-screen";
import { CommandPalette } from "./components/command-palette";
import { InsightsView } from "./components/insights-view";
import { ManagementView } from "./components/management-view";
import { SettingsView } from "./components/settings-view";
import { TerminalPanel } from "./components/terminal-panel";
import { TopBar } from "./components/top-bar";
import { RightSidebar, type RightPanel } from "./components/right-sidebar";
import { FilePreviewDialog } from "./components/file-preview-dialog";
import { ChatPeekPanel } from "./components/chat-peek-panel";
import { RemoteCompanionDialog } from "./components/remote-companion-dialog";
import { OnboardingFlow, type OnboardingPhase } from "./components/onboarding-flow";
import { WorkspaceView } from "./components/workspace-view";
import { AutomationsView } from "./components/automations-view";
import "./style.css";

type UpdatePhase = "idle" | "downloading" | "ready";
const emptyWorkspace: WorkspaceInfo = {
  path: "",
  name: "",
  projectType: "",
  totalFiles: 0,
  totalLines: 0,
  languages: [],
  ready: false,
};
const emptyAccount: DesktopAccount = {
  connected: false,
  name: "",
  email: "",
  isAdmin: false,
  status: "guest",
};
const emptyRunUsage: AgentRunUsage = {
  inputTokens: 0,
  outputTokens: 0,
  thinkingTokens: 0,
  totalTokens: 0,
};
const emptySettings: DesktopSettings = {
  model: "",
  provider: "",
  workflow: "auto",
  effort: "high",
  thinkingBudget: 16384,
  permissionMode: "ask",
  defaultPermissionMode: "latest",
  theme: "light",
  uiFontSize: 15,
  codeFontSize: 12,
  lightCodeTheme: "catppuccin-latte",
  darkCodeTheme: "github-dark",
  showLineNumbers: true,
  wrapLines: false,
  showContextWindowUsage: true,
  suggestedPrompts: true,
  sendShortcut: "command-enter",
  contextWindow: "200K",
  autoCompact: true,
  tokenSaverConcise: false,
  tokenSaverCapThinking: false,
  tokenSaverCompressOutput: false,
  tokenSaverTargetedEdits: false,
  tokenSaverRtk: false,
  tokenSaverHeadroom: false,
  language: "Default (English)",
  searchEngine: "auto",
  braveSearchConfigured: false,
  tavilySearchConfigured: false,
  artifacts: true,
  interruptMode: "queue",
  verboseOutput: false,
  contextPercent: 0,
  contextUsed: 0,
  contextLimit: 0,
};
const emptyBrowserSettings: DesktopBrowserSettings = {
  controlEnabled: false,
  ignoreCertificateErrors: false,
  chromeProfileFound: false,
  builtInBrowserAvailable: false,
  sessionRunning: false,
  profileDataDir: "",
};
const emptyPersonalization: DesktopPersonalization = {
  customInstructions: "",
  personality: "pragmatic",
  brainrotMode: false,
  trollMode: false,
  memoryEnabled: false,
  memoryToolAssisted: true,
  memoryCount: 0,
};
const emptyRemoteSession: DesktopRemoteSession = {
  active: false,
  sessionId: "",
  pairingUrl: "",
  qrCode: "",
  status: "",
  connectedDevices: 0,
  devices: [],
};
const emptyPromptCatalog: PromptCatalog = {
  context: [],
  commands: [],
  skills: [],
};
const emptyCatalog: DesktopCatalog = {
  models: [],
  workflows: [],
  efforts: [],
  permissions: [],
  themes: [],
  settings: emptySettings,
  prompt: emptyPromptCatalog,
};
const defaultAppInfo: AppInfo = {
  version: "v0.1.4-beta",
  channel: "beta",
  description: "A local-first AI workspace for building with your code.",
  repository: "https://github.com/mncuchiinhuttt/mncode",
  copyright: "© 2026 mncuchiinhuttt",
};
const chatHistoryKey = "mncode-chat-history";
const DEBUG_ONBOARDING_ALWAYS = true;
const leftSidebarWidthKey = "mncode-left-sidebar-width";

type MigrationAppBinding = {
  MigrateLegacyLocalStorage?: (input: DesktopMigrationInput) => Promise<DesktopMigrationReport>;
};

type LegacyMigrationTarget =
  | { kind: "workspace"; workspaceDir: string }
  | { kind: "standalone" };

type LegacyMigrationInFlight = {
  key: string;
  promise: Promise<DesktopMigrationReport | undefined>;
};

let legacyMigrationInFlight: LegacyMigrationInFlight | undefined;

function migrateLegacyLocalStorage(input: DesktopMigrationInput) {
  const windowWithBindings = window as unknown as {
    go?: { main?: { App?: MigrationAppBinding } };
  };
  const app = windowWithBindings.go?.main?.App;
  return app?.MigrateLegacyLocalStorage?.(input);
}

function migrationErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "";
}

function isTransientMigrationError(error: unknown) {
  return /(?:busy|locked|temporar|timed?\s*out|network|connection\s+(?:reset|refused|closed)|service\s+unavailable|not\s+ready|try\s+again|\b50[234]\b)/i.test(
    migrationErrorMessage(error),
  );
}

function runLegacyLocalStorageMigration(input: DesktopMigrationInput) {
  const key = JSON.stringify(input);
  if (legacyMigrationInFlight?.key === key) return legacyMigrationInFlight.promise;

  const promise = (async () => {
    const firstAttempt = migrateLegacyLocalStorage(input);
    if (!firstAttempt) return undefined;
    try {
      return await firstAttempt;
    } catch (error) {
      if (!isTransientMigrationError(error)) throw error;
      const { promise, resolve } = Promise.withResolvers<void>();
      window.setTimeout(resolve, 250);
      await promise;
      // The backend migration is fingerprinted/idempotent, so a single retry
      // is safe after a transient runtime or persistence failure.
      return await migrateLegacyLocalStorage(input);
    }
  })();
  legacyMigrationInFlight = { key, promise };
  return promise;
}

const rightSidebarWidthKey = "mncode-right-sidebar-width";

function storedWidth(key: string, fallback: number, min: number, max: number) {
  const value = Number(localStorage.getItem(key));
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function readChatHistory(): ChatSession[] {
  try {
    const stored = localStorage.getItem(chatHistoryKey);
    const parsed = stored ? (JSON.parse(stored) as ChatSession[]) : [];
    return Array.isArray(parsed)
      ? parsed
          .filter((chat) => chat && typeof chat.id === "string")
          .map((chat) => ({
            ...chat,
            messages: Array.isArray(chat.messages) ? chat.messages : [],
            activities: Array.isArray(chat.activities) ? chat.activities : [],
            runUsage: chat.runUsage ? { ...emptyRunUsage, ...chat.runUsage } : { ...emptyRunUsage },
          }))
      : [];
  } catch {
    return [];
  }
}

function chatTitle(messages: ChatMessage[]) {
  const firstPrompt = messages.find((message) => message.role === "user");
  const title = firstPrompt?.content.trim().replace(/\s+/g, " ") || "New chat";
  return title.length > 48 ? `${title.slice(0, 48)}…` : title;
}

type ChatSnapshot = {
  messages: ChatMessage[];
  activities: ActivityItem[];
  runSummary?: AgentRunSummary;
  runUsage: AgentRunUsage;
};

function upsertChatHistory(current: ChatSession[], id: string, snapshot: ChatSnapshot) {
  const previous = current.find((chat) => chat.id === id);
  const next = {
    ...previous,
    id,
    title: chatTitle(snapshot.messages),
    messages: snapshot.messages,
    updatedAt: Date.now(),
    unread: false,
    activities: snapshot.activities,
    runSummary: snapshot.runSummary,
    runUsage: snapshot.runUsage,
  };
  return [next, ...current.filter((chat) => chat.id !== id)]
    .sort((left, right) => Number(right.pinned) - Number(left.pinned))
    .slice(0, 9);
}

type ToolActivityDescriptor = {
  kind: ActivityItem["kind"];
  tone: ActivityItem["tone"];
  runningLabel: string;
  completeLabel: string;
  detail: string;
};

function compactText(value: unknown, limit = 180) {
  if (typeof value !== "string") return "";
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

function estimateTokens(value: string) {
  return Math.max(1, Math.ceil(value.trim().length / 4));
}

function toolArgument(args: Record<string, unknown> | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = args?.[key];
    if (typeof value === "string" && value.trim()) return compactText(value, 140);
  }
  return "";
}

function shortPath(value: string) {
  const parts = value.replaceAll("\\", "/").split("/");
  return parts[parts.length - 1] || value;
}

function prettyToolName(name: string) {
  return name.replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function describeToolAction(name: string, args?: Record<string, unknown>): ToolActivityDescriptor {
  const target = shortPath(toolArgument(args, "TargetFile", "path"));
  if (name === "write_to_file") {
    const overwrite = args?.Overwrite === true;
    return {
      kind: "file",
      tone: "cyan",
      runningLabel: overwrite ? `Editing ${target || "file"}` : `Creating ${target || "file"}`,
      completeLabel: overwrite ? `Edited ${target || "file"}` : `Created ${target || "file"}`,
      detail: target || "Preparing file change",
    };
  }
  if (name === "replace_file_content" || name === "edit_file_content") {
    return {
      kind: "file",
      tone: "cyan",
      runningLabel: `Editing ${target || "file"}`,
      completeLabel: `Edited ${target || "file"}`,
      detail: target || "Preparing file change",
    };
  }
  if (name === "bash") {
    const command = toolArgument(args, "Command", "command");
    return {
      kind: "command",
      tone: "cyan",
      runningLabel: "Running command",
      completeLabel: "Ran command",
      detail: command || "Executing a workspace command",
    };
  }
  if (name === "invoke_subagent") {
    const agentName = toolArgument(args, "name", "agentName");
    return {
      kind: "subagent",
      tone: "cyan",
      runningLabel: `Spawning ${agentName || "subagent"}`,
      completeLabel: `Completed ${agentName || "subagent"}`,
      detail: agentName || "Preparing delegated work",
    };
  }
  const readable = prettyToolName(name);
  return {
    kind: "tool",
    tone: "cyan",
    runningLabel: `Loading ${readable}`,
    completeLabel: `Loaded ${readable}`,
    detail: target || "Waiting for tool result",
  };
}

function completedToolLabel(item: ActivityItem, name: string, isError: boolean) {
  if (isError) return `Failed ${item.label}`;
  if (item.kind === "file") {
    return item.label.replace(/^(Editing|Creating)/, (verb) =>
      verb === "Creating" ? "Created" : "Edited",
    );
  }
  if (item.kind === "command") return "Ran command";
  if (item.kind === "subagent") return item.label.replace("Spawning", "Completed");
  if (item.kind === "tool") return item.label.replace("Loading", "Loaded");
  return describeToolAction(name).completeLabel;
}

export default function App() {
  const [view, setView] = useState<ViewName>("workspace");
  const [viewDirection, setViewDirection] = useState<"forward" | "back">("forward");
  const [settingsExiting, setSettingsExiting] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspaceInfo>(emptyWorkspace);
  const [account, setAccount] = useState<DesktopAccount>(emptyAccount);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [previewFilePath, setPreviewFilePath] = useState<string | null>(null);
  const [splitChatID, setSplitChatID] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [runUsage, setRunUsage] = useState<AgentRunUsage>(emptyRunUsage);
  const [runSummary, setRunSummary] = useState<AgentRunSummary>();
  const [runStartedAt, setRunStartedAt] = useState<number>();
  const [catalog, setCatalog] = useState<DesktopCatalog>(emptyCatalog);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(readChatHistory);
  const [legacyMigrationSource] = useState<DesktopMigrationInput>(() => ({
    chatJson: localStorage.getItem(chatHistoryKey) ?? undefined,
    notesJson:
      localStorage.getItem("mncode-notes") ??
      localStorage.getItem("mncode-side-notes") ??
      undefined,
    automationJson:
      localStorage.getItem("mncode-automations") ??
      localStorage.getItem("mncode-automation") ??
      undefined,
  }));
  const [activeChatId, setActiveChatId] = useState(() => `chat-${Date.now()}`);
  const [renameChatID, setRenameChatID] = useState<string>();
  const [renameDraft, setRenameDraft] = useState("");
  const [deleteChatID, setDeleteChatID] = useState<string>();
  const [prompt, setPrompt] = useState("");
  const [theme, setTheme] = useState<"system" | "light" | "dark">(() => {
    const stored = localStorage.getItem("mncode-theme");
    return stored === "light" || stored === "dark" || stored === "system" ? stored : "light";
  });
  const [running, setRunning] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() =>
    storedWidth(leftSidebarWidthKey, 268, 220, 420),
  );
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(() =>
    storedWidth(rightSidebarWidthKey, 300, 240, 440),
  );
  const [resizingSide, setResizingSide] = useState<"left" | "right">();
  const [rightPanel, setRightPanel] = useState<RightPanel>("workspace");
  const [sidePrompt, setSidePrompt] = useState("");
  const [sideNotes, setSideNotes] = useState<string[]>([]);
  const [commandOpen, setCommandOpen] = useState(false);
  const [shortcutOpen, setShortcutOpen] = useState(false);
  const [permission, setPermission] = useState<PermissionRequest>();
  const [question, setQuestion] = useState<QuestionRequest>();
  const [toast, setToast] = useState<{
    message: string;
    kind: "error" | "success";
  }>();
  const [accountBusy, setAccountBusy] = useState(false);
  const [appInfo, setAppInfo] = useState<AppInfo>(defaultAppInfo);
  const [browserSettings, setBrowserSettings] =
    useState<DesktopBrowserSettings>(emptyBrowserSettings);
  const [mcpServers, setMCPServers] = useState<DesktopMCPServer[]>([]);
  const [personalization, setPersonalization] =
    useState<DesktopPersonalization>(emptyPersonalization);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>();
  const [updateOpen, setUpdateOpen] = useState(false);
  const [updatePhase, setUpdatePhase] = useState<UpdatePhase>("idle");
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateDownloadPath, setUpdateDownloadPath] = useState("");
  const [updateError, setUpdateError] = useState("");
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState("");
  const [terminalRunning, setTerminalRunning] = useState(false);
  const [terminalCwd, setTerminalCwd] = useState("");
  const [remoteOpen, setRemoteOpen] = useState(false);
  const [remoteBusy, setRemoteBusy] = useState(false);
  const [remoteError, setRemoteError] = useState("");
  const [workspaceBootstrapReady, setWorkspaceBootstrapReady] = useState(false);
  const [remoteSession, setRemoteSession] = useState<DesktopRemoteSession>(emptyRemoteSession);
  const [bootPhase, setBootPhase] = useState<"loading" | "exiting" | "done">("loading");
  const [accountHydrated, setAccountHydrated] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingPhase, setOnboardingPhase] = useState<OnboardingPhase>("welcome");
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const chatSaveTimer = useRef<number | undefined>(undefined);
  const settingsExitTimer = useRef<number | undefined>(undefined);
  const onboardingCloseTimer = useRef<number | undefined>(undefined);
  const runStartedAtRef = useRef<number | undefined>(undefined);
  const runUsageRef = useRef<AgentRunUsage>(emptyRunUsage);
  const providerUsageRef = useRef<AgentRunUsage>(emptyRunUsage);
  const hasProviderUsageRef = useRef(false);
  const { setActiveRunID, clearActiveRunID, isActiveRun } = useActiveRunID();
  const migrationStartedRef = useRef(false);
  const resizeRef = useRef<
    | {
        side: "left" | "right";
        startX: number;
        startWidth: number;
      }
    | undefined
  >(undefined);

  const settings = catalog.settings;
  const standaloneSettings = view === "settings" || view === "skills";
  const notify = useCallback((message: string, kind: "error" | "success" = "error") => {
    setToast({ message, kind });
    window.setTimeout(() => setToast(undefined), 3600);
  }, []);

  const openTerminal = useCallback(async () => {
    if (!workspace.ready || !workspace.path) {
      setTerminalOpen(false);
      notify("Open a workspace before opening the terminal");
      return false;
    }
    try {
      await desktop.openTerminal();
      setTerminalOpen(true);
      return true;
    } catch (error) {
      setTerminalOpen(false);
      notify(error instanceof Error ? error.message : "Could not open terminal");
      return false;
    }
  }, [notify, workspace.path, workspace.ready]);

  const closeTerminal = useCallback(() => {
    setTerminalOpen(false);
    setTerminalRunning(false);
    void desktop.closeTerminal();
  }, []);

  const toggleTerminal = useCallback(() => {
    if (terminalOpen) {
      closeTerminal();
      return;
    }
    void openTerminal();
  }, [closeTerminal, openTerminal, terminalOpen]);

  const refreshRemoteSession = useCallback(async () => {
    try {
      const next = await desktop.getRemoteSession();
      setRemoteSession(next);
      setRemoteError("");
      return next;
    } catch (error) {
      setRemoteError(
        error instanceof Error ? error.message : "Could not load remote companion status",
      );
      return emptyRemoteSession;
    }
  }, []);

  const openRemoteCompanion = useCallback(async () => {
    setRemoteOpen(true);
    setRemoteBusy(true);
    setRemoteError("");
    if (!workspace.ready) {
      setRemoteBusy(false);
      setRemoteSession(emptyRemoteSession);
      setRemoteError("Open a workspace before starting the remote companion");
      return;
    }
    try {
      const existing = await desktop.getRemoteSession();
      const next = existing.active ? existing : await desktop.startRemoteSession();
      setRemoteSession(next);
    } catch (error) {
      setRemoteSession(emptyRemoteSession);
      setRemoteError(
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : error && typeof error === "object" && "message" in error
              ? String(error.message)
              : "Could not start remote companion",
      );
    } finally {
      setRemoteBusy(false);
    }
  }, [workspace.ready]);

  const disconnectRemoteCompanion = useCallback(async () => {
    setRemoteBusy(true);
    try {
      await desktop.stopRemoteSession();
      setRemoteSession(emptyRemoteSession);
      setRemoteError("");
    } catch (error) {
      setRemoteError(
        error instanceof Error ? error.message : "Could not disconnect remote companion",
      );
    } finally {
      setRemoteBusy(false);
    }
  }, []);

  const checkForUpdate = useCallback(async () => {
    const info = await desktop.checkForUpdate();
    setUpdateInfo(info);
    if (info.updateAvailable) setUpdateOpen(true);
    else notify("You are already on the latest version", "success");
    return info;
  }, [notify]);

  async function downloadDesktopUpdate() {
    if (!updateInfo) return;
    setUpdatePhase("downloading");
    setUpdateProgress(0);
    setUpdateError("");
    try {
      const path = await desktop.downloadUpdate(updateInfo.assets ?? []);
      setUpdateDownloadPath(path);
      setUpdatePhase("ready");
    } catch (error) {
      setUpdatePhase("idle");
      setUpdateError(error instanceof Error ? error.message : "Could not download the update");
    }
  }

  async function applyDesktopUpdate() {
    if (!updateDownloadPath) return;
    try {
      await desktop.applyUpdateAndRestart(updateDownloadPath);
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : "Could not apply the update");
    }
  }

  function openExternalURL(url: string) {
    void desktop
      .openExternalURL(url)
      .catch((error) => notify(error instanceof Error ? error.message : "Could not open browser"));
  }

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () =>
      document.documentElement.classList.toggle(
        "dark",
        theme === "dark" || (theme === "system" && media.matches),
      );
    applyTheme();
    localStorage.setItem("mncode-theme", theme);
    if (theme === "system") {
      media.addEventListener("change", applyTheme);
      return () => media.removeEventListener("change", applyTheme);
    }
  }, [theme]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const resize = resizeRef.current;
      if (!resize) return;
      if (resize.side === "left") {
        const next = Math.min(
          420,
          Math.max(220, resize.startWidth + event.clientX - resize.startX),
        );
        setSidebarWidth(next);
        localStorage.setItem(leftSidebarWidthKey, String(Math.round(next)));
      } else {
        const next = Math.min(
          440,
          Math.max(240, resize.startWidth - event.clientX + resize.startX),
        );
        setRightSidebarWidth(next);
        localStorage.setItem(rightSidebarWidthKey, String(Math.round(next)));
      }
    };
    const handlePointerUp = () => {
      resizeRef.current = undefined;
      setResizingSide(undefined);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const exitTimer = window.setTimeout(() => setBootPhase("exiting"), reducedMotion ? 120 : 900);
    const finishTimer = window.setTimeout(() => setBootPhase("done"), reducedMotion ? 260 : 1260);
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(finishTimer);
    };
  }, []);

  useEffect(() => {
    if (!remoteSession.active) return;
    const timer = window.setInterval(() => {
      void refreshRemoteSession();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [refreshRemoteSession, remoteSession.active]);

  useEffect(() => {
    if (!accountHydrated || account.connected || onboardingDismissed) return;
    setOnboardingPhase("welcome");
    setOnboardingStep(0);
    setOnboardingOpen(true);
  }, [account.connected, accountHydrated, onboardingDismissed]);

  useEffect(
    () => () => {
      if (onboardingCloseTimer.current) window.clearTimeout(onboardingCloseTimer.current);
    },
    [],
  );

  useEffect(() => {
    void desktop
      .getAppInfo()
      .then(setAppInfo)
      .catch(() => undefined);
    const timer = window.setTimeout(() => {
      void desktop
        .checkForUpdate()
        .then((info) => {
          if (info.updateAvailable) {
            setUpdateInfo(info);
            setUpdateOpen(true);
          }
        })
        .catch(() => undefined);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--mn-ui-font-size",
      `${settings.uiFontSize || 15}px`,
    );
    document.documentElement.style.setProperty(
      "--mn-code-font-size",
      `${settings.codeFontSize || 12}px`,
    );
  }, [settings.uiFontSize, settings.codeFontSize]);

  useEffect(() => {
    // GetWorkspace is initially empty while the Wails app mounts its session.
    // Do not import records into that transient empty workspace.
    const standaloneBootstrapReady = workspaceBootstrapReady && bootPhase === "done";
    if (!workspace.ready && !standaloneBootstrapReady) return;
    if (migrationStartedRef.current) return;

    const target: LegacyMigrationTarget =
      workspace.ready && workspace.path
        ? { kind: "workspace", workspaceDir: workspace.path }
        : { kind: "standalone" };
    const input: DesktopMigrationInput = { ...legacyMigrationSource };
    if (target.kind === "workspace") input.workspaceDir = target.workspaceDir;
    if (!input.chatJson && !input.notesJson && !input.automationJson) {
      migrationStartedRef.current = true;
      return;
    }

    migrationStartedRef.current = true;
    const migration = runLegacyLocalStorageMigration(input);
    if (!migration) return;
    void migration
      .then((report) => {
        if (report?.status === "failed") notify("Could not migrate legacy Desktop data");
      })
      .catch(() => notify("Could not migrate legacy Desktop data"));
  }, [bootPhase, legacyMigrationSource, notify, workspace, workspaceBootstrapReady]);
  useEffect(() => {
    if (messages.length === 0) return;
    if (chatSaveTimer.current) window.clearTimeout(chatSaveTimer.current);
    chatSaveTimer.current = window.setTimeout(() => {
      setChatSessions((current) =>
        upsertChatHistory(current, activeChatId, {
          messages,
          activities,
          runSummary,
          runUsage,
        }),
      );
    }, 450);
    return () => {
      if (chatSaveTimer.current) window.clearTimeout(chatSaveTimer.current);
    };
  }, [activeChatId, activities, messages, runSummary, runUsage]);

  // Persist a finished run's summary immediately — the debounced saver can be
  // beaten by quitting the app right after a run completes, which would store
  // a mid-run snapshot without the summary.
  useEffect(() => {
    if (!runSummary || messages.length === 0) return;
    setChatSessions((current) =>
      upsertChatHistory(current, activeChatId, {
        messages,
        activities,
        runSummary,
        runUsage,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runSummary]);

  useEffect(() => {
    try {
      localStorage.setItem(chatHistoryKey, JSON.stringify(chatSessions));
    } catch {
      // Storage quota exceeded
    }
  }, [chatSessions]);
  const refreshFiles = useCallback(async () => {
    try {
      setFiles(await desktop.listWorkspaceTree());
    } catch {
      setFiles([]);
    }
  }, []);

  const hydrateAccount = useCallback(async () => {
    try {
      setAccount(await desktop.getAccount());
    } catch {
      setAccount(emptyAccount);
    } finally {
      setAccountHydrated(true);
    }
  }, []);

  const hydrateMCP = useCallback(async () => {
    try {
      setMCPServers(await desktop.getMCPServers());
    } catch {
      setMCPServers([]);
    }
  }, []);

  const loadPersonalization = useCallback(async () => {
    try {
      const next = await desktop.getPersonalization();
      setPersonalization(next);
      return next;
    } catch {
      setPersonalization(emptyPersonalization);
      return emptyPersonalization;
    }
  }, []);

  const hydrateCatalog = useCallback(async () => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        const next = await desktop.getCatalog();
        if (
          next.prompt.commands.length > 0 ||
          next.prompt.context.length > 0 ||
          next.prompt.skills.length > 0
        ) {
          setCatalog((current) => ({ ...current, prompt: next.prompt }));
        }
        if (next.models.length > 0 || next.settings.model) {
          setCatalog(next);
          if (
            next.settings.theme === "system" ||
            next.settings.theme === "light" ||
            next.settings.theme === "dark"
          )
            setTheme(next.settings.theme);
          return;
        }
      } catch {
        return;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 250));
    }
  }, []);

  const applyWorkspace = useCallback(
    (info: WorkspaceInfo) => {
      clearActiveRunID();
      setRunning(false);
      setPermission(undefined);
      setQuestion(undefined);
      setWorkspaceBootstrapReady(true);
      setWorkspace(info);
      if (info.ready) {
        void refreshFiles();
        void hydrateCatalog();
        void hydrateAccount();
      }
    },
    [hydrateAccount, hydrateCatalog, refreshFiles],
  );

  useEffect(() => {
    let cancelled = false;
    function finalizeRun() {
      const startedAt = runStartedAtRef.current;
      const durationMs = startedAt ? Date.now() - startedAt : 0;
      const usage = runUsageRef.current;
      runStartedAtRef.current = undefined;
      setRunStartedAt(undefined);
      // A zeroed summary (missing start event, no usage) must never overwrite
      // a meaningful one already attached to the chat.
      setRunSummary((previous) => {
        if (durationMs === 0 && usage.totalTokens === 0 && previous) {
          return previous;
        }
        return { durationMs, usage };
      });
    }

    const cleanups = [
      listen<WorkspaceInfo>("workspace:opened", applyWorkspace),
      listen<{ prompt: string; runID: number }>("agent:start", ({ prompt: text, runID }) => {
        setActiveRunID(runID);
        setRunning(true);
        setPrompt("");
        const now = Date.now();
        const usage = {
          inputTokens: estimateTokens(text),
          outputTokens: 0,
          thinkingTokens: 0,
          totalTokens: estimateTokens(text),
        };
        runStartedAtRef.current = now;
        runUsageRef.current = usage;
        providerUsageRef.current = { ...emptyRunUsage };
        hasProviderUsageRef.current = false;
        setRunStartedAt(now);
        setRunUsage(usage);
        setRunSummary(undefined);
        setActivities([
          {
            id: `run-${now}`,
            label: "Started agent turn",
            detail: text,
            tone: "pink",
            kind: "system",
            status: "running",
            active: true,
            createdAt: now,
          },
        ]);
        setMessages((items) => [
          ...items,
          {
            id: `user-${Date.now()}`,
            role: "user",
            content: text,
            timestamp: "now",
          },
          {
            id: "streaming",
            role: "assistant",
            content: "",
            timestamp: "streaming",
          },
        ]);
      }),
      listen<{
        inputTokens: number;
        outputTokens: number;
        thinkingTokens: number;
        runID: number;
      }>("agent:usage", ({ inputTokens, outputTokens, thinkingTokens, runID }) => {
        if (!isActiveRun(runID)) return;
        if (inputTokens <= 0 && outputTokens <= 0 && thinkingTokens <= 0) return;
        const previous = providerUsageRef.current;
        const next = {
          inputTokens: previous.inputTokens + Math.max(0, inputTokens),
          outputTokens: previous.outputTokens + Math.max(0, outputTokens),
          thinkingTokens: previous.thinkingTokens + Math.max(0, thinkingTokens),
          totalTokens:
            previous.totalTokens +
            Math.max(0, inputTokens) +
            Math.max(0, outputTokens) +
            Math.max(0, thinkingTokens),
        };
        providerUsageRef.current = next;
        hasProviderUsageRef.current = true;
        runUsageRef.current = next;
        setRunUsage(next);
      }),
      listen<{ text: string; runID: number }>("agent:token", ({ text, runID }) => {
        if (!isActiveRun(runID)) return;
        setMessages((items) =>
          items.map((item) =>
            item.id === "streaming" ? { ...item, content: item.content + text } : item,
          ),
        );
        if (!hasProviderUsageRef.current) {
          const added = estimateTokens(text);
          const usage = runUsageRef.current;
          const next = {
            ...usage,
            outputTokens: usage.outputTokens + added,
            totalTokens: usage.totalTokens + added,
          };
          runUsageRef.current = next;
          setRunUsage(next);
        }
      }),
      listen<{ text: string; runID: number }>("agent:thinking", ({ text, runID }) => {
        if (!isActiveRun(runID)) return;
        setActivities((items) => {
          const existing = items.findIndex((item) => item.id === "thinking");
          const nextItem: ActivityItem = {
            id: "thinking",
            label: "Reasoning",
            detail: compactText(text),
            tone: "pink",
            kind: "thinking",
            status: "running",
            active: true,
            createdAt: Date.now(),
          };
          if (existing < 0) return [nextItem, ...items].slice(0, 80);
          const next = [...items];
          next[existing] = { ...next[existing], ...nextItem };
          return next;
        });
        if (!hasProviderUsageRef.current) {
          const added = estimateTokens(text);
          const usage = runUsageRef.current;
          const next = {
            ...usage,
            thinkingTokens: usage.thinkingTokens + added,
            totalTokens: usage.totalTokens + added,
          };
          runUsageRef.current = next;
          setRunUsage(next);
        }
      }),
      listen<{ id?: string; name: string; args?: Record<string, unknown>; runID: number }>(
        "agent:tool-start",
        ({ id, name, args, runID }) => {
          if (!isActiveRun(runID)) return;
          setActivities((items) => {
            const action = describeToolAction(name, args);
            const nextItem: ActivityItem = {
              id: id || `tool-${Date.now()}`,
              toolName: name,
              label: action.runningLabel,
              detail: action.detail,
              tone: action.tone,
              kind: action.kind,
              status: "running",
              active: true,
              createdAt: Date.now(),
              filePath:
                action.kind === "file" ? toolArgument(args, "TargetFile", "path") : undefined,
            };
            return [nextItem, ...items].slice(0, 80);
          });
        },
      ),
      listen<{
        name: string;
        result: string;
        isError: boolean;
        summary?: {
          kind?: string;
          filePath?: string;
          linesAdded?: number;
          linesRemoved?: number;
          beforeSnippet?: string;
          afterSnippet?: string;
        };
        runID: number;
      }>("agent:tool-result", ({ name, result, isError, summary, runID }) => {
        if (!isActiveRun(runID)) return;
        setActivities((items) => {
          const index = items.findIndex((item) => item.toolName === name && item.active);
          const action = describeToolAction(name);
          if (index < 0) {
            const resultItem: ActivityItem = {
              id: `result-${Date.now()}`,
              toolName: name,
              label: isError ? `Failed ${prettyToolName(name)}` : action.completeLabel,
              detail: compactText(result),
              tone: isError ? "pink" : "green",
              kind: action.kind,
              status: isError ? "error" : "complete",
              active: false,
              createdAt: Date.now(),
              filePath: summary?.filePath,
              linesAdded: summary?.linesAdded,
              linesRemoved: summary?.linesRemoved,
              beforeSnippet: summary?.beforeSnippet,
              afterSnippet: summary?.afterSnippet,
            };
            return [resultItem, ...items].slice(0, 80);
          }
          const next = [...items];
          const current = next[index];
          next[index] = {
            ...current,
            label: completedToolLabel(current, name, isError),
            detail: compactText(result) || current.detail,
            tone: isError ? "pink" : "green",
            status: isError ? "error" : "complete",
            active: false,
            filePath: summary?.filePath ?? current.filePath,
            linesAdded: summary?.linesAdded ?? current.linesAdded,
            linesRemoved: summary?.linesRemoved ?? current.linesRemoved,
            beforeSnippet: summary?.beforeSnippet ?? current.beforeSnippet,
            afterSnippet: summary?.afterSnippet ?? current.afterSnippet,
          };
          return next;
        });
      }),
      listen<{ name: string; role: string; prompt: string; runID: number }>(
        "agent:subagent-start",
        ({ name, role, prompt: subagentPrompt, runID }) => {
          if (!isActiveRun(runID)) return;
          setInspectorOpen(true);
          setRightPanel("activity");
          const subagentItem: ActivityItem = {
            id: `subagent-${name}-${Date.now()}`,
            label: `Spawned ${name}`,
            detail: role || "Delegated task",
            tone: "cyan",
            kind: "subagent",
            subagentName: name,
            subagentRole: role,
            subagentPrompt,
            status: "running",
            active: true,
            createdAt: Date.now(),
          };
          setActivities((items) => [subagentItem, ...items].slice(0, 80));
        },
      ),
      listen<{ name: string; summary: string; result?: string; runID: number }>(
        "agent:subagent-complete",
        ({ name, summary, result, runID }) => {
          if (!isActiveRun(runID)) return;
          setActivities((items) => {
            const index = items.findIndex((item) => item.subagentName === name && item.active);
            if (index < 0) return items;
            const next = [...items];
            next[index] = {
              ...next[index],
              label: `Completed ${name}`,
              detail: compactText(summary),
              tone: "green",
              status: "complete",
              active: false,
              subagentResult: result,
            };
            return next;
          });
        },
      ),
      listen<{ goal: string; elapsed: number; turns: number; tools: number; runID: number }>(
        "agent:goal-done",
        ({ goal, elapsed, turns, tools, runID }) => {
          if (!isActiveRun(runID)) return;
          const goalItem: ActivityItem = {
            id: `goal-${Date.now()}`,
            label: "Completed goal",
            detail: `${compactText(goal)} · ${turns} turns · ${tools} tools · ${elapsed.toFixed(1)}s`,
            tone: "green",
            kind: "system",
            status: "complete",
            active: false,
            createdAt: Date.now(),
          };
          setActivities((items) => [goalItem, ...items].slice(0, 80));
        },
      ),
      listen<PermissionRequest>("agent:permission", (request) => {
        if (!isActiveRun(request.runID)) return;
        setPermission(request);
        sounds.playPromptAlert();
        sounds.notify("Approval required", "mncode is waiting for your tool permission.");
      }),
      listen<QuestionRequest>("agent:question", (request) => {
        if (!isActiveRun(request.runID)) return;
        setQuestion(request);
        sounds.playPromptAlert();
        sounds.notify("Question from agent", request.question || "mncode needs your input.");
      }),
      listen<{ cwd: string }>("terminal:ready", ({ cwd }) => {
        setTerminalCwd(cwd);
        setTerminalRunning(false);
      }),
      listen<{ command: string }>("terminal:command", ({ command }) => {
        setTerminalOutput((output) => `${output}${output ? "\n" : ""}$ ${command}\n`);
        setTerminalRunning(true);
      }),
      listen<{ text: string }>("terminal:output", ({ text }) =>
        setTerminalOutput((output) => output + text),
      ),
      listen<{ code: number }>("terminal:exit", ({ code }) => {
        setTerminalRunning(false);
        setTerminalOutput((output) => `${output}\n[process exited with code ${code}]\n`);
      }),
      listen<{ error: string }>("terminal:closed", ({ error }) => {
        setTerminalOpen(false);
        setTerminalRunning(false);
        setTerminalCwd("");
        if (error) notify(`Terminal closed: ${error}`);
      }),
      listen("remote:closed", () => {
        setRemoteSession(emptyRemoteSession);
      }),
      listen("agent:done", ({ runID }: { runID: number }) => {
        if (!isActiveRun(runID)) return;
        clearActiveRunID();
        setRunning(false);
        finalizeRun();
        setMessages((items) =>
          items.map((item) =>
            item.id === "streaming"
              ? { ...item, id: `assistant-${Date.now()}`, timestamp: "now" }
              : item,
          ),
        );
        setPermission(undefined);
        setQuestion(undefined);
        sounds.playTaskComplete();
        sounds.notify("Task completed", "Agent finished executing your request.");
        setActivities((items) =>
          items.map((item) =>
            item.active
              ? { ...item, active: false, status: item.status === "error" ? "error" : "complete" }
              : item,
          ),
        );
        void hydrateCatalog();
      }),
      listen("agent:cancelled", ({ runID }: { runID: number }) => {
        if (!isActiveRun(runID)) return;
        clearActiveRunID();
        setRunning(false);
        finalizeRun();
        setMessages((items) =>
          items.map((item) =>
            item.id === "streaming"
              ? { ...item, id: `assistant-${Date.now()}`, timestamp: "cancelled" }
              : item,
          ),
        );
        setPermission(undefined);
        setQuestion(undefined);
        setActivities((items) =>
          items.map((item) =>
            item.active ? { ...item, active: false, status: "cancelled" } : item,
          ),
        );
        void hydrateCatalog();
      }),
      listen<{ message: string; runID: number }>("agent:error", ({ message, runID }) => {
        if (!isActiveRun(runID)) return;
        clearActiveRunID();
        setRunning(false);
        finalizeRun();
        setPermission(undefined);
        setQuestion(undefined);
        notify(message);
        const errorItem: ActivityItem = {
          id: `error-${Date.now()}`,
          label: "Agent error",
          detail: message,
          tone: "pink",
          kind: "system",
          status: "error",
          active: false,
          createdAt: Date.now(),
        };
        setActivities((items) =>
          [
            errorItem,
            ...items.map((item) =>
              item.active ? { ...item, active: false, status: "error" as const } : item,
            ),
          ].slice(0, 80),
        );
        setMessages((items) => [
          ...items.filter((item) => item.id !== "streaming"),
          {
            id: `error-${Date.now()}`,
            role: "system",
            content: message,
            timestamp: "error",
          },
        ]);
        void hydrateCatalog();
      }),
      listen<{ percent: number }>("update:progress", ({ percent }) => setUpdateProgress(percent)),
      listen<{ provider: string }>("provider:configured", ({ provider }) =>
        notify(`${provider} connected for this session`, "success"),
      ),
    ];
    async function hydrateWorkspace() {
      let observedWorkspaceState = false;
      for (let attempt = 0; attempt < 8 && !cancelled; attempt += 1) {
        try {
          const info = await desktop.getWorkspace();
          observedWorkspaceState = true;
          if (info.ready) {
            if (!cancelled) applyWorkspace(info);
            return;
          }
        } catch {
          // Keep polling while Wails finishes binding the bootstrap methods.
        }
        if (attempt < 7) {
          await new Promise((resolve) => window.setTimeout(resolve, 250));
        }
      }
      // An observed empty workspace is a settled standalone bootstrap, not a
      // transient state that should receive workspace-bound legacy records.
      if (!cancelled && observedWorkspaceState) setWorkspaceBootstrapReady(true);
    }
    void hydrateWorkspace();
    void hydrateAccount();
    void hydrateMCP();
    void loadPersonalization();
    void hydrateCatalog();
    return () => {
      cancelled = true;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [applyWorkspace, hydrateAccount, hydrateCatalog, hydrateMCP, loadPersonalization, notify]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        newTask();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === ",") {
        event.preventDefault();
        navigateView("settings");
        return;
      }
      if (
        (event.metaKey || event.ctrlKey) &&
        (event.key === "=" || event.key === "+" || event.key === "-")
      ) {
        event.preventDefault();
        const current = settings.uiFontSize || 15;
        const next = event.key === "-" ? Math.max(11, current - 1) : Math.min(20, current + 1);
        if (next !== current) {
          void updateSettings({ uiFontSize: next });
          notify(`UI font size: ${next}px`, "success");
        }
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "0") {
        event.preventDefault();
        void updateSettings({ uiFontSize: 15 });
        notify("UI font size reset to 15px", "success");
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j") {
        event.preventDefault();
        void toggleTerminal();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && /^[1-9]$/.test(event.key)) {
        const visibleChats = [...chatSessions].sort(
          (left, right) => Number(right.pinned) - Number(left.pinned),
        );
        const selected = visibleChats[Number(event.key) - 1];
        if (!selected) return;
        event.preventDefault();
        persistCurrentChat();
        setActiveChatId(selected.id);
        setMessages(selected.messages);
        setActivities(selected.activities ?? []);
        setRunSummary(selected.runSummary);
        setRunUsage(selected.runUsage ?? emptyRunUsage);
        setRunStartedAt(undefined);
        setRunning(false);
        setPrompt("");
        navigateView("workspace");
      }
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (event.key === "?" && !isTyping) {
        event.preventDefault();
        setShortcutOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    activities,
    chatSessions,
    messages,
    runSummary,
    runUsage,
    settings,
    settingsExiting,
    toggleTerminal,
    view,
  ]);

  function navigateView(next: ViewName) {
    if (settingsExiting) return;
    if (settingsExitTimer.current) {
      window.clearTimeout(settingsExitTimer.current);
      settingsExitTimer.current = undefined;
    }
    const inSettingsFlow = view === "settings" || view === "skills";
    const nextInSettingsFlow = next === "settings" || next === "skills";
    if (inSettingsFlow && !nextInSettingsFlow) {
      setViewDirection("back");
      setSettingsExiting(true);
      settingsExitTimer.current = window.setTimeout(() => {
        setView(next);
        setSettingsExiting(false);
        settingsExitTimer.current = undefined;
      }, 260);
      return;
    }
    setSettingsExiting(false);
    setViewDirection(inSettingsFlow && !nextInSettingsFlow ? "back" : "forward");
    setView(next);
  }

  function closeOnboarding() {
    if (onboardingPhase === "complete") return;
    setOnboardingDismissed(true);
    setOnboardingOpen(false);
    setOnboardingPhase("welcome");
    setOnboardingStep(0);
  }

  function nextOnboardingStep() {
    if (onboardingStep < 4) {
      setOnboardingStep((current) => current + 1);
      return;
    }
    setOnboardingPhase("complete");
    if (onboardingCloseTimer.current) window.clearTimeout(onboardingCloseTimer.current);
    onboardingCloseTimer.current = window.setTimeout(() => {
      setOnboardingOpen(false);
      setOnboardingDismissed(true);
      setOnboardingPhase("welcome");
      setOnboardingStep(0);
      onboardingCloseTimer.current = undefined;
      navigateView("workspace");
    }, 1050);
  }

  function previousOnboardingStep() {
    setOnboardingStep((current) => Math.max(0, current - 1));
  }
  async function openWorkspace() {
    if (running) void desktop.cancelTurn();
    clearActiveRunID();
    setRunning(false);
    setPermission(undefined);
    setQuestion(undefined);
    try {
      applyWorkspace(await desktop.chooseWorkspace());
      setRightPanel("workspace");
      setInspectorOpen(true);
      notify("Workspace opened", "success");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : error && typeof error === "object" && "message" in error
              ? String(error.message)
              : "Could not open workspace";
      if (message.toLowerCase().includes("cancel")) return;
      notify(message);
    }
  }
  async function openStandaloneChat() {
    if (running) void desktop.cancelTurn();
    clearActiveRunID();
    setRunning(false);
    setPermission(undefined);
    setQuestion(undefined);
    try {
      applyWorkspace(await desktop.openStandaloneChat());
      setFiles([]);
      notify("Chat without workspace enabled", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not start standalone chat");
    }
  }
  async function sendPrompt() {
    if (!prompt.trim()) return;
    try {
      await desktop.sendPrompt(prompt);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not start agent turn");
    }
  }
  async function steerPrompt() {
    if (!prompt.trim()) return;
    try {
      await desktop.steerPrompt(prompt);
      setPrompt("");
      notify("Steering directive queued", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not steer agent");
    }
  }
  async function updateSettings(input: Partial<DesktopSettings>) {
    try {
      const next = await desktop.updateSettings(input);
      setCatalog((current) => ({ ...current, settings: next }));
      if (input.theme === "system" || input.theme === "light" || input.theme === "dark")
        setTheme(input.theme);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not update settings");
    }
  }
  async function loginAccount(): Promise<boolean> {
    setAccountBusy(true);
    try {
      const next = await desktop.loginAccount();
      setAccount(next);
      setOnboardingDismissed(false);
      if (DEBUG_ONBOARDING_ALWAYS) {
        setOnboardingPhase("setup");
        setOnboardingStep(0);
        setOnboardingOpen(true);
      }
      notify(`Signed in as ${next.name || next.email || "mncode account"}`, "success");
      return true;
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not sign in to mncode-web");
      return false;
    } finally {
      setAccountBusy(false);
    }
  }
  async function logoutAccount() {
    setAccountBusy(true);
    try {
      setAccount(await desktop.logoutAccount());
      setOnboardingDismissed(false);
      notify("Signed out of mncode-web", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not sign out");
    } finally {
      setAccountBusy(false);
    }
  }
  const loadUsage = useCallback(() => desktop.getUsageStats(), []);
  const loadProviderSettings = useCallback(() => desktop.getProviderSettings(), []);
  const loadActiveAntigravityQuota = useCallback(() => desktop.getActiveAntigravityQuota(), []);
  const loadBrowserSettings = useCallback(async () => {
    const next = await desktop.getBrowserSettings();
    setBrowserSettings(next);
    return next;
  }, []);
  async function updateBrowserSettings(input: DesktopBrowserSettingsInput) {
    try {
      const next = await desktop.updateBrowserSettings(input);
      setBrowserSettings(next);
      const changed =
        input.controlEnabled !== undefined
          ? `Built-in browser control ${input.controlEnabled ? "enabled" : "disabled"}`
          : "Browser security setting saved";
      notify(changed, "success");
      return next;
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not update browser settings");
      throw error;
    }
  }
  async function importChromeBrowserData() {
    try {
      const next = await desktop.importChromeBrowserData();
      setBrowserSettings(next);
      notify("Imported cookies, bookmarks, and history from Chrome", "success");
      return next;
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not import Chrome browser data");
      throw error;
    }
  }
  async function clearBrowserCacheData() {
    try {
      const next = await desktop.clearBrowserCacheData();
      setBrowserSettings(next);
      notify("Cleared built-in browser cache", "success");
      return next;
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not clear browser cache");
      throw error;
    }
  }
  async function clearAllBrowserData() {
    try {
      const next = await desktop.clearAllBrowserData();
      setBrowserSettings(next);
      notify("Cleared all built-in browser data", "success");
      return next;
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not clear browser data");
      throw error;
    }
  }
  async function closeBrowserSession() {
    try {
      const next = await desktop.closeBrowserSession();
      setBrowserSettings(next);
      notify("Closed the controlled browser session", "success");
      return next;
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not close the browser session");
      throw error;
    }
  }
  async function configureMCPServer(input: DesktopMCPServerInput) {
    try {
      setMCPServers(await desktop.configureMCPServer(input));
      notify(`${input.id === "notion" ? "Notion" : "GitHub"} MCP connection saved`, "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not configure MCP server");
      throw error;
    }
  }
  async function savePersonalization(input: DesktopPersonalizationInput) {
    try {
      const next = await desktop.savePersonalization(input);
      setPersonalization(next);
      notify("Personalization saved", "success");
      return next;
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not save personalization");
      throw error;
    }
  }
  async function deleteLocalMemories() {
    try {
      const next = await desktop.deleteLocalMemories();
      setPersonalization(next);
      notify("Local memories deleted", "success");
      return next;
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not delete local memories");
      throw error;
    }
  }
  function persistCurrentChat() {
    if (messages.length === 0) return;
    setChatSessions((current) =>
      upsertChatHistory(current, activeChatId, {
        messages,
        activities,
        runSummary,
        runUsage,
      }),
    );
  }
  function openChat(chatID: string) {
    const selected = chatSessions.find((chat) => chat.id === chatID);
    if (!selected) return;
    if (running) void desktop.cancelTurn();
    clearActiveRunID();
    setRunning(false);
    setPermission(undefined);
    setQuestion(undefined);
    persistCurrentChat();
    setActiveChatId(selected.id);
    setMessages(selected.messages);
    setActivities(selected.activities ?? []);
    setRunSummary(selected.runSummary);
    setRunUsage(selected.runUsage ?? emptyRunUsage);
    setRunStartedAt(undefined);
    setRunning(false);
    setPrompt("");
    setChatSessions((current) =>
      current.map((chat) => (chat.id === chatID ? { ...chat, unread: false } : chat)),
    );
    navigateView("workspace");
  }

  function openSplitChat(chatID: string) {
    if (chatID === activeChatId) return;
    setSplitChatID(chatID);
    navigateView("workspace");
  }

  function switchToSplitChat(chatID: string) {
    openChat(chatID);
    setSplitChatID(null);
  }

  function openRenameChat(chatID: string) {
    const chat = chatSessions.find((item) => item.id === chatID);
    if (!chat) return;
    setRenameChatID(chatID);
    setRenameDraft(chat.title);
  }

  function closeRenameChat() {
    setRenameChatID(undefined);
    setRenameDraft("");
  }

  function confirmRenameChat() {
    const title = renameDraft.trim();
    if (!renameChatID || !title) return;
    setChatSessions((current) =>
      current.map((chat) =>
        chat.id === renameChatID ? { ...chat, title, updatedAt: Date.now() } : chat,
      ),
    );
    closeRenameChat();
    notify("Chat renamed", "success");
  }

  function toggleChatPin(chatID: string) {
    setChatSessions((current) =>
      current.map((chat) =>
        chat.id === chatID ? { ...chat, pinned: !chat.pinned, updatedAt: Date.now() } : chat,
      ),
    );
    notify("Chat pin updated", "success");
  }

  function requestDeleteChat(chatID: string) {
    setDeleteChatID(chatID);
  }

  function closeDeleteChat() {
    setDeleteChatID(undefined);
  }

  function confirmDeleteChat() {
    if (!deleteChatID) return;
    const chatID = deleteChatID;
    const isActive = chatID === activeChatId;
    if (isActive && running) void desktop.cancelTurn();
    setChatSessions((current) => current.filter((chat) => chat.id !== chatID));
    if (splitChatID === chatID) setSplitChatID(null);
    if (isActive) {
      setMessages([]);
      setActivities([]);
      setRunSummary(undefined);
      setRunUsage(emptyRunUsage);
      setRunStartedAt(undefined);
      setPermission(undefined);
      setQuestion(undefined);
      setPrompt("");
      setActiveChatId(`chat-${Date.now()}`);
      navigateView("workspace");
    }
    closeDeleteChat();
    notify("Chat deleted", "success");
  }

  function markChatUnread(chatID: string) {
    setChatSessions((current) =>
      current.map((chat) => (chat.id === chatID ? { ...chat, unread: true } : chat)),
    );
  }

  function copyChatID(chatID: string) {
    if (!navigator.clipboard) {
      notify("Could not copy session ID");
      return;
    }
    void navigator.clipboard
      .writeText(chatID)
      .then(() => notify("Session ID copied", "success"))
      .catch(() => notify("Could not copy session ID"));
  }

  function copyResponse(content: string) {
    if (!navigator.clipboard) {
      notify("Could not copy response");
      return;
    }
    void navigator.clipboard
      .writeText(content)
      .then(() => notify("Response copied", "success"))
      .catch(() => notify("Could not copy response"));
  }

  function branchResponse(messageID: string) {
    const messageIndex = messages.findIndex((message) => message.id === messageID);
    if (messageIndex < 0) return;
    if (running) void desktop.cancelTurn();
    clearActiveRunID();
    setRunning(false);
    setPermission(undefined);
    setQuestion(undefined);
    persistCurrentChat();
    const branchMessages = messages.slice(0, messageIndex + 1);
    const branchID = `chat-${Date.now()}`;
    setActiveChatId(branchID);
    setMessages(branchMessages);
    setActivities([]);
    setRunSummary(undefined);
    setRunUsage(emptyRunUsage);
    setRunStartedAt(undefined);
    setPrompt("");
    setChatSessions((current) =>
      upsertChatHistory(current, branchID, {
        messages: branchMessages,
        activities: [],
        runUsage: emptyRunUsage,
      }),
    );
    navigateView("workspace");
    notify("Branched into a new chat", "success");
  }

  function setResponseFeedback(messageID: string, feedback: "like" | "dislike") {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageID
          ? { ...message, feedback: message.feedback === feedback ? undefined : feedback }
          : message,
      ),
    );
  }
  const runTerminalCommand = useCallback(
    async (command: string) => {
      try {
        await desktop.runTerminalCommand(command);
      } catch (error) {
        setTerminalOpen(false);
        setTerminalRunning(false);
        notify(error instanceof Error ? error.message : "Could not run terminal command");
      }
    },
    [notify],
  );
  async function loginProvider(provider: string, accountID: string, token: string) {
    try {
      await desktop.loginProvider(provider, accountID, token);
      await hydrateCatalog();
      notify(`${provider} provider connected`, "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not connect provider");
      throw error;
    }
  }
  async function useProviderAccount(accountID: string) {
    try {
      await desktop.useProviderAccount(accountID);
      await hydrateCatalog();
      notify("Provider account selected", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not select provider account");
      throw error;
    }
  }
  async function configureOpenCode(apiKey: string) {
    try {
      await desktop.configureOpenCode(apiKey);
      await hydrateCatalog();
      notify("OpenCode configured", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not configure OpenCode");
      throw error;
    }
  }
  async function saveCustomProvider(input: CustomProviderInput) {
    try {
      await desktop.saveCustomProvider(input);
      await hydrateCatalog();
      notify("Custom provider saved", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not save provider");
      throw error;
    }
  }
  async function deleteCustomProvider(providerID: string) {
    try {
      await desktop.deleteCustomProvider(providerID);
      await hydrateCatalog();
      notify("Custom provider deleted", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not delete provider");
      throw error;
    }
  }
  function newTask() {
    if (running) void desktop.cancelTurn();
    clearActiveRunID();
    setRunning(false);
    setPermission(undefined);
    setQuestion(undefined);
    persistCurrentChat();
    setMessages([]);
    setActivities([]);
    setPrompt("");
    setActiveChatId(`chat-${Date.now()}`);
    if (
      settings.defaultPermissionMode &&
      settings.defaultPermissionMode !== "latest" &&
      settings.defaultPermissionMode !== settings.permissionMode
    ) {
      void updateSettings({ permissionMode: settings.defaultPermissionMode });
    }
    navigateView("workspace");
  }
  function utilityAction(label: string) {
    const automation = label === "Automations" || label === "New automation";
    navigateView(automation ? "automations" : "mcp");
    setRightPanel("workspace");
  }
  function changeTheme(next: "system" | "light" | "dark") {
    setTheme(next);
    if (workspace.ready) void updateSettings({ theme: next });
  }
  function chooseAttachment() {
    void desktop
      .chooseAttachment()
      .then((path) => {
        if (path) setPrompt((current) => `${current}${current ? "\n" : ""}[Attachment: ${path}]`);
      })
      .catch((error) =>
        notify(error instanceof Error ? error.message : "Could not add attachment"),
      );
  }
  function promptPreset(value: string) {
    setPrompt(value);
  }
  function saveSideNote() {
    const note = sidePrompt.trim();
    if (!note) return;
    setSideNotes((items) => [...items, note]);
    setSidePrompt("");
  }
  function promoteSideNote(note: string) {
    setPrompt(note);
    navigateView("workspace");
    setRightPanel("workspace");
    notify("Added to the main task", "success");
  }

  function beginResize(side: "left" | "right", startX: number) {
    if (side === "left" && sidebarCollapsed) return;
    resizeRef.current = {
      side,
      startX,
      startWidth: side === "left" ? sidebarWidth : rightSidebarWidth,
    };
    setResizingSide(side);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="mn-shell flex h-screen">
        {!standaloneSettings && (
          <AppSidebar
            account={account}
            accountBusy={accountBusy}
            onLoginAccount={loginAccount}
            onLogoutAccount={logoutAccount}
            collapsed={sidebarCollapsed}
            view={view}
            workspace={workspace}
            chatSessions={chatSessions}
            activeChatId={activeChatId}
            width={sidebarWidth}
            resizing={resizingSide === "left"}
            remoteConnected={remoteSession.active && remoteSession.connectedDevices > 1}
            onToggle={() => setSidebarCollapsed((value) => !value)}
            onViewChange={navigateView}
            onOpenWorkspace={openWorkspace}
            onNewTask={newTask}
            onOpenRemote={openRemoteCompanion}
            onUtilityAction={utilityAction}
            onChatSelect={openChat}
            onSplitChat={openSplitChat}
            onRenameChat={openRenameChat}
            onToggleChatPin={toggleChatPin}
            onDeleteChat={requestDeleteChat}
            onMarkChatUnread={markChatUnread}
            onCopyChatID={copyChatID}
            onResizeStart={(event) => beginResize("left", event.clientX)}
          />
        )}
        <main className="mn-main flex min-w-0 flex-1 flex-col">
          {!standaloneSettings && (
            <TopBar
              view={view}
              workspace={workspace}
              sidebarCollapsed={sidebarCollapsed}
              onCommandPalette={() => setCommandOpen(true)}
              onToggleInspector={() => setInspectorOpen((value) => !value)}
              onToggleTerminal={toggleTerminal}
              onHelp={() => setShortcutOpen(true)}
            />
          )}
          <div
            key={`${view}-${settingsExiting ? "exit" : viewDirection}`}
            className={
              "flex min-h-0 flex-1 flex-col " +
              (settingsExiting
                ? "mn-settings-exit"
                : standaloneSettings
                  ? viewDirection === "back"
                    ? "mn-settings-return"
                    : "mn-settings-enter"
                  : "")
            }
            aria-label={view}
          >
            {view === "workspace" && (
              <div className="flex min-h-0 flex-1">
                <WorkspaceView
                  workspace={workspace}
                  account={account}
                  messages={messages}
                  activities={activities}
                  runSummary={runSummary}
                  runUsage={runUsage}
                  runStartedAt={runStartedAt}
                  prompt={prompt}
                  running={running}
                  permission={permission}
                  question={question}
                  catalog={catalog}
                  settings={settings}
                  onPromptChange={setPrompt}
                  onPromptPreset={promptPreset}
                  onSend={sendPrompt}
                  onSteer={steerPrompt}
                  onPermission={(allowed) =>
                    permission &&
                    desktop
                      .resolvePermission(permission.id, allowed)
                      .then(() => setPermission(undefined))
                      .catch(() => undefined)
                  }
                  onQuestion={(answer) =>
                    question &&
                    desktop
                      .answerQuestion(question.id, answer)
                      .then(() => setQuestion(undefined))
                      .catch(() => undefined)
                  }
                  onCopyResponse={copyResponse}
                  onBranchResponse={branchResponse}
                  onFeedback={setResponseFeedback}
                  onOpenWorkspace={openWorkspace}
                  onOpenStandaloneChat={openStandaloneChat}
                  onAttach={chooseAttachment}
                  onSettingsChange={updateSettings}
                />
                {splitChatID && (
                  <ChatPeekPanel
                    chat={chatSessions.find((chat) => chat.id === splitChatID) ?? null}
                    onClose={() => setSplitChatID(null)}
                    onSwitchTo={switchToSplitChat}
                  />
                )}
              </div>
            )}
            {view === "insights" && (
              <InsightsView workspace={workspace} onOpenWorkspace={openWorkspace} />
            )}
            {(view === "settings" || view === "skills") && (
              <SettingsView
                catalog={catalog}
                settings={settings}
                initialSection={view === "skills" ? "skills" : undefined}
                account={account}
                accountBusy={accountBusy}
                appInfo={appInfo}
                browserSettings={browserSettings}
                mcpServers={mcpServers}
                personalization={personalization}
                onBack={() => navigateView("workspace")}
                onLoginAccount={loginAccount}
                onLogoutAccount={logoutAccount}
                onLoadUsage={loadUsage}
                onLoadProviderSettings={loadProviderSettings}
                onLoadProviderQuota={loadActiveAntigravityQuota}
                onLoadBrowserSettings={loadBrowserSettings}
                onUpdateBrowserSettings={updateBrowserSettings}
                onImportChromeBrowserData={importChromeBrowserData}
                onClearBrowserCacheData={clearBrowserCacheData}
                onClearAllBrowserData={clearAllBrowserData}
                onCloseBrowserSession={closeBrowserSession}
                onConfigureMCP={configureMCPServer}
                onLoadPersonalization={loadPersonalization}
                onSavePersonalization={savePersonalization}
                onDeleteLocalMemories={deleteLocalMemories}
                onLoginProvider={loginProvider}
                onUseProviderAccount={useProviderAccount}
                onConfigureOpenCode={configureOpenCode}
                onSaveCustomProvider={saveCustomProvider}
                onDeleteCustomProvider={deleteCustomProvider}
                onLoadSkillsMarketplace={() => desktop.getSkillsMarketplace()}
                onInstallSkill={(slug) => desktop.installMarketplaceSkill(slug)}
                onDeleteSkill={(id) => desktop.deleteInstalledSkill(id)}
                onOpenURL={openExternalURL}
                onCheckForUpdate={checkForUpdate}
                onOpenUpdate={(url) => desktop.openUpdatePage(url)}
                onThemeChange={changeTheme}
                onSettingsChange={updateSettings}
              />
            )}
            {view === "automations" && <AutomationsView workspace={workspace} />}
            {view === "mcp" && (
              <ManagementView
                kind="mcp"
                onOpenSettings={() => navigateView("settings")}
                mcpServers={mcpServers}
                onConfigureMCP={configureMCPServer}
                onOpenURL={openExternalURL}
              />
            )}
          </div>
          {!standaloneSettings && terminalOpen && (
            <TerminalPanel
              cwd={terminalCwd || workspace.path}
              output={terminalOutput}
              running={terminalRunning}
              onCommand={runTerminalCommand}
              onInterrupt={() => void desktop.interruptTerminal()}
              onClear={() => setTerminalOutput("")}
              onClose={closeTerminal}
            />
          )}
        </main>
        {!standaloneSettings && (
          <div
            className={
              "mn-right-sidebar-shell " +
              (inspectorOpen ? "is-open" : "is-closed") +
              (resizingSide === "right" ? " is-resizing" : "")
            }
            style={
              inspectorOpen ? { width: rightSidebarWidth, flexBasis: rightSidebarWidth } : undefined
            }
          >
            <RightSidebar
              key={theme}
              panel={rightPanel}
              workspace={workspace}
              files={files}
              activities={activities}
              sidePrompt={sidePrompt}
              sideNotes={sideNotes}
              onPanelChange={setRightPanel}
              onClose={() => setInspectorOpen(false)}
              onSidePromptChange={setSidePrompt}
              onSideSubmit={saveSideNote}
              onPromoteNote={promoteSideNote}
              onOpenWorkspace={openWorkspace}
              onFileSelect={(node) => setPreviewFilePath(node.path)}
              onResizeStart={(event) => beginResize("right", event.clientX)}
            />
          </div>
        )}
        <CommandPalette
          open={commandOpen}
          onOpenChange={setCommandOpen}
          onOpenWorkspace={openWorkspace}
          onNavigate={navigateView}
          chats={chatSessions.map((chat) => ({ id: chat.id, title: chat.title }))}
          onOpenChat={openChat}
        />
        <ShortcutDialog open={shortcutOpen} onOpenChange={setShortcutOpen} />
        <FilePreviewDialog
          path={previewFilePath}
          onClose={() => setPreviewFilePath(null)}
          onLoad={(path) => desktop.readWorkspaceFile(path)}
          onNotify={notify}
        />
        <RenameChatDialog
          open={Boolean(renameChatID)}
          value={renameDraft}
          onChange={setRenameDraft}
          onOpenChange={(open) => {
            if (!open) closeRenameChat();
          }}
          onSubmit={confirmRenameChat}
        />
        <DeleteChatDialog
          open={Boolean(deleteChatID)}
          chatTitle={chatSessions.find((chat) => chat.id === deleteChatID)?.title || "this chat"}
          onOpenChange={(open) => {
            if (!open) closeDeleteChat();
          }}
          onConfirm={confirmDeleteChat}
        />
        {toast && (
          <Toast message={toast.message} kind={toast.kind} onClose={() => setToast(undefined)} />
        )}
        <UpdateDialog
          update={updateInfo}
          open={updateOpen}
          onOpenChange={setUpdateOpen}
          phase={updatePhase}
          progress={updateProgress}
          error={updateError}
          onDownload={() => void downloadDesktopUpdate()}
          onApply={() => void applyDesktopUpdate()}
        />
        <RemoteCompanionDialog
          open={remoteOpen}
          session={remoteSession}
          loading={remoteBusy}
          error={remoteError}
          workspaceReady={workspace.ready}
          onOpenChange={setRemoteOpen}
          onOpenWorkspace={openWorkspace}
          onStart={() => void openRemoteCompanion()}
          onRefresh={() => void refreshRemoteSession()}
          onDisconnect={() => void disconnectRemoteCompanion()}
        />
        <OnboardingFlow
          open={onboardingOpen}
          phase={onboardingPhase}
          step={onboardingStep}
          loginBusy={accountBusy}
          account={account}
          settings={settings}
          personalization={personalization}
          onClose={closeOnboarding}
          onLogin={() => void loginAccount()}
          onSettingsChange={updateSettings}
          onPersonalizationChange={savePersonalization}
          onNext={nextOnboardingStep}
          onBack={previousOnboardingStep}
        />
      </div>
      {bootPhase !== "done" && <AppBootScreen phase={bootPhase} />}
    </TooltipProvider>
  );
}

function ShortcutDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const shortcuts = [
    ["⌘ N", "New chat"],
    ["⌘ K", "Open search / command palette"],
    ["⌘ ,", "Open settings"],
    ["⌘ J", "Toggle terminal"],
    ["⌘ 1–9", "Open the matching chat"],
    ["Enter", "Send prompt"],
    ["⌘ Enter", "Send or steer the active turn"],
    ["?", "Show keyboard shortcuts"],
    ["Esc", "Close the active menu or dialog"],
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[var(--mn-line)] bg-[var(--mn-surface)] text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="size-4 text-[var(--mn-accent-strong)]" />
            Keyboard shortcuts
          </DialogTitle>
          <DialogDescription>
            Keep your hands on the keyboard while you move through mncode.
          </DialogDescription>
        </DialogHeader>
        <div className="divide-y divide-[var(--mn-line)] rounded-xl border border-[var(--mn-line)] bg-[var(--mn-surface-muted)] px-3">
          {shortcuts.map(([keys, label]) => (
            <div key={keys} className="flex items-center gap-3 py-2.5 text-sm">
              <kbd className="min-w-16 rounded-md border border-[var(--mn-line)] bg-[var(--mn-surface)] px-2 py-1 text-center font-mono text-[0.75rem] text-foreground shadow-sm">
                {keys}
              </kbd>
              <span className="text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RenameChatDialog({
  open,
  value,
  onChange,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[var(--mn-line)] bg-[var(--mn-surface)] text-foreground">
        <DialogHeader>
          <DialogTitle>Rename chat</DialogTitle>
          <DialogDescription>
            Give this conversation a name that is easy to find later.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <Input
            autoFocus
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Chat name"
            className="border-[var(--mn-line)] bg-[var(--mn-surface-muted)]"
          />
          <DialogFooter className="mt-5">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="mn-accent-button">
              Save name
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteChatDialog({
  open,
  chatTitle,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  chatTitle: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[var(--mn-line)] bg-[var(--mn-surface)] text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="size-4 text-rose-600" />
            Delete chat?
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete “{chatTitle}”? This conversation will be
            removed from this desktop.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete chat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Markdown-lite parser for GitHub release bodies: `## Section` + bullets. */
function parseReleaseNotes(notes: string): Array<{ title: string; items: string[] }> {
  const sections: Array<{ title: string; items: string[] }> = [];
  let current: { title: string; items: string[] } | null = null;
  for (const raw of notes.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const plain = line.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\*\*/g, "");
    if (plain.startsWith("#")) {
      current = { title: plain.replace(/^#+\s*/, ""), items: [] };
      sections.push(current);
    } else if (plain.startsWith("- ") || plain.startsWith("* ")) {
      if (!current) {
        current = { title: "Changes", items: [] };
        sections.push(current);
      }
      current.items.push(plain.slice(2));
    } else if (current) {
      current.items.push(plain);
    }
  }
  return sections;
}

function UpdateDialog({
  update,
  open,
  onOpenChange,
  phase,
  progress,
  error,
  onDownload,
  onApply,
}: {
  update?: UpdateInfo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phase: UpdatePhase;
  progress: number;
  error: string;
  onDownload: () => void;
  onApply: () => void;
}) {
  if (!update) return null;
  const sections = parseReleaseNotes(update.notes ?? "");
  const releaseDate = update.releaseDate
    ? new Date(update.releaseDate + "T00:00:00").toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[var(--mn-line)] bg-[var(--mn-surface)] text-foreground sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="size-4 text-[var(--mn-accent-strong)]" />
            {update.latestVersion} Release Notes
          </DialogTitle>
          <DialogDescription>
            {releaseDate && `Released ${releaseDate}. `}
            {phase === "ready"
              ? "Download complete — restart to finish the update."
              : "A newer mncode desktop release is ready to install."}
          </DialogDescription>
        </DialogHeader>

        {sections.length > 0 && (
          <div className="max-h-64 overflow-y-auto rounded-xl border border-[var(--mn-line)] bg-[var(--mn-surface-muted)] p-4">
            {sections.map((section) => (
              <div key={section.title} className="mb-4 last:mb-0">
                <p className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {section.title}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {section.items.map((item, index) => (
                    <li key={index} className="flex gap-2 text-xs leading-5 text-muted-foreground">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-[var(--mn-accent)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {phase === "downloading" && (
          <div className="space-y-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--mn-surface-muted)]">
              <div
                className="h-full rounded-full bg-[var(--mn-accent)] transition-[width] duration-300"
                style={{ width: `${Math.min(100, progress).toFixed(1)}%` }}
              />
            </div>
            <p className="text-center font-mono text-[0.6875rem] text-muted-foreground">
              Downloading… {progress.toFixed(0)}%
            </p>
          </div>
        )}
        {error && (
          <p className="rounded-md border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-600 dark:text-rose-300">
            {error}
          </p>
        )}

        <DialogFooter>
          {phase === "ready" ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Later
              </Button>
              <Button className="mn-accent-button" onClick={onApply}>
                <Check className="mr-2 size-3.5" />
                Restart to update
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Later
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  onOpenChange(false);
                  window.open(update.releaseUrl, "_blank");
                }}
              >
                Release page
              </Button>
              <Button
                className="mn-accent-button"
                disabled={phase === "downloading"}
                onClick={onDownload}
              >
                {phase === "downloading" ? (
                  <Loader2 className="mr-2 size-3.5 animate-spin" />
                ) : (
                  <Download className="mr-2 size-3.5" />
                )}
                {phase === "downloading" ? "Downloading…" : "Download update"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Toast({
  message,
  kind,
  onClose,
}: {
  message: string;
  kind: "error" | "success";
  onClose: () => void;
}) {
  return (
    <div className="fixed left-1/2 top-5 z-[100] flex w-max max-w-[min(520px,calc(100vw-2rem))] -translate-x-1/2 items-center gap-3 rounded-2xl border border-[var(--mn-line)] bg-[var(--mn-surface)] px-4 py-3.5 text-sm shadow-2xl animate-in fade-in-0 slide-in-from-top-2">
      <span
        className={
          kind === "success"
            ? "text-emerald-600 dark:text-emerald-200"
            : "text-rose-600 dark:text-rose-200"
        }
      >
        {kind === "success" ? <Check className="size-4" /> : <AlertCircle className="size-4" />}
      </span>
      <span className="truncate font-medium">{message}</span>
      <Button
        variant="ghost"
        size="icon-xs"
        className="ml-2 shrink-0 text-muted-foreground"
        onClick={onClose}
        aria-label="Dismiss notification"
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}
