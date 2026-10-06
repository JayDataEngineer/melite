"""THE RIG REPORT SIDECAR WRITER (2026-10-17, the rig-reports batch).

The module under proof is
vendor/comfyui_extensions/melite-autorig-nodes/report_sidecar.py —
deliberately bpy-free so this seat runs it directly (the engine
cannot host bpy; the validator itself executes on the blender lane
and only its SIDECAR writer is python the estate can wall here).

Walls the three laws the runs seat depends on:
  1. the body is the FINISHED bench report entry (the adapter's
     fold, ported) — never a rig tuple the seat would have to parse;
  2. the path law: <stem>.report.json lands beside its GLB whatever
     directory shape the input carries;
  3. a write that cannot land refuses LOUD (the path named) — a
     silent skip would read on the bench as a validation that never
     ran.
"""

import importlib.util
import json
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
MOD = REPO / "vendor" / "comfyui_extensions" / "melite-autorig-nodes" / "report_sidecar.py"


@pytest.fixture(scope="module")
def sidecar():
    spec = importlib.util.spec_from_file_location("report_sidecar", MOD)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_path_law_beside_the_glb(sidecar, tmp_path):
    nested = tmp_path / "3D" / "rigged.glb"
    nested.parent.mkdir()
    assert sidecar.report_path_for(str(nested)) == str(tmp_path / "3D" / "rigged.report.json")
    # bare names and absolute paths both resolve beside their GLB
    assert sidecar.report_path_for("bare.glb").endswith("/bare.report.json")


def test_body_is_the_finished_report_entry(sidecar):
    body = sidecar.report_body(
        False,
        [["CRITICAL", "no animation found"], ["WARNING", "wobble"]],
        {"bone_count": 2, "violations": "reserved", "nested": {"a": 1}, "none": None},
    )
    # the adapter's fold, mirrored: fail on a false pass or CRITICAL
    assert body["kind"] == "report"
    assert body["status"] == "fail"
    assert body["title"] == "Rig validation"
    assert body["chips"] == ["CRITICAL 1", "WARNING 1"]
    rows = body["rows"]
    assert rows["passed"] is False
    assert rows["critical_count"] == 1
    assert rows["warning_count"] == 1
    assert json.loads(rows["violations"]) == [["CRITICAL", "no animation found"], ["WARNING", "wobble"]]
    # reserved stat keys gain the stat_ prefix; containers + None
    # stringify, scalars pass (the adapter's rowValue law)
    assert rows["stat_violations"] == "reserved"
    assert rows["nested"] == '{"a": 1}'
    assert rows["none"] == "null"
    assert rows["bone_count"] == 2


def test_body_warn_and_pass_folds(sidecar):
    warned = sidecar.report_body(True, [["WARNING", "wobble"]], {})
    assert warned["status"] == "warn"
    assert warned["chips"] == ["WARNING 1"]
    clean = sidecar.report_body(True, [], {})
    assert clean["status"] == "pass"
    assert clean["chips"] == []


def test_write_lands_and_returns_the_path(sidecar, tmp_path):
    glb = tmp_path / "rigged.glb"
    path = sidecar.write_report(str(glb), True, [], {"bone_count": 2})
    assert Path(path) == tmp_path / "rigged.report.json"
    body = json.loads(Path(path).read_text())
    assert body["status"] == "pass"
    # what the harness adapter reads is what THIS writer emits: the
    # entry satisfies the bench result contract's reports arm
    for key in ("kind", "status", "title", "chips", "rows"):
        assert key in body


def test_a_write_that_cannot_land_names_the_path(sidecar, tmp_path):
    glb = tmp_path / "no-such-dir" / "rigged.glb"
    with pytest.raises(OSError, match="no-such-dir"):
        sidecar.write_report(str(glb), True, [], {})


def test_the_cli_seat_writes_a_real_sidecar(sidecar, tmp_path):
    glb = tmp_path / "cli.glb"
    import subprocess
    out = subprocess.run(
        [sys.executable, str(MOD), str(glb), "false"],
        check=True, capture_output=True, text=True,
    )
    assert out.stdout.strip() == str(tmp_path / "cli.report.json")
    body = json.loads((tmp_path / "cli.report.json").read_text())
    assert body["status"] == "fail"
    assert body["rows"]["critical_count"] == 1
