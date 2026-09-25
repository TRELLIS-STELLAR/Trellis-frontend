'use client';

import React, { useState } from 'react';
import { LifecycleNotification } from '@/lib/notifications/lifecycle-types';
import { lifecycleNotifications } from '@/lib/notifications/lifecycle-manager';

export interface NotificationCenterProps {
  walletAddress?: string;
  onSelectAction?: (actionId: string, notif: LifecycleNotification) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  walletAddress,
  onSelectAction,
}) => {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const notifications = lifecycleNotifications.getForUser(walletAddress, { unreadOnly });
  const unreadCount = lifecycleNotifications.getForUser(walletAddress, { unreadOnly: true }).length;

  const handleMarkRead = (id: string) => {
    lifecycleNotifications.markAsRead(id);
    setRefreshKey((k) => k + 1);
  };

  const handleDismiss = (id: string) => {
    lifecycleNotifications.dismiss(id);
    setRefreshKey((k) => k + 1);
  };

  const handleMarkAllRead = () => {
    lifecycleNotifications.markAllAsRead(walletAddress);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-4 text-white">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold bg-purple-600 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={`text-xs px-2 py-1 rounded transition ${
              unreadOnly ? 'bg-neutral-800 text-purple-400' : 'text-neutral-400 hover:text-white'
            }`}
          >
            {unreadOnly ? 'All' : 'Unread'}
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-purple-400 hover:text-purple-300 font-medium"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-2 max-h-96 overflow-y-auto pr-1">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 text-sm">
            No notifications to display
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-3 rounded-lg border transition ${
                n.isRead ? 'bg-neutral-950 border-neutral-800/60' : 'bg-neutral-800/40 border-neutral-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded font-semibold uppercase ${
                    n.severity === 'critical'
                      ? 'bg-red-900/50 text-red-300 border border-red-700/50'
                      : n.severity === 'warning'
                      ? 'bg-amber-900/50 text-amber-300 border border-amber-700/50'
                      : n.severity === 'success'
                      ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50'
                      : 'bg-blue-900/50 text-blue-300 border border-blue-700/50'
                  }`}
                >
                  {n.severity}
                </span>
                <button
                  onClick={() => handleDismiss(n.id)}
                  className="text-neutral-500 hover:text-neutral-300 text-xs"
                  title="Dismiss"
                >
                  ✕
                </button>
              </div>

              <h4 className="font-medium text-sm mt-1 text-white">{n.title}</h4>
              <p className="text-xs text-neutral-300 mt-1">{n.message}</p>

              {n.recoveryAction && (
                <div className="mt-2.5 pt-2 border-t border-neutral-800/60 flex items-center justify-between">
                  <a
                    href={n.recoveryAction.href || n.deepLink || '#'}
                    onClick={() => {
                      handleMarkRead(n.id);
                      if (onSelectAction && n.recoveryAction) {
                        onSelectAction(n.recoveryAction.actionId, n);
                      }
                    }}
                    className="text-xs font-semibold px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white inline-flex items-center gap-1"
                  >
                    {n.recoveryAction.label} →
                  </a>
                  {!n.isRead && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="text-xs text-neutral-400 hover:text-white"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
