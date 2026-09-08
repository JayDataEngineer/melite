"""test_ui_map_parity — THE MAP WALL (2026-09-07, the map stroke;
design record docs/design/ui-map.md).

PURGE S-vocab (2026-09-08): python/ui_map.py + tools/gen_ui_map.py are
deleted. packages/web-kit/ui/src/uiMap.generated.ts is HAND-OWNED
frozen data (header re-truthed) — the kit imports it and re-exports
it; no second hand-written union may exist in packages/web-kit/ui/src.
This wall refuses the surviving drift classes:

  1. STALE FACE — retired with the generator (tombstone below); the
     hand-owned header pin + generator-deletion pin replace it.
  2. SECOND SPELLING — no hand-written union may exist anywhere
     in packages/web-kit/ui/src except the generated face (the written-once
     law: everything in the ui is written once, apart from the
     map).
  3. VOCABULARY ROT — the member sets are pinned here by name,
     parsed from the face stdlib-only (no TS toolchain), so deleting
     or renaming a member is a deliberate act the walls see.

RETIRED with ui_map.py (tombstones, not silence — the behaviors died
with the module, deliberately):
  - rows_refuse_bogus_members_at_construction: the closed vocabulary
    is a TS union now — a typo refuses at COMPILE time (tsc), which
    is stronger than the pydantic construction refusal was.
  - rows_are_frozen: frozen-ness was a pydantic property; the face's
    unions are compile-time closed sets, nothing to mutate.
  - a_studio_declares_as_rows: the py DSL breath died with the
    module; the tsx row-renderer stays queued behind its first
    consumer (unchanged).
  - center_is_required: a py-required-field gate with no TS
    counterpart — the face declares unions, not rows.
"""
import re
from pathlib import Path

from _anchor import REPO

GENERATED = REPO / "packages" / "web-kit" / "ui" / "src" / "uiMap.generated.ts"
GEN_TOOL = REPO / "tools" / "gen_ui_map.py"
UI_SRC = REPO / "packages" / "web-kit" / "ui" / "src"

# THE seam unions — the only vocabulary the map owns. A union
# name here may be declared ONLY in the generated face. (Kit
# -internal unions outside the portability surface — e.g.
# cardControls' ControlDensity — are free until a consumer
# promotes them into the map.)
_SEAM_UNIONS = ("ViewportKind", "BarKind", "OverlayKind",
                "OverlayDock", "ViewportAnchorDock")
_UNION_DECL = re.compile(
    r'^export type (\w+) = "', re.MULTILINE)

# FROZEN member sets (transcribed 2026-09-08 from the deleted
# ui_map.py enums — verified against the untouched face at the cut).
_FROZEN_MEMBERS = {
    "ViewportKind": {"stage3d", "paint2d", "native"},
    "BarKind": {"recipe", "timeline"},
    "OverlayKind": {"toggle", "segmented", "status"},
    "OverlayDock": {"tl", "tr", "bl", "br"},
    "ViewportAnchorDock": {"top-right", "top-left", "bottom-right",
                           "bottom-left", "bottom-center", "bottom",
                           "fill", "edge-right", "edge-left"},
}


def _face_members(src: str, union: str) -> set[str]:
    """Parse `export type <union> = "a" | "b" ...` stdlib-only."""
    m = re.search(r"^export type %s = (.*?);?$" % re.escape(union),
                  src, re.MULTILINE)
    assert m is not None, "no `export type %s` block in the face" % union
    return set(re.findall(r'"((?:[^"\\]|\\.)*)"', m.group(1)))


def test_the_generated_face_is_hand_owned() -> None:
    # the generator is gone — the face carries a HAND-OWNED header
    # with no Regenerate pointer (it may name the deleted generator
    # as provenance)
    assert not GEN_TOOL.is_file(), (
        "tools/gen_ui_map.py still exists — the dry-run regen would "
        "re-anchor to it"
    )
    src = GENERATED.read_text(encoding="utf-8")
    assert "HAND-OWNED" in src and "Regenerate:" not in src, (
        "uiMap.generated.ts header must mark the file HAND-OWNED "
        "with no Regenerate pointer"
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
                " in uiMap.generated.ts; import the generated face"
                % (f.name, ", ".join(decls)),
            )


def test_the_vocabulary_is_pinned() -> None:
    # member sets by name, parsed from the face: deleting/renaming
    # a member is a deliberate act these pins make visible
    src = GENERATED.read_text(encoding="utf-8")
    for union, want in _FROZEN_MEMBERS.items():
        assert _face_members(src, union) == want, (
            "%s drifted from the frozen set" % union
        )
