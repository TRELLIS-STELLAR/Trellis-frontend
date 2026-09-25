import { getFeatureFlags, isFeatureEnabled } from "@/lib/feature-flags";

describe("feature flags", () => {
  it("uses safe defaults when configuration is missing", () => {
    expect(getFeatureFlags({})).toEqual({
      stableBugReportPagination: true,
      securityReportExport: false,
    });
  });

  it("accepts explicit enabled and disabled values", () => {
    expect(
      isFeatureEnabled("stableBugReportPagination", {
        TRELLIS_FEATURE_STABLE_BUG_REPORT_PAGINATION: "false",
      }),
    ).toBe(false);
    expect(
      isFeatureEnabled("securityReportExport", {
        TRELLIS_FEATURE_SECURITY_REPORT_EXPORT: "true",
      }),
    ).toBe(true);
  });
});
