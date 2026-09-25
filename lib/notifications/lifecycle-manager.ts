import {
  LifecycleNotification,
  LifecycleEventType,
  NotificationSeverity,
  NotificationFilterOptions,
} from './lifecycle-types';

class LifecycleNotificationManager {
  private notifications: Map<string, LifecycleNotification> = new Map();
  private dedupKeys: Set<string> = new Set();

  /**
   * Dispatch a lifecycle notification.
   * Enforces deduplication using dedupKey so retries never create duplicate alerts.
   */
  dispatch(
    event: Omit<LifecycleNotification, 'id' | 'isRead' | 'dismissed' | 'createdAt'> & {
      dedupKey?: string;
    }
  ): { notification: LifecycleNotification | null; isDuplicate: boolean } {
    const dedupKey =
      event.dedupKey ||
      `${event.type}_${event.recipientWallet || 'all'}_${event.title}_${JSON.stringify(event.metadata || {})}`;

    if (this.dedupKeys.has(dedupKey)) {
      return { notification: null, isDuplicate: true };
    }

    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const notification: LifecycleNotification = {
      ...event,
      id,
      dedupKey,
      audience: event.audience || 'user',
      isRead: false,
      dismissed: false,
      createdAt: new Date().toISOString(),
    };

    this.notifications.set(id, notification);
    this.dedupKeys.add(dedupKey);

    return { notification, isDuplicate: false };
  }

  /**
   * Retrieve notifications targeted to a specific wallet (or broadcast audience).
   * Ensures private notifications are never leaked to the wrong user.
   */
  getForUser(
    walletAddress?: string,
    options: NotificationFilterOptions = {}
  ): LifecycleNotification[] {
    const all = Array.from(this.notifications.values());

    let filtered = all.filter((n) => {
      if (n.dismissed) return false;

      // Privacy / Targeting filtering
      if (n.audience === 'all') return true;
      if (n.recipientWallet) {
        if (!walletAddress) return false;
        return n.recipientWallet.toLowerCase() === walletAddress.toLowerCase();
      }
      return true;
    });

    if (options.unreadOnly) {
      filtered = filtered.filter((n) => !n.isRead);
    }

    if (options.severity) {
      filtered = filtered.filter((n) => n.severity === options.severity);
    }

    if (options.type) {
      filtered = filtered.filter((n) => n.type === options.type);
    }

    // Sort newest first
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (options.limit && options.limit > 0) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  markAsRead(id: string): boolean {
    const notif = this.notifications.get(id);
    if (!notif) return false;
    notif.isRead = true;
    notif.readAt = new Date().toISOString();
    return true;
  }

  markAllAsRead(walletAddress?: string): number {
    const notifs = this.getForUser(walletAddress, { unreadOnly: true });
    notifs.forEach((n) => {
      n.isRead = true;
      n.readAt = new Date().toISOString();
    });
    return notifs.length;
  }

  dismiss(id: string): boolean {
    const notif = this.notifications.get(id);
    if (!notif) return false;
    notif.dismissed = true;
    return true;
  }

  clear(): void {
    this.notifications.clear();
    this.dedupKeys.clear();
  }
}

export const lifecycleNotifications = new LifecycleNotificationManager();
