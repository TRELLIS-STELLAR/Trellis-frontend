import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SessionSyncEventName,
  SessionSyncMessage,
  SessionSyncPayload,
  SessionTabSync,
} from '../tab-sync';

export function useSessionTabSync() {
  const sync = useMemo(() => new SessionTabSync(), []);
  const [lastMessage, setLastMessage] = useState<SessionSyncMessage | null>(null);
  useEffect(() => { const unsubscribe = sync.subscribe(setLastMessage); return () => { unsubscribe(); sync.close(); }; }, [sync]);
  const publish = useCallback(
    <TName extends SessionSyncEventName>(event: TName, payload: SessionSyncPayload<TName>) => sync.publish(event, payload),
    [sync],
  );
  return { lastMessage, publish };
}
