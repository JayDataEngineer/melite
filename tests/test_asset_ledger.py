"""Asset-ledger tests — typed rows, derivation, index shape (2026-09-03).

PYTHON SHAPE LAW: invalid rows are construction refusals; the index is
derived from disk truth, never stored beside it.
"""
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "py"))

import asset_ledger as al  # noqa: E402


def _write_run(root, run_id, files, status="completed", model="x",
                created_at=1700000000):
    rd = os.path.join(root, run_id)
    os.makedirs(rd, exist_ok=True)
    for name, blob in files.items():
        with open(os.path.join(rd, name), "wb") as f:
            f.write(blob)
    with open(os.path.join(rd, "_pipeline.json"), "w") as f:
        json.dump({"run_id": run_id, "status": status, "model": model,
                   "created_at": created_at}, f)
    return rd


class RowShapeTests(unittest.TestCase):
    def test_bad_sha_refused(self):
        with self.assertRaises(Exception):
            al.AssetRow(name="a.png", run_id="run-x", kind=al.AssetKind.image,
                        bytes=10, sha256="not-a-sha", url="/u")

    def test_zero_bytes_refused(self):
        with self.assertRaises(Exception):
            al.AssetRow(name="a.png", run_id="run-x", kind=al.AssetKind.image,
                        bytes=0, sha256="a" * 64, url="/u")

    def test_frozen(self):
        r = al.AssetRow(name="a.png", run_id="run-x", kind=al.AssetKind.image,
                        bytes=10, sha256="b" * 64, url="/u")
        with self.assertRaises(Exception):
            r.name = "other"

    def test_kind_vocab_closed(self):
        with self.assertRaises(Exception):
            al.AssetRow(name="a", run_id="run-x", kind="weird",
                        bytes=10, sha256="c" * 64, url="/u")


class KindTests(unittest.TestCase):
    def test_media_mesh_doc(self):
        self.assertEqual(al.kind_for("a.png"), al.AssetKind.image)
        self.assertEqual(al.kind_for("a.mp4"), al.AssetKind.video)
        self.assertEqual(al.kind_for("a.wav"), al.AssetKind.audio)
        self.assertEqual(al.kind_for("a.glb"), al.AssetKind.model)
        self.assertEqual(al.kind_for("a.json"), al.AssetKind.document)
        self.assertEqual(al.kind_for("a.zzz"), al.AssetKind.other)


class ScanTests(unittest.TestCase):
    def test_scan_skips_bookkeeping_and_empty(self):
        with tempfile.TemporaryDirectory() as root:
            rd = _write_run(root, "run-1", {
                "out.png": bytes.fromhex("89504e470d0a1a0a64617461"),
                "_poster.jpg": b"poster",
                "empty.bin": b"",
            })
            idx = al.scan_run(rd)
            self.assertEqual(idx.status, "completed")
            self.assertEqual(len(idx.artifacts), 1)
            row = idx.artifacts[0]
            self.assertEqual(row.name, "out.png")
            self.assertEqual(row.kind, al.AssetKind.image)
            self.assertEqual(row.bytes, 12)
            self.assertEqual(len(row.sha256), 64)


class ResilienceTests(unittest.TestCase):
    """RESILIENCE LAW: indexing never raises — a broken run is a broken
    run, never a gateway crash. scan_run over hostile input returns a
    well-formed (possibly empty) index."""

    def test_garbled_sidecar(self):
        # a corrupt _pipeline.json must not raise
        with tempfile.TemporaryDirectory() as root:
            rd = os.path.join(root, "run-x")
            os.makedirs(rd)
            with open(os.path.join(rd, "a.png"), "wb") as f:
                f.write(b"x" * 5)
            with open(os.path.join(rd, "_pipeline.json"), "w") as f:
                f.write("{not json at all")
            idx = al.scan_run(rd)
            self.assertEqual(idx.run_id, "run-x")
            self.assertEqual(idx.status, "unknown")
            # the file still indexes — disk truth survives sidecar rot
            self.assertEqual(len(idx.artifacts), 1)

    def test_empty_dir(self):
        with tempfile.TemporaryDirectory() as root:
            rd = os.path.join(root, "run-empty")
            os.makedirs(rd)
            idx = al.scan_run(rd)
            self.assertEqual(idx.artifacts, tuple())
            self.assertEqual(idx.status, "unknown")

    def test_missing_dir(self):
        # a vanished run dir (operator cleanup race) returns empty
        with tempfile.TemporaryDirectory() as root:
            idx = al.scan_run(os.path.join(root, "run-gone"))
            self.assertEqual(idx.artifacts, tuple())

    def test_assets_index_never_raises_on_rot(self):
        # the ROUTE wrapper: garbage inside output_root still yields a
        # well-formed envelope, never a 500
        with tempfile.TemporaryDirectory() as root:
            os.makedirs(os.path.join(root, "run-a"))
            with open(os.path.join(root, "run-a", "_pipeline.json"), "w") as f:
                f.write("]]]")
            os.makedirs(os.path.join(root, "not-a-run"))
            body = al.assets_index(root)
            self.assertEqual(set(body.keys()), {"count", "artifacts", "runs"})
            self.assertEqual(body["count"], 1)

    def test_index_filters_and_counts(self):
        with tempfile.TemporaryDirectory() as root:
            _write_run(root, "run-a", {"x.png": b"img"})
            _write_run(root, "run-b", {"y.glb": b"mesh"})
            allv = al.assets_index(root)
            self.assertEqual(allv["count"], 2)
            self.assertEqual(allv["artifacts"], 2)
            only_mesh = al.assets_index(root, kind="model")
            self.assertEqual(only_mesh["artifacts"], 1)
            self.assertEqual(only_mesh["runs"][0]["run_id"], "run-b")
            one = al.assets_index(root, run="run-a")
            self.assertEqual(one["count"], 1)
            self.assertEqual(one["artifacts"], 1)

class CompletedPayloadTests(unittest.TestCase):
    # completed_payload() — the run.completed ledger event payload.
    # Returned as None when a run delivered nothing; otherwise the
    # fields the worker journals into the ledger.

    def test_none_when_empty(self):
        with tempfile.TemporaryDirectory() as root:
            rd = _write_run(root, "run-c", {})
            self.assertIsNone(al.completed_payload(rd))

    def test_carries_sha16(self):
        import hashlib
        blob = b"artifact-bytes"
        with tempfile.TemporaryDirectory() as root:
            rd = _write_run(root, "run-d", {"z.png": blob})
            ev = al.completed_payload(rd)
            self.assertEqual(ev["run_id"], "run-d")
            row = ev["artifacts"][0]
            self.assertEqual(row["sha16"], hashlib.sha256(blob).hexdigest()[:16])

    def test_has_created_at(self):
        # the worker journals run.completed with the same fields the
        # run row carries. created_at must ride along (consumers like
        # the LEDGER wall sort by it).
        with tempfile.TemporaryDirectory() as root:
            rd = _write_run(root, "run-e", {"x.png": b"abc"}, created_at=1700001234)
            ev = al.completed_payload(rd)
            self.assertIn("created_at", ev)
            self.assertEqual(ev["created_at"], 1700001234)


class IndexFrozenTests(unittest.TestCase):
    # PYTHON SHAPE LAW: a row cannot mutate after construction. AssetRow
    # was tested; RunIndex is the run-level view and must obey the same
    # law (a consumer that mutates a returned index breaks the "index is
    # a derived artifact" contract).

    def test_run_index_frozen(self):
        with tempfile.TemporaryDirectory() as root:
            rd = _write_run(root, "run-f", {"a.png": b"abc"})
            idx = al.scan_run(rd)
            with self.assertRaises(Exception):
                idx.run_id = "other"
            with self.assertRaises(Exception):
                idx.status = "spoofed"


if __name__ == "__main__":
    unittest.main()
