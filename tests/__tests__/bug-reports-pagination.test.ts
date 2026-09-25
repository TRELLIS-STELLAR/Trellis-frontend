import { paginateBugReports } from "@/lib/bug-reports-pagination";
import type { BugReport } from "@/types/bug-report";

function report(id: string, createdAt: string, status: BugReport["status"] = "submitted"): BugReport {
  return {
    id,
    title: id,
    description: "A report description that is long enough for a test.",
    stepsToReproduce: "Open the page",
    expectedBehavior: "The page works",
    actualBehavior: "The page does not work",
    priority: "medium",
    category: "functionality",
    screenshots: [],
    reporterAddress: "redacted",
    status,
    createdAt,
    updatedAt: createdAt,
    rewardAmount: 10,
    rewardStatus: status === "resolved" ? "pending" : "pending",
  };
}

describe("paginateBugReports", () => {
  it("keeps a deterministic cursor across inserts", () => {
    const initial = [report("three", "2026-01-03"), report("two", "2026-01-02"), report("one", "2026-01-01")];
    const firstPage = paginateBugReports(initial, { limit: 2 });
    const secondPage = paginateBugReports(
      [report("four", "2026-01-04"), ...initial],
      { cursor: firstPage.nextCursor, limit: 2 },
    );

    expect(firstPage.records.map((item) => item.id)).toEqual(["three", "two"]);
    expect(secondPage.records.map((item) => item.id)).toEqual(["one"]);
  });

  it("applies status filters before paging", () => {
    const page = paginateBugReports(
      [report("resolved", "2026-01-02", "resolved"), report("open", "2026-01-01")],
      { status: "resolved", limit: 10 },
    );

    expect(page.records.map((item) => item.id)).toEqual(["resolved"]);
  });

  it("continues after a record is deleted", () => {
    const initial = [report("three", "2026-01-03"), report("two", "2026-01-02"), report("one", "2026-01-01")];
    const firstPage = paginateBugReports(initial, { limit: 2 });
    const secondPage = paginateBugReports(
      [report("three", "2026-01-03"), report("one", "2026-01-01")],
      { cursor: firstPage.nextCursor, limit: 2 },
    );

    expect(secondPage.records.map((item) => item.id)).toEqual(["one"]);
  });
});
