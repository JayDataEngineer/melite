# The TS walls plane (successor of `tests/walls/suites/*.py` + `tests/unit` + `conftest`)

Date: 2026-09-08. Status: pilot (three suites; full conversion is follow-up work).

NO-ESTATE-PYTHON LAW: the estate writes zero Python, so the proof plane
cannot stay Python. This directory is the successor: wall suites as
erasable-syntax TypeScript run under the SAME runtime as the serving
gateway (`node --experimental-strip-types`), asserting live wire + source
shapes. The condemned `tests/walls/suites/*.py`, `tests/unit`, and
`conftest.py` are read-only specs during conversion and die afterwards —
never edit them, never run `tools/run_walls.py` (condemned plane).

## Runner convention

Root `package.json` declares no test script, and the gateway leaves
(`gateway-core`, `gateway-doors`, `queue`, `gateway`) carry only
`typecheck` — their `package.json` files are frozen by the parent rail
build, so no `vitest` script/dependency can be declared there, and no new
npm dependency is justified for what the stdlib already ships. The
convention is therefore:

- suites: `node --experimental-strip-types --test <suite>` (`node:test`,
  stdlib — no framework, no build, no new deps);
- full plane: `node tests/walls/ts/run.mjs` (this directory's
  orchestrator: per-suite subprocesses, sandbox guards, summary);
- types: `tsc --noEmit -p tests/walls/ts/tsconfig.json` (any package
  `tsc` binary works — e.g. `pnpm --dir packages/gateway-doors exec tsc`).

The editor/card-deck lanes keep their own `"test": "vitest run"` scripts;
this plane does not compete with them — it walls the gateway/door
contracts the Python walls used to pin.

## Sandbox discipline (HARD BOUNDARIES, enforced by `run.mjs` + helpers)

- never the live PROD gateway: the runner refuses `GATEWAY_PORT=33081`;
  boots are always ephemeral-port (`READY <port>` handshake);
- never the real state root: every boot gets a fresh `mkdtemp` state
  root (`MELITE_STATE_ROOT`) plus a fixture `MELITE_REPO_ROOT` carrying
  only an `inference.config.json`;
- ComfyUI native `:18466` is never touched (the status probe sees no
  endpoint url, so no fetch ever leaves the sandbox);
- the vendor MCP rail is stubbed (`fixtures/mcp-stub.mjs`, pinned via
  `MELITE_COMFY_MCP_BIN`) — dispatch legs never spawn the real vendor
  binary, keeping the plane hermetic and fast.

## Suites

- `suites/manage-vocabulary.test.ts` — the manage-vocabulary wall
  (successor of `test_manage_parity.py`): the 17-action SSOT in
  `packages/gateway-doors/src/doors/manage.ts` (`ACTIONS`), handler-row
  coverage (`HANDLERS`), the exact `LIFECYCLE_GUARDED` set, and the
  panel/tool 1:1 mirror. Sources-as-text, no imports, no boot.
- `suites/manage-wire.test.ts` — the manage-wire wall (successor of the
  `test_gateway_bridges_parity.py` manage legs): bad-JSON 400,
  method-mismatch 404, list-body 500, plane-unavailable 503, dispatch
  422s, catalog-missing 503, live status 200 (stub rail),
  trailing-slash normalization, auth 401, and the `resolveComfyMcpBin`
  unit probe — all against sandbox boots.
- `suites/law-hygiene.test.ts` — law-text hygiene for TS sources:
  no live (import/spawn/path) references to deleted estate modules and
  no SSOT/authoritative claims naming dead paths. Provenance comments
  (line-cited origins, dead-marked history) pass — only authority and
  live code fail.
