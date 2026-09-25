import { buildOperationalHealth } from "@/lib/operational-health";
import type { BugReport } from "@/types/bug-report";

const baseReport: BugReport = {
  id: "BR-1",
  title: "Critical issue",
  description: "description",
  stepsToReproduce: "steps",
  expectedBehavior: "expected",
  actualBehavior: "actual",
  priority: "critical",
  category: "functionality",
  screenshots: [],
  reporterAddress: "private-address",
  reporterEmail: "private@example.com",
  status: "submitted",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  rewardAmount: 10,
  rewardStatus: "pending",
};

test("aggregates actionable categories without exposing report details", () => {
  const health = buildOperationalHealth([baseReport], Date.parse("2026-01-10T00:00:00.000Z"));
  expect(health.categories.map((category) => category.count)).toEqual([1, 1, 0, 1]);
  expect(JSON.stringify(health)).not.toContain("private@example.com");
  expect(JSON.stringify(health)).not.toContain("private-address");
});
