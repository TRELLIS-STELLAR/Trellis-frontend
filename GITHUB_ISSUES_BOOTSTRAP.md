# GitHub Issues Bootstrap - Good First Issues

This document contains 10 ready-to-use "good first issues" specifically tailored to this repository's tech stack. Each issue contains all the information a new contributor needs to get started.

---

## Issue 1: Fix hydration warning in layout.tsx
**Title**: fix: Remove suppressHydrationWarning from body tag in layout.tsx
**Labels**: good first issue, bug, frontend
**Description**:
```
Currently in `app/layout.tsx` line 118, the body tag has `suppressHydrationWarning` which is being used to bypass a hydration mismatch warning. We should fix the underlying issue instead of suppressing it.

**Location**: `app/layout.tsx#L118`
**Tech**: Next.js 16, React 18
**Difficulty**: Easy
**Steps to fix**:
1. Identify what's causing the hydration mismatch
2. Fix the root cause
3. Remove the suppressHydrationWarning attribute
4. Test that the app still renders correctly without console warnings

**Resources**:
- Next.js hydration docs: https://nextjs.org/docs/messages/react-hydration-error
```

---

## Issue 2: Add missing TypeScript types to Stellar SDK functions
**Title**: feat: Add proper TypeScript types for Stellar SDK interactions
**Labels**: good first issue, typescript, blockchain
**Description**:
```
Several functions in the Stellar integration files are using `any` types. Let's add proper TypeScript interfaces for wallet transactions and responses.

**Files to update**: Look for files importing @stellar/stellar-sdk
**Tech**: TypeScript, Stellar SDK
**Difficulty**: Easy
**What needs to be done**:
1. Find all instances of `any` type in Stellar-related code
2. Create proper interfaces for Transaction, Account, and Response types
3. Update functions to use these interfaces
4. Run `npm run lint` to ensure no errors

**Estimated time**: 2-3 hours
```

---

## Issue 3: Improve accessibility - Add alt text to all theme images
**Title**: feat: Add proper alt text to all images in the Trellis theme
**Labels**: good first issue, accessibility, frontend
**Description**:
```
Many images across the codebase are missing alt text attributes, which hurts accessibility. Let's add descriptive alt text to all images in the Trellis UI components.

**Search for**: `<img` tags without alt attributes in components
**Tech**: React, Material UI, accessibility
**Difficulty**: Very Easy
**Files to check**:
- app/globals.css for background images
- Components in components/ directory
- Any image elements in page files

**Resources**:
- MDN alt text guide: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#alt
```

---

## Issue 4: Add unit tests for Zustand store
**Title**: test: Add unit tests for the primary Zustand store
**Labels**: good first issue, testing, state-management
**Description**:
```
The Zustand store in `store/` is missing unit tests. Let's add basic tests to ensure all actions work correctly.

**File**: `store/[main-store-file].ts`
**Tech**: Jest, React Testing Library, Zustand
**Difficulty**: Easy
**Tests to add**:
1. Test initial state is correctly set
2. Test all action creators properly update state
3. Test selectors work as expected
4. Run `npm run test:coverage` to verify coverage improves

**Resources**:
- Zustand testing guide: https://docs.pmnd.rs/zustand/guides/testing
```

---

## Issue 5: Fix console warning about duplicate react-i18next imports
**Title**: fix: Remove duplicate react-i18next imports in package.json
**Labels**: good first issue, bug, dependencies
**Description**:
```
Looking at package.json, there are duplicate entries for react-i18next and react-redux. Let's clean this up to avoid npm warnings.

**File**: `package.json`
**Tech**: npm, package management
**Difficulty**: Very Easy
**Steps**:
1. Remove the duplicate "react-i18next": "~17.0.4" entry
2. Remove the duplicate "react-redux": "^9.2.0" entry
3. Run `npm install` to verify everything still works
4. Check for any npm warnings during installation
```

---

## Issue 6: Add loading skeleton to agent listings page
**Title**: feat: Add loading skeleton component for agent listings
**Labels**: good first issue, frontend, ui
**Description**:
```
The agent listings page shows nothing while data is fetching. Let's add a simple skeleton loading state using Material UI's Skeleton component.

**Location**: `app/(marketplace)/agents/page.tsx` or similar
**Tech**: Next.js, Material UI, React Query
**Difficulty**: Easy
**What to implement**:
1. Detect when React Query is in loading state
2. Render 6-8 skeleton cards that match the agent card design
3. Animate the skeleton loading state
4. Ensure responsive layout is maintained

**Resources**:
- MUI Skeleton docs: https://mui.com/material-ui/react-skeleton/
```

---

## Issue 7: Add error boundary component for marketplace pages
**Title**: feat: Create a React error boundary component for the marketplace
**Labels**: good first issue, frontend, error-handling
**Description**:
```
Currently if a page component throws an error, the entire app crashes. Let's create a simple error boundary component that can wrap marketplace pages.

**Tech**: React 18, TypeScript
**Difficulty**: Medium (but still approachable!)
**Features needed**:
1. Create ErrorBoundary class component
2. Add fallback UI with Trellis theme styling
3. Add "Try again" button that resets the error
4. Implement error logging
5. Wrap the main agents page with this component
```

---

## Issue 8: Improve mobile responsiveness of navigation bar
**Title**: fix: Improve mobile menu in the navigation component
**Labels**: good first issue, frontend, responsive-design
**Description**:
```
The navigation bar's mobile menu has some issues on small screens. The hamburger menu doesn't always open correctly and links are difficult to tap.

**Location**: components/Navigation.tsx or similar
**Tech**: React, Material UI, TailwindCSS
**Difficulty**: Easy
**Fixes needed**:
1. Increase touch target size for menu items
2. Fix any z-index issues with the mobile menu
3. Ensure menu closes when clicking outside
4. Test on various screen sizes (320px, 375px, 425px)
```

---

## Issue 9: Add console logging for telemetry debugging
**Title**: feat: Add debug logging for telemetry WebSocket connection
**Labels**: good first issue, debugging, backend
**Description**:
```
The telemetry WebSocket server in scripts/telemetry-ws-server.mjs lacks proper debug logging. Let's add structured logging to help with debugging connection issues.

**File**: `scripts/telemetry-ws-server.mjs`
**Tech**: Node.js, WebSocket
**Difficulty**: Easy
**Add logging for**:
1. Server startup
2. New client connections
3. Message reception
4. Errors and disconnections
5. Use conditional logging that can be enabled via DEBUG env var
```

---

## Issue 10: Add JSDoc comments to key utility functions
**Title**: docs: Add JSDoc comments to core utility functions
**Labels**: good first issue, documentation, typescript
**Description**:
```
Several utility functions in the `lib/utils.ts` file are missing JSDoc comments. Let's document them to help new contributors understand their purpose.

**File**: `lib/utils.ts`
**Tech**: TypeScript, JSDoc
**Difficulty**: Very Easy
**Functions to document**:
1. formatCurrency - Stellar amount formatting
2. validateAgentMetadata - IPFS metadata validation
3. searchIndexBuilder - Algolia search index preparation
4. Any other complex utility functions

**Resources**:
- JSDoc guide: https://www.typescriptlang.org/docs/handbook/jsdoc-reference.html
```

---

## Additional Good First Issues Ready to Create

11. Fix TypeScript error in React Window virtualization component
12. Add dark/light mode toggle (currently only the dark theme exists)
13. Implement toast notifications for successful wallet connections
14. Add input validation to search bar component
15. Fix CSS overflow issues on the agent detail page
16. Add analytics event tracking for page views
17. Improve error messages when Algolia search fails
18. Add localization support for Arabic language
19. Optimize bundle size by tree-shaking unused MUI icons
20. Add ESLint rule to prevent console.log in production code