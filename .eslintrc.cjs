const config = {
  extends: 'next/core-web-vitals',
  rules: {
    'react-hooks/rules-of-hooks': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    '@next/next/no-assign-module-variable': 'off',
    'react/jsx-no-undef': 'warn',
  },
};

module.exports = config;
