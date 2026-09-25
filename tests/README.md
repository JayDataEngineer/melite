# tests/

The current proof tree is Vitest-based. The Python gateway, pytest planes,
scratch-gateway fixture layer, and legacy per-package runner conventions are
historical; their filenames may remain in dated audits, but they are not
current gates.

## Root runner

The root `package.json` owns the test tiers:

| Command | Scope |
| --- | --- |
| `pnpm run test` | root Vitest projects: node, DOM, DOM18, and deck lanes |
| `pnpm run test:coverage` | the same unit/wall inventory with coverage thresholds |
| `pnpm run test:e2e` | live/e2e configuration in `tests/e2e/` |
| `pnpm run test:expected` | owner-local expected fixtures in `tests/expected/` |
| `pnpm run test:bench` | benchmark fixtures |
| `pnpm run test:snapshot` | recorded-session snapshots |
| `pnpm run test:web` | web snapshot fixtures |
| `pnpm run test:web:browser` | Playwright suites for the card-view and card-deck packages |

The root Vitest config partitions specs into isolated node, DOM, DOM18, and
React-18 deck projects. Package-local `typecheck` commands may still exist;
they are not a second test runner.

## Current layout

```text
tests/
  unit/                  cross-cutting TypeScript unit specs
  e2e/                   live/e2e specs with their own prerequisite gates
  expected/              owner-local expected e2e fixtures
  integration/           integration assets/materials
  walls/ts/              cross-cutting Vitest walls
    suites/*.spec.ts
  helpers/               launch and shared wall helpers
  harness.ts             shared fixtures
  global-sweep.ts        temporary-root cleanup hook
```

Package behavior specs live beside their owners under `packages/*/*/tests/`
or `packages/*/*/test/`. The current H3 timeline specs, for example, live at
`packages/video/h3-timeline/tests/`; queue and management specs live under
`packages/harness/estate-queue/tests/` and
`packages/harness/melite-tools/test/`.

The editor's former Python and node:test test planes are not part of the
current runner. See [`docs/testing/index.md`](../docs/testing/index.md) for
gate interpretation and [`docs/testing/chaos-tests.md`](../docs/testing/chaos-tests.md)
for focused failure/recovery commands.

## Running focused specs

```sh
node_modules/.bin/vitest run tests/walls/ts/suites/flows-wiring.spec.ts
node_modules/.bin/vitest run packages/harness/estate-queue/tests/queue-core.spec.ts
node_modules/.bin/vitest run packages/harness/estate-queue/tests/queue-lock-sweep.spec.ts
node_modules/.bin/vitest run packages/harness/melite-tools/test/doors-errors.spec.ts
node_modules/.bin/vitest run packages/estate/provisioning/tests
```

The root Vitest config is the authority for project selection. A focused
spec proves only its named contract.

## Sandbox discipline

Suites should mount real seats in-process where practical and use fresh
roots. A wall must not mutate a live ComfyUI instance, the operator's DSH
home, or the production run tree unless it is explicitly an owner-local live
gate. `INFERENCE_TEST_SANDBOX=1` is the management-plane safety pin.

## Test laws

- **Card birth law** — a run is born from an action-card draft.
- **CAS law** — drafts and benches use live revisions and refuse stale writes.
- **Queue lane law** — unknown or missing seats refuse loudly; no fallback
  runtime is created.
- **Inject law** — optional services are probed with `ctx.get` at the use
  site.
- **Compile-time gates** — declared pins, kinds, and initial validators are
  checked before a run is registered.
- **Secrets safety** — credentials and machine secrets never enter fixtures,
  snapshots, or source control.

A self-skip is not a pass. Record its exact prerequisite when a live gate is
required, and keep the overall receipt open until that class of proof runs.
