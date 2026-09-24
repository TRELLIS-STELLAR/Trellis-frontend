import fs from 'fs';
import path from 'path';

function flattenKeys(obj: Record<string, any>, prefix = ''): string[] {
  let keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys = keys.concat(flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

describe('i18n Parity Check', () => {
  const i18nDir = path.resolve(process.cwd(), 'i18n');
  const enPath = path.join(i18nDir, 'en.json');

  if (!fs.existsSync(enPath)) {
    throw new Error('en.json reference file not found');
  }

  const enContent = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const enKeys = flattenKeys(enContent);

  const localeFiles = fs
    .readdirSync(i18nDir)
    .filter((file) => file.endsWith('.json') && file !== 'en.json');

  it('should have all i18n json files matching en.json keys', () => {
    const failures: string[] = [];

    for (const file of localeFiles) {
      const filePath = path.join(i18nDir, file);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const localeKeys = flattenKeys(content);

      const missingKeys = enKeys.filter((k) => !localeKeys.includes(k));
      const extraKeys = localeKeys.filter((k) => !enKeys.includes(k));

      if (missingKeys.length > 0 || extraKeys.length > 0) {
        let report = `\n--- Locale File: ${file} ---`;
        if (missingKeys.length > 0) {
          report += `\n  Missing ${missingKeys.length} key(s):\n    - ${missingKeys.join('\n    - ')}`;
        }
        if (extraKeys.length > 0) {
          report += `\n  Extra ${extraKeys.length} key(s):\n    - ${extraKeys.join('\n    - ')}`;
        }
        failures.push(report);
      }
    }

    if (failures.length > 0) {
      throw new Error(`i18n Parity Mismatch Found:\n${failures.join('\n')}`);
    }
  });
});
