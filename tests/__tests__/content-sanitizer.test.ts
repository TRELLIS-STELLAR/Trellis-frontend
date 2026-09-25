import {
  escapeHtml,
  stripControlAndBidi,
  sanitizeExternalUrl,
  sanitizeHtml,
  sanitizeMarkdown,
  sanitizeObject,
} from '@/lib/security/content-sanitizer';

describe('Security Hardening & Content Sanitizer (Issue #38)', () => {
  describe('HTML Escaping & Plaintext Sanitization', () => {
    it('escapes dangerous HTML characters', () => {
      const raw = '<script>alert("xss & test")</script>';
      const escaped = escapeHtml(raw);
      expect(escaped).toBe('&lt;script&gt;alert(&quot;xss &amp; test&quot;)&lt;/script&gt;');
    });

    it('strips BIDI override characters and non-printable control codes', () => {
      const bidi = 'admin\u202E\u0000text';
      const cleaned = stripControlAndBidi(bidi);
      expect(cleaned).toBe('admintext');
    });
  });

  describe('External URL Sanitization', () => {
    it('allows safe http and https URLs with proper attributes', () => {
      const res = sanitizeExternalUrl('https://stellar.org/soroban');
      expect(res.isValid).toBe(true);
      expect(res.isExternal).toBe(true);
      expect(res.safeUrl).toBe('https://stellar.org/soroban');
      expect(res.safeAttributes.rel).toContain('noopener noreferrer');
      expect(res.safeAttributes.target).toBe('_blank');
    });

    it('blocks javascript: URLs', () => {
      const res = sanitizeExternalUrl('javascript:alert(document.cookie)');
      expect(res.isValid).toBe(false);
      expect(res.safeUrl).toBe('about:blank');
    });

    it('blocks data: and vbscript: URLs', () => {
      expect(sanitizeExternalUrl('data:text/html,<script>alert(1)</script>').isValid).toBe(false);
      expect(sanitizeExternalUrl('vbscript:msgbox("hi")').isValid).toBe(false);
    });

    it('blocks obfuscated protocol schemes with whitespace or BIDI characters', () => {
      const obfuscated = 'java\u202Escript :alert(1)';
      expect(sanitizeExternalUrl(obfuscated).isValid).toBe(false);
    });
  });

  describe('HTML Markup Sanitization', () => {
    it('strips script tags and inline event handlers', () => {
      const dirty = '<p>Hello <script>alert(1)</script><img src="x" onerror="alert(2)" /> World</p>';
      const clean = sanitizeHtml(dirty);
      expect(clean).not.toContain('<script>');
      expect(clean).not.toContain('onerror');
      expect(clean).toContain('<p>Hello ');
      expect(clean).toContain('World</p>');
    });

    it('strips iframe, embed, and object tags', () => {
      const dirty = '<iframe src="https://evil.com"></iframe><embed src="test.swf"><object data="x"></object>';
      const clean = sanitizeHtml(dirty);
      expect(clean).not.toContain('<iframe');
      expect(clean).not.toContain('<embed');
      expect(clean).not.toContain('<object');
    });
  });

  describe('Markdown Sanitization', () => {
    it('neutralizes malicious markdown links', () => {
      const markdown = '[Click here](javascript:alert("pwned")) and [Valid](https://trellis.org)';
      const clean = sanitizeMarkdown(markdown);
      expect(clean).toContain('[Click here](#unsafe-url-blocked)');
      expect(clean.includes('[Valid](https://trellis.org/)') || clean.includes('[Valid](https://trellis.org)')).toBe(true);
    });
  });

  describe('Object Sanitization & Prototype Pollution Protection', () => {
    it('strips __proto__ and constructor keys', () => {
      const maliciousObj = JSON.parse('{"name": "Agent", "__proto__": {"isAdmin": true}}');
      const sanitized = sanitizeObject(maliciousObj);
      expect(sanitized.name).toBe('Agent');
      expect(Object.prototype.hasOwnProperty.call(sanitized, '__proto__')).toBe(false);
    });
  });
});
