# Storybook Setup

This document provides guidance on using Storybook for the Trellis component library.

## Overview

Storybook is a tool for developing and documenting UI components in isolation. It provides an interactive environment where you can:

- Develop components without needing to run the full application
- Document component APIs and usage patterns
- Test component states and variations
- Share a living component library with the team

## Getting Started

### Running Storybook

To start Storybook in development mode:

```bash
npm run storybook
```

This will open Storybook at `http://localhost:6006`.

### Building Storybook

To build a static version of Storybook for deployment:

```bash
npm run build-storybook
```

## Writing Stories

Stories are files that document how components should be used. Each story file should follow this pattern:

### File Structure

Create `.stories.tsx` files in the same directory as your components:

```
components/
├── Button.tsx
├── Button.stories.tsx
├── Card.tsx
└── Card.stories.tsx
```

### Basic Story Template

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import MyComponent from './MyComponent';

const meta = {
  title: 'Components/MyComponent',
  component: MyComponent,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof MyComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // Default props
  },
};

export const Variant: Story = {
  args: {
    // Variant props
  },
};
```

## Theme Support

Storybook is configured with theme support for both light and dark modes using Material-UI theming.

### Styling Components

Use Tailwind CSS classes and ensure you support both light and dark themes:

```tsx
<div className="bg-white dark:bg-trellis-ground text-gray-900 dark:text-white">
  Content
</div>
```

## Documentation

Stories with `tags: ['autodocs']` automatically generate documentation pages. You can enhance them with:

- **Args Tables**: Document component props
- **Controls**: Interactive prop editing
- **Source Code**: Show component implementation

## Addons

The Storybook setup includes:

- **Essentials**: Basic addons (controls, actions, viewport, etc.)
- **Interactions**: Test user interactions in stories
- **Accessibility**: Check component accessibility
- **Styling**: Support for CSS/SCSS preprocessing

## CI/CD Integration

To integrate Storybook into CI/CD:

1. Build Storybook: `npm run build-storybook`
2. Deploy the generated `storybook-static` directory
3. Run visual regression tests if needed

## Migrating Components to Storybook

When adding new components:

1. Create the component in `components/` or `features/*/components/`
2. Write stories in a `.stories.tsx` file
3. Test all component states and variations
4. Update the component library README with links to stories

## Tips and Best Practices

- Keep stories focused on a single component
- Cover all important states (disabled, loading, error, etc.)
- Use meaningful story names
- Document complex component props
- Keep stories up-to-date with component changes
- Use controls to allow interactive exploration

## Resources

- [Storybook Documentation](https://storybook.js.org/docs/)
- [Storybook for Next.js](https://storybook.js.org/docs/react/configure/frameworks/nextjs)
- [Writing Stories](https://storybook.js.org/docs/react/writing-stories/introduction)
- [MDX Documentation](https://storybook.js.org/docs/react/writing-docs/mdx)
