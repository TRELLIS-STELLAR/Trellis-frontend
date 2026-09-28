import { z } from 'zod';

const booleanFlag = z.enum(['true', 'false']).transform((value) => value === 'true');

const environmentSchema = z.enum(['development', 'staging', 'production']);
const networkSchema = z.enum(['testnet', 'mainnet']);

const rawEnvironmentSchema = z.object({
  NEXT_PUBLIC_ENVIRONMENT: environmentSchema,
  NEXT_PUBLIC_API_URL: z.string().trim().url(),
  NEXT_PUBLIC_STELLAR_NETWORK: networkSchema,
  NEXT_PUBLIC_ENABLE_BETA_FEATURES: booleanFlag.optional().default(false),
  WEBHOOK_SECRET: z.string().optional(),
});

export type AppEnvironment = z.infer<typeof environmentSchema>;
export type StellarNetwork = z.infer<typeof networkSchema>;

export interface AppConfig {
  environment: AppEnvironment;
  apiUrl: URL;
  stellarNetwork: StellarNetwork;
  enableBetaFeatures: boolean;
}

const DEVELOPMENT_SECRET_PATTERNS = [/^your[_-]/i, /^change[_-]?me/i, /^example/i, /^placeholder/i, /^secret$/i];

/** Parse and validate the public app configuration without ever including values in errors. */
export function parseAppConfig(source: NodeJS.ProcessEnv): AppConfig {
  const parsed = rawEnvironmentSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues.map(({ path, message }) => `  - ${String(path[0])}: ${message}`);
    throw new Error(`Invalid application configuration:\n${details.join('\n')}`);
  }

  const values = parsed.data;
  const problems: string[] = [];
  const apiUrl = new URL(values.NEXT_PUBLIC_API_URL);
  const isLocalApi = apiUrl.hostname === 'localhost' || apiUrl.hostname === '127.0.0.1' || apiUrl.hostname === '::1';

  if (values.NEXT_PUBLIC_ENVIRONMENT === 'production' && apiUrl.protocol !== 'https:') {
    problems.push('NEXT_PUBLIC_API_URL must use HTTPS in production.');
  }
  if (!isLocalApi && apiUrl.protocol !== 'https:') {
    problems.push('NEXT_PUBLIC_API_URL must use HTTPS outside local development.');
  }
  if (values.NEXT_PUBLIC_ENVIRONMENT !== 'development' && isLocalApi) {
    problems.push('NEXT_PUBLIC_API_URL cannot point to localhost outside development.');
  }
  if (values.NEXT_PUBLIC_ENVIRONMENT !== 'development' && values.NEXT_PUBLIC_STELLAR_NETWORK === 'testnet') {
    problems.push('NEXT_PUBLIC_STELLAR_NETWORK must be mainnet outside development.');
  }

  const webhookSecret = values.WEBHOOK_SECRET?.trim();
  if (webhookSecret && (webhookSecret.length < 32 || DEVELOPMENT_SECRET_PATTERNS.some((pattern) => pattern.test(webhookSecret)))) {
    problems.push('WEBHOOK_SECRET must be a non-placeholder secret of at least 32 characters.');
  }
  if (values.NEXT_PUBLIC_ENVIRONMENT === 'development' && webhookSecret && /^(prod|production|live)[-_]/i.test(webhookSecret)) {
    problems.push('WEBHOOK_SECRET appears production-like and cannot be used in development.');
  }

  if (problems.length) throw new Error(`Invalid application configuration:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);

  return {
    environment: values.NEXT_PUBLIC_ENVIRONMENT,
    apiUrl,
    stellarNetwork: values.NEXT_PUBLIC_STELLAR_NETWORK,
    enableBetaFeatures: values.NEXT_PUBLIC_ENABLE_BETA_FEATURES,
  };
}

export function getAppConfig(): AppConfig {
  return parseAppConfig(process.env);
}
