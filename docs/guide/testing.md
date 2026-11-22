# Testing

The repository test plane is Vitest. Package tests live beside their
packages; cross-cutting walls live under `tests/walls/ts`.

```sh
pnpm run test             # the unit battery
pnpm run test:coverage    # the CI coverage gate (per-file floors)
pnpm run test:snapshot    # keyless recorded-session replay
pnpm run test:expected    # owner-local process expectations
pnpm run test:bench       # performance benchmarks
pnpm run test:e2e         # real-API e2e; self-skips without a key
pnpm run test:web         # web snapshot (happy-dom replay); real-browser evidence is test:web:browser
pnpm run lint             # architecture lint
```

## The two coverage laws (2026-11-20)

The gate has TWO halves — floors and the tripwire — and both must be green:

1. **Floors.** `scripts/coverage-baseline.ts` prices owned debt per file. A change may only RAISE
   a file's floor — drops are capped. Regenerate after deliberate coverage gains with
   `node scripts/coverage-regen.mjs` (needs ≥ 2 stable summaries).
2. **The rows tripwire.** `node scripts/coverage-rows-tripwire.mjs` refuses any change that adds a
   NEW uncovered line (exit 0 = your delta added no uncovered lines). Coverage must run SOLO in
   serial chains — concurrent writers corrupt the merged pool.

The full history ratchet (`tools/coverage-ratchet.mjs`) is not a CI leg: it rides the pre-push
battery (`node tools/hook-full-battery.mjs`) as a tier with persisted leases
(`data/tmp/battery-leases.json`, never committed).

A product-visible tool or card change also updates the relevant
recorded-session snapshot. `tests/README.md` describes the tier gates.
