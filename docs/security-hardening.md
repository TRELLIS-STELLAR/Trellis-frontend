# Security Hardening for Untrusted Content & External URLs

## Overview
This document outlines security measures and rendering guidelines for handling user-submitted content, metadata, markdown, HTML, and outbound links in the Trellis Frontend.

---

## 1. External URL Hardening
- **Protocol Allowlist**: Only `http:`, `https:`, and `mailto:` are permitted.
- **Blocked Protocols**: `javascript:`, `vbscript:`, `data:`, `file:`, `blob:` are stripped or rejected.
- **Rel Attributes**: External links must include `rel="noopener noreferrer"` (and `nofollow` where appropriate) to prevent tabnabbing and window opener hijacking.
- **Component**: Use `<SafeExternalLink href="..." showExternalIcon>` instead of raw `<a target="_blank">`.

---

## 2. Content Sanitization
- **HTML Sanitization**: Strip dangerous elements (`<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, `<style>`) and all `on*` inline event handlers.
- **Markdown Sanitization**: Strip raw malicious HTML and convert unsafe markdown link targets (`[click](javascript:alert(1))`) to safe inert placeholders.
- **Plaintext Escaping**: Use `escapeHtml()` and `stripControlAndBidi()` to eliminate bidirectional override characters (RTLO spoofing attacks) and control codes.
- **Object Sanitization**: `sanitizeObject()` prevents prototype pollution (`__proto__`, `constructor`, `prototype`).

---

## 3. Usage Examples

### In React Components:
```tsx
import { SafeExternalLink } from '@/components/security/SafeExternalLink';
import { SafeContent } from '@/components/security/SafeContent';

// Rendering External Link
<SafeExternalLink href={agent.externalUrl} showExternalIcon>
  Visit Agent Website
</SafeExternalLink>

// Rendering Markdown Description
<SafeContent content={agent.description} type="markdown" />
```
