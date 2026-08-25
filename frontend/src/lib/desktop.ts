import { EventsOff, EventsOn } from "../../wailsjs/runtime/runtime";
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
  DesktopRemoteSession,
  DesktopSettings,
  DesktopSkill,
  DesktopSkillsMarketplace,
  FileNode,
  ProviderQuota,
  ProviderSettings,
  UpdateAsset,
  Automation,
  AutomationInput,
  UpdateInfo,
  UsageStats,
  WorkspaceInfo,
} from "@/types";

type WailsMethod = (...args: unknown[]) => unknown;

interface WailsWindow extends Window {
  go?: { main?: { App?: Record<string, WailsMethod> } };
  runtime?: Record<string, unknown>;
}

function appMethod(name: string): WailsMethod {
  const method = (window as WailsWindow).go?.main?.App?.[name];
  if (!method) {
    throw new Error("Wails runtime is not connected. Start the app with wails dev.");
  }
  return method;
}

async function call<T>(name: string, ...args: unknown[]): Promise<T> {
  return (await appMethod(name)(...args)) as T;
}

export const desktop = {
  chooseWorkspace: () => call<WorkspaceInfo>("ChooseWorkspace"),
  openStandaloneChat: () => call<WorkspaceInfo>("OpenStandaloneChat"),
  chooseAttachment: () => call<string>("ChooseAttachment"),
  getWorkspace: () => call<WorkspaceInfo>("GetWorkspace"),
  getAccount: () => call<DesktopAccount>("GetAccount"),
  getUsageStats: () => call<UsageStats>("GetUsageStats"),
  getBrowserSettings: () => call<DesktopBrowserSettings>("GetBrowserSettings"),
  updateBrowserSettings: (input: DesktopBrowserSettingsInput) =>
    call<DesktopBrowserSettings>("UpdateBrowserSettings", input),
  getMCPServers: () => call<DesktopMCPServer[]>("GetMCPServers"),
  configureMCPServer: (input: DesktopMCPServerInput) =>
    call<DesktopMCPServer[]>("ConfigureMCPServer", input),
  startRemoteSession: () => call<DesktopRemoteSession>("StartRemoteSession"),
  getRemoteSession: () => call<DesktopRemoteSession>("GetRemoteSession"),
  stopRemoteSession: () => call<void>("StopRemoteSession"),
  getPersonalization: () => call<DesktopPersonalization>("GetPersonalization"),
  savePersonalization: (input: DesktopPersonalizationInput) =>
    call<DesktopPersonalization>("SavePersonalization", input),
  deleteLocalMemories: () => call<DesktopPersonalization>("DeleteLocalMemories"),
  openTerminal: () => call<void>("OpenTerminal"),
  runTerminalCommand: (command: string) => call<void>("RunTerminalCommand", command),
  interruptTerminal: () => call<void>("InterruptTerminal"),
  closeTerminal: () => call<void>("CloseTerminal"),
  getProviderSettings: () => call<ProviderSettings>("GetProviderSettings"),
  getActiveAntigravityQuota: () => call<ProviderQuota | null>("GetActiveAntigravityQuota"),
  getAppInfo: () => call<AppInfo>("GetAppInfo"),
  getSkillsMarketplace: () => call<DesktopSkillsMarketplace>("GetSkillsMarketplace"),
  installMarketplaceSkill: (slug: string) => call<DesktopSkill>("InstallMarketplaceSkill", slug),
  deleteInstalledSkill: (id: string) => call<void>("DeleteInstalledSkill", id),
  checkForUpdate: () => call<UpdateInfo>("CheckForUpdate"),
  openUpdatePage: (url: string) => call<void>("OpenUpdatePage", url),
  downloadUpdate: (assets: UpdateAsset[]) => call<string>("DownloadUpdate", assets),
  listAutomations: () => call<Automation[]>("ListAutomations"),
  createAutomation: (input: AutomationInput) => call<Automation>("CreateAutomation", input),
  updateAutomation: (id: string, input: AutomationInput) => call<Automation>("UpdateAutomation", id, input),
  deleteAutomation: (id: string) => call<void>("DeleteAutomation", id),
  toggleAutomation: (id: string, enabled: boolean) => call<void>("ToggleAutomation", id, enabled),
  runAutomationNow: (id: string) => call<void>("RunAutomationNow", id),
  getKeepAwake: () => call<boolean>("GetKeepAwake"),
  setKeepAwake: (enabled: boolean) => call<void>("SetKeepAwake", enabled),
  applyUpdateAndRestart: (path: string) => call<void>("ApplyUpdateAndRestart", path),
  openExternalURL: (url: string) => call<void>("OpenExternalURL", url),
  loginProvider: (provider: string, accountID: string, token: string) =>
    call<void>("LoginProvider", provider, accountID, token),
  useProviderAccount: (accountID: string) => call<void>("UseProviderAccount", accountID),
  configureOpenCode: (apiKey: string) => call<void>("ConfigureOpenCode", apiKey),
  saveCustomProvider: (input: CustomProviderInput) => call<unknown>("SaveCustomProvider", input),
  deleteCustomProvider: (providerID: string) => call<void>("DeleteCustomProvider", providerID),
  loginAccount: () => call<DesktopAccount>("LoginAccount"),
  logoutAccount: () => call<DesktopAccount>("LogoutAccount"),
  getCatalog: () => call<DesktopCatalog>("GetCatalog"),
  listWorkspaceTree: () => call<FileNode[]>("ListWorkspaceTree"),
  sendPrompt: (prompt: string) => call<void>("SendPrompt", prompt),
  steerPrompt: (prompt: string) => call<void>("SteerPrompt", prompt),
  cancelTurn: () => call<void>("CancelTurn"),
  configureProvider: (provider: string, model: string, apiKey: string) =>
    call<void>("ConfigureProvider", provider, model, apiKey),
  setModel: (model: string) => call<void>("SetModel", model),
  updateSettings: (settings: Partial<DesktopSettings>) =>
    call<DesktopSettings>("UpdateSettings", settings),
  resolvePermission: (id: string, allowed: boolean) => call<void>("ResolvePermission", id, allowed),
  answerQuestion: (id: string, answer: string) => call<void>("AnswerQuestion", id, answer),
};

export function listen<T>(eventName: string, handler: (payload: T) => void) {
  if (!(window as WailsWindow).runtime) {
    return () => undefined;
  }
  EventsOn(eventName, handler);
  return () => EventsOff(eventName);
}
