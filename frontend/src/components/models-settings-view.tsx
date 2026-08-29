import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  Cloud,
  Code2,
  Compass,
  Copy,
  ExternalLink,
  Globe,
  KeyRound,
  Loader2,
  Plus,
  Server,
  Sparkles,
  Trash2,
  UserRound,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { desktop } from "@/lib/desktop";
import type {
  CustomModel,
  CustomProvider,
  CustomProviderInput,
  DesktopCatalog,
  ProviderAccount,
  ProviderQuota,
  ProviderSettings,
} from "@/types";
const formats = [
  { id: "anthropic-messages", label: "Anthropic messages (/v1/messages)" },
  { id: "chat-completions", label: "Chat completions (/chat/completions)" },
  { id: "responses", label: "Responses (/responses)" },
];

interface ModelsSettingsProps {
  catalog: DesktopCatalog;
  refreshKey: number;
  onLoad: () => Promise<ProviderSettings>;
  onLoadQuota: () => Promise<ProviderQuota | null>;
  onLogin: (provider: string, accountID: string, token: string) => Promise<void>;
  onUseAccount: (accountID: string) => Promise<void>;
  onOpenCode: (apiKey: string) => Promise<void>;
  onSaveCustom: (input: CustomProviderInput) => Promise<void>;
  onDeleteCustom: (providerID: string) => Promise<void>;
}

export function ModelsSettingsView({
  catalog,
  refreshKey,
  onLoad,
  onLoadQuota,
  onLogin,
  onUseAccount,
  onOpenCode,
  onSaveCustom,
  onDeleteCustom,
}: ModelsSettingsProps) {
  const [settings, setSettings] = useState<ProviderSettings>({
    accounts: [],
    customProviders: [],
    openCodeConfigured: false,
  });
  const [selected, setSelected] = useState("antigravity");
  const [loading, setLoading] = useState(true);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSettings(await onLoad());
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load provider settings");
    } finally {
      setLoading(false);
    }
  }, [onLoad]);
  const refreshQuota = useCallback(async () => {
    setQuotaLoading(true);
    try {
      const quota = await onLoadQuota();
      setSettings((current) => ({ ...current, activeAntigravityQuota: quota ?? undefined }));
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load Antigravity quota");
    } finally {
      setQuotaLoading(false);
    }
  }, [onLoadQuota]);
  useEffect(() => {
    void refresh();
  }, [refresh, refreshKey]);
  async function switchAccount(accountID: string) {
    setBusy(true);
    setError("");
    try {
      await onUseAccount(accountID);
      setSettings((current) => ({
        ...current,
        accounts: current.accounts.map((account) =>
          account.provider === "antigravity"
            ? { ...account, active: account.id === accountID }
            : account,
        ),
      }));
      await refreshQuota();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not switch provider account");
    } finally {
      setBusy(false);
    }
  }
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Provider action failed");
    } finally {
      setBusy(false);
    }
  }

  const custom = settings.customProviders.find((provider) => provider.id === selected);
  const accounts = settings.accounts.filter((account) => {
    if (selected === "antigravity") return account.provider === "antigravity";
    if (selected === "codex") return account.provider === "codex";
    if (selected === "openai") return account.provider === "openai";
    if (selected === "openrouter") return account.provider === "openrouter";
    if (selected === "anthropic") return account.provider === "anthropic";
    return false;
  });
  const models = useMemo(
    () =>
      catalog.models.filter((model) => {
        if (selected === "antigravity") return model.tag.includes("Antigravity");
        if (selected === "codex") return model.provider === "openai" || model.tag.includes("OpenAI") || model.tag.includes("Codex");
        if (selected === "openai") return model.provider === "openai" || model.tag.includes("OpenAI");
        if (selected === "openrouter") return model.provider === "openrouter" || model.tag.includes("OpenRouter");
        if (selected === "anthropic") return model.provider === "anthropic" || model.tag.includes("Anthropic");
        if (selected === "opencode") return model.provider === "opencode" || model.tag.includes("OpenCode");
        return false;
      }),
    [catalog.models, selected],
  );
  return (
    <div className="mt-8 space-y-4">
      {error && (
        <div className="rounded-lg border border-rose-400/30 bg-rose-50/60 px-3 py-2 text-xs text-rose-700 dark:bg-rose-300/[0.08] dark:text-rose-200">
          {error}
        </div>
      )}
      <div className="grid min-h-[520px] overflow-hidden rounded-lg border border-[var(--mn-line)] bg-[var(--mn-surface)] lg:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="border-b border-[var(--mn-line)] bg-[var(--mn-surface-muted)] p-3 lg:border-b-0 lg:border-r">
          <p className="px-2 py-2 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Providers
          </p>
          <ProviderButton
            selected={selected === "antigravity"}
            icon={Cloud}
            label="Antigravity (Google)"
            status={settings.accounts.some((account) => account.provider === "antigravity" && account.active)}
            onClick={() => setSelected("antigravity")}
          />
          <ProviderButton
            selected={selected === "codex"}
            icon={Code2}
            label="Codex (ChatGPT)"
            status={settings.accounts.some((account) => account.provider === "codex" && account.active)}
            onClick={() => setSelected("codex")}
          />
          <ProviderButton
            selected={selected === "openai"}
            icon={Zap}
            label="OpenAI API"
            status={settings.accounts.some((account) => account.provider === "openai" && account.active)}
            onClick={() => setSelected("openai")}
          />
          <ProviderButton
            selected={selected === "openrouter"}
            icon={Globe}
            label="OpenRouter"
            status={settings.accounts.some((account) => account.provider === "openrouter" && account.active)}
            onClick={() => setSelected("openrouter")}
          />
          <ProviderButton
            selected={selected === "anthropic"}
            icon={Sparkles}
            label="Anthropic Claude"
            status={settings.accounts.some((account) => account.provider === "anthropic" && account.active)}
            onClick={() => setSelected("anthropic")}
          />
          <ProviderButton
            selected={selected === "opencode"}
            icon={Server}
            label="OpenCode Zen"
            status={settings.openCodeConfigured}
            onClick={() => setSelected("opencode")}
          />
          <p className="px-2 pb-2 pt-6 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Custom providers
          </p>
          {settings.customProviders.map((provider) => (
            <ProviderButton
              key={provider.id}
              selected={selected === provider.id}
              icon={Server}
              label={provider.name}
              status={provider.apiKeyConfigured}
              onClick={() => setSelected(provider.id)}
            />
          ))}
          <button
            type="button"
            onClick={() => setSelected("new")}
            className={
              "mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-[var(--mn-surface)] hover:text-foreground " +
              (selected === "new" ? "bg-[var(--mn-surface)] text-foreground" : "")
            }
          >
            <Plus className="size-4" />
            Add provider
          </button>
        </aside>
        <main className="min-w-0 p-5 sm:p-7">
          {loading ? (
            <div className="flex min-h-[420px] items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading providers…
            </div>
          ) : selected === "antigravity" ? (
            <BuiltInProvider
              title="Antigravity"
              description="Google OAuth accounts used by the CLI model catalog."
              icon={Cloud}
              accounts={accounts}
              models={models}
              busy={busy}
              loginLabel="Login with Google"
              onLogin={() => void run(() => onLogin("antigravity", "", ""))}
              onUseAccount={switchAccount}
              quota={settings.activeAntigravityQuota}
              quotaLoading={quotaLoading}
            />
          ) : selected === "codex" ? (
            <CodexProvider
              accounts={accounts}
              models={models}
              busy={busy}
              onUseAccount={(id) => void run(() => onUseAccount(id))}
            />
          ) : selected === "openai" ? (
            <OpenAIProvider
              accounts={accounts}
              models={models}
              busy={busy}
              onLogin={(id, token) => void run(() => onLogin("openai", id, token))}
              onUseAccount={(id) => void run(() => onUseAccount(id))}
            />
          ) : selected === "openrouter" ? (
            <OpenRouterProvider
              accounts={accounts}
              models={models}
              busy={busy}
              onLogin={(id, token) => void run(() => onLogin("openrouter", id, token))}
              onUseAccount={(id) => void run(() => onUseAccount(id))}
            />
          ) : selected === "anthropic" ? (
            <AnthropicProvider
              accounts={accounts}
              models={models}
              busy={busy}
              onLogin={(id, token) => void run(() => onLogin("anthropic", id, token))}
              onUseAccount={(id) => void run(() => onUseAccount(id))}
            />
          ) : selected === "opencode" ? (
            <OpenCodeProvider
              configured={settings.openCodeConfigured}
              models={models}
              busy={busy}
              onSave={(key) => void run(() => onOpenCode(key))}
            />
          ) : (
            <CustomProviderForm
              initial={selected === "new" ? undefined : custom}
              busy={busy}
              onSave={(input) =>
                void run(async () => {
                  await onSaveCustom(input);
                  if (!input.id)
                    setSelected(
                      input.name
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-|-$/g, ""),
                    );
                })
              }
              onDelete={
                selected !== "new" && custom
                  ? () =>
                      void run(async () => {
                        await onDeleteCustom(custom.id);
                        setSelected("new");
                      })
                  : undefined
              }
            />
          )}
        </main>
      </div>
    </div>
  );
}

function ProviderButton({
  selected,
  icon: Icon,
  label,
  status,
  onClick,
}: {
  selected: boolean;
  icon: typeof Cloud;
  label: string;
  status: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors " +
        (selected
          ? "bg-[var(--mn-surface)] font-medium text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-[var(--mn-surface)] hover:text-foreground")
      }
    >
      <Icon className="size-4" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {status && <span className="size-2 rounded-full bg-emerald-500" />}
    </button>
  );
}

function BuiltInProvider({
  title,
  description,
  icon: Icon,
  accounts,
  models,
  busy,
  loginLabel,
  onLogin,
  onUseAccount,
  quota,
  quotaLoading,
}: {
  title: string;
  description: string;
  icon: typeof Cloud;
  accounts: ProviderAccount[];
  models: DesktopCatalog["models"];
  busy: boolean;
  loginLabel: string;
  onLogin: () => void;
  onUseAccount: (id: string) => void;
  quota?: ProviderQuota;
  quotaLoading: boolean;
}) {
  return (
    <ProviderLayout
      title={title}
      description={description}
      icon={Icon}
      action={
        <Button size="sm" onClick={onLogin} disabled={busy} className="mn-accent-button">
          {busy ? (
            <Loader2 className="mr-2 size-3.5 animate-spin" />
          ) : (
            <Plus className="mr-2 size-3.5" />
          )}
          {loginLabel}
        </Button>
      }
    >
      <AccountList
        accounts={accounts}
        busy={busy}
        onUse={onUseAccount}
        quota={quota}
        quotaLoading={quotaLoading}
      />
      <ModelList models={models} />
    </ProviderLayout>
  );
}

function CodexProvider({
  accounts,
  models,
  busy,
  onUseAccount,
}: {
  accounts: ProviderAccount[];
  models: DesktopCatalog["models"];
  busy: boolean;
  onUseAccount: (id: string) => void;
}) {
  const [mode, setMode] = useState<"oauth" | "device">("oauth");
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthResult, setOauthResult] = useState<{
    authUrl?: string;
    verificationUri?: string;
    userCode?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [oauthError, setOauthError] = useState("");

  const startOAuth = async (loginMode: "browser" | "device") => {
    setOauthLoading(true);
    setOauthError("");
    try {
      const res = await desktop.startCodexOAuthLogin(loginMode);
      setOauthResult(res);
      if (loginMode === "browser" && res.authUrl) {
        await desktop.openExternalURL(res.authUrl);
      }
    } catch (err) {
      setOauthError(err instanceof Error ? err.message : "Failed to start Codex login");
    } finally {
      setOauthLoading(false);
    }
  };

  const completeOAuth = async () => {
    setOauthLoading(true);
    setOauthError("");
    try {
      await desktop.completeCodexOAuthLogin();
      setOauthResult(null);
    } catch (err) {
      setOauthError(err instanceof Error ? err.message : "Login not completed yet");
    } finally {
      setOauthLoading(false);
    }
  };

  const copyCode = () => {
    if (oauthResult?.userCode) {
      navigator.clipboard.writeText(oauthResult.userCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <ProviderLayout
      title="Codex (ChatGPT)"
      description="Sign in directly with your ChatGPT Plus/Team/Pro subscription via official OpenAI Codex OAuth. No API keys required."
      icon={Code2}
      action={null}
    >
      <div className="flex gap-2 border-b border-border/40 pb-3">
        <Button
          variant={mode === "oauth" ? "default" : "outline"}
          size="sm"
          onClick={() => { setMode("oauth"); setOauthResult(null); setOauthError(""); }}
          className={mode === "oauth" ? "mn-accent-button" : ""}
        >
          <Globe className="mr-1.5 size-3.5" />
          ChatGPT OAuth (Browser)
        </Button>
        <Button
          variant={mode === "device" ? "default" : "outline"}
          size="sm"
          onClick={() => { setMode("device"); setOauthResult(null); setOauthError(""); }}
          className={mode === "device" ? "mn-accent-button" : ""}
        >
          <Sparkles className="mr-1.5 size-3.5" />
          Device Code
        </Button>
      </div>

      {oauthError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
          {oauthError}
        </div>
      )}

      {mode === "oauth" && (
        <div className="space-y-3 rounded-lg border border-border/50 bg-secondary/20 p-3.5">
          <p className="text-xs text-muted-foreground">
            Click below to open the official OpenAI ChatGPT sign-in window in your browser.
          </p>
          {!oauthResult ? (
            <Button
              size="sm"
              onClick={() => void startOAuth("browser")}
              disabled={oauthLoading || busy}
              className="mn-accent-button"
            >
              {oauthLoading ? (
                <Loader2 className="mr-2 size-3.5 animate-spin" />
              ) : (
                <Globe className="mr-2 size-3.5" />
              )}
              Sign in with ChatGPT
            </Button>
          ) : (
            <div className="space-y-2.5">
              <p className="text-xs text-emerald-400">
                ✓ Browser authorization opened. Complete sign-in in your browser then click Verify below.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => void completeOAuth()}
                  disabled={oauthLoading}
                  className="mn-accent-button"
                >
                  {oauthLoading ? (
                    <Loader2 className="mr-2 size-3.5 animate-spin" />
                  ) : (
                    <Check className="mr-2 size-3.5" />
                  )}
                  Verify & Finish Login
                </Button>
                {oauthResult.authUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void desktop.openExternalURL(oauthResult.authUrl!)}
                  >
                    <ExternalLink className="mr-1.5 size-3.5" />
                    Re-open Browser
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {mode === "device" && (
        <div className="space-y-3 rounded-lg border border-border/50 bg-secondary/20 p-3.5">
          <p className="text-xs text-muted-foreground">
            Authenticate via one-time device code for headless or remote environments.
          </p>
          {!oauthResult ? (
            <Button
              size="sm"
              onClick={() => void startOAuth("device")}
              disabled={oauthLoading || busy}
              className="mn-accent-button"
            >
              {oauthLoading ? (
                <Loader2 className="mr-2 size-3.5 animate-spin" />
              ) : (
                <Sparkles className="mr-2 size-3.5" />
              )}
              Generate Device Code
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Your Code:</span>
                <span className="rounded bg-background px-2 py-1 font-mono text-sm font-bold tracking-wider text-primary">
                  {oauthResult.userCode}
                </span>
                <Button size="sm" variant="ghost" onClick={copyCode} className="h-7 px-2">
                  {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                </Button>
              </div>
              {oauthResult.verificationUri && (
                <p className="text-xs text-muted-foreground">
                  Open{" "}
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      void desktop.openExternalURL(oauthResult.verificationUri!);
                    }}
                    className="text-primary underline hover:opacity-80"
                  >
                    {oauthResult.verificationUri}
                  </a>{" "}
                  and enter the code above.
                </p>
              )}
              <Button
                size="sm"
                onClick={() => void completeOAuth()}
                disabled={oauthLoading}
                className="mn-accent-button"
              >
                {oauthLoading ? (
                  <Loader2 className="mr-2 size-3.5 animate-spin" />
                ) : (
                  <Check className="mr-2 size-3.5" />
                )}
                Verify & Finish Login
              </Button>
            </div>
          )}
        </div>
      )}

      <AccountList accounts={accounts} busy={busy} onUse={onUseAccount} />
      <ModelList models={models} />
    </ProviderLayout>
  );
}

function OpenAIProvider({
  accounts,
  models,
  busy,
  onLogin,
  onUseAccount,
}: {
  accounts: ProviderAccount[];
  models: DesktopCatalog["models"];
  busy: boolean;
  onLogin: (id: string, token: string) => void;
  onUseAccount: (id: string) => void;
}) {
  const [id, setId] = useState("openai-main");
  const [token, setToken] = useState("");

  return (
    <ProviderLayout
      title="OpenAI API"
      description="Connect your OpenAI Platform API key to access GPT-4o, o1, and o3-mini models."
      icon={Zap}
      action={
        <Button
          size="sm"
          onClick={() => {
            onLogin(id, token);
            setToken("");
          }}
          disabled={busy || !token.trim()}
          className="mn-accent-button"
        >
          {busy ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <KeyRound className="mr-2 size-3.5" />}
          Connect API key
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">
          Account label
          <Input
            value={id}
            onChange={(e) => setId(e.target.value)}
            className="mt-2"
            placeholder="openai-main"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          OpenAI API Key
          <Input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="mt-2"
            placeholder="sk-proj-…"
          />
        </label>
      </div>
      <AccountList accounts={accounts} busy={busy} onUse={onUseAccount} />
      <ModelList models={models} />
    </ProviderLayout>
  );
}

function OpenRouterProvider({
  accounts,
  models,
  busy,
  onLogin,
  onUseAccount,
}: {
  accounts: ProviderAccount[];
  models: DesktopCatalog["models"];
  busy: boolean;
  onLogin: (id: string, token: string) => void;
  onUseAccount: (id: string) => void;
}) {
  const [id, setId] = useState("openrouter-main");
  const [token, setToken] = useState("");

  return (
    <ProviderLayout
      title="OpenRouter"
      description="Connect an OpenRouter API key to access Claude 3.7, DeepSeek R1, Llama 3.3, and hundreds of models."
      icon={Globe}
      action={
        <Button
          size="sm"
          onClick={() => {
            onLogin(id, token);
            setToken("");
          }}
          disabled={busy || !token.trim()}
          className="mn-accent-button"
        >
          {busy ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <KeyRound className="mr-2 size-3.5" />}
          Connect OpenRouter
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">
          Account label
          <Input
            value={id}
            onChange={(e) => setId(e.target.value)}
            className="mt-2"
            placeholder="openrouter-main"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          OpenRouter API Key
          <Input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="mt-2"
            placeholder="sk-or-v1-…"
          />
        </label>
      </div>
      <AccountList accounts={accounts} busy={busy} onUse={onUseAccount} />
      <ModelList models={models} />
    </ProviderLayout>
  );
}

function AnthropicProvider({
  accounts,
  models,
  busy,
  onLogin,
  onUseAccount,
}: {
  accounts: ProviderAccount[];
  models: DesktopCatalog["models"];
  busy: boolean;
  onLogin: (id: string, token: string) => void;
  onUseAccount: (id: string) => void;
}) {
  const [id, setId] = useState("anthropic-main");
  const [token, setToken] = useState("");

  return (
    <ProviderLayout
      title="Anthropic Claude"
      description="Connect your direct Anthropic API key to access Claude 3.7 Sonnet (Thinking), Claude 3.5 Sonnet, and Opus."
      icon={Sparkles}
      action={
        <Button
          size="sm"
          onClick={() => {
            onLogin(id, token);
            setToken("");
          }}
          disabled={busy || !token.trim()}
          className="mn-accent-button"
        >
          {busy ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <KeyRound className="mr-2 size-3.5" />}
          Connect Claude key
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">
          Account label
          <Input
            value={id}
            onChange={(e) => setId(e.target.value)}
            className="mt-2"
            placeholder="anthropic-main"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Anthropic API Key
          <Input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="mt-2"
            placeholder="sk-ant-api03-…"
          />
        </label>
      </div>
      <AccountList accounts={accounts} busy={busy} onUse={onUseAccount} />
      <ModelList models={models} />
    </ProviderLayout>
  );
}

function OpenCodeProvider({
  configured,
  models,
  busy,
  onSave,
}: {
  configured: boolean;
  models: DesktopCatalog["models"];
  busy: boolean;
  onSave: (key: string) => void;
}) {
  const [key, setKey] = useState("");
  return (
    <ProviderLayout
      title="OpenCode"
      description="OpenCode Zen is ready to use. Add an API key to enable the provider."
      icon={Sparkles}
      action={
        <Button
          size="sm"
          onClick={() => {
            onSave(key);
            setKey("");
          }}
          disabled={busy || !key.trim()}
          className="mn-accent-button"
        >
          {busy ? (
            <Loader2 className="mr-2 size-3.5 animate-spin" />
          ) : (
            <Check className="mr-2 size-3.5" />
          )}
          {configured ? "Update key" : "Save API key"}
        </Button>
      }
    >
      <label className="block max-w-xl text-xs text-muted-foreground">
        API key
        <Input
          type="password"
          value={key}
          onChange={(event) => setKey(event.target.value)}
          className="mt-2"
          placeholder={configured ? "Configured — enter a new key to rotate" : "sk-…"}
        />
      </label>
      <ModelList models={models} />
    </ProviderLayout>
  );
}

function CustomProviderForm({
  initial,
  busy,
  onSave,
  onDelete,
}: {
  initial?: CustomProvider;
  busy: boolean;
  onSave: (input: CustomProviderInput) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl ?? "");
  const [format, setFormat] = useState(initial?.apiFormat ?? formats[1].id);
  const [apiKey, setApiKey] = useState("");
  const [models, setModels] = useState<CustomModel[]>(initial?.models ?? []);
  const [modelID, setModelID] = useState("");
  const [modelName, setModelName] = useState("");
  useEffect(() => {
    setName(initial?.name ?? "");
    setBaseUrl(initial?.baseUrl ?? "");
    setFormat(initial?.apiFormat ?? formats[1].id);
    setApiKey("");
    setModels(initial?.models ?? []);
  }, [initial?.id]);
  function addModel() {
    if (!modelID.trim()) return;
    setModels((current) => [
      ...current,
      { id: modelID.trim(), name: modelName.trim() || modelID.trim() },
    ]);
    setModelID("");
    setModelName("");
  }
  return (
    <ProviderLayout
      title={initial?.name ?? "Add provider"}
      description="Add a custom endpoint and choose the API format used by its models."
      icon={Server}
      action={
        <div className="flex gap-2">
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              disabled={busy}
              className="border-[var(--mn-line)]"
            >
              <Trash2 className="mr-2 size-3.5" />
              Delete
            </Button>
          )}
          <Button
            size="sm"
            onClick={() =>
              onSave({ id: initial?.id, name, baseUrl, apiFormat: format, apiKey, models })
            }
            disabled={busy || !name.trim() || !baseUrl.trim()}
            className="mn-accent-button"
          >
            {busy ? (
              <Loader2 className="mr-2 size-3.5 animate-spin" />
            ) : (
              <Check className="mr-2 size-3.5" />
            )}
            Save provider
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <label className="block text-xs text-muted-foreground">
          Provider name
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2"
            placeholder="Z.ai"
          />
        </label>
        <label className="block text-xs text-muted-foreground">
          Base URL
          <Input
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            className="mt-2"
            placeholder="https://api.example.com/v1"
          />
        </label>
        <label className="block text-xs text-muted-foreground">
          API format
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {formats.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="block text-xs text-muted-foreground">
          API key
          {initial?.apiKeyConfigured && (
            <span className="ml-2 text-emerald-600 dark:text-emerald-300">Configured</span>
          )}
          <Input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            className="mt-2"
            placeholder={initial?.apiKeyConfigured ? "Leave blank to keep current key" : "sk-…"}
          />
        </label>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Model list</p>
            <BadgeText>{models.length} models</BadgeText>
          </div>
          <div className="space-y-2">
            {models.map((model, index) => (
              <div
                key={`${model.id}-${index}`}
                className="flex items-center gap-2 rounded-lg border border-[var(--mn-line)] p-2"
              >
                <Input
                  value={model.name}
                  onChange={(event) =>
                    setModels((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, name: event.target.value } : item,
                      ),
                    )
                  }
                  className="h-8"
                />
                <code className="max-w-40 truncate text-[0.6875rem] text-muted-foreground">
                  {model.id}
                </code>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() =>
                    setModels((current) => current.filter((_, itemIndex) => itemIndex !== index))
                  }
                  aria-label={`Remove ${model.id}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input
              value={modelID}
              onChange={(event) => setModelID(event.target.value)}
              placeholder="model-id"
            />
            <Input
              value={modelName}
              onChange={(event) => setModelName(event.target.value)}
              placeholder="Display name"
            />
            <Button
              type="button"
              variant="outline"
              onClick={addModel}
              className="border-[var(--mn-line)]"
            >
              <Plus className="mr-1.5 size-3.5" />
              Add model
            </Button>
          </div>
        </div>
      </div>
    </ProviderLayout>
  );
}

function ProviderLayout({
  title,
  description,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  description: string;
  icon: typeof Cloud;
  action: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-[var(--mn-accent-soft)] text-[var(--mn-accent-strong)]">
            <Icon className="size-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
function AccountList({
  accounts,
  busy,
  onUse,
  quota,
  quotaLoading,
}: {
  accounts: ProviderAccount[];
  busy: boolean;
  onUse: (id: string) => void;
  quota?: ProviderQuota;
  quotaLoading?: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium">Logged-in accounts</p>
      {accounts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--mn-line)] p-4 text-xs text-muted-foreground">
          No accounts connected yet.
        </div>
      ) : (
        accounts.map((account) => (
          <button
            type="button"
            key={account.id}
            onClick={() => onUse(account.id)}
            disabled={busy}
            className="flex w-full items-center gap-3 rounded-lg border border-[var(--mn-line)] p-3 text-left transition-colors hover:bg-[var(--mn-surface-muted)]"
          >
            <div className="grid size-8 place-items-center rounded-full bg-[var(--mn-accent-soft)] text-[var(--mn-accent-strong)]">
              <UserRound className="size-3.5" />
            </div>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium">
                {account.email || account.id}
              </span>
              <span className="mt-1 block text-[0.6875rem] text-muted-foreground">
                {account.available ? "Available" : account.lastError || "Unavailable"}
              </span>
            </span>
            {account.active ? (
              <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[0.625rem] font-medium text-emerald-600 dark:text-emerald-300">
                Active
              </span>
            ) : (
              <ChevronRight className="size-3.5 text-muted-foreground" />
            )}
          </button>
        ))
      )}
      <QuotaPanel quota={quota} loading={quotaLoading} />
    </div>
  );
}
function QuotaPanel({ quota, loading }: { quota?: ProviderQuota; loading?: boolean }) {
  if (loading) return <QuotaSkeleton />;
  if (!quota) return null;
  const rows = quota.modelQuotas ?? [];
  const groups = [
    {
      title: "Gemini models",
      items: rows.filter((item) => item.modelId.toLowerCase().includes("gemini")),
    },
    {
      title: "GPT & Claude models",
      items: rows.filter((item) => !item.modelId.toLowerCase().includes("gemini")),
    },
  ];
  return (
    <section className="rounded-lg border border-[var(--mn-line)] bg-[var(--mn-surface-muted)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Active account quota</p>
          <p className="mt-1 text-xs font-medium text-foreground">
            {quota.accountId || "Antigravity account"}
          </p>
          <p className="mt-1 text-[0.6875rem] text-muted-foreground">
            {quota.tier || "Antigravity"} · {quota.status || "Not checked"}
          </p>
        </div>
        <span
          className={
            quota.healthy
              ? "rounded-full bg-emerald-500/10 px-2 py-1 text-[0.6875rem] font-medium text-emerald-600 dark:text-emerald-300"
              : "rounded-full bg-rose-500/10 px-2 py-1 text-[0.6875rem] font-medium text-rose-600 dark:text-rose-300"
          }
        >
          {quota.healthy ? "Healthy" : "Needs attention"}
        </span>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {groups.map((group) => (
          <div
            key={group.title}
            className="rounded-lg border border-[var(--mn-line)] bg-[var(--mn-surface)] p-3"
          >
            <p className="text-xs font-semibold">{group.title}</p>
            {group.items.length > 0 ? (
              <div className="mt-3 space-y-3">
                {group.items.map((item) => {
                  const percentage = Math.max(0, Math.min(100, item.remainingPercentage));
                  return (
                    <div key={item.modelId}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-xs font-medium">
                          {item.displayName || item.modelId}
                        </span>
                        <span className="font-mono text-[0.6875rem] text-muted-foreground">
                          {Math.round(percentage)}%
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--mn-line)]">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-[width]"
                          style={{ width: percentage + "%" }}
                        />
                      </div>
                      {item.resetIn && (
                        <p className="mt-1 text-[0.6875rem] text-muted-foreground">
                          {item.resetIn}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 rounded-md border border-dashed border-[var(--mn-line)] px-2 py-2 text-[0.6875rem] text-muted-foreground">
                No quota data
              </p>
            )}
          </div>
        ))}
      </div>
      {(quota.expiresIn || quota.rpmRemaining || quota.tpmRemaining) && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--mn-line)] pt-3 text-[0.6875rem] text-muted-foreground">
          {quota.expiresIn && <span>Token {quota.expiresIn}</span>}
          {quota.rpmRemaining && <span>{quota.rpmRemaining}</span>}
          {quota.tpmRemaining && <span>{quota.tpmRemaining}</span>}
        </div>
      )}
      {quota.errorMessage && (
        <p className="mt-3 text-[0.6875rem] text-rose-600 dark:text-rose-300">
          {quota.errorMessage}
        </p>
      )}
    </section>
  );
}
function QuotaSkeleton() {
  return (
    <section
      className="rounded-lg border border-[var(--mn-line)] bg-[var(--mn-surface-muted)] p-4"
      aria-label="Loading quota"
    >
      <div className="h-4 w-40 animate-pulse rounded bg-[var(--mn-line)]" />
      <div className="mt-2 h-3 w-56 animate-pulse rounded bg-[var(--mn-line)]" />
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {["Gemini models", "GPT & Claude models"].map((title) => (
          <div
            key={title}
            className="rounded-lg border border-[var(--mn-line)] bg-[var(--mn-surface)] p-3"
          >
            <div className="h-3 w-28 animate-pulse rounded bg-[var(--mn-line)]" />
            <div className="mt-4 space-y-3">
              {[1, 2].map((item) => (
                <div key={item}>
                  <div className="h-3 w-full animate-pulse rounded bg-[var(--mn-line)]" />
                  <div className="mt-2 h-2 w-full animate-pulse rounded-full bg-[var(--mn-line)]" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
function ModelList({ models }: { models: DesktopCatalog["models"] }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium">Model list</p>
      {models.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--mn-line)] p-4 text-xs text-muted-foreground">
          No models available for this provider yet.
        </div>
      ) : (
        models.map((model) => (
          <div
            key={`${model.provider}-${model.id}`}
            className="flex items-center gap-3 rounded-lg border border-[var(--mn-line)] p-3"
          >
            <span className="min-w-0 flex-1 truncate text-xs font-medium">{model.name}</span>
            <code className="max-w-52 truncate text-[0.6875rem] text-muted-foreground">
              {model.id}
            </code>
            <span className="rounded-md border border-[var(--mn-line)] px-2 py-1 text-[0.625rem] text-muted-foreground">
              {model.tag}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
function BadgeText({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-[var(--mn-line)] px-2 py-1 text-[0.6875rem] text-muted-foreground">
      {children}
    </span>
  );
}
