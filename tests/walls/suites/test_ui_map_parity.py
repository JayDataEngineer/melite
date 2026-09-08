"""test_ui_map_parity — THE MAP WALL (2026-09-07, the map stroke;
design record docs/design/ui-map.md).

python/ui_map.py is the SSOT of every closed seam union. This wall
refuses all three drift classes:

  1. STALE FACE — the generated ts file must match the map
     (gen_ui_map dry run, exit 1 on drift).
  2. SECOND SPELLING — no hand-written union may exist anywhere
     in packages/web-kit/ui/src except the generated file (the written-once
     law: everything in the ui is written once, apart from the
     map).
  3. VOCABULARY ROT — the member sets are pinned here by name,
     so deleting or renaming a member is a deliberate act the
     walls see.

Plus the M2 DSL skeleton: the frozen pydantic rows refuse bogus
members at construction and refuse mutation after.
"""
import re
import subprocess
import sys
from pathlib import Path

from _anchor import REPO

sys.path.insert(0, str(REPO / "python"))

import ui_map  # noqa: E402
from ui_map import (  # noqa: E402
    AnchorRow,
    BottomSeamRow,
    CenterSeamRow,
    OverlayRow,
    ShellRows,
    ValidationError,
)

GENERATED = REPO / "packages" / "web-kit" / "ui" / "src" / "uiMap.generated.ts"
GEN_TOOL = REPO / "tools" / "gen_ui_map.py"
UI_SRC = REPO / "packages" / "web-kit" / "ui" / "src"

# THE seam unions — the only vocabulary the map owns. A union
# name here may be declared ONLY in the generated face. (Kit
# -internal unions outside the portability surface — e.g.
# cardControls' ControlDensity — are free until a python-side
# consumer promotes them into the map.)
_SEAM_UNIONS = ("ViewportKind", "BarKind", "OverlayKind",
                "OverlayDock", "ViewportAnchorDock")
_UNION_DECL = re.compile(
    r'^export type (\w+) = "', re.MULTILINE)


def test_the_generated_face_is_fresh() -> None:
    # gen_ui_map dry run: exit 0 only when the generated file
    # matches python/ui_map.py byte-for-byte
    out = subprocess.run(  # noqa: S603
        [sys.executable, str(GEN_TOOL)], capture_output=True, text=True
    )
    assert out.returncode == 0, (
        "uiMap.generated.ts is stale — run "
        "python3 tools/gen_ui_map.py --write: %s" % out.stdout
    )


def test_the_unions_are_written_once() -> None:
    # the ONLY union declaration in the whole ui package is the
    # generated face — a second hand-spelling is the drift class
    # this wall exists to kill
    for f in UI_SRC.glob("*.ts*"):
        src = f.read_text(encoding="utf-8")
        decls = [
            name for name in _UNION_DECL.findall(src)
            if name in _SEAM_UNIONS
        ]
        if f.name == "uiMap.generated.ts":
            assert sorted(decls) == sorted(_SEAM_UNIONS), (
                "the map face carries exactly the %d seam unions"
                % len(_SEAM_UNIONS)
            )
        else:
            assert not decls, (
                "%s hand-spells %s — the seam vocabulary lives ONCE"
                " in python/ui_map.py; import the generated face"
                % (f.name, ", ".join(decls)),
            )


def test_the_vocabulary_is_pinned() -> None:
    # member sets by name: deleting/renaming a member is a
    # deliberate act these pins make visible
    assert {m.value for m in ui_map.ViewportKind} == {
        "stage3d", "paint2d", "native"
    }
    assert {m.value for m in ui_map.BarKind} == {"recipe", "timeline"}
    assert {m.value for m in ui_map.OverlayKind} == {
        "toggle", "segmented", "status"
    }
    assert {m.value for m in ui_map.OverlayDock} == {
        "tl", "tr", "bl", "br"
    }
    assert {m.value for m in ui_map.ViewportAnchorDock} == {
        "top-right", "top-left", "bottom-right", "bottom-left",
        "bottom-center", "bottom", "fill", "edge-right", "edge-left",
    }


def test_rows_refuse_bogus_members_at_construction() -> None:
    # closed vocabularies by enum — a typo is a construction
    # refusal, never a runtime route mismatch. The bogus rows are
    # built through a ** spread (deliberately dynamic: the wrong
    # shape must reach pydantic, not the type checker — and NO
    # ignore comments: test_python_annotations hunts silencers).
    for build, why in [
        (lambda: ShellRows(**{"center": {"kind": "holodeck"}}),
         "a bogus ViewportKind"),
        (lambda: AnchorRow(**{"id": "x", "dock": "middle"}),
         "a bogus dock"),
        (lambda: OverlayRow(**{"id": "x", "kind": "dial",
                               "dock": "tl"}),
         "a bogus OverlayKind"),
    ]:
        try:
            build()
            raised = False
        except ValidationError:
            raised = True
        assert raised, "%s must refuse at construction" % why


def test_rows_are_frozen() -> None:
    rows = ShellRows(center=CenterSeamRow(kind="native"))
    try:  # builtin setattr — the same mutation the frozen law
        # refuses, but statically opaque (no ignore comment, and the
        # anti-cheat wall stays green)
        setattr(rows, "bottom", BottomSeamRow(kind="timeline"))
        raised = False
    except ValidationError:
        raised = True
    assert raised, "rows are frozen — mutation refuses"


def test_a_studio_declares_as_rows() -> None:
    # the first DSL breath: the h3 studio's shell shape as python
    # rows — the same vocabulary the tsx declaration speaks,
    # validated here at construction (the ts row-renderer that
    # walks these rows is queued behind its first consumer)
    rows = ShellRows(
        center=CenterSeamRow(kind="native"),
        bottom=BottomSeamRow(kind="timeline"),
        rail={"slots": ["a", "b"]},
        overlays=(OverlayRow(id="detect", kind="status", dock="tl"),),
        anchors=(AnchorRow(id="source-pin", dock="top-right"),),
    )
    assert rows.center.kind.value == "native"
    assert rows.bottom is not None and rows.bottom.kind.value == "timeline"
    assert rows.anchors[0].dock.value == "top-right"


def test_center_is_required() -> None:
    # a studio without a center is not a studio (** spread: the
    # missing-field refusal belongs to pydantic, not the checker)
    try:
        ShellRows(**{})
        raised = False
    except ValidationError:
        raised = True
    assert raised
