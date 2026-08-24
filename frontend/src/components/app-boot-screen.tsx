import { Check, Loader2 } from "lucide-react";
import mncodeLogo from "@/assets/images/mncode-logo.svg";

export function AppBootScreen({ phase }: { phase: "loading" | "exiting" }) {
  const exiting = phase === "exiting";
  return (
    <div
      className={`mn-boot-screen fixed inset-0 z-[140] grid place-items-center ${exiting ? "is-exiting" : ""}`}
      aria-live="polite"
      aria-label={exiting ? "mncode ready" : "Starting mncode"}
    >
      <div className="mn-boot-aura" />
      <div className="mn-boot-lockup">
        <div className="mn-boot-logo-frame">
          <img src={mncodeLogo} alt="mncode" className="mn-boot-logo" />
          <span className="mn-boot-scan" />
        </div>
        <div className="mn-boot-status">
          <span className="mn-boot-status-icon">
            {exiting ? <Check className="size-3" /> : <Loader2 className="size-3 animate-spin" />}
          </span>
          <span className="font-mono text-[0.75rem] uppercase tracking-[0.14em]">
            {exiting ? "[ Ready ]" : "[ Booting local workspace ]"}
          </span>
          <span className="mn-boot-status-code">mncode desktop</span>
        </div>
      </div>
    </div>
  );
}
