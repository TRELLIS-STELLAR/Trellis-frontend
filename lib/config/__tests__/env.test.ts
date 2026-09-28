import { parseAppConfig } from '../env';

const validLocal = {
  NEXT_PUBLIC_ENVIRONMENT: 'development',
  NEXT_PUBLIC_API_URL: 'http://localhost:3001',
  NEXT_PUBLIC_STELLAR_NETWORK: 'testnet',
};

describe('application environment validation', () => {
  it('accepts a valid local configuration and applies safe feature defaults', () => {
    expect(parseAppConfig(validLocal)).toMatchObject({
      environment: 'development',
      stellarNetwork: 'testnet',
      enableBetaFeatures: false,
    });
  });

  it('reports missing and malformed settings by name without echoing values', () => {
    expect(() => parseAppConfig({ ...validLocal, NEXT_PUBLIC_API_URL: 'not-a-url' })).toThrow(/NEXT_PUBLIC_API_URL/);
    expect(() => parseAppConfig({ ...validLocal, NEXT_PUBLIC_ENABLE_BETA_FEATURES: 'yes' })).toThrow(/NEXT_PUBLIC_ENABLE_BETA_FEATURES/);
    expect(() => parseAppConfig({ NEXT_PUBLIC_API_URL: 'private-value' })).toThrow(/NEXT_PUBLIC_ENVIRONMENT/);
    try {
      parseAppConfig({ ...validLocal, NEXT_PUBLIC_API_URL: 'not-a-url?token-secret' });
    } catch (error) {
      expect(String(error)).not.toContain('token-secret');
    }
  });

  it('rejects insecure deployment and production-like local secrets', () => {
    expect(() => parseAppConfig({
      NEXT_PUBLIC_ENVIRONMENT: 'production',
      NEXT_PUBLIC_API_URL: 'http://api.example.com',
      NEXT_PUBLIC_STELLAR_NETWORK: 'testnet',
    })).toThrow(/HTTPS|mainnet/);
    expect(() => parseAppConfig({
      ...validLocal,
      WEBHOOK_SECRET: 'prod-signing-key-that-is-long-enough-to-pass-minimum',
    })).toThrow(/production-like/);
    expect(() => parseAppConfig({ ...validLocal, WEBHOOK_SECRET: 'placeholder-signing-key-with-enough-characters' })).toThrow(/non-placeholder/);
  });
});
