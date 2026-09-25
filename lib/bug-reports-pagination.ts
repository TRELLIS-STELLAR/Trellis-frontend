import type { BugReport } from "@/types/bug-report";

export type BugReportStatus = BugReport["status"];

export interface BugReportPage {
  records: BugReport[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface Cursor {
  createdAt: string;
  id: string;
}

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCursor(value: string | null): Cursor | null {
  if (!value) return null;
  try {
    const cursor = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (typeof cursor.createdAt !== "string" || typeof cursor.id !== "string") {
      return null;
    }
    return cursor;
  } catch {
    return null;
  }
}

export function paginateBugReports(
  reports: readonly BugReport[],
  options: {
    cursor?: string | null;
    limit?: number;
    status?: BugReportStatus | "all";
  } = {},
): BugReportPage {
  const limit = Math.min(Math.max(options.limit ?? 10, 1), 50);
  const filtered = [...reports]
    .filter((report) => !options.status || options.status === "all" || report.status === options.status)
    .sort((left, right) => {
      const dateOrder = right.createdAt.localeCompare(left.createdAt);
      return dateOrder || right.id.localeCompare(left.id);
    });
  const cursor = decodeCursor(options.cursor ?? null);
  const start = cursor
    ? filtered.findIndex(
        (report) =>
          report.createdAt < cursor.createdAt ||
          (report.createdAt === cursor.createdAt && report.id < cursor.id),
      )
    : 0;
  const records = filtered.slice(start, start + limit);
  const last = records.at(-1);

  return {
    records,
    nextCursor:
      start + records.length < filtered.length && last
        ? encodeCursor({ createdAt: last.createdAt, id: last.id })
        : null,
    hasMore: start + records.length < filtered.length,
  };
}
