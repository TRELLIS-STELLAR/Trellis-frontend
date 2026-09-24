import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

const Card = ({ children, title, description }: any) => (
  <div className="bg-white dark:bg-trellis-ground border border-gray-200 dark:border-trellis-vine/20 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
    {title && <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>}
    {description && <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{description}</p>}
    <div className="text-gray-700 dark:text-gray-300">{children}</div>
  </div>
);

const meta = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: { type: 'text' },
    },
    description: {
      control: { type: 'text' },
    },
    children: {
      control: { type: 'text' },
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Card Title',
    description: 'This is a card component',
    children: 'Card content goes here',
  },
};

export const WithLongContent: Story = {
  args: {
    title: 'Detailed Information',
    description: 'A card with longer content',
    children: (
      <div>
        <p className="mb-2">This is a card component showcasing how it renders with longer text content.</p>
        <p>Cards are versatile containers for grouping related information and actions.</p>
      </div>
    ),
  },
};

export const StatsCard: Story = {
  render: () => (
    <div className="flex gap-4">
      <Card title="Total Users" description="Last 30 days">
        <div className="text-3xl font-bold text-trellis-vine">1,234</div>
      </Card>
      <Card title="Active Sessions" description="Right now">
        <div className="text-3xl font-bold text-trellis-leaf">156</div>
      </Card>
      <Card title="Conversion Rate" description="Last 30 days">
        <div className="text-3xl font-bold text-amber-500">3.2%</div>
      </Card>
    </div>
  ),
};
