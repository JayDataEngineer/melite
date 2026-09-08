#!/usr/bin/env python3
"""export_vocab — emit the estate vocab tables as TypeScript (ladder P1,
declarations manifest .scratch/declarations-ts-map.md §4.4 + §5 step 7-vocabs).

ADDITIVE ONLY: nothing imports the output yet (shadow artifact) — the
cutover consumers land in later steps behind py==ts parity walls.

SSOT inputs (read-only; never edited here):
  py/card_kinds.py                  BadgeTone, KindRunner, 8 CardKindRows, kinds_wire
  py/slot_kinds.py                  FileKind, 17 SlotDecls, undeclared_slots, bindings
  py/melite_models/grammar.py       Genre, ClipType, LatentNode, Quant, KnobKind, Studio*
  py/flow.py                        Kind (the closed edge-type vocabulary)
  py/melite_cards/dsl.py            ActionCard.SIDEBAR_SECTIONS (the sidebar trio gate)
  py/ui_map.py                      5 seam enums — READ ONLY (sibling MAP stroke owns
                                    packages/web-kit/ui/src/uiMap.generated.ts). Imported solely
                                    to REFUSE a name collision: a vocab union taking
                                    a seam-union name would be a second spelling.

Output: packages/engines/comfyui/cordis/src/generated/vocab.ts —
const-unions (NO TS enums: the Cordis plane runs on node
--experimental-strip-types, erasable syntax only) + tables (SLOTS,
SLOT_KINDS, UNDECLARED_SLOTS, CARD_KINDS, SIDEBAR_SECTIONS). Sorted,
deterministic, GENERATED header. One row per CARD_KINDS line (the
parity wall regex-parses rows stdlib-only).

REFINEMENTS VERDICT (validators.py — NOT landed, deliberately):
py/melite_cards/validators.py semantics (positive/seed/ranged/
lora-bag/slot-null/envelope) are per-FIELD gates with per-use bounds
(ranged/int_ranged factories), a row shape (LoraWire), schema context
(parse_card_body, empty_slot_null_for array_fields) and verbatim
refusal texts — porting them needs the zod harness + refusal-text
parity wall (manifest §5 step 6 owns that shape). Half-building
refinements beside the vocabs would be dual-serve drift, so this
stroke emits vocabs only; refinements are the wall's documented next
step (see tests/walls/suites/test_vocab_parity.py NEXT STEPS).

Usage:
  python3 tools/export_vocab.py            # dry run: drift report, exit 1
  python3 tools/export_vocab.py --write    # rewrite the generated file
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "py"))

import card_kinds  # noqa: E402
import flow as _flow  # noqa: E402
import slot_kinds  # noqa: E402
import ui_map as _ui_map  # noqa: E402  (read-only: collision guard only)
from melite_cards.dsl import ActionCard  # noqa: E402
from melite_models.grammar import (  # noqa: E402
    ClipType,
    Genre,
    KnobKind,
    LatentNode,
    Quant,
    StudioKind,
    StudioLayout,
    StudioSize,
)

GENERATED = (
    REPO
    / "packages"
    / "engines"
    / "comfyui"
    / "cordis"
    / "src"
    / "generated"
    / "vocab.ts"
)

# The sibling-owned seam-union names (py/ui_map.py → uiMap.generated.ts).
# A vocab union taking one of these names would be a second spelling —
# refuse at generation time, never as consumer confusion.
_SEAM_NAMES = frozenset(
    m.__name__
    for m in (
        _ui_map.ViewportKind,
        _ui_map.BarKind,
        _ui_map.OverlayKind,
        _ui_map.OverlayDock,
        _ui_map.ViewportAnchorDock,
    )
)

_HEADER = """/**
 * GENERATED from py/card_kinds.py + py/slot_kinds.py + py/flow.py::Kind
 * + py/melite_models/grammar.py + ActionCard.SIDEBAR_SECTIONS — DO NOT EDIT.
 * Regenerate: python3 tools/export_vocab.py --write
 * Manifest: .scratch/declarations-ts-map.md §4.4 + §5 step 7-vocabs.
 * The parity wall (tests/walls/suites/test_vocab_parity.py) refuses drift.
 * py/ui_map.py seam unions are sibling-owned (uiMap.generated.ts) and are
 * deliberately NOT re-declared here — a second spelling refuses the wall.
 */
"""


def _q(v: str) -> str:
    """One TS string literal (json quoting — the values are all
    [a-z0-9_ \\-] but quoting stays mechanical, never hand-rolled)."""
    return json.dumps(v)


def _union_block(ts_name: str, members: list[str], doc: str) -> str:
    assert ts_name not in _SEAM_NAMES, (
        "vocab union %r collides with the sibling-owned seam unions %s"
        % (ts_name, sorted(_SEAM_NAMES))
    )
    vals = ", ".join(_q(m) for m in members)
    lines = [
        "/** %s */" % doc,
        "export const %sValues = [%s] as const;" % (ts_name, vals),
        "export type %s = (typeof %sValues)[number];" % (ts_name, ts_name),
    ]
    return "\n".join(lines) + "\n"


def _enum_members(enum_cls: object) -> list[str]:
    from enum import Enum  # local: keeps the module top import-clean

    assert isinstance(enum_cls, type) and issubclass(enum_cls, Enum)
    return sorted(m.value for m in enum_cls)  # type: ignore[union-attr]


def render() -> str:
    parts = [_HEADER]
    # ── const-unions (§4.4, sorted) ──────────────────────────────────
    slot_rows = sorted(slot_kinds.VOCAB.slots, key=lambda r: r.slot)
    card_rows = sorted(card_kinds.TABLE.kinds, key=lambda r: r.kind)
    unions: list[tuple[str, list[str], str]] = [
        ("Genre", _enum_members(Genre),
         "Model family genre (grammar.py Genre — the 7 lanes + unordered)."),
        ("Kind", _enum_members(_flow.Kind),
         "Flow edge-type vocabulary (py/flow.py Kind — what flows on the wire)."),
        ("FileKind", _enum_members(slot_kinds.FileKind),
         "Input-slot file-kind vocabulary (slot_kinds.py FileKind)."),
        ("BadgeTone", _enum_members(card_kinds.BadgeTone),
         "Card-kind badge tone (card_kinds.py BadgeTone)."),
        ("KindRunner", _enum_members(card_kinds.KindRunner),
         'Card-kind runner family ("" = the default rule, "input" = the input family runner).'),
        ("SidebarSection", sorted(ActionCard.SIDEBAR_SECTIONS),
         "Universal sidebar sections (ActionCard.SIDEBAR_SECTIONS)."),
        ("Quant", _enum_members(Quant),
         "Weight-tier vocabulary (grammar.py Quant — native = no weights matrix)."),
        ("ClipType", _enum_members(ClipType),
         "CLIPLoader type vocabulary (grammar.py ClipType)."),
        ("LatentNode", _enum_members(LatentNode),
         "Empty-latent constructor vocabulary (grammar.py LatentNode)."),
        ("KnobKind", _enum_members(KnobKind),
         "Card-knob value vocabulary (grammar.py KnobKind)."),
        ("StudioSize", _enum_members(StudioSize),
         "Studio body-frame size notch (grammar.py StudioSize)."),
        ("StudioLayout", _enum_members(StudioLayout),
         "Studio body mount shape (grammar.py StudioLayout)."),
        ("StudioKind", _enum_members(StudioKind),
         "Studio body renderer claim (grammar.py StudioKind)."),
        ("Slot", [r.slot for r in slot_rows],
         "Canonical wire slots (slot_kinds.py VOCAB — the closed set)."),
        ("CardKind", [r.kind for r in card_rows],
         "Card-kind behavior rows (card_kinds.py TABLE — the wire kind strings)."),
    ]
    for ts_name, members, doc in unions:
        parts.append(_union_block(ts_name, members, doc))
    # ── tables ───────────────────────────────────────────────────────
    slot_names = [r.slot for r in slot_rows]
    parts.append(
        "/** Every canonical wire slot (sorted — the closed set). */\n"
        "export const SLOTS: readonly string[] = [%s];\n"
        % ", ".join(_q(s) for s in slot_names)
    )
    kind_lines = ",\n".join(
        '  %s: %s' % (_q(r.slot), _q(r.kind.value)) for r in slot_rows
    )
    parts.append(
        "/** Slot key -> FileKind (sorted by slot). */\n"
        "export const SLOT_KINDS: Record<string, FileKind> = {\n"
        + kind_lines
        + "\n};\n"
    )
    undeclared = sorted(slot_kinds.VOCAB.undeclared_slots)
    parts.append(
        "/** Wire-live slots no form/model declares (protected from purges). */\n"
        "export const UNDECLARED_SLOTS: readonly string[] = [%s];\n"
        % ", ".join(_q(s) for s in undeclared)
    )
    sections = sorted(ActionCard.SIDEBAR_SECTIONS)
    parts.append(
        "/** Universal sidebar sections (sorted — mirrors SidebarSection). */\n"
        "export const SIDEBAR_SECTIONS: readonly SidebarSection[] = [%s];\n"
        % ", ".join(_q(s) for s in sections)
    )

    def _bool(v: bool) -> str:
        return "true" if v else "false"

    row_lines = []
    for r in card_rows:
        icon = "null" if r.icon is None else _q(r.icon)
        # ONE line per row (fixed key order — the wall parses rows stdlib-only).
        row_lines.append(
            "  { kind: %s, runnable: %s, executable: %s, formSpec: %s, "
            "compound: %s, opensStudio: %s, badgeTone: %s, runner: %s, icon: %s },"
            % (
                _q(r.kind),
                _bool(r.runnable),
                _bool(r.executable),
                _bool(r.formSpec),
                _bool(r.compound),
                _bool(r.opensStudio),
                _q(r.badgeTone.value),
                _q(r.runner.value),
                icon,
            )
        )
    parts.append(
        "/** One card-kind behavior flag row (sorted by kind — the editor render/run contract). */\n"
        "export interface CardKindDef {\n"
        "  kind: string;\n"
        "  runnable: boolean;\n"
        "  executable: boolean;\n"
        "  formSpec: boolean;\n"
        "  compound: boolean;\n"
        "  opensStudio: boolean;\n"
        "  badgeTone: BadgeTone;\n"
        "  runner: KindRunner;\n"
        "  icon: string | null;\n"
        "}\n"
        "/** The card-kind table (card_kinds.py TABLE — runner \"\" = the default rule). */\n"
        "export const CARD_KINDS: readonly CardKindDef[] = [\n"
        + "\n".join(row_lines)
        + "\n];\n"
    )
    return "\n".join(parts)


def main() -> int:
    want = render()
    if "--write" in sys.argv:
        GENERATED.parent.mkdir(parents=True, exist_ok=True)
        GENERATED.write_text(want, encoding="utf-8")
        print("wrote %s" % GENERATED)
        return 0
    if not GENERATED.is_file():
        print("DRIFT: %s does not exist — run --write" % GENERATED)
        return 1
    have = GENERATED.read_text(encoding="utf-8")
    if have != want:
        print("DRIFT: %s is stale — run --write" % GENERATED)
        return 1
    print("%s matches the py declarations" % GENERATED)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
