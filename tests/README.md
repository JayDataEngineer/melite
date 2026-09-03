# tests/

The test estate. All unittest, no pytest. Run with
.venv/bin/python -m unittest tests.<module> from the repo root.

## Layout

| kind | naming | needs live gateway? |
|---|---|---|
| **unit** (rows, models, helpers) | test_<thing>.py | no |
| **live route wall** (one per route) | test_<route>.py (singular) | yes |
| **live route smoke** (several routes, lighter pins) | test_routes_<aspect>.py (plural) | yes |
| **parity / golden** | test_<thing>_<aspect>.py | varies |
| **tripwires** (filesystem / git / pnpm) | test_<subject>_laws.py or <subject>.py | no |
| **shared helper** | _<name>.py (underscore prefix -- unittest skips) | n/a |

## The live-gateway contract

The test_*_route.py and test_routes_smoke.py suites hit a real
gateway on 127.0.0.1:33081 (override with TEST_GATEWAY_BASE). They
all inherit tests/_live.LiveRequired -- when the gateway is
unreachable the suite is **skipped** with a one-line operator hint,
not a 4-suite red. If a live suite fails with Connection refused on
a fresh tree, the gateway is the problem, not the test.

To boot the gateway:

    pkill -f "gateway.py 33081"   # operator only
    cd <repo> && setsid /usr/bin/python3 py/gateway.py 33081       >> data/gateway.log 2>&1 < /dev/null &

## The shape laws the tests pin

* **PYTHON SHAPE LAW** -- frozen pydantic rows (test_asset_ledger:
  RowShapeTests.test_frozen, IndexFrozenTests.test_run_index_frozen)
* **PYTHON SHAPE LAW** -- closed-vocab enums (test_asset_ledger:
  RowShapeTests.test_kind_vocab_closed; test_assets_route:
  AssetsRouteShapeTests.test_row_kinds_are_closed)
* **RESILIENCE LAW** -- scan/index never raise on garbled input
  (test_asset_ledger.ResilienceTests)
* **QUEUE LANE LAW** -- 4xx before registration (test_http_parity
  covers the surface)
* **C RETIREMENT** -- provision door stays 404
  (test_assets_route.CCruftAbsenceTests; test_manage_route:
  ManageDoorSingularityTests)
* **EXTENSION LAW** -- no project-root derived artifacts
  (test_workspace_laws.DerivedArtifactHomeTests)
* **PROVISIONING LAW** -- /v1/manage is the ONE management door
  (test_manage_route.ManageDoorSingularityTests)
* **INFERENCE LAW** -- sha16 = sha256[:16] on completion
  (test_assets_route.RunCompletedLedgerTests;
   test_asset_ledger.CompletedPayloadTests)
* **Secrets safety** -- llm_keystore cannot be committed
  (test_workspace_laws.SecretSafetyTests)
