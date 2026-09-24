# Storybook Setup Instructions

This folder contains the Storybook configuration for the Trellis component library. Follow these steps to complete the setup.

## Installation

Install the required Storybook dependencies:

```bash
npm install -D \
  @storybook/react \
  @storybook/nextjs \
  @storybook/addon-links \
  @storybook/addon-essentials \
  @storybook/addon-onboarding \
  @storybook/addon-interactions \
  @storybook/addon-a11y \
  @storybook/addon-styling-webpack \
  storybook
```

Or if you prefer a single command:

```bash
npm install -D @storybook/react @storybook/nextjs @storybook/addon-links @storybook/addon-essentials @storybook/addon-onboarding @storybook/addon-interactions @storybook/addon-a11y @storybook/addon-styling-webpack storybook
```

## Running Storybook

After installation, start Storybook with:

```bash
npm run storybook
```

This will open Storybook at `http://localhost:6006`.

## Configuration Files

- `main.ts` - Main Storybook configuration
- `preview.tsx` - Preview settings and global decorators

## Next Steps

1. Install the dependencies as shown above
2. Run `npm run storybook` to start Storybook
3. Navigate to `http://localhost:6006` to view the stories
4. Review existing stories in `components/Button.stories.tsx` and `components/Card.stories.tsx`
5. Add more stories for other components following the same pattern
6. See `../STORYBOOK.md` for detailed documentation

## Lighthouse CI Setup

Lighthouse CI configuration is available in `.lighthouserc.json` and `.github/workflows/lighthouse.yml`.

To run Lighthouse CI locally:

```bash
npm install -g @lhci/cli@0.12.x
lhci autorun --config=.lighthouserc.json
```

## Troubleshooting

If you encounter issues:

1. Clear node_modules and reinstall: `rm -rf node_modules && npm install`
2. Check that all configuration files are in place
3. Ensure you're using Node.js 18 or later
4. Review Storybook documentation at https://storybook.js.org/docs/

## CI/CD Integration

The Lighthouse workflow (`.github/workflows/lighthouse.yml`) can be enabled once:

1. All Lighthouse dependencies are installed
2. The project builds successfully
3. Storybook can be built with `npm run build-storybook`
