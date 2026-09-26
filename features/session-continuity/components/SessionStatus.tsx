"use client";

import { useEffect, useState } from "react";

interface SessionStatusProps {
  deviceId?: string;
  isOnline?: boolean;
}

/**
 * Shows current session and device information
 */
export function SessionStatus({ deviceId, isOnline = true }: SessionStatusProps) {
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "error">("synced");

  useEffect(() => {
    const handleOnline = () => setSyncStatus("synced");
    const handleOffline = () => setSyncStatus("error");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const statusColor = {
    synced: "text-green-600",
    syncing: "text-amber-600",
    error: "text-red-600",
  }[syncStatus];

  const statusLabel = {
    synced: "Synced",
    syncing: "Syncing...",
    error: "Offline",
  }[syncStatus];

  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 w-2 rounded-full ${statusColor.replace("text-", "bg-")}`} />
      <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
      {deviceId && <span className="text-xs text-gray-500">({deviceId.slice(0, 8)}...)</span>}
    </div>
  );
}
