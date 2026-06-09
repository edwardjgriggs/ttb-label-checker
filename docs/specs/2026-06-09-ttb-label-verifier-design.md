# TTB Label Verifier — Design Spec

**Date:** 2026-06-09
**Author:** Edward Griggs
**Context:** Take-home assessment — AI-powered alcohol label verification prototype for a TTB-style label compliance workflow.

---

## 1. Problem

TTB compliance agents manually verify ~150,000 alcohol label applications a year. Most of the work is routine matching: does the brand name, ABV, and mandatory government warning on the label artwork match the rules (and the application)? Agents want a tool that returns a verdict in **~5 seconds**, is simple enough for a non-technical 73-year-old to use, and supports **batch uploads** of hundreds of labels at once.

## 2. Goals & Non-Goals

### Goals
- Upload one or many label images and get a clear pass / fail / needs-review verdict per label.
- **Most-automatic default:** zero data entry required. The app extracts label fields and checks them against TTB rules on its own.
- Verify the **government health warning** word-for-word, including the all-caps and bold formatting of `GOVERNMENT WARNING:`.
- Validate mandatory fields are present and well-formed (brand name, class/type, alcohol content, net contents).
- **Optional application matching:** cross-check the label against expected values when supplied — typed for a single label, or via CSV for batch.
- **Batch upload** of 200–300 labels with a filterable results table.
- Sub-5-second target per label; batch processed concurrently.
- UX legible and obvious for low-tech, older users.

### Non-Goals
- No integration with the real COLA system (explicitly out of scope per stakeholder).
- No persistence of images or results (PII / retention concerns). In-memory only.
- No user accounts / auth for the prototype.
- Image pre-processing (de-glare, auto-rotate) is documented future work, not built. The vision model already tolerates moderate angle/lighting issues.

## 3. Core Insight

Most verification needs **no application data at all.** The government warning is a fixed legal text (27 CFR §16.21). Presence and format of ABV, brand, class/type, and net contents are checkable against TTB rules alone. So the default flow is *drop image → verdict*. The only check that requires application data — "does the brand/ABV match what the applicant claimed" — is **optional** and, for batch, driven by a single CSV.

## 4. Architecture

Next.js (App Router) + TypeScript, deployed on Vercel. Four well-bounded units:

```
┌─────────────┐   image(s)   ┌──────────────┐   fields+flags   ┌──────────────┐
│  UI (page)  │ ───────────► │ /api/verify  │ ───────────────► │  Extraction  │
│  upload +   │ ◄─────────── │  orchestrator│ ◄─────────────── │  service     │
│  results    │   verdicts   │              │                  │ (GPT-4o)     │
└─────────────┘              └──────┬───────┘                  └──────────────┘
                                    │ extracted fields + optional expected values
                                    ▼
                             ┌──────────────┐
                             │ Rules engine │  pure, deterministic, unit-tested
                             │ (verdicts)   │
                             └──────────────┘
```

### 4.1 UI (`app/page.tsx` + components)
- Single page. Large drag-and-drop zone, large fonts and buttons.
- Single result: a card per check (brand, class/type, ABV, net contents, government warning) with a green check / red X / amber "needs review" and a one-line plain-English reason.
- Batch result: a table, one row per file, overall status badge, plus a "show only problems" filter and per-row expand for detail.
- Optional expected-values: a collapsible form (single) or CSV upload (batch). Hidden by default to keep the automatic path clean. **CSV matches on filename**; rows with no CSV match silently fall back to rules-only checking (no error).
- Clear error states: unreadable image, wrong file type, extraction failure, oversized file.

### 4.2 `/api/verify` (route handler)
- Accepts `multipart/form-data`: **exactly one image** plus optional expected-values JSON. (Vercel serverless caps request bodies at 4.5MB, so one giant batch POST is a non-starter.)
- **Batch orchestration lives in the client:** the browser loops over the dropped files with its own concurrency cap (5 parallel fetches) and updates the results table as each response lands. Agents see results stream in immediately.
- Pipeline per call: extraction → rules → verdict JSON. Never persists input.
- One retry with backoff on transient provider errors (429/5xx/network); a second failure returns "needs review," never a hard error row.
- `maxDuration = 60` on the route so a slow vision call doesn't hit Vercel's default timeout.
- Basic abuse protection for the public demo: per-IP in-memory rate limit and server-side file-size cap (the key is mine and the URL will be shared).

### 4.3 Extraction service (`lib/extraction/`)
- `ExtractionProvider` interface: `extract(image: Buffer | base64): Promise<ExtractedLabel>`.
- `OpenAIProvider` implementation calls GPT-4o vision with a strict JSON-schema prompt.
- `ExtractedLabel` includes every field **plus formatting flags**: `warning.text`, `warning.isAllCapsHeader`, `warning.isBold`, and a per-field `confidence`/`legible` signal so unreadable labels become "needs review," not false "fail."
- Production note (README): swap `OpenAIProvider` for an `AzureOpenAIProvider` to run GPT-4o inside TTB's existing Azure/FedRAMP tenant — no outbound-firewall problem. The interface makes this a one-file change.

### 4.4 Rules engine (`lib/rules/`)
Pure functions, no I/O, fully unit-testable. **The LLM only reads; all pass/fail judgments live here** — reproducible verdicts, not "the AI decided."
- `checkGovernmentWarning(extracted)` — normalize whitespace and unicode punctuation (curly quotes/apostrophes → ASCII), then compare against the canonical 27 CFR §16.21 text word-for-word. The caps and bold requirements apply **only to the "GOVERNMENT WARNING:" header**, not the full statement. Signal confidence drives severity: wrong wording, missing statement, or non-caps header = **fail** (reliable signals); bold-looks-wrong = **needs review** (bold can't be judged reliably from a photo — many label fonts are heavy by design; false fails are the Dave Morrison trap).
- `checkAlcoholContent(extracted, expected?)` — present and well-formed, accepting TTB's tolerated formats (`45% Alc./Vol.`, `Alc. 45% by Vol.`, `Alcohol 45% by Volume`, optional proof); fail only on missing/malformed. If expected supplied, numeric match within tolerance.
- `checkBrandName(extracted, expected?)` — present; if expected supplied, fuzzy match after normalization (case, whitespace, punctuation, possessives) so "STONE'S THROW" == "Stone's Throw".
- `checkPresence(field)` — class/type, net contents present.
- `composeVerdict(checks)` — overall = fail if any fail, needs-review if any review and none fail, else pass.

### 4.5 Canonical warning text
```
GOVERNMENT WARNING: (1) According to the Surgeon General, women should not
drink alcoholic beverages during pregnancy because of the risk of birth
defects. (2) Consumption of alcoholic beverages impairs your ability to
drive a car or operate machinery, and may cause health problems.
```
Stored as a constant; comparison normalizes internal whitespace/line breaks but is otherwise exact.

## 5. Data Flow (single label)
1. Agent drops `old-tom.jpg`.
2. Browser POSTs the file to `/api/verify`.
3. Route base64-encodes, calls `OpenAIProvider.extract`.
4. GPT-4o returns structured JSON (fields + warning flags + legibility).
5. Rules engine produces per-check results + overall verdict.
6. UI renders the result card(s). Nothing stored.

## 6. Performance
- Single label: one vision call, ~2–4s typical. Target ≤5s.
- **Client-side image downscale** (~1500px longest edge, canvas re-encode) before upload: faster vision calls, lower cost, and keeps every request safely under the 4.5MB body limit.
- Batch: client-side concurrency (5 parallel) with per-row progress so the agent sees results arrive rather than waiting for the whole batch.
- Model: `gpt-4o` everywhere. `gpt-4o-mini` was considered for batch cost but rejected — it is measurably worse at fine label text, and the warning check is the heart of the product. A 300-label batch on 4o costs roughly $2–3.

## 7. Error Handling
- Reject non-image / oversized files client-side with a plain message.
- Extraction failure or unreadable label → "needs review: couldn't read the label clearly, please re-upload a better photo" (mirrors current agent behavior, never a silent pass).
- API key missing → clear server log + user-facing "service not configured" message.
- Batch: one bad file fails its own row, never the whole batch.

## 8. Security / Privacy
- No storage of images or results. Processed in memory, discarded after response.
- API key only in server env (`OPENAI_API_KEY`), never sent to client, never logged.
- Documented production hardening: Azure OpenAI in-tenant, retention policy, PII handling.

## 9. Testing
- Vitest unit tests on the rules engine — the deterministic core. Cover: exact warning pass; warning wrong-wording / not-caps / not-bold / missing; ABV format + numeric match + tolerance; brand fuzzy-match cases (possessive, case, punctuation); presence checks; verdict composition precedence.
- Extraction tests with a mocked provider (no live API calls in CI).
- A handful of generated sample labels (valid + each failure mode) checked into `samples/` for manual and demo testing.

## 10. Deliverables
- This repo on GitHub with README: setup/run, approach, tools, assumptions, trade-offs/limitations.
- Deployed Vercel URL.
- `samples/` with test labels and an example batch CSV.

## 11. Assumptions
- "Application data" is optional input the agent provides; we are not pulling from COLA.
- Distilled-spirits label fields per the brief; rules are structured so beer/wine variants can be added.
- A working core with clean, tested code beats more features half-built (per the brief).

## 12. Trade-offs / Limitations (for README)
- Vision LLM vs local OCR: chose LLM for accuracy on messy photos and formatting nuance; documented Azure OpenAI path resolves the firewall concern for production.
- No image pre-processing yet; relying on model tolerance.
- Warning bold detection depends on the model's formatting report, so it only ever downgrades to needs-review; a vision-geometry check (stroke-width analysis) is the future fix if bold must become a hard fail.
