'use client';

import React from 'react';
import { sanitizeExternalUrl } from '@/lib/security/content-sanitizer';

export interface SafeExternalLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
  showExternalIcon?: boolean;
}

/**
 * Secure Anchor Component for external links.
 * Guarantees rel="noopener noreferrer", blocks malicious URI schemes, and protects against tabnabbing.
 */
export const SafeExternalLink: React.FC<SafeExternalLinkProps> = ({
  href,
  children,
  showExternalIcon = false,
  className = '',
  ...props
}) => {
  const { safeUrl, isValid, isExternal, safeAttributes } = sanitizeExternalUrl(href);

  if (!isValid) {
    return (
      <span className={`text-gray-400 cursor-not-allowed ${className}`} title="Invalid or unsafe URL blocked">
        {children}
      </span>
    );
  }

  return (
    <a
      href={safeUrl}
      rel={safeAttributes.rel}
      target={isExternal ? '_blank' : undefined}
      className={`inline-flex items-center gap-1 hover:underline ${className}`}
      {...props}
    >
      {children}
      {showExternalIcon && isExternal && (
        <svg
          className="w-3.5 h-3.5 opacity-70"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      )}
    </a>
  );
};
