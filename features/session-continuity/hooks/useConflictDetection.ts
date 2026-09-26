import { useState, useCallback } from "react";
import { detectConflict, ConflictInfo, getRecoveryActions, RecoveryAction } from "../../../lib/concurrency";

export interface ConflictState {
  hasConflict: boolean;
  conflict: ConflictInfo | null;
  recoveryActions: RecoveryAction[];
}

/**
 * Hook to detect and manage concurrent edit conflicts
 */
export function useConflictDetection() {
  const [state, setState] = useState<ConflictState>({
    hasConflict: false,
    conflict: null,
    recoveryActions: [],
  });

  const checkForConflict = useCallback(
    (
      localVersion: number,
      serverVersion: number,
      deviceId: string,
      serverDeviceId: string,
      resourceId: string,
    ) => {
      const conflict = detectConflict(localVersion, serverVersion, deviceId, serverDeviceId);
      if (conflict) {
        conflict.resourceId = resourceId;
        const actions = getRecoveryActions(conflict);
        setState({
          hasConflict: true,
          conflict,
          recoveryActions: actions,
        });
        return true;
      }
      setState({
        hasConflict: false,
        conflict: null,
        recoveryActions: [],
      });
      return false;
    },
    [],
  );

  const resolveConflict = useCallback(
    (action: "retry" | "refresh" | "merge" | "discard") => {
      setState({
        hasConflict: false,
        conflict: null,
        recoveryActions: [],
      });
      return action;
    },
    [],
  );

  const clearConflict = useCallback(() => {
    setState({
      hasConflict: false,
      conflict: null,
      recoveryActions: [],
    });
  }, []);

  return {
    ...state,
    checkForConflict,
    resolveConflict,
    clearConflict,
  };
}
