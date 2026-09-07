#!/usr/bin/env python3
"""Export card declarations JSON for the Cordis decl plane.

Declarations stream (.scratch/declarations-ts-map.md §4.2 + §5 step 2,
ladder P0): the py card surface as DATA — one JSON object, per card id,
that the TS `cards/<id>.decl.ts` layer will derive from (nothing imports
it yet — this stroke lands the generator + the snapshot, no importers).

    python3 tools/export_card_decls.py \
        > plugins/engines/comfyui/cordis/data/card-decls.json

AUTO-SCAN via melite_cards.scan_engine_cards (no manual list): all 18
comfyui cards land; the 4 non-comfyui cards the shared scanner also sees
(auto-rig, forge, quad-remesh, music-native) are INCLUDED, never a crash
— the inclusion is announced LOUD on stderr. stdout is pure JSON.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "py"))

from melite_cards import scan_engine_cards  # noqa: E402
from melite_cards.dsl import _num_or_str, _parse_options_str  # noqa: E402
from melite_cards.dsl import Field, VocabRef  # noqa: E402


def field_meta(f: Field) -> dict:
    """One schemaMeta row — the Field declaration, verbatim data."""
    m: dict = {
        "name": f.name,
        "type": f.type,
        "label": f.label or "",
        "group": f.group or "",
        "zone": f.zone or "",
    }
    for attr in ("order", "width", "columns", "min", "max", "step"):
        v = getattr(f, attr)
        if v is not None:
            m[attr] = v
    if f.default is not None and f.default != "":
        m["default"] = _num_or_str(f.default)
    m["required"] = bool(f.required)
    m["placeholder"] = f.placeholder or ""
    m["tooltip"] = f.tooltip or ""
    m["visibleWhen"] = f.visible_when or ""
    if isinstance(f.options, VocabRef):
        m["vocabRef"] = f.options.name
    elif isinstance(f.options, (list, tuple)):
        m["options"] = list(f.options)
    elif isinstance(f.options, str) and f.options != "":
        m["options"] = _parse_options_str(f.name, f.options)
    m["families"] = list(f.families or ())
    return m


def verb_meta(vcls, vfams) -> dict:
    """One verbs[] row — id/label/engines/writes/requires + own knobs."""
    return {
        "id": vcls.id,
        "label": vcls.label or "",
        "families": list(vfams),
        "engines": [
            {
                "id": e.id,
                "flow": e.flow,
                "local": e.local or "",
                "refusal": e.refusal or "",
            }
            for e in (vcls.engines or ())
        ],
        "writes": list(vcls.writes or ()),
        "requires": list(vcls.requires or ()),
        "knobs": [field_meta(f) for f in getattr(vcls, "_fields_", ())],
    }


def card_decl(cid: str, cls) -> dict:
    fams = list(cls.families_of() or ())
    rbf = getattr(cls, "requires_by_family", None)
    return {
        "id": cls.id,
        "boarded": fams,
        "requires": list(cls.requires or ()),
        "requiresByFamily": {k: list(v) for k, v in (rbf or {}).items()},
        "families": fams,
        "schemaMeta": [field_meta(f) for f in cls._fields_],
        "outputs": [
            {"patterns": list(o.patterns), "label": o.label, "many": bool(o.many)}
            for o in (cls.card_outputs or ())
        ],
        "sidebar": {
            "order": cls.sidebar_order,
            "section": cls.sidebar or "",
            "hidden": bool(cls.sidebar_hidden),
            "defaultService": cls.default_service or "",
        },
        "ability": dict(cls.ability) if cls.ability else None,
        "principles": list(cls.principles or ()),
        "icon": cls.icon or "",
        "genre": cls.genre or "",
        "api": bool(cls.api),
        "size": cls.size,
        "layout": cls.layout,
        "structuralKnobs": sorted(cls.structural_knobs or ()),
        "verbs": [verb_meta(v, vf) for v, vf in (cls._verbs_ or ())],
    }


def main() -> None:
    cards = scan_engine_cards(str(REPO))
    out: dict[str, dict] = {}
    foreign: list[str] = []
    for cid in sorted(cards):
        path, cls = cards[cid]
        if "plugins/engines/comfyui/" not in path.replace("\\", "/"):
            # Non-comfyui cards ride the shared scanner — INCLUDED,
            # announced loud (never skipped silent, never a crash).
            foreign.append(cid)
        try:
            out[cid] = card_decl(cid, cls)
        except Exception as e:
            raise SystemExit(
                "export_card_decls: card %r (%s) REFUSED: %s" % (cid, path, e))
    if foreign:
        print("export_card_decls: non-comfyui cards included: %s"
              % ", ".join(sorted(foreign)), file=sys.stderr)
    print(json.dumps(out, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
