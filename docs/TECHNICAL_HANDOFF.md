# ConcilIA showroom - technical handoff

## Purpose and boundary

This repository packages the public, interactive ConcilIA showroom. It exists
to communicate the product experience safely; it is not a deployable copy of
the production/core ConcilIA system.

- **`concilia`**: separate core product repository and the location for real
  application architecture, integrations, persistence, and customer work.
- **`concilia-demo`**: this repository; a synthetic, isolated, read-only
  showroom.

Do not merge the repositories or use this demo as a source of production truth.
The actual core product remains in its separate ConcilIA repository; its local
or remote location is deliberately not encoded here.

## Implemented surface

The Next.js App Router application demonstrates portfolio attention, payment
reconciliation, evidence, collections/debt, consortia, documents, supplier
invoices, maintenance, and prepared follow-up/reminder previews. Interactions
reset locally and do not commit operational actions.

`lib/demo-data.ts` is the canonical dataset. It contains fixed fictional
consortia, people, payments, suppliers, documents, invoices, and operational
dates. Generated rows are explicitly labelled synthetic. Tests assert portfolio
arithmetic, referential integrity, tool responses, analytics minimization, and
truthful simulated-flow language. No database, production export, or customer
dataset is required.

## Conversational demo

`app/api/assistant/route.ts` accepts a small bounded conversation and structured
UI context. Deterministic reads are routed locally first. When needed, the
server-side OpenAI Responses API selects exactly one allow-listed read-only
tool; the server constructs the factual response from synthetic data. Requests
are bounded, API storage is disabled, and credentials are never exposed to the
browser. Upstash applies IP/session rate limits. Reminder and collection actions
produce previews only; nothing is sent.

The analytics endpoint accepts only allow-listed event/view identifiers and
stores aggregate counters in Upstash. It rejects prompts, answers, amounts,
units, document identifiers, and provider facts.

## External services and environment

See `.env.example`. `OPENAI_API_KEY` and an Upstash REST URL/token pair are
server-only. `OPENAI_MODEL` is optional. Vercel Marketplace-prefixed Upstash
aliases are supported. There are no `NEXT_PUBLIC_*` secrets.

Without those services, the static showroom can still be installed, tested,
typechecked, and built; live assistant/rate-limited analytics endpoints return
an unavailable response.

## Local verification

With Node.js 22+:

```bash
npm ci
npm test
npm run typecheck
npm run build
npm run dev
```

No lint tool is configured. Add one only as a deliberate project decision.

## Deployment relationship

The known deployment is <https://concilia-vercel-showroom.vercel.app/>. Local
ignored `.vercel/project.json` metadata names the linked Vercel project
`concilia-vercel-showroom`, consistent with the repository history, package
content, branding, and public URL. The target mapping is:

`concilia-demo` private GitHub repository -> Vercel project
`concilia-vercel-showroom` -> the URL above.

This handoff does not change a remote, push to GitHub, mutate Vercel settings,
or deploy.

## Intentionally absent

- Production/customer data and database connectivity
- Banking, OCR, email, WhatsApp, or accounting integrations
- Production authentication, authorization, and tenancy
- Mutating assistant tools or message delivery
- ConcilIA core source and infrastructure
- Local credentials, `.env.local`, `.vercel`, build output, and agent artifacts
