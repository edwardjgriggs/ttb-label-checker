# TTB Label Checker

Drop one or more alcohol label images and the app reads every mandatory field using GPT-4o vision, then runs a deterministic rules engine to report pass, fail, or needs-review per TTB check with a plain-English reason. The AI reads; code judges. Batch upload of 200-300 labels is supported with results streaming into the table as they complete.

---

## Live demo

Deployed at: _(URL added after deploy)_

Try it with the images in `samples/`:

| File | What it demonstrates |
|---|---|
| `valid.png` | Clean label. Passes all checks |
| `titlecase-warning.png` | Warning header is title-case. Fails the all-caps header rule |
| `missing-warning.png` | Government warning absent. Fails warning presence check |
| `wrong-wording.png` | Warning text is paraphrased. Fails word-for-word match |
| `no-abv.png` | Alcohol content field missing. Fails ABV presence check |
| `riverbend.png` | Second valid label for batch demos |

`samples/batch.csv` demonstrates the expected-values flow. Drop `valid.png`, `riverbend.png`, and `titlecase-warning.png` together, load the CSV, and those three labels are cross-checked against their CSV rows for brand, class/type, ABV, and net contents. The remaining PNGs have no CSV row and fall back to rules-only checking automatically.

---

## Run it locally

```bash
npm install
cp .env.example .env.local   # then set OPENAI_API_KEY=sk-...
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm test          # 56 unit tests (rules engine, extraction, client utils)
npm run samples   # regenerate the sample label PNGs
```

---

## How it works

### The core design decision: the LLM only reads, code judges

GPT-4o vision transcribes the label verbatim under a strict JSON schema: brand name, class/type, ABV, net contents, the government warning text with capitalization preserved, and a bold-type flag for the warning header. The all-caps check reads the transcribed text itself rather than trusting a model judgment. Every pass/fail decision is made by pure TypeScript rule functions in `lib/rules/`. Those functions have no I/O, no network calls, and 56 unit tests. The verdict for a given set of extracted fields is always the same, regardless of which model run produced them.

### Zero-entry default flow

Most TTB checks require no data from the applicant. The government warning text is fixed by 27 CFR 16.21. Presence and format of ABV, brand, class/type, and net contents are rule-checkable without knowing what was on the application. So the default flow is: drop an image, get a verdict. No form to fill out.

Expected-values matching is optional. For a single label, a collapsible form takes brand, ABV, and class/type. For batch, a CSV keyed on filename supplies the same fields at scale. Labels with no CSV row fall back to rules-only checking without an error.

### Brand name matching

The rules engine normalizes both sides (lowercased, punctuation stripped, possessives collapsed) before comparing. STONE'S THROW equals Stone's Throw under this normalization. Near-misses that are close but not identical go to needs-review for a human; they never silently pass or hard-fail.

### Severity philosophy

A check either fails reliably or it does not hard-fail at all. Bold-type detection from a photograph is not reliable enough to produce a definitive signal, so a label that appears to lack bold formatting on "GOVERNMENT WARNING:" is downgraded to needs-review, not failed. False fails destroy trust in an automated tool faster than false passes. Unreliable signals get the amber state; only high-confidence checks produce red.

### Batch

Each label is one multipart POST to `/api/verify`. The browser orchestrates concurrent uploads with a pool of 5 parallel requests and updates the results table as each response lands. No waiting for the whole batch to finish. The browser also downscales images to a maximum of 1500px on the longest edge before upload, which keeps each request comfortably under Vercel's 4.5MB body limit and reduces vision call latency.

---

## Requirement traceability

| Stakeholder requirement | Where it is handled |
|---|---|
| Verdict in ~5 seconds per label | Client downscales to 1500px before upload; single GPT-4o vision call typically completes in 2-4s |
| Batch uploads of 200-300 labels | Browser pool of 5 concurrent requests; results stream into table per label; CSV supplies expected values at scale |
| Usable by non-technical staff | Zero-entry default flow; large drag-and-drop zone with large type; plain-English verdict reasons; keyboard accessible |
| Agency firewall blocks external ML endpoints | `ExtractionProvider` interface in `lib/extraction/provider.ts`; swap `OpenAIProvider` for `AzureOpenAIProvider` and run GPT-4o inside the agency's existing Azure tenant, one file change |
| STONE'S THROW vs Stone's Throw | Loose normalization (case, punctuation, possessives) before comparison; near-misses go to needs-review |
| Exact warning text enforcement including all-caps header | Word-for-word comparison against the canonical 27 CFR 16.21 text; title-case header fails; missing bold returns needs-review |
| Imperfect or angled photos | GPT-4o vision tolerates moderate angle and lighting variation; a per-field legibility signal turns unreadable labels into needs-review with re-upload guidance, never a silent pass |

---

## Production path

This prototype is deliberately hosted outside any compliance boundary and processes only synthetic test labels, per the project brief's scoping ("standalone proof-of-concept", no sensitive data). Compliance is a property of the whole system and its operating process, not the hosting choice; the list below is what crosses that boundary.

What changes before real deployment:

- **Azure OpenAI in-tenant.** The `ExtractionProvider` interface makes this a one-file swap: implement `AzureOpenAIProvider` and point the route at it. GPT-4o is available inside existing Azure/FedRAMP tenants so no outbound firewall exception is needed.
- **Real authentication.** The prototype has no auth. A production deployment sits behind TTB's identity provider.
- **Durable rate limiting.** The current per-IP rate limiter lives in module memory (see trade-offs below). Production uses Vercel KV or Upstash Rate Limit to enforce limits across all serverless instances.
- **Audit logging.** Log verdict, timestamp, and filename (not image bytes) for each check. No label images stored.
- **Retention policy review.** Even with no image storage, logs containing filename and verdict may be subject to records-management rules. Legal review required before production.

### Accepted prototype trade-offs (from security review)

- **In-memory rate limiter is per-instance.** On Vercel serverless, each warm instance has an independent counter. Multiple concurrent instances each see a fraction of traffic. The real cost-abuse backstop for the prototype is the OpenAI spending cap, not the rate limiter. Documented; not fixed.
- **Payload size check runs after body buffering.** `req.formData()` buffers the full body before the 6MB size check runs. Vercel's 4.5MB platform-level limit is the effective guard for oversized requests. Documented; not fixed for the prototype.

---

## Assumptions and limitations

- Bold-type detection from a photograph is unreliable. The "GOVERNMENT WARNING:" bold requirement never produces a hard fail; it only downgrades to needs-review. Stroke-width analysis at the image level is the path to a reliable signal, and is future work.
- The rules engine covers distilled spirits fields per the project brief. Beer and wine have different mandatory fields; adding those is a matter of adding rule functions, not a structural change.
- No COLA system integration. The app checks the label against TTB rules and optionally against applicant-supplied expected values. It does not read from or write to the COLA database.
- Nothing is stored server-side. Images are processed in memory and discarded after the response. Results are not persisted.
- The in-memory rate limiter resets on instance recycle. This is expected and documented.
- The sample labels are synthetic PNG renders generated from SVG. They demonstrate every failure mode cleanly. Real bottle photos work but were not part of automated testing.

---

## Costs

Roughly $0.01 per label with GPT-4o. A 300-label batch costs approximately $2-3.

---

## Stack

Next.js 16, TypeScript, Tailwind CSS, OpenAI SDK (GPT-4o vision), Vitest, sharp (dev-only, sample generation), deployed on Vercel.
