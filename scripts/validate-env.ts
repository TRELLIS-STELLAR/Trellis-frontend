import { getAppConfig } from '../lib/config/env';

try {
  const config = getAppConfig();
  console.info(`Environment configuration valid (${config.environment}, Stellar ${config.stellarNetwork}).`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Invalid application configuration.');
  process.exitCode = 1;
}
