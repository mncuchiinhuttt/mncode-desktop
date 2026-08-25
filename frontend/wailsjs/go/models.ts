export namespace main {
	
	export class AutomationRun {
	    startedAt: number;
	    durationMs: number;
	    status: string;
	    detail: string;
	    logPath: string;
	
	    static createFrom(source: any = {}) {
	        return new AutomationRun(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.startedAt = source["startedAt"];
	        this.durationMs = source["durationMs"];
	        this.status = source["status"];
	        this.detail = source["detail"];
	        this.logPath = source["logPath"];
	    }
	}
	export class Automation {
	    id: string;
	    name: string;
	    prompt: string;
	    kind: string;
	    schedule: string;
	    workspace: string;
	    enabled: boolean;
	    createdAt: number;
	    lastRunAt: number;
	    nextRunAt: number;
	    runCount: number;
	    runs: AutomationRun[];
	
	    static createFrom(source: any = {}) {
	        return new Automation(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.prompt = source["prompt"];
	        this.kind = source["kind"];
	        this.schedule = source["schedule"];
	        this.workspace = source["workspace"];
	        this.enabled = source["enabled"];
	        this.createdAt = source["createdAt"];
	        this.lastRunAt = source["lastRunAt"];
	        this.nextRunAt = source["nextRunAt"];
	        this.runCount = source["runCount"];
	        this.runs = this.convertValues(source["runs"], AutomationRun);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class AutomationInput {
	    name: string;
	    prompt: string;
	    kind: string;
	    schedule: string;
	    workspace: string;
	    enabled: boolean;
	
	    static createFrom(source: any = {}) {
	        return new AutomationInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.prompt = source["prompt"];
	        this.kind = source["kind"];
	        this.schedule = source["schedule"];
	        this.workspace = source["workspace"];
	        this.enabled = source["enabled"];
	    }
	}
	
	export class DesktopAccount {
	    connected: boolean;
	    name: string;
	    email: string;
	    isAdmin: boolean;
	    status: string;
	
	    static createFrom(source: any = {}) {
	        return new DesktopAccount(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.connected = source["connected"];
	        this.name = source["name"];
	        this.email = source["email"];
	        this.isAdmin = source["isAdmin"];
	        this.status = source["status"];
	    }
	}
	export class DesktopAppInfo {
	    version: string;
	    channel: string;
	    description: string;
	    repository: string;
	    copyright: string;
	
	    static createFrom(source: any = {}) {
	        return new DesktopAppInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.version = source["version"];
	        this.channel = source["channel"];
	        this.description = source["description"];
	        this.repository = source["repository"];
	        this.copyright = source["copyright"];
	    }
	}
	export class DesktopBrowserSettings {
	    controlEnabled: boolean;
	    ignoreCertificateErrors: boolean;
	    chromeProfileFound: boolean;
	    builtInBrowserAvailable: boolean;
	
	    static createFrom(source: any = {}) {
	        return new DesktopBrowserSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.controlEnabled = source["controlEnabled"];
	        this.ignoreCertificateErrors = source["ignoreCertificateErrors"];
	        this.chromeProfileFound = source["chromeProfileFound"];
	        this.builtInBrowserAvailable = source["builtInBrowserAvailable"];
	    }
	}
	export class DesktopBrowserSettingsInput {
	    controlEnabled?: boolean;
	    ignoreCertificateErrors?: boolean;
	
	    static createFrom(source: any = {}) {
	        return new DesktopBrowserSettingsInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.controlEnabled = source["controlEnabled"];
	        this.ignoreCertificateErrors = source["ignoreCertificateErrors"];
	    }
	}
	export class DesktopPromptOption {
	    id: string;
	    label: string;
	    detail: string;
	    category: string;
	    kind: string;
	    insertText: string;
	
	    static createFrom(source: any = {}) {
	        return new DesktopPromptOption(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.label = source["label"];
	        this.detail = source["detail"];
	        this.category = source["category"];
	        this.kind = source["kind"];
	        this.insertText = source["insertText"];
	    }
	}
	export class DesktopPromptCatalog {
	    context: DesktopPromptOption[];
	    commands: DesktopPromptOption[];
	    skills: DesktopPromptOption[];
	
	    static createFrom(source: any = {}) {
	        return new DesktopPromptCatalog(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.context = this.convertValues(source["context"], DesktopPromptOption);
	        this.commands = this.convertValues(source["commands"], DesktopPromptOption);
	        this.skills = this.convertValues(source["skills"], DesktopPromptOption);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class DesktopSettings {
	    model: string;
	    provider: string;
	    workflow: string;
	    effort: string;
	    thinkingBudget: number;
	    permissionMode: string;
	    defaultPermissionMode: string;
	    theme: string;
	    uiFontSize: number;
	    codeFontSize: number;
	    lightCodeTheme: string;
	    darkCodeTheme: string;
	    showLineNumbers: boolean;
	    wrapLines: boolean;
	    showContextWindowUsage: boolean;
	    suggestedPrompts: boolean;
	    sendShortcut: string;
	    contextWindow: string;
	    autoCompact: boolean;
	    tokenSaverConcise: boolean;
	    tokenSaverCapThinking: boolean;
	    tokenSaverCompressOutput: boolean;
	    tokenSaverTargetedEdits: boolean;
	    tokenSaverRtk: boolean;
	    language: string;
	    artifacts: boolean;
	    interruptMode: string;
	    verboseOutput: boolean;
	    contextPercent: number;
	    contextUsed: number;
	    contextLimit: number;
	
	    static createFrom(source: any = {}) {
	        return new DesktopSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.model = source["model"];
	        this.provider = source["provider"];
	        this.workflow = source["workflow"];
	        this.effort = source["effort"];
	        this.thinkingBudget = source["thinkingBudget"];
	        this.permissionMode = source["permissionMode"];
	        this.defaultPermissionMode = source["defaultPermissionMode"];
	        this.theme = source["theme"];
	        this.uiFontSize = source["uiFontSize"];
	        this.codeFontSize = source["codeFontSize"];
	        this.lightCodeTheme = source["lightCodeTheme"];
	        this.darkCodeTheme = source["darkCodeTheme"];
	        this.showLineNumbers = source["showLineNumbers"];
	        this.wrapLines = source["wrapLines"];
	        this.showContextWindowUsage = source["showContextWindowUsage"];
	        this.suggestedPrompts = source["suggestedPrompts"];
	        this.sendShortcut = source["sendShortcut"];
	        this.contextWindow = source["contextWindow"];
	        this.autoCompact = source["autoCompact"];
	        this.tokenSaverConcise = source["tokenSaverConcise"];
	        this.tokenSaverCapThinking = source["tokenSaverCapThinking"];
	        this.tokenSaverCompressOutput = source["tokenSaverCompressOutput"];
	        this.tokenSaverTargetedEdits = source["tokenSaverTargetedEdits"];
	        this.tokenSaverRtk = source["tokenSaverRtk"];
	        this.language = source["language"];
	        this.artifacts = source["artifacts"];
	        this.interruptMode = source["interruptMode"];
	        this.verboseOutput = source["verboseOutput"];
	        this.contextPercent = source["contextPercent"];
	        this.contextUsed = source["contextUsed"];
	        this.contextLimit = source["contextLimit"];
	    }
	}
	export class DesktopTheme {
	    id: string;
	    name: string;
	    description: string;
	    isDark: boolean;
	
	    static createFrom(source: any = {}) {
	        return new DesktopTheme(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.description = source["description"];
	        this.isDark = source["isDark"];
	    }
	}
	export class DesktopMode {
	    id: string;
	    label: string;
	    description: string;
	    budget?: number;
	
	    static createFrom(source: any = {}) {
	        return new DesktopMode(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.label = source["label"];
	        this.description = source["description"];
	        this.budget = source["budget"];
	    }
	}
	export class DesktopModel {
	    id: string;
	    name: string;
	    provider: string;
	    tag: string;
	    description: string;
	
	    static createFrom(source: any = {}) {
	        return new DesktopModel(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.provider = source["provider"];
	        this.tag = source["tag"];
	        this.description = source["description"];
	    }
	}
	export class DesktopCatalog {
	    models: DesktopModel[];
	    workflows: DesktopMode[];
	    efforts: DesktopMode[];
	    permissions: DesktopMode[];
	    themes: DesktopTheme[];
	    settings: DesktopSettings;
	    prompt: DesktopPromptCatalog;
	
	    static createFrom(source: any = {}) {
	        return new DesktopCatalog(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.models = this.convertValues(source["models"], DesktopModel);
	        this.workflows = this.convertValues(source["workflows"], DesktopMode);
	        this.efforts = this.convertValues(source["efforts"], DesktopMode);
	        this.permissions = this.convertValues(source["permissions"], DesktopMode);
	        this.themes = this.convertValues(source["themes"], DesktopTheme);
	        this.settings = this.convertValues(source["settings"], DesktopSettings);
	        this.prompt = this.convertValues(source["prompt"], DesktopPromptCatalog);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class DesktopCustomModel {
	    id: string;
	    name: string;
	    contextWindow?: number;
	
	    static createFrom(source: any = {}) {
	        return new DesktopCustomModel(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.contextWindow = source["contextWindow"];
	    }
	}
	export class DesktopCustomProvider {
	    id: string;
	    name: string;
	    baseUrl: string;
	    apiFormat: string;
	    apiKeyConfigured: boolean;
	    models: DesktopCustomModel[];
	
	    static createFrom(source: any = {}) {
	        return new DesktopCustomProvider(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.baseUrl = source["baseUrl"];
	        this.apiFormat = source["apiFormat"];
	        this.apiKeyConfigured = source["apiKeyConfigured"];
	        this.models = this.convertValues(source["models"], DesktopCustomModel);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class DesktopCustomProviderInput {
	    id: string;
	    name: string;
	    baseUrl: string;
	    apiFormat: string;
	    apiKey: string;
	    models: DesktopCustomModel[];
	
	    static createFrom(source: any = {}) {
	        return new DesktopCustomProviderInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.baseUrl = source["baseUrl"];
	        this.apiFormat = source["apiFormat"];
	        this.apiKey = source["apiKey"];
	        this.models = this.convertValues(source["models"], DesktopCustomModel);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class DesktopMCPServer {
	    id: string;
	    name: string;
	    description: string;
	    tokenConfigured: boolean;
	    configured: boolean;
	    connected: boolean;
	
	    static createFrom(source: any = {}) {
	        return new DesktopMCPServer(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.description = source["description"];
	        this.tokenConfigured = source["tokenConfigured"];
	        this.configured = source["configured"];
	        this.connected = source["connected"];
	    }
	}
	export class DesktopMCPServerInput {
	    id: string;
	    token: string;
	
	    static createFrom(source: any = {}) {
	        return new DesktopMCPServerInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.token = source["token"];
	    }
	}
	
	
	export class DesktopModelQuota {
	    modelId: string;
	    displayName: string;
	    remainingPercentage: number;
	    resetIn: string;
	
	    static createFrom(source: any = {}) {
	        return new DesktopModelQuota(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.modelId = source["modelId"];
	        this.displayName = source["displayName"];
	        this.remainingPercentage = source["remainingPercentage"];
	        this.resetIn = source["resetIn"];
	    }
	}
	export class DesktopPersonalization {
	    customInstructions: string;
	    personality: string;
	    brainrotMode: boolean;
	    trollMode: boolean;
	    memoryEnabled: boolean;
	    memoryToolAssisted: boolean;
	    memoryCount: number;
	
	    static createFrom(source: any = {}) {
	        return new DesktopPersonalization(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.customInstructions = source["customInstructions"];
	        this.personality = source["personality"];
	        this.brainrotMode = source["brainrotMode"];
	        this.trollMode = source["trollMode"];
	        this.memoryEnabled = source["memoryEnabled"];
	        this.memoryToolAssisted = source["memoryToolAssisted"];
	        this.memoryCount = source["memoryCount"];
	    }
	}
	export class DesktopPersonalizationInput {
	    customInstructions?: string;
	    personality: string;
	    brainrotMode?: boolean;
	    trollMode?: boolean;
	    memoryEnabled?: boolean;
	    memoryToolAssisted?: boolean;
	
	    static createFrom(source: any = {}) {
	        return new DesktopPersonalizationInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.customInstructions = source["customInstructions"];
	        this.personality = source["personality"];
	        this.brainrotMode = source["brainrotMode"];
	        this.trollMode = source["trollMode"];
	        this.memoryEnabled = source["memoryEnabled"];
	        this.memoryToolAssisted = source["memoryToolAssisted"];
	    }
	}
	
	
	export class DesktopProviderAccount {
	    id: string;
	    email: string;
	    provider: string;
	    active: boolean;
	    available: boolean;
	    lastError?: string;
	
	    static createFrom(source: any = {}) {
	        return new DesktopProviderAccount(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.email = source["email"];
	        this.provider = source["provider"];
	        this.active = source["active"];
	        this.available = source["available"];
	        this.lastError = source["lastError"];
	    }
	}
	export class DesktopProviderQuota {
	    accountId: string;
	    status: string;
	    healthy: boolean;
	    tier: string;
	    expiresIn: string;
	    modelQuotas: DesktopModelQuota[];
	    availableModels: string[];
	    maxContext: number;
	    rpmRemaining: string;
	    tpmRemaining: string;
	    errorMessage: string;
	
	    static createFrom(source: any = {}) {
	        return new DesktopProviderQuota(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.accountId = source["accountId"];
	        this.status = source["status"];
	        this.healthy = source["healthy"];
	        this.tier = source["tier"];
	        this.expiresIn = source["expiresIn"];
	        this.modelQuotas = this.convertValues(source["modelQuotas"], DesktopModelQuota);
	        this.availableModels = source["availableModels"];
	        this.maxContext = source["maxContext"];
	        this.rpmRemaining = source["rpmRemaining"];
	        this.tpmRemaining = source["tpmRemaining"];
	        this.errorMessage = source["errorMessage"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class DesktopProviderSettings {
	    accounts: DesktopProviderAccount[];
	    customProviders: DesktopCustomProvider[];
	    openCodeConfigured: boolean;
	    activeAntigravityQuota?: DesktopProviderQuota;
	
	    static createFrom(source: any = {}) {
	        return new DesktopProviderSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.accounts = this.convertValues(source["accounts"], DesktopProviderAccount);
	        this.customProviders = this.convertValues(source["customProviders"], DesktopCustomProvider);
	        this.openCodeConfigured = source["openCodeConfigured"];
	        this.activeAntigravityQuota = this.convertValues(source["activeAntigravityQuota"], DesktopProviderQuota);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class DesktopRemoteDevice {
	    id: string;
	    name: string;
	    platform: string;
	    status: string;
	
	    static createFrom(source: any = {}) {
	        return new DesktopRemoteDevice(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.platform = source["platform"];
	        this.status = source["status"];
	    }
	}
	export class DesktopRemoteSession {
	    active: boolean;
	    sessionId: string;
	    pairingUrl: string;
	    qrCode: string;
	    status: string;
	    connectedDevices: number;
	    devices: DesktopRemoteDevice[];
	
	    static createFrom(source: any = {}) {
	        return new DesktopRemoteSession(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.active = source["active"];
	        this.sessionId = source["sessionId"];
	        this.pairingUrl = source["pairingUrl"];
	        this.qrCode = source["qrCode"];
	        this.status = source["status"];
	        this.connectedDevices = source["connectedDevices"];
	        this.devices = this.convertValues(source["devices"], DesktopRemoteDevice);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class DesktopSettingsInput {
	    model: string;
	    provider: string;
	    workflow: string;
	    effort: string;
	    permissionMode: string;
	    defaultPermissionMode: string;
	    theme: string;
	    uiFontSize: number;
	    codeFontSize: number;
	    lightCodeTheme: string;
	    darkCodeTheme: string;
	    showLineNumbers?: boolean;
	    wrapLines?: boolean;
	    showContextWindowUsage?: boolean;
	    suggestedPrompts?: boolean;
	    sendShortcut: string;
	    contextWindow: string;
	    language: string;
	    interruptMode: string;
	    autoCompact?: boolean;
	    tokenSaverConcise?: boolean;
	    tokenSaverCapThinking?: boolean;
	    tokenSaverCompressOutput?: boolean;
	    tokenSaverTargetedEdits?: boolean;
	    tokenSaverRtk?: boolean;
	    artifacts?: boolean;
	    verboseOutput?: boolean;
	
	    static createFrom(source: any = {}) {
	        return new DesktopSettingsInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.model = source["model"];
	        this.provider = source["provider"];
	        this.workflow = source["workflow"];
	        this.effort = source["effort"];
	        this.permissionMode = source["permissionMode"];
	        this.defaultPermissionMode = source["defaultPermissionMode"];
	        this.theme = source["theme"];
	        this.uiFontSize = source["uiFontSize"];
	        this.codeFontSize = source["codeFontSize"];
	        this.lightCodeTheme = source["lightCodeTheme"];
	        this.darkCodeTheme = source["darkCodeTheme"];
	        this.showLineNumbers = source["showLineNumbers"];
	        this.wrapLines = source["wrapLines"];
	        this.showContextWindowUsage = source["showContextWindowUsage"];
	        this.suggestedPrompts = source["suggestedPrompts"];
	        this.sendShortcut = source["sendShortcut"];
	        this.contextWindow = source["contextWindow"];
	        this.language = source["language"];
	        this.interruptMode = source["interruptMode"];
	        this.autoCompact = source["autoCompact"];
	        this.tokenSaverConcise = source["tokenSaverConcise"];
	        this.tokenSaverCapThinking = source["tokenSaverCapThinking"];
	        this.tokenSaverCompressOutput = source["tokenSaverCompressOutput"];
	        this.tokenSaverTargetedEdits = source["tokenSaverTargetedEdits"];
	        this.tokenSaverRtk = source["tokenSaverRtk"];
	        this.artifacts = source["artifacts"];
	        this.verboseOutput = source["verboseOutput"];
	    }
	}
	export class DesktopSkill {
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
	
	    static createFrom(source: any = {}) {
	        return new DesktopSkill(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.slug = source["slug"];
	        this.name = source["name"];
	        this.description = source["description"];
	        this.category = source["category"];
	        this.source = source["source"];
	        this.system = source["system"];
	        this.installed = source["installed"];
	        this.free = source["free"];
	        this.marketplaceUrl = source["marketplaceUrl"];
	    }
	}
	export class DesktopSkillsMarketplace {
	    systemSkills: DesktopSkill[];
	    userSkills: DesktopSkill[];
	    availableSkills: DesktopSkill[];
	    sourceUrl: string;
	
	    static createFrom(source: any = {}) {
	        return new DesktopSkillsMarketplace(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.systemSkills = this.convertValues(source["systemSkills"], DesktopSkill);
	        this.userSkills = this.convertValues(source["userSkills"], DesktopSkill);
	        this.availableSkills = this.convertValues(source["availableSkills"], DesktopSkill);
	        this.sourceUrl = source["sourceUrl"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class DesktopUpdateAsset {
	    name: string;
	    url: string;
	    size: number;
	
	    static createFrom(source: any = {}) {
	        return new DesktopUpdateAsset(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.url = source["url"];
	        this.size = source["size"];
	    }
	}
	export class DesktopUpdateInfo {
	    currentVersion: string;
	    latestVersion: string;
	    releaseDate: string;
	    channel: string;
	    releaseUrl: string;
	    notes: string;
	    assets: DesktopUpdateAsset[];
	    updateAvailable: boolean;
	
	    static createFrom(source: any = {}) {
	        return new DesktopUpdateInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.currentVersion = source["currentVersion"];
	        this.latestVersion = source["latestVersion"];
	        this.releaseDate = source["releaseDate"];
	        this.channel = source["channel"];
	        this.releaseUrl = source["releaseUrl"];
	        this.notes = source["notes"];
	        this.assets = this.convertValues(source["assets"], DesktopUpdateAsset);
	        this.updateAvailable = source["updateAvailable"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class DesktopUsageDay {
	    date: string;
	    tokens: number;
	    sessions: number;
	
	    static createFrom(source: any = {}) {
	        return new DesktopUsageDay(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.date = source["date"];
	        this.tokens = source["tokens"];
	        this.sessions = source["sessions"];
	    }
	}
	export class DesktopUsageSummary {
	    totalTokens: number;
	    inputTokens: number;
	    outputTokens: number;
	    thinkingTokens: number;
	    totalSessions: number;
	    recordsCount: number;
	
	    static createFrom(source: any = {}) {
	        return new DesktopUsageSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.totalTokens = source["totalTokens"];
	        this.inputTokens = source["inputTokens"];
	        this.outputTokens = source["outputTokens"];
	        this.thinkingTokens = source["thinkingTokens"];
	        this.totalSessions = source["totalSessions"];
	        this.recordsCount = source["recordsCount"];
	    }
	}
	export class DesktopUsageStats {
	    summary: DesktopUsageSummary;
	    dailyUsage: DesktopUsageDay[];
	
	    static createFrom(source: any = {}) {
	        return new DesktopUsageStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.summary = this.convertValues(source["summary"], DesktopUsageSummary);
	        this.dailyUsage = this.convertValues(source["dailyUsage"], DesktopUsageDay);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class FileNode {
	    name: string;
	    path: string;
	    isDir: boolean;
	    children?: FileNode[];
	
	    static createFrom(source: any = {}) {
	        return new FileNode(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.path = source["path"];
	        this.isDir = source["isDir"];
	        this.children = this.convertValues(source["children"], FileNode);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class LanguageStat {
	    name: string;
	    count: number;
	
	    static createFrom(source: any = {}) {
	        return new LanguageStat(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.count = source["count"];
	    }
	}
	export class WorkspaceInfo {
	    path: string;
	    name: string;
	    projectType: string;
	    totalFiles: number;
	    totalLines: number;
	    languages: LanguageStat[];
	    ready: boolean;
	
	    static createFrom(source: any = {}) {
	        return new WorkspaceInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.name = source["name"];
	        this.projectType = source["projectType"];
	        this.totalFiles = source["totalFiles"];
	        this.totalLines = source["totalLines"];
	        this.languages = this.convertValues(source["languages"], LanguageStat);
	        this.ready = source["ready"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

