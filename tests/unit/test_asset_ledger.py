"""Asset-ledger unit + resilience walls (PYTHON SHAPE LAW).

Test classes stay (pytest discovers plain classes fine):
  * TestRowShape       -- construction refusals (parametrized) + frozen
  * TestKindFor        -- kind_for filename mapping
  * TestScan           -- scan + index filters
  * TestResilience     -- never raise on garbled input
  * TestCompletedPayload -- completed_payload shape
  * TestIndexFrozen    -- RunIndex frozen
  * TestRunTestFlag    -- L1+L2: sidecar test flag + index filter
  * TestL3DirectoryRouting -- L3: directory-level routing

STRUCTURE
  * tmp_path (built-in fixture) replaces every tempfile block.
  * make_run (tests/unit/conftest.py) is the factory fixture:
    make_run('run-x', {a.png: bytes}) writes a run dir + sidecar and
    returns the path.
  * parametrized where the assertions differ by data only (the three
    construction-refusal cases in TestRowShape).
"""
import hashlib
import json
import os

import pytest

import asset_ledger as al  # noqa: E402
from tests.unit.conftest import write_run  # noqa: E402


class TestRowShape:
    # PYTHON SHAPE LAW: invalid rows are construction refusals;
    # mutability dies with frozen=True.

    @pytest.mark.parametrize("override", [
        {"sha256": "not-a-sha"},                 # bad sha
        {"bytes": 0, "sha256": "a" * 64},       # zero bytes
        {"name": "a", "kind": "weird",
         "sha256": "c" * 64},                   # closed vocab
    ], ids=["bad_sha", "zero_bytes", "closed_vocab"])
    def test_row_construction_refused(self, override):
        base = {"name": "a.png", "run_id": "run-x",
                "kind": al.AssetKind.image, "bytes": 10,
                "sha256": "b" * 64, "url": "/u"}
        with pytest.raises(Exception):
            al.AssetRow(**{**base, **override})

    def test_frozen(self):
        r = al.AssetRow(name="a.png", run_id="run-x",
                        kind=al.AssetKind.image, bytes=10,
                        sha256="b" * 64, url="/u")
        with pytest.raises(Exception):
            r.name = "other"


class TestKindFor:
    def test_media_mesh_doc(self):
        assert al.kind_for("a.png") == al.AssetKind.image
        assert al.kind_for("a.mp4") == al.AssetKind.video
        assert al.kind_for("a.wav") == al.AssetKind.audio
        assert al.kind_for("a.glb") == al.AssetKind.model
        assert al.kind_for("a.json") == al.AssetKind.document
        assert al.kind_for("a.zzz") == al.AssetKind.other


class TestScan:
    def test_skips_bookkeeping_and_empty(self, make_run):
        rd = make_run("run-1", {
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

    def test_index_filters_and_counts(self, make_run):
        make_run("run-a", {"x.png": b"img"})
        make_run("run-b", {"y.glb": b"mesh"})
        root = make_run.root
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

    def test_garbled_sidecar(self, tmp_path):
        # tests that need a custom sidecar shape use tmp_path directly
        rd = tmp_path / "run-x"
        rd.mkdir()
        (rd / "a.png").write_bytes(b"x" * 5)
        (rd / "_pipeline.json").write_text("{not json at all")
        idx = al.scan_run(str(rd))
        assert idx.run_id == "run-x"
        assert idx.status == "unknown"
        assert len(idx.artifacts) == 1

    def test_empty_dir(self, tmp_path):
        rd = tmp_path / "run-empty"
        rd.mkdir()
        idx = al.scan_run(str(rd))
        assert idx.artifacts == tuple()
        assert idx.status == "unknown"

    def test_missing_dir(self, tmp_path):
        idx = al.scan_run(str(tmp_path / "run-gone"))
        assert idx.artifacts == tuple()

    def test_assets_index_never_raises_on_rot(self, tmp_path):
        # garbage inside output_root must still yield a well-formed
        # envelope, never a 500
        (tmp_path / "run-a").mkdir()
        (tmp_path / "run-a" / "_pipeline.json").write_text("]]]")
        (tmp_path / "not-a-run").mkdir()
        body = al.assets_index(str(tmp_path))
        assert set(body.keys()) == {"count", "artifacts", "runs"}
        assert body["count"] == 1


class TestCompletedPayload:
    def test_none_when_empty(self, make_run):
        rd = make_run("run-c", {})
        assert al.completed_payload(rd) is None

    def test_carries_sha16(self, make_run):
        blob = b"artifact-bytes"
        rd = make_run("run-d", {"z.png": blob})
        ev = al.completed_payload(rd)
        assert ev["run_id"] == "run-d"
        row = ev["artifacts"][0]
        assert row["sha16"] == hashlib.sha256(blob).hexdigest()[:16]

    def test_has_created_at(self, make_run):
        rd = make_run("run-e", {"x.png": b"abc"}, created_at=1700001234)
        ev = al.completed_payload(rd)
        assert "created_at" in ev
        assert ev["created_at"] == 1700001234


class TestIndexFrozen:
    def test_run_index_frozen(self, make_run):
        rd = make_run("run-f", {"a.png": b"abc"})
        idx = al.scan_run(rd)
        with pytest.raises(Exception):
            idx.run_id = "other"
        with pytest.raises(Exception):
            idx.status = "spoofed"


class TestRunTestFlag:
    # L1+L2 unit: the sidecar test flag rides into RunIndex; the
    # asset index excludes test runs from the production view by
    # default, includes them when asked.

    def test_sidecar_test_flag_default_false(self, make_run):
        # a sidecar WITHOUT a test key is treated as production
        rd = make_run("run-prod", {"x.png": b"abc"})
        idx = al.scan_run(rd)
        assert idx.test is False

    def test_sidecar_test_flag_true(self, tmp_path):
        # a custom-shape sidecar; write it by hand under tmp_path
        rd = tmp_path / "run-test"
        rd.mkdir()
        (rd / "x.png").write_bytes(b"abc")
        (rd / "_pipeline.json").write_text(json.dumps({
            "run_id": "run-test", "status": "completed",
            "model": "x", "created_at": 1700000000,
            "test": True,
        }))
        idx = al.scan_run(str(rd))
        assert idx.test is True

    def test_index_excludes_test_by_default(self, make_run):
        make_run("run-prod", {"a.png": b"a"})
        make_run("run-test", {"b.png": b"b"}, test=True)
        body = al.assets_index(make_run.root)
        run_ids = [r["run_id"] for r in body["runs"]]
        assert "run-prod" in run_ids
        assert "run-test" not in run_ids
        assert all(r["test"] is False for r in body["runs"])

    def test_index_includes_test_when_asked(self, make_run):
        make_run("run-prod", {"a.png": b"a"})
        make_run("run-test", {"b.png": b"b"}, test=True)
        body = al.assets_index(make_run.root, include_test=True)
        run_ids = [r["run_id"] for r in body["runs"]]
        assert "run-prod" in run_ids
        assert "run-test" in run_ids
        by_id = {r["run_id"]: r for r in body["runs"]}
        assert by_id["run-test"]["test"] is True
        assert by_id["run-prod"]["test"] is False

    def test_completed_payload_carries_test_flag(self, tmp_path):
        # custom-shape sidecar (test:true, no model field)
        rd = tmp_path / "run-t"
        rd.mkdir()
        (rd / "a.png").write_bytes(b"abc")
        (rd / "_pipeline.json").write_text(json.dumps({
            "run_id": "run-t", "status": "completed",
            "created_at": 0, "test": True,
        }))
        ev = al.completed_payload(str(rd))
        assert ev is not None
        assert ev["test"] is True


class TestL3DirectoryRouting:
    # L3 unit: assets_index on a given root reads only that root.
    # The directory-level enforcement is independent of the sidecar
    # filter; a test run written to a test root is invisible from a
    # production-root scan, and vice versa.

    def test_test_root_only_sees_test_runs(self, tmp_path):
        # the test root is an arbitrary sibling -- the factory fixture
        # would write to tmp_path itself, so we use the module helper
        # for a custom location
        test_root = tmp_path / "test-output"
        test_root.mkdir()
        write_run(str(test_root), "run-test-1", {"a.png": b"a"},
                    test=True)
        body = al.assets_index(str(test_root), include_test=True)
        assert body["count"] == 1
        assert body["runs"][0]["run_id"] == "run-test-1"
        assert body["runs"][0]["test"] is True

    def test_prod_root_does_not_see_test_root_runs(self, tmp_path):
        test_root = tmp_path / "test-output"
        prod_root = tmp_path / "output"
        test_root.mkdir()
        prod_root.mkdir()
        write_run(str(test_root), "run-test-1", {"a.png": b"a"},
                    test=True)
        # a production-root scan: should not see the test run
        body = al.assets_index(str(prod_root))
        assert body["count"] == 0
        # the test root sees it
        body2 = al.assets_index(str(test_root), include_test=True)
        assert body2["count"] == 1
