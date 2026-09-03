# tests/

The test estate. Two runtimes:

* uv run pytest         -- native pytest under tests/pytest/ (the
  per-law walls, the helper smoke, the workspace tripwires). Plus
  the script-wall orchestrator at tests/pytest/test_walls.py which
  subprocess-runs the script-style walls.
* uv run pytest -m gpu  -- real-inference integration suite under
  tests/integration/ (boots a scratch gateway, submits cards, waits
  for artifacts on disk). Deselected by default; GPU money.

The script-style walls (tests/test_*.py) are deliberately NOT
converted to pytest -- their check() discipline, exit codes, and
stdout-as-contract are the walls themselves. pytest wraps each as a
subprocess in tests/pytest/test_walls.py and asserts the exit code
(one suite, one test, one code).

## Layout

| dir / file | kind | needs live gateway? |
|---|---|---|
| tests/pytest/test_asset_ledger.py | unit + resilience (PYTHON SHAPE LAW) | no |
| tests/pytest/test_workspace_laws.py | filesystem / git / pnpm tripwires | no |
| tests/pytest/test_assets_route.py | live /v1/assets + run.completed wall | yes (live) |
| tests/pytest/test_manage_route.py | live /v1/manage wall + singularity | yes (live) |
| tests/pytest/test_routes_smoke.py | live smoke for the no-wall routes | yes (live) |
| tests/pytest/test_http_helper.py | conftest live-fixture smoke | yes (live) |
| tests/pytest/test_walls.py | script-wall orchestrator (one test per script) | varies |
| tests/pytest/conftest.py | live fixture + repo fixture | n/a |
| tests/integration/test_*.py | REAL INFERENCE (cards through the queue) | yes (scratch) |
| tests/integration/conftest.py | scratch-gateway fixture + QueueDoor | n/a |
| tests/test_*.py | script-style walls (subprocess-run by test_walls.py) | varies |
| tests/golden_http/, tests/golden_compose/ | wire + compose goldens | n/a |

## The live-gateway contract

The live fixture in tests/pytest/conftest.py pings /v1/health once
per session; any test that requests it is auto-skipped with a
one-line operator hint when the gateway is unreachable. A live
suite never goes red on a down gateway.

To boot the gateway:

    pkill -f "gateway.py 33081"   # operator only
    cd <repo> && setsid /usr/bin/python3 py/gateway.py 33081 \
      >> data/gateway.log 2>&1 < /dev/null &

## The shape laws the tests pin

* PYTHON SHAPE LAW -- frozen pydantic rows (test_asset_ledger:
  TestRowShape.test_frozen, TestIndexFrozen)
* PYTHON SHAPE LAW -- closed-vocab enums (test_asset_ledger:
  TestRowShape.test_kind_vocab_closed; test_assets_route:
  TestAssetsRouteShape.test_row_kinds_are_closed)
* RESILIENCE LAW -- scan/index never raise on garbled input
  (test_asset_ledger.TestResilience)
* C RETIREMENT -- provision door stays 404 (test_assets_route:
  TestCCruftAbsence; test_manage_route:
  TestManageDoorSingularity)
* EXTENSION LAW -- no project-root derived artifacts
  (test_workspace_laws.TestDerivedArtifactHome)
* PROVISIONING LAW -- /v1/manage is the ONE management door
  (test_manage_route.TestManageDoorSingularity)
* INFERENCE LAW -- sha16 = sha256[:16] on completion
  (test_assets_route.TestRunCompletedLedger;
   test_asset_ledger.TestCompletedPayload)
* Secrets safety -- llm_keystore cannot be committed
  (test_workspace_laws.TestSecretSafety)
