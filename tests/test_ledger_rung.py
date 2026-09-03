"""Asset-ledger rung integration + parity wall (2026-09-03).

Covers the new system end-to-end against the LIVE gateway:
  * /v1/assets response envelope (count, runs[].{run_id, name, status,
    created_at, artifacts[].{name, run_id, kind, bytes, sha256, url}})
  * /v1/assets ?kind= and ?run= and ?limit= filter behavior
  * run.completed event lands in /v1/ledger (worker completion hook)
  * run.completed payload carries sha16 = sha256[:16] for each artifact
  * the C-cruft /v1/models/provision door stays GONE (404 tripwire)
  * /v1/manage unknown action is rejected with 422 (action is validated
    server-side, the refused-action is what the new manage door does)

A live gateway is required at 127.0.0.1:33081 (tested via
TEST_GATEWAY_BASE env override).
"""
import hashlib
import json
import os
import unittest
import urllib.error
import urllib.request

BASE = os.environ.get("TEST_GATEWAY_BASE", "http://127.0.0.1:33081")


def _get(path):
    with urllib.request.urlopen(BASE + path, timeout=10) as r:
        return r.status, json.loads(r.read())


def _post(path, body):
    req = urllib.request.Request(
        BASE + path, method="POST",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:200]


REQUIRED_RUN_KEYS = {"run_id", "name", "status", "created_at", "artifacts"}
REQUIRED_ROW_KEYS = {"name", "run_id", "kind", "bytes", "sha256", "url"}


class AssetsRouteShapeTests(unittest.TestCase):
    def test_envelope(self):
        st, body = _get("/v1/assets?limit=200")
        self.assertEqual(st, 200)
        self.assertEqual(set(body.keys()), {"count", "artifacts", "runs"})
        self.assertIsInstance(body["count"], int)
        self.assertIsInstance(body["runs"], list)

    def test_run_envelope_keys(self):
        st, body = _get("/v1/assets?limit=200")
        runs = [r for r in body["runs"] if r["artifacts"]]
        self.assertTrue(runs, "live estate should have at least one run with artifacts")
        self.assertEqual(set(runs[0].keys()), REQUIRED_RUN_KEYS)
        row = runs[0]["artifacts"][0]
        self.assertEqual(set(row.keys()), REQUIRED_ROW_KEYS)

    def test_row_kinds_are_closed(self):
        # every row's kind belongs to the closed AssetKind enum
        st, body = _get("/v1/assets?limit=200")
        allowed = {"image", "video", "audio", "model", "document", "other"}
        for run in body["runs"]:
            for row in run["artifacts"]:
                self.assertIn(row["kind"], allowed,
                              f"row {row['name']} has unvouched kind {row['kind']!r}")

    def test_sha256_is_64_hex(self):
        st, body = _get("/v1/assets?limit=200")
        for run in body["runs"]:
            for row in run["artifacts"]:
                self.assertRegex(
                    row["sha256"], r"^[0-9a-f]{64}$",
                    f"row {row['name']} bad sha: {row['sha256']!r}"
                )
                self.assertGreater(row["bytes"], 0)


class AssetsRouteFilterTests(unittest.TestCase):
    def test_kind_filter(self):
        st, body = _get("/v1/assets?kind=image&limit=200")
        self.assertEqual(st, 200)
        for run in body["runs"]:
            for row in run["artifacts"]:
                self.assertEqual(row["kind"], "image")

    def test_run_filter(self):
        st, body = _get("/v1/assets?limit=200")
        target = next((r for r in body["runs"] if r["artifacts"]), None)
        self.assertIsNotNone(target, "no run with artifacts in the live estate")
        st2, body2 = _get(f"/v1/assets?run={target['run_id']}")
        self.assertEqual(st2, 200)
        self.assertTrue(body2["runs"])
        self.assertEqual(body2["runs"][0]["run_id"], target["run_id"])

    def test_limit_honored(self):
        # limit caps RUN ROWS; the envelope's artifacts field is the
        # TOTAL int across returned runs, not a slice.
        st, body = _get("/v1/assets?limit=1")
        self.assertEqual(st, 200)
        self.assertLessEqual(body["count"], 1)
        self.assertLessEqual(len(body["runs"]), 1)
        self.assertIsInstance(body["artifacts"], int)


class AssetsRouteIntegrityTests(unittest.TestCase):
    def test_index_sha_matches_streamed_bytes(self):
        # the index's sha256 must be the sha256 of the bytes served at
        # the row's url. The state-is-not-contract law only holds if the
        # index agrees with the bytes.
        st, body = _get("/v1/assets?kind=image&limit=200")
        for run in body["runs"]:
            for row in run["artifacts"]:
                with urllib.request.urlopen(BASE + row["url"], timeout=10) as r:
                    blob = r.read()
                self.assertEqual(
                    hashlib.sha256(blob).hexdigest(), row["sha256"],
                    f"sha mismatch for {row['name']}"
                )


class RunCompletedLedgerTests(unittest.TestCase):
    def test_run_completed_event_present(self):
        # the worker finally-block journals run.completed; the live ledger
        # must contain at least one. (Tests the end-to-end hook, not just
        # the unit-level completed_payload.)
        st, body = _get("/v1/ledger?limit=200")
        self.assertEqual(st, 200)
        events = [e["event"] for e in body["entries"]]
        self.assertIn(
            "run.completed", events,
            f"ledger has no run.completed event — worker hook regressed? "
            f"top events: {events[:10]}"
        )

    def test_run_completed_payload_has_sha16(self):
        # the meld-assets contract: a run.completed event rows[] each
        # carry sha16 = sha256[:16]. Scans the live ledger for any
        # run.completed entry with artifacts and asserts the form.
        st, body = _get("/v1/ledger?limit=500")
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


class CCruftAbsenceTests(unittest.TestCase):
    def test_provision_door_stays_404(self):
        # the C-era POST /v1/models/provision was cut; the door stays gone
        # (regression guard for the C-retirement law).
        code, _ = _post("/v1/models/provision", {})
        self.assertEqual(
            code, 404,
            "POST /v1/models/provision is back — the C-cruft cut regressed"
        )


class ManageDoorShapeTests(unittest.TestCase):
    def test_unknown_action_rejected(self):
        # /v1/manage is the ONE management door (provisioning law). It
        # must validate the action and refuse unknown ones with 422 (the
        # pydantic/FastAPI semantic-validation shape).
        code, body = _post("/v1/manage", {"action": "__nonexistent__"})
        self.assertIn(
            code, (400, 422),
            f"unknown action returned {code}: {body!r}"
        )


if __name__ == "__main__":
    unittest.main()
