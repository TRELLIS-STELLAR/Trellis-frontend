/**
 * Security Hardening & Content Sanitizer for Trellis Frontend (Issue #38).
 * Provides robust sanitization for untrusted HTML, Markdown, Plaintext, Objects, and External URLs.
 */

// Disallowed HTML tags that must never be rendered in untrusted content
const DANGEROUS_TAGS = [
  'script',
  'style',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'applet',
  'link',
  'meta',
  'base',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'svg',
  'math',
];

// Dangerous URL schemes
const UNSAFE_URL_SCHEMES = ['javascript:', 'vbscript:', 'data:', 'file:', 'blob:', 'about:'];

// Allowed URL schemes for external links
const SAFE_URL_SCHEMES = ['http:', 'https:', 'mailto:'];

// Unicode BIDI control characters (used in RTLO spoofing attacks)
const BIDI_REGEX = /[\u202A-\u202E\u2066-\u2069\u200E\u200F\u061C]/g;

// Control characters except standard whitespace
const CONTROL_CHARS_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/**
 * Escape HTML special characters for safe plaintext rendering.
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Remove bidirectional control characters and non-printable control codes.
 */
export function stripControlAndBidi(text: string): string {
  if (!text) return '';
  return text.replace(BIDI_REGEX, '').replace(CONTROL_CHARS_REGEX, '');
}

export interface SanitizeUrlResult {
  safeUrl: string;
  isValid: boolean;
  isExternal: boolean;
  safeAttributes: {
    rel: string;
    target?: string;
  };
}

/**
 * Validate and sanitize external URLs, preventing javascript:, data:, and obfuscated protocol attacks.
 */
export function sanitizeExternalUrl(
  rawUrl: string | undefined | null,
  fallback = 'about:blank'
): SanitizeUrlResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return {
      safeUrl: fallback,
      isValid: false,
      isExternal: false,
      safeAttributes: { rel: 'noopener noreferrer' },
    };
  }

  // Strip whitespaces, control chars, and BIDI codes that could obfuscate protocols
  const cleanedUrl = stripControlAndBidi(rawUrl.trim()).replace(/[\s\r\n\t]/g, '');

  // Check for unsafe schemes
  const lowerUrl = cleanedUrl.toLowerCase();
  for (const scheme of UNSAFE_URL_SCHEMES) {
    if (lowerUrl.startsWith(scheme)) {
      return {
        safeUrl: fallback,
        isValid: false,
        isExternal: false,
        safeAttributes: { rel: 'noopener noreferrer' },
      };
    }
  }

  // Handle Relative URLs
  if (cleanedUrl.startsWith('/') || cleanedUrl.startsWith('#') || cleanedUrl.startsWith('?')) {
    return {
      safeUrl: cleanedUrl,
      isValid: true,
      isExternal: false,
      safeAttributes: { rel: 'noopener noreferrer' },
    };
  }

  // Validate absolute URL
  try {
    const parsed = new URL(cleanedUrl);
    const isSafeScheme = SAFE_URL_SCHEMES.includes(parsed.protocol);

    if (!isSafeScheme) {
      return {
        safeUrl: fallback,
        isValid: false,
        isExternal: false,
        safeAttributes: { rel: 'noopener noreferrer' },
      };
    }

    return {
      safeUrl: parsed.href,
      isValid: true,
      isExternal: true,
      safeAttributes: {
        rel: 'noopener noreferrer nofollow',
        target: '_blank',
      },
    };
  } catch {
    return {
      safeUrl: fallback,
      isValid: false,
      isExternal: false,
      safeAttributes: { rel: 'noopener noreferrer' },
    };
  }
}

/**
 * Sanitize untrusted HTML markup.
 * Strips dangerous tags, removes inline event handlers, and cleans href/src attributes.
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';

  let sanitized = stripControlAndBidi(html);

  // 1. Strip dangerous tags completely along with their content
  for (const tag of DANGEROUS_TAGS) {
    const tagRegex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    sanitized = sanitized.replace(tagRegex, '');
    const selfClosingRegex = new RegExp(`<${tag}[^>]*\\/?>`, 'gi');
    sanitized = sanitized.replace(selfClosingRegex, '');
  }

  // 2. Strip inline event handlers (e.g. onclick, onerror, onload, onmouseover)
  sanitized = sanitized.replace(/\s+on[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // 3. Clean href and src attributes containing unsafe URI schemes
  sanitized = sanitized.replace(/(href|src)\s*=\s*(["'])(.*?)\2/gi, (match, attr, quote, val) => {
    const res = sanitizeExternalUrl(val);
    if (!res.isValid && !val.startsWith('/') && !val.startsWith('#')) {
      return `${attr}=${quote}#${quote}`;
    }
    return `${attr}=${quote}${res.safeUrl}${quote}`;
  });

  return sanitized;
}

/**
 * Sanitize untrusted Markdown content before rendering.
 * Strips unsafe raw HTML and removes javascript: / data: pseudo links.
 */
export function sanitizeMarkdown(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') return '';

  let sanitized = stripControlAndBidi(markdown);

  // 1. Sanitize raw embedded HTML
  sanitized = sanitizeHtml(sanitized);

  // 2. Sanitize markdown links [text](url)
  sanitized = sanitized.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
    const cleanedText = escapeHtml(text);
    const res = sanitizeExternalUrl(url.trim());
    if (!res.isValid) {
      return `[${cleanedText}](#unsafe-url-blocked)`;
    }
    return `[${cleanedText}](${res.safeUrl})`;
  });

  return sanitized;
}

/**
 * Deeply sanitize an object or array to prevent prototype pollution and scrub strings.
 */
export function sanitizeObject<T>(input: T): T {
  if (input === null || typeof input !== 'object') {
    return typeof input === 'string' ? (stripControlAndBidi(input) as unknown as T) : input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeObject(item)) as unknown as T;
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(input)) {
    // Prevent Prototype Pollution
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    result[stripControlAndBidi(key)] = sanitizeObject(value);
  }

  return result as T;
}
