# Repository guidance

This repository is the isolated ConcilIA synthetic showroom, not the ConcilIA
core product. Keep all demo facts in the canonical synthetic dataset, preserve
read-only behavior, and never add production code, customer data, exports,
credentials, or local Vercel state. Before handing off changes, run `npm test`,
`npm run typecheck`, and `npm run build`.
