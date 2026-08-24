import { useEffect, useState } from "react";
import { Check, Copy, Laptop, Link2, RefreshCw, Smartphone, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DesktopRemoteSession } from "@/types";

export function RemoteCompanionDialog({
  open,
  session,
  loading,
  error,
  workspaceReady,
  onOpenChange,
  onOpenWorkspace,
  onStart,
  onRefresh,
  onDisconnect,
}: {
  open: boolean;
  session: DesktopRemoteSession;
  loading: boolean;
  error: string;
  workspaceReady: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenWorkspace: () => void;
  onStart: () => void;
  onRefresh: () => void;
  onDisconnect: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  async function copyPairingLink() {
    if (!session.pairingUrl) return;
    await navigator.clipboard.writeText(session.pairingUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-[var(--mn-line)] bg-[var(--mn-surface)] text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Smartphone className="size-5 text-[var(--mn-accent-strong)]" />
            Remote companion
          </DialogTitle>
          <DialogDescription className="text-sm leading-5">
            Pair a phone with this desktop to steer turns and answer questions while mncode is
            running.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-rose-500/25 bg-rose-500/8 px-3 py-2 text-sm text-rose-700 dark:text-rose-200">
            {error}
          </div>
        )}

        {!session.active ? (
          <div className="rounded-xl border border-dashed border-[var(--mn-line)] bg-[var(--mn-surface-muted)] p-8 text-center">
            <Smartphone className="mx-auto size-8 text-[var(--mn-accent-strong)]" />
            <p className="mt-3 text-base font-medium">
              {workspaceReady ? "Start a private pairing link" : "Open a workspace first"}
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm leading-5 text-muted-foreground">
              {workspaceReady
                ? "The link is scoped to this remote session and can be closed at any time from this dialog."
                : "Remote companion attaches to the active agent workspace. Choose a project, then open this dialog again."}
            </p>
            {workspaceReady ? (
              <Button className="mn-accent-button mt-5" onClick={onStart} disabled={loading}>
                {loading && <RefreshCw className="mr-2 size-4 animate-spin" />}
                Create pairing link
              </Button>
            ) : (
              <Button
                variant="outline"
                className="mt-5 border-[var(--mn-line)]"
                onClick={() => {
                  onOpenChange(false);
                  onOpenWorkspace();
                }}
              >
                Open workspace
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <section className="rounded-xl border border-[var(--mn-line)] bg-[var(--mn-surface-muted)] p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Scan to connect</p>
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-300">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  {session.status}
                </span>
              </div>
              <div className="mx-auto mt-4 grid aspect-square max-w-[210px] place-items-center rounded-xl border border-[var(--mn-line)] bg-white p-3">
                {session.qrCode ? (
                  <img
                    src={session.qrCode}
                    alt="QR code for mncode remote companion"
                    className="size-full"
                  />
                ) : (
                  <Link2 className="size-10 text-slate-400" />
                )}
              </div>
              <p className="mt-3 truncate text-center font-mono text-xs text-muted-foreground">
                {session.sessionId}
              </p>
              <Button
                variant="outline"
                className="mt-3 w-full border-[var(--mn-line)]"
                onClick={() => void copyPairingLink()}
              >
                {copied ? (
                  <Check className="mr-2 size-4 text-emerald-600" />
                ) : (
                  <Copy className="mr-2 size-4" />
                )}
                {copied ? "Copied" : "Copy pairing link"}
              </Button>
            </section>

            <section className="rounded-xl border border-[var(--mn-line)] bg-[var(--mn-surface)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Connected devices</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {session.connectedDevices} device
                    {session.connectedDevices === 1 ? "" : "s"} on this bridge
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onRefresh}
                  disabled={loading}
                  aria-label="Refresh remote devices"
                >
                  <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
                </Button>
              </div>
              <div className="mt-4 space-y-2">
                {session.devices.map((device) => (
                  <div
                    key={device.id}
                    className="flex items-center gap-3 rounded-lg border border-[var(--mn-line)] bg-[var(--mn-surface-muted)] p-3"
                  >
                    <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--mn-accent-soft)] text-[var(--mn-accent-strong)]">
                      {device.status === "Connected" ? (
                        <Smartphone className="size-4" />
                      ) : (
                        <Laptop className="size-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{device.name}</p>
                      <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                        {device.id} · {device.platform}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      <Wifi className="size-3.5" />
                      {device.status}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                The phone appears here after opening the pairing link. Status refreshes
                automatically while this dialog is open.
              </p>
            </section>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {session.active ? (
            <Button
              variant="ghost"
              className="text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-300"
              onClick={onDisconnect}
            >
              Disconnect bridge
            </Button>
          ) : (
            <span />
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
