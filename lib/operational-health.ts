import type { BugReport } from "@/types/bug-report";

export interface OperationalHealth {
  generatedAt: string;
  categories: Array<{
    key: "unresolved-exceptions" | "stale-records" | "reconciliation-drift" | "user-incidents";
    label: string;
    count: number;
    severity: "info" | "warning" | "critical";
    href: string;
  }>;
}

export function buildOperationalHealth(
  reports: readonly BugReport[],
  now = Date.now(),
  staleAfterMs = 7 * 24 * 60 * 60 * 1000,
): OperationalHealth {
  const unresolved = reports.filter((report) => report.status !== "resolved");
  const stale = unresolved.filter(
    (report) => now - Date.parse(report.updatedAt) >= staleAfterMs,
  );
  const drift = reports.filter(
    (report) => report.status === "resolved" && report.rewardStatus === "pending",
  );
  const incidents = reports.filter(
    (report) => report.priority === "critical" && report.status !== "resolved",
  );

  return {
    generatedAt: new Date(now).toISOString(),
    categories: [
      {
        key: "unresolved-exceptions",
        label: "Unresolved exceptions",
        count: unresolved.length,
        severity: unresolved.length > 0 ? "warning" : "info",
        href: "/bug-reports?status=all",
      },
      {
        key: "stale-records",
        label: "Stale records",
        count: stale.length,
        severity: stale.length > 0 ? "warning" : "info",
        href: "/bug-reports?status=all&stale=true",
      },
      {
        key: "reconciliation-drift",
        label: "Reconciliation drift",
        count: drift.length,
        severity: drift.length > 0 ? "critical" : "info",
        href: "/bug-reports?status=resolved",
      },
      {
        key: "user-incidents",
        label: "User-impacting incidents",
        count: incidents.length,
        severity: incidents.length > 0 ? "critical" : "info",
        href: "/bug-reports?status=all&priority=critical",
      },
    ],
  };
}
