import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  Check,
  Loader2,
  Monitor,
  Moon,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import type {
  DesktopAccount,
  DesktopPersonalization,
  DesktopPersonalizationInput,
  DesktopSettings,
} from "@/types";
import mncodeLogo from "@/assets/images/mncode-logo.svg";

export type OnboardingPhase = "welcome" | "setup" | "complete";

interface OnboardingFlowProps {
  open: boolean;
  phase: OnboardingPhase;
  step: number;
  loginBusy: boolean;
  account: DesktopAccount;
  settings: DesktopSettings;
  personalization: DesktopPersonalization;
  onClose: () => void;
  onLogin: () => void;
  onSettingsChange: (input: Partial<DesktopSettings>) => void | Promise<void>;
  onPersonalizationChange: (
    input: DesktopPersonalizationInput,
  ) => void | Promise<DesktopPersonalization>;
  onNext: () => void;
  onBack: () => void;
}

const steps = [
  { title: "Choose your surface", detail: "Set the visual mode that feels right for your workspace." },
  { title: "Set your context window", detail: "Choose how much project context a new chat can use." },
  { title: "Tune your agent defaults", detail: "Pick the guardrails and reasoning level you want to start with." },
  { title: "Choose your vibe", detail: "Decide whether mncode should bring the CLI’s brainrot energy into your chats." },
];

function Choice({ active, children, onClick, icon: Icon }: { active: boolean; children: string; onClick: () => void | Promise<unknown>; icon: typeof Monitor }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex min-h-14 items-center gap-3 rounded-xs border px-4 text-left transition-all duration-200",
        active
          ? "border-[var(--mn-accent)] bg-[var(--mn-accent-soft)] font-semibold shadow-[inset_2px_0_0_0_var(--mn-accent)]"
          : "border-[var(--mn-line)] bg-[var(--mn-surface)] hover:-translate-y-0.5 hover:border-[var(--mn-accent)]",
      )}
    >
      <Icon className={cn("size-4 shrink-0", active ? "text-[var(--mn-accent)]" : "text-muted-foreground")} />
      <span className="text-sm">{children}</span>
      {active && <Check className="ml-auto size-4 shrink-0 text-[var(--mn-accent)]" />}
    </button>
  );
}

export function OnboardingFlow({
  open,
  phase,
  step,
  loginBusy,
  account,
  settings,
  personalization,
  onClose,
  onLogin,
  onSettingsChange,
  onPersonalizationChange,
  onNext,
  onBack,
}: OnboardingFlowProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && phase !== "complete") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open, phase]);

  if (!open) return null;
  const setupStep = steps[step] ?? steps[0];

  return (
    <div className="mn-onboarding-overlay fixed inset-0 z-[80] grid place-items-center p-4 sm:p-8" role="dialog" aria-modal="true" aria-label="mncode onboarding">
      <div className="mn-onboarding-panel relative grid max-h-[min(760px,calc(100vh-32px))] w-full max-w-5xl overflow-auto rounded-lg border border-[var(--mn-line)] bg-[var(--mn-shell)] shadow-[0_32px_100px_rgba(9,10,15,0.28)] lg:grid-cols-[0.92fr_1.08fr] lg:overflow-hidden">
        <button type="button" aria-label="Close onboarding" onClick={onClose} className="absolute right-4 top-4 z-10 rounded-xs p-2 text-muted-foreground transition-colors hover:bg-[var(--mn-surface-muted)] hover:text-foreground">
          <X className="size-4" />
        </button>
        <section className="relative flex min-h-[520px] flex-col p-7 sm:p-10">
          {/* Ambient glow orbs (hero parity) */}
          <div className="pointer-events-none absolute -top-20 left-8 size-72 rounded-full blur-[90px]" style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--mn-accent) 14%, transparent), transparent 70%)" }} />
          <div className="dot-grid-bg pointer-events-none absolute inset-0 opacity-25" />
          {phase === "welcome" && (
            <>
              <div className="relative flex items-center gap-3">
                <img src={mncodeLogo} alt="mncode" className="h-9 w-[132px] object-contain object-left" />
              </div>
              <div className="relative mt-auto max-w-md pb-10 pt-16">
                <div className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs uppercase tracking-[0.18em] text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                  <span className="font-bold text-foreground">2026</span>
                  <i className="pipe-delimiter">|</i>
                  <span className="font-semibold text-foreground">Local Workspace Agent</span>
                  <i className="pipe-delimiter">|</i>
                  <span className="font-bold text-[var(--mn-accent)]">Go 1.24+ Engine</span>
                </div>
                <h1 className="text-4xl font-extralight leading-[0.95] tracking-tighter sm:text-5xl">
                  Welcome to{" "}
                  <span className="font-bold text-foreground">mncode.</span>
                </h1>
                <p className="mt-5 max-w-sm text-base leading-7 text-muted-foreground">Sign in once, then shape the workspace around the way you think and ship.</p>
              </div>
              <Button type="button" onClick={onLogin} disabled={loginBusy} className="mn-accent-button relative h-12 w-full justify-between px-5 text-white hover:text-white">
                {loginBusy ? <><Loader2 className="size-4 animate-spin" /> Signing in…</> : <>Sign in to mncode <ArrowRight className="size-4" /></>}
              </Button>
            </>
          )}
          {phase === "setup" && (
            <>
              <div className="relative flex items-center justify-between pr-8">
                <div>
                  <p className="hud-mono text-muted-foreground">Setup {String(step + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}</p>
                  <div className="mt-3 flex gap-1">{steps.map((item, index) => <span key={item.title} className={cn("h-[3px] transition-all duration-300", index === step ? "w-10 bg-[var(--mn-accent)]" : "w-4 bg-[var(--mn-line)]")} />)}</div>
                </div>
                <Sparkles className="size-5 text-[var(--mn-accent)]" />
              </div>
              <div key={step} className="mn-onboarding-step relative my-auto max-w-lg py-12">
                <p className="eyebrow-badge mb-5">[ Setup · {account.name ? `For ${account.name}` : "Your workspace"} ]</p>
                <h1 className="text-3xl font-extralight leading-tight tracking-tight sm:text-4xl">{setupStep.title}</h1>
                <p className="mt-3 text-base leading-7 text-muted-foreground">{setupStep.detail}</p>
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {step === 0 && <><Choice active={settings.theme === "system"} onClick={() => onSettingsChange({ theme: "system" })} icon={Monitor}>System</Choice><Choice active={settings.theme === "light"} onClick={() => onSettingsChange({ theme: "light" })} icon={Sun}>Light</Choice><Choice active={settings.theme === "dark"} onClick={() => onSettingsChange({ theme: "dark" })} icon={Moon}>Dark</Choice></>}
                  {step === 1 && ["200K", "300K", "500K", "1M"].map((value) => <Choice key={value} active={settings.contextWindow === value} onClick={() => onSettingsChange({ contextWindow: value })} icon={SlidersHorizontal}>{`${value} context`}</Choice>)}
                  {step === 2 && <><Choice active={settings.permissionMode === "ask"} onClick={() => onSettingsChange({ permissionMode: "ask" })} icon={ShieldCheck}>Ask before changes</Choice><Choice active={settings.permissionMode === "plan"} onClick={() => onSettingsChange({ permissionMode: "plan" })} icon={ShieldCheck}>Plan mode</Choice><Choice active={settings.effort === "high"} onClick={() => onSettingsChange({ effort: "high" })} icon={Sparkles}>High effort</Choice><Choice active={settings.effort === "pro max"} onClick={() => onSettingsChange({ effort: "pro max" })} icon={Sparkles}>Pro Max effort</Choice></>}
                  {step === 3 && <><Choice active={personalization.brainrotMode} onClick={() => onPersonalizationChange({ brainrotMode: true, trollMode: true })} icon={BrainCircuit}>Yes, activate Brainrot</Choice><Choice active={!personalization.brainrotMode} onClick={() => onPersonalizationChange({ brainrotMode: false, trollMode: false })} icon={ShieldCheck}>Keep it focused</Choice><p className="col-span-full text-xs leading-5 text-muted-foreground">Brainrot mode automatically enables Troll mode for extra chaotic status updates. Real tools and permissions stay unchanged.</p></>}
                </div>
              </div>
              <div className="relative flex items-center justify-between gap-3">
                <Button type="button" variant="ghost" onClick={onBack} disabled={step === 0} className="gap-2"><ArrowLeft className="size-4" /> Back</Button>
                <Button type="button" onClick={onNext} className="mn-accent-button gap-2 px-5">{step === steps.length - 1 ? "Finish setup" : "Continue"}<ArrowRight className="size-4" /></Button>
              </div>
            </>
          )}
          {phase === "complete" && (
            <div className="relative flex flex-1 flex-col items-center justify-center text-center">
              <p className="eyebrow-badge mb-6">[ Runtime Ready ]</p>
              <div className="mn-onboarding-check grid size-20 place-items-center rounded-full bg-emerald-500 text-white shadow-[0_16px_36px_rgba(16,185,129,0.24)]"><Check className="size-10" strokeWidth={2.5} /></div>
              <h1 className="mt-7 text-4xl font-extralight tracking-tight">You’re <span className="font-bold">all set.</span></h1>
              <p className="mt-3 text-base text-muted-foreground">Opening your workspace now.</p>
            </div>
          )}
        </section>
        <aside className="relative flex min-h-[280px] flex-col justify-end overflow-hidden border-l border-[var(--mn-line)] bg-[var(--mn-surface-muted)] p-8 sm:p-12 lg:min-h-full">
          {/* Ambient glows + dot grid texture */}
          <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full blur-[90px]" style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--mn-accent) 18%, transparent), transparent 70%)" }} />
          <div className="pointer-events-none absolute -bottom-20 -left-12 size-80 rounded-full blur-[90px]" style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--mn-cyan) 14%, transparent), transparent 70%)" }} />
          <div className="dot-grid-bg pointer-events-none absolute inset-0 opacity-30" />
          <div className="relative max-w-md">
            <p className="eyebrow-badge mb-5">[ A Quieter Control Plane ]</p>
            <h2 className="text-4xl font-extralight leading-[0.95] tracking-tighter sm:text-5xl">
              Open fast.
              <br />
              <span className="font-bold">Stay focused.</span>
            </h2>
            <p className="mt-5 max-w-sm text-base leading-7 text-muted-foreground">Pick a workspace, keep your context close, and let the agent surface the next useful move.</p>
            {/* RMIT HUD telemetry strip (hero parity) */}
            <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-7">
              <div className="hud-stat" style={{ borderColor: "var(--mn-accent)" }}>
                <span className="hud-stat-label">Engine Startup</span>
                <span className="hud-stat-value">0.05s</span>
                <span className="hud-stat-sub text-emerald-600 dark:text-emerald-400">&#10003; Local PTY Ready</span>
              </div>
              <div className="hud-stat" style={{ borderColor: "var(--mn-cyan)" }}>
                <span className="hud-stat-label">Slash Commands</span>
                <span className="hud-stat-value">70+ Builtin</span>
                <span className="hud-stat-sub text-[var(--mn-cyan)]">Skills, MCP &amp; Swarms</span>
              </div>
              <div className="hud-stat">
                <span className="hud-stat-label">Quota Routing</span>
                <span className="hud-stat-value">Zero 429</span>
                <span className="hud-stat-sub text-muted-foreground">Auto Account Pool</span>
              </div>
              <div className="hud-stat" style={{ borderColor: "var(--mn-accent)" }}>
                <span className="hud-stat-label">Runtime</span>
                <span className="hud-stat-value flex items-center gap-2"><span className="pulse-beacon" />READY</span>
                <span className="hud-stat-sub text-muted-foreground">mncode core attached</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
