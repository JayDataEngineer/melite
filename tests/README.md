# tests/

The estate's proof tree (2026-09-10: the gateway kill retired the
pytest plane — `conftest.py`, `_bootstrap.py`, `unit/`, `routes/`,
and the scratch-gateway rig died with the gateway app).

## Layout (DSH seven tiers — no legacy plane)

2026-09-11: the legacy node:test/bun:test plane is REMOVED (ledger
§TEST-4). Every spec runs under root vitest; no per-package `test`
scripts, no walls runner, no `.test.*` files remain.

    vitest.config.ts           UNIT (all projects; per-file 100% gate on models DECL)
    vitest.e2e.config.ts       REAL-API e2e (tests/e2e/*.e2e.ts, self-skip without key)
    vitest.expected.config.ts  OWNER-LOCAL expected (tests/expected/*.expected.e2e.ts)
    vitest.bench.config.ts     BENCH (benchmarks/*.bench.ts)
    vitest.snapshot.config.ts  SNAPSHOT (snapshots/session|acp|sdk)
    vitest.web.config.ts       WEB snapshot (snapshots/web + packages/web/tests/expected)

    tests/
      harness.ts               SHARED fixtures (never another *.e2e.ts)
      helpers/launch.ts        dual-mode launcher (lib vs src) + launch-probe.mjs
      unit/                    cross-cutting unit specs (registry HMR lives with its owner)
      e2e/                     with-key smokes (estate-smoke.e2e.ts)
      expected/                assembled expectations (smoke.expected.e2e.ts)
      walls/ts/                the wall suites, now vitest-native
                               (disclose, runs-remote,
                               gallery-host, ledger-tail, drafts-remote,
                               queue-service, models-*, families-*,
                               card/form/params/mod/engine/s4 walls)
        suites/                *.spec.ts under the root node project
                               (forks: the file isolation run.mjs
                               used to provide)
      golden_cordis/           compose goldens (the graph truth, pinned)
      golden_http/             the model-catalog tree golden (live —
                               models-golden wall anchors to it)
      integration/             live integration material
      data/ fixtures/ helpers/ shared wall fixtures + helpers

Package specs live with their packages (`packages/*/*/tests/`,
`packages/*/*/test/`, the editor's `src/__tests__/` + card-deck's
`src/client/__tests__/`); the root config partitions them into
node/dom/dom18/deck projects (deck = the card-deck client's own
React-18 universe). Manual rigs (not specs, not in CI):

    packages/harness/melite-tools/test/smoke.mjs              (in-process estate)
    packages/harness/melite-tools/test/estate-drive.mjs       (the headless job-server proof)

## Conventions

* suites boot the real seats in-process (timer, queue, storage,
  drafts, cards, disclose/manage/skills/load, runs) — no HTTP rig,
  no second process, no hand-rolled Popen loops;
* every boot mints fresh sandbox dirs (`MELITE_STATE_ROOT` + fixture
  repo root) — a suite never touches the real tree, the live engine
  (`INFERENCE_TEST_SANDBOX=1` pins manage lifecycle arms), or PROD
  `:3080`;
* assertions are plain `node:assert/strict`; managed seats throw LOUD
  (`RemoteError` with named codes) — walls pin the voices;
* a refusal is a value or a named throw per the seat's contract —
  never an absorbed fallback.

## The laws the tests pin

* CARD BIRTH LAW — every run is born from an action card draft
* CAS LAW — drafts/bench persist across runs; clients read-modify-write on live revs
* QUEUE LANE LAW — no fallbacks; unknown lanes refuse with the door's voice
* INJECT LAW — optional seats probe with `ctx.get` at the use site
* COMPILE-TIME GATES — pin sweep + initial_validators refuse before any run registers
* SECRETS SAFETY — no keystore material is ever committed
