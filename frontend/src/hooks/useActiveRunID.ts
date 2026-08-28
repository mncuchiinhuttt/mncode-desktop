import { useRef } from "react";

/**
 * Tracks the active run ID for event filtering.
 * Events from stale runs (chat switched, cancelled) are ignored.
 */
export function useActiveRunID() {
  const activeRunIDRef = useRef<number>(0);

  const setActiveRunID = (runID: number) => {
    activeRunIDRef.current = runID;
  };

  const clearActiveRunID = () => {
    activeRunIDRef.current = 0;
  };

  const isActiveRun = (runID: number): boolean => {
    if (runID === 0) return false;
    return activeRunIDRef.current === runID;
  };

  return { setActiveRunID, clearActiveRunID, isActiveRun };
}
