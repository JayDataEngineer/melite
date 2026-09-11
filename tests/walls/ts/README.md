# The TS walls plane — the estate's proof plane (2026-09-10: the
# gateway kill retired the Python walls with the gateway itself).

Wall suites as erasable-syntax TypeScript run under the SAME runtime
as the serving estate (`node --experimental-strip-types`), mounting
the real seats in-process (timer, queue, storage, drafts, card
registry, disclose/manage/skills/load, runs) and asserting live
behavior — no HTTP rig, no second process.

## Runner convention

- suites: `node --experimental-strip-types --test <suite>` (`node:test`,
  stdlib — no framework, no build, no new deps);
- full plane: `node tests/walls/ts/run.mjs` (this directory's
  orchestrator: per-suite subprocesses, sandbox guards, summary);
- types: `tsc --noEmit -p tests/walls/ts/tsconfig.json`.

The editor/card-deck lanes keep their own `"test": "vitest run"` scripts;
this plane does not compete with them — it walls the estate-seat
contracts the tools and the GUI ride.

## Sandbox discipline (HARD BOUNDARIES, enforced by `run.mjs` + helpers)

- never the real state root: every boot gets a fresh `mkdtemp` state
  root (`MELITE_STATE_ROOT`) plus a fixture `MELITE_REPO_ROOT` carrying
  only an `inference.config.json`;
- ComfyUI native `:18466` is never touched (the status probe sees no
  endpoint url, so no fetch ever leaves the sandbox);
- manage lifecycle arms pin `INFERENCE_TEST_SANDBOX=1` (the hermetic
  pin — the live engine is never mutated);
- PROD `:3080` is untouched (no wall boots a web server).

## Suites

- `suites/disclose.test.ts` — the disclose seat + its lanes (discover
  over both planes, manage, skills, load).
- `suites/runs-remote.test.ts` — the runs registry seat ({flow:} +
  {model:} arms, pin-sweep honest refusals, the initial_validators
  compile-time gate).
- `suites/gallery-host.test.ts` — the gallery host row (in-tree seats,
  cross-host pin, artifact confinement, sidecar law).
- `suites/ledger-tail.test.ts` — the queue journal tail (matched/shown,
  clamp, prefix, lane).
- `suites/drafts-remote.test.ts`, `suites/queue-service.test.ts` — the
  drafts remote (CAS law) and the serial queue service.
- `suites/models-*.test.ts`, `suites/families-*.test.ts` — the model
  DECLs, catalog, cascade, and golden pins.
- `suites/card-kinds-chain.test.ts`, `suites/form-spec-parity.test.ts`,
  `suites/params-spec-fidelity.test.ts`, `suites/mod-interlock.test.ts`,
  `suites/engine-supervisor.test.ts`, `suites/s4-client-deps.test.ts` —
  the card/model/engine contract walls.
