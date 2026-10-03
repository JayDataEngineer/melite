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
| `pnpm run test:lane` | the 3088 lane harness's live gate (video + 3D-non-Unity paths, real estate) |
| `pnpm run test:lane:analyse` | the lane analyst as a driver: judge the paths, exit non-zero on a fail or a block |
| `pnpm run test:lane:commission` | commission a real headless maker for a path, then analyse what it left |

The root Vitest config partitions specs into isolated node, DOM, DOM18, and
React-18 deck projects. Package-local `typecheck` commands may still exist;
they are not a second test runner.

Browser-wall law (li-bu): the first-run masking notice is dismissed by its
CLASS — any dialog heading `/Notice/` with a Continue button, retried until a
real click lands — never by a baked title. The shells retitle it mid-arc
("Preview Notice" -> "Internal Testing Notice"), and every baked copy
(card-view's tour spine, the deck's two settle helpers) rots on the next
retitle.

## Current layout

```text
tests/
  unit/                  cross-cutting TypeScript unit specs
  e2e/                   live/e2e specs with their own prerequisite gates
  lane/                  the 3088 lane harness (the operator's video +
                         3D-non-Unity test/analyse loop)
    analysis.ts            the analyst: run-tree scan, transcript
                           discovery (collision law), MP4/GLB/OBJ
                           artifact verdicts, path verdicts
    analysis.spec.ts       its walls — real films/meshes as fixtures,
                           no GPU and no engine
    commission.ts          the commissioner: brief + launch prompt
                           through scripts/commission-supervisor.sh
    commission.spec.ts     its walls — a stubbed MAKER, never a real one
    3088-lane.e2e.ts       the live gate (engine-gated; writes
                           data/lane-harness/verdict.json)
    run.ts                 the driver: `analyse` | `commission`
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
current runner. See [`dev_docs/testing/index.md`](../dev_docs/testing/index.md) for
gate interpretation and [`dev_docs/testing/chaos-tests.md`](../dev_docs/testing/chaos-tests.md)
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

## The 3088 lane harness

`tests/lane/` is the harness for the 3088 media maker lane: it
COMMISSIONS a real headless maker through `scripts/commission-supervisor.sh`
(the runbook's one-call launch, with the transcript's collision-law done-GLOB
and the queue-lock turn-wait) and ANALYZES what the commission left behind —
the run tree, the run's own sidecars, and the artifact bytes themselves.

- Judged paths: `video` (the assembled `h3_t4_film_*.mp4` — a per-window
  render is NOT a film receipt) and `3d` (the mesh cards/flows, non-Unity:
  `.glb`/`.gltf`/`.obj`; Unity is an MCP editor lane, not this maker's).
- A path passes only on a terminal, successful run holding a REAL artifact
  whose bytes parse; a running run, a failed run, a sidecar-less run dir, a
  window render, or an unparseable artifact is a `fail` with its reason.
- A missing prerequisite is `blocked`, never `pass`, and the machine-readable
  receipt (`data/lane-harness/verdict.json`) says so.
- The window defaults to 24h (`LANE_SINCE_MS` overrides) so a cumulative run
  tree answers for the recent commission, not for the archive.

```sh
pnpm run test:lane                       # the live gate (verdict receipt)
LANE_STRICT=1 pnpm run test:lane         # …as a gate: a failing path fails
pnpm run test:lane:analyse -- --path 3d  # judge one path, non-zero on a fail
pnpm run test:lane:analyse -- --all      # the whole tree (forensics)
pnpm run test:lane:commission -- --path video --dry   # mint a brief, launch nothing
```

The analyst's own walls (`analysis.spec.ts`, `commission.spec.ts`) run in the
node project with no engine, no GPU, and no provider: they are proven against
a real H3 film, real glTF binaries, and a stubbed maker.
