# tests/

The estate's proof tree (2026-09-10: the gateway kill retired the
pytest plane — `conftest.py`, `_bootstrap.py`, `unit/`, `routes/`,
and the scratch-gateway rig died with the gateway app).

## Layout

    tests/
      walls/ts/                THE WALL PLANE (node:test, stdlib only)
        run.mjs                orchestrator: per-suite subprocesses,
                               sandbox guards, tally
        suites/                the wall suites (disclose, runs-remote,
                               gallery-host, ledger-tail, drafts-remote,
                               queue-service, models-*, families-*,
                               card/form/params/mod/engine/s4 walls)
        helpers/               boot rigs (fresh sandbox dirs per boot)
      golden_cordis/           compose goldens (the graph truth, pinned)
      golden_http/             the model-catalog tree golden (live —
                               models-golden wall anchors to it)
      integration/             live integration material
      data/ fixtures/ helpers/ shared wall fixtures + helpers

The tool-level suites live with their packages:

    packages/harness/melite-tools/test/melite-flow.test.ts   (17/17)
    packages/harness/melite-tools/test/smoke.mjs              (15/15, in-process estate)
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
