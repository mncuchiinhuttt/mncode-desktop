import { useEffect, useState } from "react";
import { Circle, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { desktop } from "@/lib/desktop";

export function ReplayRecordingControls({ onComplete }: { onComplete: () => void }) {
  const [recordingID, setRecordingID] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void desktop
      .getReplayRecordingID()
      .then((id) => {
        if (active) setRecordingID(id || null);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Could not read recording state");
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const id = await desktop.startReplayRecording();
      setRecordingID(id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not start recording");
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    setBusy(true);
    setError(null);
    try {
      await desktop.stopReplayRecording();
      setRecordingID(null);
      onComplete();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not stop recording");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {recordingID ? (
        <>
          <span className="font-mono text-[10px] text-rose-700 dark:text-rose-400">REC {recordingID}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void stop()}
            disabled={busy}
            aria-busy={busy}
          >
            <Square className="size-3.5 fill-current" /> {busy ? "Stopping…" : "Stop"}
          </Button>
        </>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => void start()}
          disabled={busy}
          aria-busy={busy}
        >
          <Circle className="size-3.5 fill-rose-400 text-rose-400" /> {busy ? "Checking…" : "Record"}
        </Button>
      )}
      {error && (
        <span role="alert" aria-live="polite" className="max-w-48 truncate text-[10px] text-rose-700 dark:text-rose-400">
          {error}
        </span>
      )}
    </div>
  );
}
