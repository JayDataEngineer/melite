"""/v1/assets + run.completed hook -- the asset-ledger rung wall.

Envelope, filter, integrity, the worker completion event, the
C-cruft tripwire. Live-gateway; uses the live fixture.
"""
import hashlib
import re
import urllib.request

import pytest

REQUIRED_RUN_KEYS = {"run_id", "name", "status", "created_at", "artifacts"}
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
