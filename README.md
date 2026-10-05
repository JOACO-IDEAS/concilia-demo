# ConcilIA showroom

Private handoff repository for the public ConcilIA product showroom at
<https://concilia-vercel-showroom.vercel.app/>.

This is **not the ConcilIA core product**. `concilia` is the production/core
codebase; this repository is `concilia-demo`, an isolated, read-only commercial
demo backed entirely by synthetic fixtures. Do not move production code,
credentials, customer records, exports, or databases into this repository.

## What is included

- A Next.js 16 / React 19 showroom for reconciliation, collections, documents,
  invoices, maintenance, and portfolio views.
- A deterministic synthetic dataset in `lib/demo-data.ts`.
- A read-only conversational assistant. Most supported reads resolve locally;
  OpenAI is used server-side only to select a read-only tool when deterministic
  routing is insufficient.
- Anonymous allow-listed product analytics and Upstash-backed rate limiting.

The UI simulates product workflows. It does not connect to a bank, parse a real
statement, mutate operational data, send reminders, or contain a production
ConcilIA backend.

## Local setup

Requirements: Node.js 22+ and npm.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>. The conversational assistant needs the server-side
OpenAI and Upstash variables described in `.env.example`; the rest of the
showroom and its tests/build do not require production data.

## Validation

```bash
npm test
npm run typecheck
npm run build
```

There is no lint command or linter dependency currently configured.

## Deployment

Local Vercel metadata identifies the project as `concilia-vercel-showroom`,
matching the public URL above. The intended ownership chain is:

`concilia-demo` private GitHub repository -> Vercel showroom -> public demo URL.

Publishing or deploying is intentionally outside this handoff commit. See
[`docs/TECHNICAL_HANDOFF.md`](docs/TECHNICAL_HANDOFF.md) for the technical map.
