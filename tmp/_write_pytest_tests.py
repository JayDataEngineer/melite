import os
WS = "/home/user/Documents/programs/active/inference.cpp"
P = os.path.join(WS, "tests/pytest")
os.makedirs(P, exist_ok=True)

# --- 1. test_asset_ledger.py (unit) ---
with open(os.path.join(P, "test_asset_ledger.py"), "w") as f:
    f.write('''"""Asset-ledger unit + resilience walls (PYTHON SHAPE LAW).

The class-based groupings stay (pytest discovers plain classes fine):
RowShape (row construction + frozen + closed vocab), KindTests
(kind_for mapping), ScanTests (scan + index filters), ResilienceTests
(never raise on garbled input), CompletedPayloadTests
(completed_payload shape), IndexFrozenTests (RunIndex frozen).
"""
import hashlib
import os
import sys
import tempfile

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "py"))
import asset_ledger as al  # noqa: E402


def _write_run(root, run_id, files, status="completed", model="x",
                created_at=1700000000):
    rd = os.path.join(root, run_id)
    os.makedirs(rd, exist_ok=True)
    for name, blob in files.items():
        with open(os.path.join(rd, name), "wb") as fp:
            fp.write(blob)
    with open(os.path.join(rd, "_pipeline.json"), "w") as fp:
        import json
        fp.write(json.dumps({"run_id": run_id, "status": status,
                              "model": model, "created_at": created_at}))
    return rd


class TestRowShape:
    # PYTHON SHAPE LAW: invalid rows are construction refusals;
    # mutability dies with frozen=True.

    def test_bad_sha_refused(self):
        with pytest.raises(Exception):
            al.AssetRow(name="a.png", run_id="run-x",
                        kind=al.AssetKind.image, bytes=10,
                        sha256="not-a-sha", url="/u")

    def test_zero_bytes_refused(self):
        with pytest.raises(Exception):
            al.AssetRow(name="a.png", run_id="run-x",
                        kind=al.AssetKind.image, bytes=0,
                        sha256="a" * 64, url="/u")

    def test_frozen(self):
        r = al.AssetRow(name="a.png", run_id="run-x",
                        kind=al.AssetKind.image, bytes=10,
                        sha256="b" * 64, url="/u")
        with pytest.raises(Exception):
            r.name = "other"

    def test_kind_vocab_closed(self):
        with pytest.raises(Exception):
            al.AssetRow(name="a", run_id="run-x", kind="weird",
                        bytes=10, sha256="c" * 64, url="/u")


class TestKindFor:
    def test_media_mesh_doc(self):
        assert al.kind_for("a.png") == al.AssetKind.image
        assert al.kind_for("a.mp4") == al.AssetKind.video
        assert al.kind_for("a.wav") == al.AssetKind.audio
        assert al.kind_for("a.glb") == al.AssetKind.model
        assert al.kind_for("a.json") == al.AssetKind.document
        assert al.kind_for("a.zzz") == al.AssetKind.other


class TestScan:
    def test_skips_bookkeeping_and_empty(self):
        with tempfile.TemporaryDirectory() as root:
            rd = _write_run(root, "run-1", {
                "out.png": bytes.fromhex("89504e470d0a1a0a64617461"),
                "_poster.jpg": b"poster",
                "empty.bin": b"",
            })
            idx = al.scan_run(rd)
            assert idx.status == "completed"
            assert len(idx.artifacts) == 1
            row = idx.artifacts[0]
            assert row.name == "out.png"
            assert row.kind == al.AssetKind.image
            assert row.bytes == 12
            assert len(row.sha256) == 64

    def test_index_filters_and_counts(self):
        with tempfile.TemporaryDirectory() as root:
            _write_run(root, "run-a", {"x.png": b"img"})
            _write_run(root, "run-b", {"y.glb": b"mesh"})
            allv = al.assets_index(root)
            assert allv["count"] == 2
            assert allv["artifacts"] == 2
            only_mesh = al.assets_index(root, kind="model")
            assert only_mesh["artifacts"] == 1
            assert only_mesh["runs"][0]["run_id"] == "run-b"
            one = al.assets_index(root, run="run-a")
            assert one["count"] == 1
            assert one["artifacts"] == 1


class TestResilience:
    # RESILIENCE LAW: indexing never raises. A broken run is a
    # broken run, never a gateway crash.

    def test_garbled_sidecar(self):
        with tempfile.TemporaryDirectory() as root:
            rd = os.path.join(root, "run-x")
            os.makedirs(rd)
            with open(os.path.join(rd, "a.png"), "wb") as fp:
                fp.write(b"x" * 5)
            with open(os.path.join(rd, "_pipeline.json"), "w") as fp:
                fp.write("{not json at all")
            idx = al.scan_run(rd)
            assert idx.run_id == "run-x"
            assert idx.status == "unknown"
            assert len(idx.artifacts) == 1

    def test_empty_dir(self):
        with tempfile.TemporaryDirectory() as root:
            rd = os.path.join(root, "run-empty")
            os.makedirs(rd)
            idx = al.scan_run(rd)
            assert idx.artifacts == tuple()
            assert idx.status == "unknown"

    def test_missing_dir(self):
        with tempfile.TemporaryDirectory() as root:
            idx = al.scan_run(os.path.join(root, "run-gone"))
            assert idx.artifacts == tuple()

    def test_assets_index_never_raises_on_rot(self):
        with tempfile.TemporaryDirectory() as root:
            os.makedirs(os.path.join(root, "run-a"))
            with open(os.path.join(root, "run-a",
                                    "_pipeline.json"), "w") as fp:
                fp.write("]]]")
            os.makedirs(os.path.join(root, "not-a-run"))
            body = al.assets_index(root)
            assert set(body.keys()) == {"count", "artifacts", "runs"}
            assert body["count"] == 1


class TestCompletedPayload:
    def test_none_when_empty(self):
        with tempfile.TemporaryDirectory() as root:
            rd = _write_run(root, "run-c", {})
            assert al.completed_payload(rd) is None

    def test_carries_sha16(self):
        blob = b"artifact-bytes"
        with tempfile.TemporaryDirectory() as root:
            rd = _write_run(root, "run-d", {"z.png": blob})
            ev = al.completed_payload(rd)
            assert ev["run_id"] == "run-d"
            row = ev["artifacts"][0]
            assert row["sha16"] == hashlib.sha256(blob).hexdigest()[:16]

    def test_has_created_at(self):
        with tempfile.TemporaryDirectory() as root:
            rd = _write_run(root, "run-e", {"x.png": b"abc"},
                            created_at=1700001234)
            ev = al.completed_payload(rd)
            assert "created_at" in ev
            assert ev["created_at"] == 1700001234


class TestIndexFrozen:
    def test_run_index_frozen(self):
        with tempfile.TemporaryDirectory() as root:
            rd = _write_run(root, "run-f", {"a.png": b"abc"})
            idx = al.scan_run(rd)
            with pytest.raises(Exception):
                idx.run_id = "other"
            with pytest.raises(Exception):
                idx.status = "spoofed"
''')
print("wrote test_asset_ledger.py")
