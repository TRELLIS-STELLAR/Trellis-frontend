import fs from 'node:fs';
import path from 'node:path';

type LocaleValues = { [key: string]: string | LocaleValues };

function flattenKeys(value: LocaleValues, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    return typeof child === 'string' ? [fullKey] : flattenKeys(child, fullKey);
  });
}

// TODO(#5): remove these keys from the allowlist as the four locale PRs land.
// Keeping the exact known gaps (rather than skipping these locales) means a new
// English key or any other translation drift still fails this test.
const knownMissingWaitlistKeys = [
  'waitlist.title',
  'waitlist.subtitle',
  'waitlist.description',
  'waitlist.limitedSpots',
  'waitlist.peopleWaiting',
  'waitlist.earlyAccess',
  'waitlist.reserveSpot',
  'waitlist.reserveDescription',
  'waitlist.emailPlaceholder',
  'waitlist.joinButton',
  'waitlist.joining',
  'waitlist.noSpam',
  'waitlist.premiumBenefits',
  'waitlist.benefits.earlyAccess.title',
  'waitlist.benefits.earlyAccess.description',
  'waitlist.benefits.exclusiveDiscounts.title',
  'waitlist.benefits.exclusiveDiscounts.description',
  'waitlist.benefits.prioritySupport.title',
  'waitlist.benefits.prioritySupport.description',
  'waitlist.benefits.betaFeatures.title',
  'waitlist.benefits.betaFeatures.description',
  'waitlist.benefits.communityAccess.title',
  'waitlist.benefits.communityAccess.description',
  'waitlist.benefits.enhancedAnalytics.title',
  'waitlist.benefits.enhancedAnalytics.description',
  'waitlist.readyTitle',
  'waitlist.readyDescription',
  'waitlist.joinNowButton',
  'waitlist.success.title',
  'waitlist.success.message',
  'waitlist.success.checkEmail',
  'waitlist.success.addAnother',
];

const expectedMissingByLocale: Record<string, string[]> = {
  ar: knownMissingWaitlistKeys,
  ko: knownMissingWaitlistKeys,
  pt: knownMissingWaitlistKeys,
  ru: knownMissingWaitlistKeys,
};

const localeDirectory = path.join(__dirname, '../../i18n');

describe('i18n key parity', () => {
  it('keeps each locale aligned with English except for explicitly tracked translation gaps', () => {
    const english = JSON.parse(
      fs.readFileSync(path.join(localeDirectory, 'en.json'), 'utf8')
    ) as LocaleValues;
    const englishKeys = flattenKeys(english).sort();
    const englishSet = new Set(englishKeys);
    const differences: string[] = [];

    const localeFiles = fs
      .readdirSync(localeDirectory)
      .filter((file) => file.endsWith('.json') && file !== 'en.json')
      .sort();

    for (const file of localeFiles) {
      const locale = path.basename(file, '.json');
      const translated = JSON.parse(
        fs.readFileSync(path.join(localeDirectory, file), 'utf8')
      ) as LocaleValues;
      const translatedKeys = flattenKeys(translated).sort();
      const translatedSet = new Set(translatedKeys);
      const missing = englishKeys.filter((key) => !translatedSet.has(key));
      const extra = translatedKeys.filter((key) => !englishSet.has(key));
      const expectedMissing = expectedMissingByLocale[locale] ?? [];

      if (
        JSON.stringify(missing) !== JSON.stringify([...expectedMissing].sort()) ||
        extra.length > 0
      ) {
        differences.push(
          `${locale}: missing [${missing.join(', ')}]; extra [${extra.join(', ')}]`
        );
      }
    }

    expect(differences).toEqual([]);
  });
});
