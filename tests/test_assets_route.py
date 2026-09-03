"""/v1/assets + the run.completed hook — the asset-ledger rung's wall.

Covers the cross-run delivery view end-to-end against the LIVE gateway:
  * /v1/assets response envelope (count, runs[].{run_id, name, status,
    created_at, artifacts[].{name, run_id, kind, bytes, sha256, url}})
  * /v1/assets ?kind= and ?run= and ?limit= filter behavior
    (limit caps RUN ROWS; artifacts is the total int across returns)
  * index sha256 == sha256(streamed bytes) at the row url
  * run.completed event lands in /v1/ledger (worker completion hook)
  * run.completed payload rows carry sha16 = sha256[:16]
  * the C-cruft /v1/models/provision door stays GONE (404 tripwire —
    the cut was contextual to this work, so the pin lives here)

A live gateway is required at 127.0.0.1:33081 (overridable via
TEST_GATEWAY_BASE).
"""
import hashlib
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(__file__))
import _http as hh  # noqa: E402

REQUIRED_RUN_KEYS = {"run_id", "name", "status", "created_at", "artifacts"}
REQUIRED_ROW_KEYS = {"name", "run_id", "kind", "bytes", "sha256", "url"}


class AssetsRouteShapeTests(unittest.TestCase):
    def test_envelope(self):
        st, body = hh.get("/v1/assets?limit=200")
        self.assertEqual(st, 200)
        self.assertEqual(set(body.keys()), {"count", "artifacts", "runs"})
        self.assertIsInstance(body["count"], int)
        self.assertIsInstance(body["runs"], list)

    def test_run_envelope_keys(self):
        st, body = hh.get("/v1/assets?limit=200")
        runs = [r for r in body["runs"] if r["artifacts"]]
        self.assertTrue(runs, "live estate should have at least one run with artifacts")
        self.assertEqual(set(runs[0].keys()), REQUIRED_RUN_KEYS)
        row = runs[0]["artifacts"][0]
        self.assertEqual(set(row.keys()), REQUIRED_ROW_KEYS)

    def test_row_kinds_are_closed(self):
        # every row's kind belongs to the closed AssetKind enum
        st, body = hh.get("/v1/assets?limit=200")
        allowed = {"image", "video", "audio", "model", "document", "other"}
        for run in body["runs"]:
            for row in run["artifacts"]:
                self.assertIn(row["kind"], allowed,
                              f"row {row['name']} has unvouched kind {row['kind']!r}")

    def test_sha256_is_64_hex(self):
        st, body = hh.get("/v1/assets?limit=200")
        for run in body["runs"]:
            for row in run["artifacts"]:
                self.assertRegex(
                    row["sha256"], r"^[0-9a-f]{64}$",
                    f"row {row['name']} bad sha: {row['sha256']!r}"
                )
                self.assertGreater(row["bytes"], 0)


class AssetsRouteFilterTests(unittest.TestCase):
    def test_kind_filter(self):
        st, body = hh.get("/v1/assets?kind=image&limit=200")
        self.assertEqual(st, 200)
        for run in body["runs"]:
            for row in run["artifacts"]:
                self.assertEqual(row["kind"], "image")

    def test_run_filter(self):
        st, body = hh.get("/v1/assets?limit=200")
        target = next((r for r in body["runs"] if r["artifacts"]), None)
        self.assertIsNotNone(target, "no run with artifacts in the live estate")
        st2, body2 = hh.get(f"/v1/assets?run={target['run_id']}")
        self.assertEqual(st2, 200)
        self.assertTrue(body2["runs"])
        self.assertEqual(body2["runs"][0]["run_id"], target["run_id"])

    def test_limit_honored(self):
        # limit caps RUN ROWS; the envelope's artifacts field is the
        # TOTAL int across returned runs, not a slice.
        st, body = hh.get("/v1/assets?limit=1")
        self.assertEqual(st, 200)
        self.assertLessEqual(body["count"], 1)
        self.assertLessEqual(len(body["runs"]), 1)
        self.assertIsInstance(body["artifacts"], int)


class AssetsRouteIntegrityTests(unittest.TestCase):
    def test_index_sha_matches_streamed_bytes(self):
        # the index's sha256 must be the sha256 of the bytes served at
        # the row's url. The state-is-not-contract law only holds if the
        # index agrees with the bytes.
        st, body = hh.get("/v1/assets?kind=image&limit=200")
        import urllib.request
        for run in body["runs"]:
            for row in run["artifacts"]:
                with urllib.request.urlopen(hh.BASE + row["url"], timeout=hh.TIMEOUT) as r:
                    blob = r.read()
                self.assertEqual(
                    hashlib.sha256(blob).hexdigest(), row["sha256"],
                    f"sha mismatch for {row['name']}"
                )


class RunCompletedLedgerTests(unittest.TestCase):
    def test_run_completed_event_present(self):
        st, body = hh.get("/v1/ledger?limit=200")
        self.assertEqual(st, 200)
        events = [e["event"] for e in body["entries"]]
        self.assertIn(
            "run.completed", events,
            f"ledger has no run.completed event — worker hook regressed? "
            f"top events: {events[:10]}"
        )

    def test_run_completed_payload_has_sha16(self):
        st, body = hh.get("/v1/ledger?limit=500")
        self.assertEqual(st, 200)
        seen = False
        for e in body["entries"]:
            if e["event"] != "run.completed":
                continue
            data = e.get("data", {})
            for row in data.get("artifacts", []):
                seen = True
                self.assertEqual(
                    row["sha16"], row["sha256"][:16],
                    f"sha16 != sha256[:16] for {row.get('name')}"
                )
        self.assertTrue(seen, "no run.completed event carried any artifacts in the live ledger")

    def test_run_completed_payload_shape(self):
        # the worker finally-block writes a payload from completed_payload.
        # The four IDENTITY keys (run_id, name, status, artifacts) have
        # always been there; created_at was added later. The live ledger
        # is mixed-age (events from before the code change still lack it)
        # so we pin the universal four and report the created_at
        # presence as a forward-compat signal — the real created_at law
        # is the unit test in test_asset_ledger (the code under test).
        st, body = hh.get("/v1/ledger?limit=500")
        self.assertEqual(st, 200)
        seen = False
        new_shape_seen = False
        for e in body["entries"]:
            if e["event"] != "run.completed":
                continue
            data = e.get("data", {})
            self.assertTrue(
                {"run_id", "name", "status", "artifacts"}.issubset(data.keys()),
                f"run.completed payload dropped an identity key: {sorted(data.keys())}"
            )
            self.assertIsInstance(data["run_id"], str)
            self.assertIsInstance(data["name"], str)
            self.assertEqual(data["status"], "completed")
            self.assertIsInstance(data["artifacts"], list)
            if "created_at" in data:
                self.assertIsInstance(data["created_at"], int)
                new_shape_seen = True
            seen = True
        self.assertTrue(seen, "no run.completed event found in the live ledger")
        # forward-compat signal: at least one event was written by the
        # updated worker. If the live estate never completed a run
        # after the fix, this stays False — the unit test is the law.


class CCruftAbsenceTests(unittest.TestCase):
    # the C-era POST /v1/models/provision was cut in the same commit as
    # this rung; the 404 stays here as the regression guard.

    def test_provision_door_stays_404(self):
        code, _ = hh.post("/v1/models/provision", {})
        self.assertEqual(
            code, 404,
            "POST /v1/models/provision is back — the C-cruft cut regressed"
        )


if __name__ == "__main__":
    unittest.main()
