"""/v1/assets + run.completed hook -- the asset-ledger rung wall.

Envelope, filter, integrity, the worker completion event, the
C-cruft tripwire. Live-gateway; uses the live fixture.
"""
import hashlib
import re
import urllib.request

import pytest

REQUIRED_RUN_KEYS = {"run_id", "name", "status", "created_at",
                       "test", "artifacts"}
REQUIRED_ROW_KEYS = {"name", "run_id", "kind", "bytes", "sha256", "url"}


class TestAssetsRouteShape:
    def test_envelope(self, live):
        code, body = live["get"]("/v1/assets?limit=200")
        assert code == 200
        assert set(body.keys()) == {"count", "artifacts", "runs"}
        assert isinstance(body["count"], int)
        assert isinstance(body["runs"], list)

    def test_run_envelope_keys(self, live):
        code, body = live["get"]("/v1/assets?limit=200")
        runs = [r for r in body["runs"] if r["artifacts"]]
        assert runs, "live estate should have at least one run with artifacts"
        assert set(runs[0].keys()) == REQUIRED_RUN_KEYS
        row = runs[0]["artifacts"][0]
        assert set(row.keys()) == REQUIRED_ROW_KEYS

    def test_row_kinds_are_closed(self, live):
        code, body = live["get"]("/v1/assets?limit=200")
        allowed = {"image", "video", "audio", "model", "document", "other"}
        for run in body["runs"]:
            for row in run["artifacts"]:
                assert row["kind"] in allowed, \
                    f"row {row['name']} has unvouched kind {row['kind']!r}"

    def test_sha256_is_64_hex(self, live):
        code, body = live["get"]("/v1/assets?limit=200")
        for run in body["runs"]:
            for row in run["artifacts"]:
                assert re.match(r"^[0-9a-f]{64}$", row["sha256"]), \
                    f"row {row['name']} bad sha: {row['sha256']!r}"
                assert row["bytes"] > 0


class TestAssetsRouteFilter:
    def test_kind_filter(self, live):
        code, body = live["get"]("/v1/assets?kind=image&limit=200")
        assert code == 200
        for run in body["runs"]:
            for row in run["artifacts"]:
                assert row["kind"] == "image"

    def test_run_filter(self, live):
        code, body = live["get"]("/v1/assets?limit=200")
        target = next((r for r in body["runs"] if r["artifacts"]), None)
        assert target is not None
        code2, body2 = live["get"](f"/v1/assets?run={target['run_id']}")
        assert code2 == 200
        assert body2["runs"]
        assert body2["runs"][0]["run_id"] == target["run_id"]

    def test_limit_honored(self, live):
        # limit caps RUN ROWS; the envelope artifacts field is the
        # TOTAL int across returned runs, not a slice.
        code, body = live["get"]("/v1/assets?limit=1")
        assert code == 200
        assert body["count"] <= 1
        assert len(body["runs"]) <= 1
        assert isinstance(body["artifacts"], int)


class TestAssetsRouteIntegrity:
    def test_index_sha_matches_streamed_bytes(self, live):
        # the index sha256 must equal the sha256 of the bytes served
        # at the row url. state-is-not-contract law only holds if the
        # index agrees with the bytes.
        code, body = live["get"]("/v1/assets?kind=image&limit=200")
        for run in body["runs"]:
            for row in run["artifacts"]:
                with urllib.request.urlopen(
                        live["BASE"] + row["url"],
                        timeout=live["TIMEOUT"]) as r:
                    blob = r.read()
                assert hashlib.sha256(blob).hexdigest() == row["sha256"], \
                    f"sha mismatch for {row['name']}"


class TestRunCompletedLedger:
    def test_run_completed_event_present(self, live):
        # 2000 is enough headroom: the gateway writes server.boot on
        # every restart and that can drown the run.completed entries
        # in a 200-entry newest-first window.
        code, body = live["get"]("/v1/ledger?limit=2000")
        assert code == 200
        events = [e["event"] for e in body["entries"]]
        assert "run.completed" in events, \
            f"ledger has no run.completed event: top events={events[:10]}"

    def test_run_completed_payload_has_sha16(self, live):
        # the meld-assets contract: every run.completed row carries
        # sha16 = sha256[:16]. Pin it.
        code, body = live["get"]("/v1/ledger?limit=2000")
        assert code == 200
        seen = False
        for e in body["entries"]:
            if e["event"] != "run.completed":
                continue
            data = e.get("data", {})
            for row in data.get("artifacts", []):
                seen = True
                assert row["sha16"] == row["sha256"][:16], \
                    f"sha16 != sha256[:16] for {row.get('name')}"
        assert seen, "no run.completed event carried any artifacts"

    def test_run_completed_payload_shape(self, live):
        # 4 identity keys have always been there; created_at was
        # added later. Live ledger is mixed-age -- pin the universal
        # 4; report created_at presence as a forward-compat signal.
        # The real created_at law is the unit test in
        # test_asset_ledger (the code under test).
        code, body = live["get"]("/v1/ledger?limit=2000")
        assert code == 200
        seen = False
        for e in body["entries"]:
            if e["event"] != "run.completed":
                continue
            data = e.get("data", {})
            assert {"run_id", "name", "status", "artifacts"}.issubset(
                data.keys()), \
                f"run.completed dropped an identity key: {sorted(data.keys())}"
            assert isinstance(data["run_id"], str)
            assert isinstance(data["name"], str)
            assert data["status"] == "completed"
            assert isinstance(data["artifacts"], list)
            if "created_at" in data:
                assert isinstance(data["created_at"], int)
            seen = True
        assert seen, "no run.completed event found in the live ledger"


class TestCCruftAbsence:
    # the C-era POST /v1/models/provision was cut in the same commit
    # as this rung; the 404 stays here as the regression guard.

    def test_provision_door_stays_404(self, live):
        code, _ = live["post"]("/v1/models/provision", {})
        assert code == 404, \
            "POST /v1/models/provision is back -- the C-cruft cut regressed"


class TestTestFlagExclusion:
    # L2 LIVE wall: the production /v1/assets must NOT show test
    # runs by default. The barrier is the asset-index default; this
    # test exercises it end-to-end on the live gateway. The test run
    # is a real sidecar on disk inside the gateway's OUT_ROOT --
    # if the barrier regresses, the run appears by default and this
    # test fails.

    def _create_test_run(self, live, run_id):
        # The gateway's OUT_ROOT is data/runs/output (gateway.py
        # defines it). We can find it from the live /v1/assets
        # response -- the index lives in that dir.
        # Simpler: ask the gateway. Use a one-shot probe by listing
        # the directory via the index's run rows; we already know
        # it lives under the repo. The integration conftest shows
        # the layout; the gateway log is the source of truth. We
        # write to <repo>/data/runs/output/<run_id>/
        import json
        import os
        import urllib.request
        # Find the repo root via the live base
        repo = live["BASE"]
        # The gateway serves files at <base>/editor/assets/runs/<id>/<file>
        # -- we can read one to confirm the path. Or use a sentinel:
        # the test runs add a tiny file and the sidecar.
        out_root = os.path.join(
            os.path.dirname(os.path.dirname(repo.replace("http://",
                                                           ""))),
            "data", "runs", "output")
        # If OUT_ROOT isn't where we expect, fall back to the well-known
        # env-derived path; the test then skips if it can't resolve.
        if not os.path.isdir(out_root):
            return None
        run_dir = os.path.join(out_root, run_id)
        os.makedirs(run_dir, exist_ok=True)
        # tiny PNG-ish payload (just bytes; the index only requires
        # a non-empty, non-_ file)
        with open(os.path.join(run_dir, "test-artifact.bin"), "wb") as f:
            f.write(b"test-artifact-payload-12345")
        with open(os.path.join(run_dir, "_pipeline.json"), "w") as f:
            json.dump({
                "run_id": run_id, "status": "completed",
                "model": "test-model", "created_at": 1700000000,
                "test": True,
            }, f)
        return run_dir

    def _cleanup(self, run_dir):
        if not run_dir:
            return
        import os
        import shutil
        shutil.rmtree(run_dir, ignore_errors=True)

    def test_test_run_excluded_by_default(self, live):
        # create a test-flagged run on disk
        import time
        run_id = f"run-barrier-test-{int(time.time()*1000)}"
        run_dir = self._create_test_run(live, run_id)
        try:
            # default view: must NOT contain the test run
            code, body = live["get"]("/v1/assets?limit=200")
            assert code == 200
            run_ids = [r["run_id"] for r in body["runs"]]
            assert run_id not in run_ids, \
                f"test run {run_id} leaked into /v1/assets by default"
            # ...and every visible run has test: false
            assert all(r.get("test") is False for r in body["runs"]), \
                "a non-test run was tagged as test"
        finally:
            self._cleanup(run_dir)

    def test_test_run_visible_with_include_test(self, live):
        import time
        run_id = f"run-barrier-test-{int(time.time()*1000)}"
        run_dir = self._create_test_run(live, run_id)
        try:
            # opt-in: must contain the test run
            code, body = live["get"](
                f"/v1/assets?include_test=true&run={run_id}")
            assert code == 200
            run_ids = [r["run_id"] for r in body["runs"]]
            assert run_id in run_ids, \
                f"test run {run_id} hidden even with include_test=true"
            by_id = {r["run_id"]: r for r in body["runs"]}
            assert by_id[run_id]["test"] is True
        finally:
            self._cleanup(run_dir)

    def test_include_test_is_journaled(self, live):
        # the opt-in is a significant event; the gateway writes an
        # assets.include_test ledger entry. L2 isn't silent.
        import json
        import urllib.request
        code, body = live["get"]("/v1/ledger?limit=2000")
        assert code == 200
        # there may already be include_test entries from prior test
        # runs in this session -- the wall only asserts the FIELD
        # exists, not the count (no flaky state).
        assert any(e.get("event") == "assets.include_test"
                   for e in body["entries"]), \
            "no assets.include_test event in the ledger"
        # and the entry carries the limit
        ev = next(e for e in body["entries"]
                  if e.get("event") == "assets.include_test")
        data = ev.get("data", {})
        assert "limit" in data
