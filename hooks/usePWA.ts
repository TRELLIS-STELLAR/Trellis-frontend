'use client';

import { useState, useEffect, useCallback } from 'react';
import PWAManager from '@/lib/pwa-utils';
import { subscribeDomainEvent, type DomainEventFallbackContext } from '@/lib/domain-events';

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  isServiceWorkerSupported: boolean;
  updateAvailable: boolean;
  connectionStatus: {
    online: boolean;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };
}

/**
 * An event this build cannot read is logged and dropped, never merged into
 * state. The next `updateState()` poll or valid event restores the truth, so a
 * drifted payload degrades to slightly stale UI instead of a wrong value.
 */
function reportUnreadableEvent(context: DomainEventFallbackContext): void {
  console.warn(
    `[usePWA] Ignored unreadable domain event "${context.name}" ` +
      `(${context.reason}, version ${context.receivedVersion ?? 'absent'}): ${context.issues.join('; ')}`,
  );
}

interface UsePWAReturn extends PWAState {
  promptInstall: () => Promise<boolean>;
  updateServiceWorker: () => Promise<void>;
  skipWaiting: () => Promise<void>;
  clearCache: () => Promise<void>;
  getCacheStats: () => Promise<any>;
  requestNotificationPermission: () => Promise<NotificationPermission>;
  showNotification: (title: string, options?: NotificationOptions) => Promise<void>;
  preloadAssets: () => Promise<void>;
}

export function usePWA(): UsePWAReturn {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOnline: true,
    isServiceWorkerSupported: false,
    updateAvailable: false,
    connectionStatus: {
      online: true,
    },
  });

  const [pwaManager] = useState(() => PWAManager.getInstance());

  const updateState = useCallback(() => {
    setState(prev => ({
      ...prev,
      isInstallable: pwaManager.isInstallPromptAvailable(),
      isServiceWorkerSupported: pwaManager.isServiceWorkerSupported(),
      isOnline: navigator.onLine,
      connectionStatus: pwaManager.getConnectionStatus(),
    }));
  }, [pwaManager]);

  useEffect(() => {
    updateState();
    pwaManager.setupConnectionListeners();

    // Every handler below receives a payload that already validated against
    // the registered schema for its version, so the `as EventListener` casts
    // and the `event.detail` reaches are both gone.

    const unsubscribes = [
      subscribeDomainEvent(
        'pwa-install-available',
        () => setState(prev => ({ ...prev, isInstallable: true })),
        { fallback: reportUnreadableEvent },
      ),
      subscribeDomainEvent(
        'pwa-installed',
        () => setState(prev => ({ ...prev, isInstalled: true, isInstallable: false })),
        { fallback: reportUnreadableEvent },
      ),
      subscribeDomainEvent(
        'sw-update',
        () => setState(prev => ({ ...prev, updateAvailable: true })),
        { fallback: reportUnreadableEvent },
      ),
      subscribeDomainEvent(
        'connection-change',
        (payload) =>
          setState(prev => ({
            ...prev,
            isOnline: payload.online,
            connectionStatus: pwaManager.getConnectionStatus(),
          })),
        { fallback: reportUnreadableEvent },
      ),
      subscribeDomainEvent(
        'connection-quality-change',
        (payload) => setState(prev => ({ ...prev, connectionStatus: payload })),
        { fallback: reportUnreadableEvent },
      ),
    ];

    window.addEventListener('online', updateState);
    window.addEventListener('offline', updateState);

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
      window.removeEventListener('online', updateState);
      window.removeEventListener('offline', updateState);
    };
  }, [pwaManager, updateState]);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    const success = await pwaManager.promptInstall();
    if (success) {
      setState(prev => ({ ...prev, isInstalled: true, isInstallable: false }));
    }
    return success;
  }, [pwaManager]);

  const updateServiceWorker = useCallback(async (): Promise<void> => {
    await pwaManager.updateServiceWorker();
  }, [pwaManager]);

  const skipWaiting = useCallback(async (): Promise<void> => {
    await pwaManager.skipWaiting();
    setState(prev => ({ ...prev, updateAvailable: false }));
  }, [pwaManager]);

  const clearCache = useCallback(async (): Promise<void> => {
    await pwaManager.clearCache();
  }, [pwaManager]);

  const getCacheStats = useCallback(async (): Promise<any> => {
    return await pwaManager.getCacheStats();
  }, [pwaManager]);

  const requestNotificationPermission = useCallback(async (): Promise<NotificationPermission> => {
    return await pwaManager.requestNotificationPermission();
  }, [pwaManager]);

  const showNotification = useCallback(async (
    title: string,
    options?: NotificationOptions
  ): Promise<void> => {
    await pwaManager.showNotification(title, options);
  }, [pwaManager]);

  const preloadAssets = useCallback(async (): Promise<void> => {
    await pwaManager.preloadCriticalAssets();
  }, [pwaManager]);

  return {
    ...state,
    promptInstall,
    updateServiceWorker,
    skipWaiting,
    clearCache,
    getCacheStats,
    requestNotificationPermission,
    showNotification,
    preloadAssets,
  };
}
