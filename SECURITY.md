# Security

This is a public prototype built for a take-home assessment. It has no authentication and stores nothing, both by design. This document describes the threat model, what was assessed, and the decisions made. A full security review was part of the development process, not an afterthought.

## Threat model

- **Attacker-controlled inputs:** uploaded images (content and filename), the optional expected-values form and CSV, and raw HTTP requests to the API. Label images are a genuinely adversarial input: anything printed on a label becomes model-extracted text that flows through the app.
- **Assets worth protecting:** the server-side OpenAI API key, the owner's API spend, and the integrity of verdicts shown to users.
- **Out of scope by design:** user accounts, sensitive data, persistence. Images are processed in memory and discarded.

## What was assessed

- Full git history scan for secrets (key-pattern search across all blobs, all `.env*` history). Clean. The key lives only in server-side environment configuration with a hard spend cap set at the provider.
- XSS over every surface that renders model-extracted or user-controlled text (verdict reasons, the verbatim extraction panel, filenames). All rendering goes through React's escaping; the codebase contains no `dangerouslySetInnerHTML`.
- CSV export injection. Exported cells that begin with `=`, `+`, `-`, `@`, tab, or carriage return are neutralized with the OWASP single-quote prefix, with unit tests pinning the behavior.
- Prompt injection via label images. The extraction call uses a strict JSON schema, so injected text can only land inside string fields, and every pass/fail decision is made by deterministic code, not the model. Worst case is wrong text displayed as escaped plain text for that one label, which lands in the human-review lane rather than a silent pass.
- API hardening: strict image MIME allowlist, request size cap, rate limiting keyed on the proxy-appended client IP (the spoofable leading `X-Forwarded-For` entry is ignored), one retry then a needs-review verdict, and generic client-facing errors that never include internals.
- Transport and headers: HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, and a minimal `Permissions-Policy` on all responses.
- Dependency audit. One moderate advisory remains in the PostCSS version bundled inside Next.js (no stable Next release carries the patch yet). The vulnerable path requires stringifying untrusted CSS; this app's PostCSS usage is build-time compilation of its own stylesheets, so the advisory is not exploitable here.

## Accepted prototype trade-offs

- The per-IP rate limiter is in-memory and per-serverless-instance. The provider-side spend cap is the real cost-abuse backstop. Production replaces this with a durable store (Vercel KV or equivalent).
- The application's size check runs after the platform has buffered the body. The platform's own request-size limit is the effective guard.
- No authentication. A production deployment sits behind the agency's identity provider.

## Reporting

This is a demonstration project. If you find an issue, open a GitHub issue on this repository.
