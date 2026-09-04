# tests/

A pytest project. The runner:

    uv run pytest                # unit + routes + walls (fast, no GPU)
    uv run pytest -m gpu         # integration: REAL inference (GPU money)

## Layout

    tests/
      conftest.py                root: repo fixture + the ONE py/ sys.path insert
      unit/                      no server, milliseconds
        conftest.py              make_run factory (tmp_path-based)
        test_asset_ledger.py     PYTHON SHAPE + RESILIENCE + L3 (unit)
        test_plugin_drift.py     plugin contract sweep (parametrized)
        test_plugin_isolation.py subprocess clean-import walls
        test_workspace_laws.py   fs / git / pnpm tripwires
        test_architectural_contracts.py  boundary-drift linter wall
      routes/                    live gateway; SKIPS when down
        conftest.py              GatewayClient + live fixture
        test_gateway_client.py   client smoke
        test_assets_route.py     /v1/assets + run.completed + L3 (live)
        test_manage_route.py     /v1/manage + ONE-DOOR singularity
        test_routes_smoke.py     lanes / card-tools / skills smokes
      integration/               REAL inference, -m gpu (scratch gateway)
      walls/                     test_walls.py: subprocess orchestrator
      test_*.py                  the script-style walls (NOT pytest-
                                 collected; the orchestrator runs them
                                 and pins exit codes)

## Conventions

* unit tests take fixtures (tmp_path, make_run); no per-file sys.path
  rituals -- the root conftest owns the py/ path.
* route tests take the live client: live.get(path), live.post(path,
  body), live.fetch_bytes(path). A down gateway skips the suite.
* assertions are plain assert; parametrize whenever cases differ by
  data only.
* new walls go in tests/unit or tests/routes; new script walls stay
  at tests/ root and get added to tests/walls/test_walls.py WALLS.

## The live-gateway contract

The routes suites hit 127.0.0.1:33081 (TEST_GATEWAY_BASE overrides).
Boot:

    pkill -f "gateway.py 33081"   # operator only
    cd <repo> && setsid /usr/bin/python3 py/gateway.py 33081 \
      >> data/gateway.log 2>&1 < /dev/null &

## The laws the tests pin

* PYTHON SHAPE LAW -- frozen rows, closed enums (unit/test_asset_ledger)
* RESILIENCE LAW -- indexing never raises (unit/test_asset_ledger)
* PLUGIN ARCHITECTURE -- py/ is generic; plugins independent (tools/
  arch_lint.py via unit/test_architectural_contracts)
* EXTENSION LAW -- vendor packs isolated, references study-only (same)
* PROVISIONING LAW -- /v1/manage is the ONE door (routes/test_manage_route)
* C RETIREMENT -- provision door stays 404 (routes/test_assets_route)
* TEST/PROD BARRIER (L1-L4) -- test runs tagged, segregated, routed to
  test-output, harness-tagged (routes/test_assets_route + the
  melite-tools bun suite)
* Secrets safety -- llm_keystore cannot be committed (unit/test_workspace_laws)
