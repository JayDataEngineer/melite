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
pnpm run test:web         # web browser snapshot (replay)
pnpm run lint             # architecture lint
```

A product-visible tool or card change also updates the relevant
recorded-session snapshot. `tests/README.md` describes the tier gates.
