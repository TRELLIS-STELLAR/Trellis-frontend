export const FEATURE_FLAGS = {
  stableBugReportPagination: {
    env: "TRELLIS_FEATURE_STABLE_BUG_REPORT_PAGINATION",
    defaultValue: true,
  },
  securityReportExport: {
    env: "TRELLIS_FEATURE_SECURITY_REPORT_EXPORT",
    defaultValue: false,
  },
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
}

export function isFeatureEnabled(
  flag: FeatureFlag,
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  const definition = FEATURE_FLAGS[flag];
  return parseBoolean(environment[definition.env], definition.defaultValue);
}

export function getFeatureFlags(
  environment: NodeJS.ProcessEnv = process.env,
): Record<FeatureFlag, boolean> {
  return {
    stableBugReportPagination: isFeatureEnabled(
      "stableBugReportPagination",
      environment,
    ),
    securityReportExport: isFeatureEnabled("securityReportExport", environment),
  };
}
