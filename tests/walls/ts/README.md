# The TS walls — the estate's proof suites (2026-09-11: vitest-native;
# the node:test runner `run.mjs` is deleted, the suites run under root
# `pnpm run test`, node project, pool forks — the file isolation the
# orchestrator's per-suite subprocesses used to provide).

Wall suites as erasable-syntax TypeScript mount the real seats
in-process (timer, queue, storage, drafts, card registry,
disclose/manage/skills/load, runs) and assert live behavior — no HTTP
rig, no second process.

## Runner convention

- everything: `pnpm run test` (root vitest; this tree's
  `suites/*.spec.ts` ride the node project);
- one suite: `npx vitest run tests/walls/ts/suites/<name>.spec.ts`;
- types: `tsc --noEmit -p tests/walls/ts/tsconfig.json`.

## Sandbox discipline (HARD BOUNDARIES, enforced by the suites)

- never the real state root: every boot gets a fresh `mkdtemp` state
  root (`MELITE_STATE_ROOT`) plus a fixture `MELITE_REPO_ROOT` carrying
  only an `inference.config.json`;
- ComfyUI native `:18466` is never touched (the status probe sees no
  endpoint url, so no fetch ever leaves the sandbox);
- manage lifecycle arms pin `INFERENCE_TEST_SANDBOX=1` (the hermetic
  pin — the live engine is never mutated);
- PROD `:3080` is untouched (no wall boots a web server).

## Suites

- `suites/disclose.spec.ts` — the disclose seat + its lanes (discover
  over both planes, manage, skills, load).
- `suites/runs-remote.spec.ts` — the runs registry seat ({flow:} +
  {model:} arms, pin-sweep honest refusals, the initial_validators
  compile-time gate).
- `suites/gallery-host.spec.ts` — the gallery host row (in-tree seats,
  cross-host pin, artifact confinement, sidecar law).
- `suites/ledger-tail.spec.ts` — the queue journal tail (matched/shown,
  clamp, prefix, lane).
- `suites/drafts-remote.spec.ts` — the drafts remote (CAS law).
- `suites/runs-remote.spec.ts` and the package-local
  `packages/harness/estate-queue/tests/queue-core.spec.ts` — the runs
  remote and serial queue service.
- `suites/models-*.spec.ts`, `suites/families-*.spec.ts` — the model
  DECLs, catalog, cascade, and golden pins.
- `suites/mod-interlock.spec.ts`, `suites/s4-client-deps.spec.ts` —
  the card/model/engine contract walls. (The supervisor wall died at
  the 2026-10-12 dedupe: every law moved home to
  comfyui-cordis/tests/supervisor.spec.ts and the mockless
  comfyui-host-repoint.spec.ts — dev_docs/audits/supervisor-duplicate-map-2026-10-12.md.)
