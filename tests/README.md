# tests/

A pytest project. The runner:

    uv run pytest                # unit + routes + walls (fast, no GPU)
    uv run pytest -m gpu         # integration: REAL inference (GPU money)

## Layout

Every suite lives in a folder for its plane — nothing piles up at
the root:

    tests/
      conftest.py                root: repo fixture + the ONE py/ sys.path insert
      unit/                      no server, milliseconds
        conftest.py              make_run factory (tmp_path-based)
        estate/                  config, workspace laws, boundary-drift linter
        plugins/                 plugin contract sweep, subprocess isolation
        runtime/                 asset ledger (PYTHON SHAPE + RESILIENCE, unit)
      routes/                    live gateway; SKIPS when down
        conftest.py              GatewayClient + live fixture
        control/                 /v1/manage + ONE-DOOR singularity
        data/                    /v1/assets + run.completed + L3 (live)
        discovery/               client smoke, lanes / card-tools / skills
      integration/               REAL inference, -m gpu (scratch gateway)
      walls/                     THE WALL PLANE
        conftest.py              collect_ignore — suites/ is never collected
        test_walls.py            the subprocess orchestrator (exit codes)
        suites/                  the script-style wall suites (check()
                                  discipline + exit code IS the contract;
                                  run directly: python3 tests/walls/suites/
                                  test_<name>.py — never imported by pytest)
      dev_dsh/                   the DSH harness gate ladder
        test_dev_dsh.py          structural + host-side boot gates (pytest)
        test_dev_dsh_boot_e2e.py browser-side boot gate (python3.14 + playwright)
        run_dev_dsh_tests.sh     single entrypoint for the ladder
      timeline/                  h3 timeline suite (own runner: run_tests.sh)
      golden_compose/            compose goldens + their _runner.py wall
      golden_http/               the wire-contract goldens (C RETIREMENT)

## Conventions

* unit tests take fixtures (tmp_path, make_run); no per-file sys.path
  rituals -- the root conftest owns the py/ path.
* route tests take the live client: live.get(path), live.post(path,
  body), live.fetch_bytes(path). A down gateway skips the suite.
* assertions are plain assert; parametrize whenever cases differ by
  data only.
* script-style wall suites live in walls/suites/, keep their
  check()/exit-code shape, and get pinned by walls/test_walls.py
  (WALLS when green; KNOWN_DRIFT when red at HEAD for another lane's
  reasons). New pytest-native walls go in unit/ or routes/.
* dev_dsh and timeline keep their own runners (two interpreters /
  ComfyUI-side probes); they are not in testpaths.

## The live-gateway contract

The routes suites hit 127.0.0.1:33081 (TEST_GATEWAY_BASE overrides).
Boot:

    pkill -f "gateway.py 33081"   # operator only
    cd <repo> && setsid /usr/bin/python3 py/gateway.py 33081 \
      >> data/gateway.log 2>&1 < /dev/null &

## The laws the tests pin

* PYTHON SHAPE LAW -- frozen rows, closed enums (unit/runtime/test_asset_ledger)
* RESILIENCE LAW -- indexing never raises (unit/runtime/test_asset_ledger)
* PLUGIN ARCHITECTURE -- py/ is generic; plugins independent (unit/
  estate/test_architectural_contracts)
* EXTENSION LAW -- vendor packs isolated, references study-only (same)
* PROVISIONING LAW -- /v1/manage is the ONE door (routes/control/
  test_manage_route; walls/suites/test_provision)
* C RETIREMENT -- the http goldens are OUR wire contract (walls/
  suites/test_http_parity); provision door stays 404 (routes/data/
  test_assets_route)
* TEST/PROD BARRIER (L1-L4) -- test runs tagged, segregated, routed to
  test-output, harness-tagged (routes/data/test_assets_route + the
  melite-tools bun suite)
* Secrets safety -- llm_keystore cannot be committed (unit/estate/
  test_workspace_laws)
