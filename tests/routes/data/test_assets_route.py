"""/v1/assets + run.completed hook -- the asset-ledger rung wall.

Envelope, filter, integrity, the worker completion event, the
C-cruft tripwire. Live-gateway; uses the live client.
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
        code, body = live.get("/v1/assets?limit=200")
        assert code == 200
        assert set(body.keys()) == {"count", "artifacts", "runs"}
        assert isinstance(body["count"], int)
        assert isinstance(body["runs"], list)

    def test_run_envelope_keys(self, live):
        code, body = live.get("/v1/assets?limit=200")
        runs = [r for r in body["runs"] if r["artifacts"]]
        assert runs, "live estate should have at least one run with artifacts"
        assert set(runs[0].keys()) == REQUIRED_RUN_KEYS
        row = runs[0]["artifacts"][0]
        assert set(row.keys()) == REQUIRED_ROW_KEYS

    def test_row_kinds_are_closed(self, live):
        code, body = live.get("/v1/assets?limit=200")
        allowed = {"image", "video", "audio", "model", "document", "other"}
        for run in body["runs"]:
            for row in run["artifacts"]:
                assert row["kind"] in allowed, \
                    f"row {row['name']} has unvouched kind {row['kind']!r}"

    def test_sha256_is_64_hex(self, live):
        code, body = live.get("/v1/assets?limit=200")
        for run in body["runs"]:
            for row in run["artifacts"]:
                assert re.match(r"^[0-9a-f]{64}$", row["sha256"]), \
                    f"row {row['name']} bad sha: {row['sha256']!r}"
                assert row["bytes"] > 0


class TestAssetsRouteFilter:
    def test_kind_filter(self, live):
        code, body = live.get("/v1/assets?kind=image&limit=200")
        assert code == 200
        for run in body["runs"]:
            for row in run["artifacts"]:
                assert row["kind"] == "image"

    def test_run_filter(self, live):
        code, body = live.get("/v1/assets?limit=200")
        target = next((r for r in body["runs"] if r["artifacts"]), None)
        assert target is not None
        code2, body2 = live.get(f"/v1/assets?run={target['run_id']}")
        assert code2 == 200
        assert body2["runs"]
        assert body2["runs"][0]["run_id"] == target["run_id"]

    def test_limit_honored(self, live):
        # limit caps RUN ROWS; the envelope artifacts field is the
        # TOTAL int across returned runs, not a slice.
        code, body = live.get("/v1/assets?limit=1")
        assert code == 200
        assert body["count"] <= 1
        assert len(body["runs"]) <= 1
        assert isinstance(body["artifacts"], int)


class TestAssetsRouteIntegrity:
    def test_index_sha_matches_streamed_bytes(self, live):
        # the index sha256 must equal the sha256 of the bytes served
        # at the row url. state-is-not-contract law only holds if the
        # index agrees with the bytes.
        code, body = live.get("/v1/assets?kind=image&limit=200")
        for run in body["runs"]:
            for row in run["artifacts"]:
                with urllib.request.urlopen(
                        live.base + row["url"],
                        timeout=live.timeout) as r:
                    blob = r.read()
                assert hashlib.sha256(blob).hexdigest() == row["sha256"], \
                    f"sha mismatch for {row['name']}"


class TestRunCompletedLedger:
    def test_run_completed_event_present(self, live):
        # 2000 is enough headroom: the gateway writes server.boot on
        # every restart and that can drown the run.completed entries
        # in a 200-entry newest-first window.
        code, body = live.get("/v1/ledger?limit=2000")
        assert code == 200
        events = [e["event"] for e in body["entries"]]
        assert "run.completed" in events, \
            f"ledger has no run.completed event: top events={events[:10]}"

    def test_run_completed_payload_has_sha16(self, live):
        # the meld-assets contract: every run.completed row carries
        # sha16 = sha256[:16]. Pin it.
        code, body = live.get("/v1/ledger?limit=2000")
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
        code, body = live.get("/v1/ledger?limit=2000")
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
        code, _ = live.post("/v1/models/provision", {})
        assert code == 404, \
            "POST /v1/models/provision is back -- the C-cruft cut regressed"



class TestTestFlagExclusion:
    # L2 + L3 LIVE wall: the production /v1/assets must NOT show test
    # runs by default. The wall is two layers now:
    #   L3 -- /v1/assets reads ONLY the production OUT_ROOT. A test
    #         run lives in TEST_OUT_ROOT and CANNOT appear here.
    #   L2 -- defense-in-depth: even if a test-tagged run somehow
    #         lands in OUT_ROOT, scan_run reads the sidecar test:true
    #         and assets_index filters it.
    # include_test=true switches the read to TEST_OUT_ROOT (the test
    # view) -- production runs there aren't present, test runs are.

    def _create_test_run(self, live, repo, run_id, in_test_root):
        # write a real sidecar + a tiny file to either OUT_ROOT or
        # TEST_OUT_ROOT (the directory-level routing target)
        import json
        import os
        sub = "test-output" if in_test_root else "output"
        root = os.path.join(repo, "data", "runs", sub)
        if not os.path.isdir(os.path.dirname(root)):
            return None
        os.makedirs(root, exist_ok=True)
        run_dir = os.path.join(root, run_id)
        os.makedirs(run_dir, exist_ok=True)
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

    def _new_run_id(self):
        import time
        return f"run-barrier-test-{int(time.time()*1000)}"

    def test_test_run_in_test_output_excluded_from_production_view(self, live, repo):
        # L3: a test run lives in TEST_OUT_ROOT. /v1/assets (which
        # reads OUT_ROOT) must not see it.
        run_id = self._new_run_id()
        run_dir = self._create_test_run(live, repo, run_id, in_test_root=True)
        try:
            code, body = live.get("/v1/assets?limit=200")
            assert code == 200
            run_ids = [r["run_id"] for r in body["runs"]]
            assert run_id not in run_ids, \
                f"test run {run_id} in TEST_OUT_ROOT leaked into production view"
        finally:
            self._cleanup(run_dir)

    def test_test_run_in_test_output_visible_via_include_test(self, live, repo):
        # L3: include_test=true reads TEST_OUT_ROOT. The test run is there.
        run_id = self._new_run_id()
        run_dir = self._create_test_run(live, repo, run_id, in_test_root=True)
        try:
            code, body = live.get(
                f"/v1/assets?include_test=true&run={run_id}")
            assert code == 200
            run_ids = [r["run_id"] for r in body["runs"]]
            assert run_id in run_ids, \
                f"test run {run_id} hidden from test view too"
            by_id = {r["run_id"]: r for r in body["runs"]}
            assert by_id[run_id]["test"] is True
        finally:
            self._cleanup(run_dir)

    def test_test_run_in_output_excluded_by_l2_defense(self, live, repo):
        # L2 defense: if a test-tagged run is in the PRODUCTION root
        # (which L3 should prevent from happening normally), it must
        # still be hidden by the sidecar filter.
        run_id = self._new_run_id()
        run_dir = self._create_test_run(live, repo, run_id, in_test_root=False)
        try:
            code, body = live.get("/v1/assets?limit=200")
            assert code == 200
            run_ids = [r["run_id"] for r in body["runs"]]
            assert run_id not in run_ids, \
                f"test run {run_id} in OUT_ROOT slipped through L2 defense"
        finally:
            self._cleanup(run_dir)

    def test_include_test_is_journaled(self, live):
        # the opt-in is a significant event; the gateway writes an
        # assets.include_test ledger entry. The wall is not silent.
        code, body = live.get("/v1/ledger?limit=2000")
        assert code == 200
        assert any(e.get("event") == "assets.include_test"
                   for e in body["entries"]), \
            "no assets.include_test event in the ledger"
        ev = next(e for e in body["entries"]
                  if e.get("event") == "assets.include_test")
        assert "limit" in ev.get("data", {})
