"""test_artifact_url_shape.py - the stamped-URL shape wall
(2026-09-06; exposed LIVE by the run-lifecycle wall against the
booted gateway: a merged-path run stamped /v1/assets/runs/<run>/
<basename>.png while the artifact lived at <run>/<stage>/<file> —
the door joins under output/ and 404'd its own gallery URL).

Pinned, all offline:
  1. RUN-RELATIVE: an artifact inside run.dir keeps its stage subdir
     in the link (generate/x.png, not x.png).
  2. ROOT-LEVEL: an artifact directly in run.dir stays a bare name.
  3. NEVER TRAVERSAL: a path outside run.dir falls back to basename
     (the door refuses ".." — the stamp must never emit one).
  4. BOTH STAMP SITES use the seam (source pin - no bare basename
     stamps left in the harvest loops).
"""

from __future__ import annotations

import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "py"))

import gateway as gw_mod  # noqa: E402
from flow_graph import FlowGraph, NodeRow  # noqa: E402

JsonValue = dict[str, "JsonValue"] | list["JsonValue"] | str | int | float | bool | None


def _run(run_id: str, out: Path) -> gw_mod.Run:
    graph = FlowGraph(name="url-shape-wall", nodes=(
        NodeRow(**{"id": "n", "type": "comfyui", "params": {}}),))
    r = gw_mod.Run(run_id=run_id, graph=graph, request={},
                   draft_id="d" * 96)
    r.out_root = out
    return r


def test_stage_subdir_kept_in_link(tmp_path: Path) -> None:
    run = _run("run-u", tmp_path)
    art = str(tmp_path / "run-u" / "generate" / "img_00001_.png")
    assert gw_mod._artifact_rel(run, art) == \
        "generate/img_00001_.png"


def test_root_level_artifact_stays_bare(tmp_path: Path) -> None:
    run = _run("run-u", tmp_path)
    art = str(tmp_path / "run-u" / "out.png")
    assert gw_mod._artifact_rel(run, art) == "out.png"


def test_outside_run_dir_falls_back_to_basename(
        tmp_path: Path) -> None:
    run = _run("run-u", tmp_path)
    far = str(tmp_path / "elsewhere" / "x.png")
    assert gw_mod._artifact_rel(run, far) == "x.png"
    upper = str(tmp_path.parent / "y.png")
    assert ".." not in gw_mod._artifact_rel(run, upper)


def test_both_stamp_sites_use_the_seam() -> None:
    src = (REPO / "py" / "gateway.py").read_text()
    assert "os.path.basename(str(a)) for a in" not in src
    assert src.count("_artifact_rel(run,") == 2


def test_media_detector_descends_into_stage_subdirs(
        tmp_path: Path) -> None:
    """The second face of the merged-path shape bug: media-first
    ranking read <run>/<stage>/<img> runs as media-less and buried
    them below the archive's media rows (live bug, 2026-09-06)."""
    import editor_runs as er
    flat = tmp_path / "run-flat"
    flat.mkdir()
    (flat / "out.png").write_bytes(b"x")
    assert er._run_dir_has_media(str(flat)) is True
    staged = tmp_path / "run-staged"
    (staged / "generate").mkdir(parents=True)
    (staged / "generate" / "img_00001_.png").write_bytes(b"x")
    assert er._run_dir_has_media(str(staged)) is True
    bare = tmp_path / "run-bare"
    bare.mkdir()
    (bare / "_flow.json").write_text("{}")
    assert er._run_dir_has_media(str(bare)) is False
