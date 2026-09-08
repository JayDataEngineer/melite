#!/usr/bin/env python3
"""Export model facts JSON for the Cordis compose plane.

AUTO-SCAN: every comfyui family under packages/engines/comfyui/models
that carries lane_inputs lands a row (id-keyed, card-attributed from
the model class). No manual list — a boarded family without a facts
row is unbornable. The EXTENSION-LAW node map rides along.

    python3 tools/export_model_facts.py \
        > packages/engines/comfyui/cordis/data/model-facts.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "python"))


def _artifact_basename(artifact) -> str:
    """The cell artifact's file basename ("" when the cell ships no
    download place — weightless/native tiers). The URL never rides
    the facts file; the basename is the compose-door coordinate."""
    if artifact is None:
        return ""
    return str(artifact.source_url).rsplit("/", 1)[-1]


def _knob_rows(cls) -> list[dict]:
    rows = []
    for r in (getattr(cls, "card_knobs", None) or ()):
        d = r.model_dump(mode="json") if hasattr(r, "model_dump") else dict(r)
        rows.append({
            "card": d.get("card", ""),
            "inject": d.get("inject", ""),
            "kind": str(d.get("kind", "")),
        })
    return rows


def _variant_rows(cls) -> list[dict]:
    rows = []
    for v in (getattr(cls, "variants", None) or ()):
        cells = []
        for c in (getattr(v, "cells", None) or ()):
            q = getattr(c, "quant", "")
            cells.append({
                "quant": getattr(q, "value", str(q)),
                "label": getattr(c, "label", ""),
                "route": getattr(c, "route", ""),
                "artifact": _artifact_basename(getattr(c, "artifact", None)),
                "vram_peak_gb": getattr(c, "vram_peak_gb", None),
            })
        rows.append({
            "id": getattr(v, "id", ""),
            "label": getattr(v, "label", ""),
            "group": getattr(v, "group", ""),
            "route": getattr(v, "route", ""),
            "resolver_defaults": dict(getattr(v, "resolver_defaults", None) or {}),
            "defaults": dict(getattr(v, "defaults", None) or {}),
            "cells": cells,
        })
    return rows


def _group_rows(cls) -> list[dict]:
    rows = []
    for g in (getattr(cls, "variant_groups", None) or ()):
        d = g.model_dump(mode="json") if hasattr(g, "model_dump") else dict(g)
        rows.append({
            "id": d.get("id", ""),
            "label": d.get("label", ""),
            "tooltip": d.get("tooltip", ""),
            "default": d.get("default", ""),
        })
    return rows


def _output_rows(card_cls) -> list[dict]:
    """The owning card's output contract, copied per model (the
    compose door's delivery gate reads it off facts, never the card
    class — QUEUE LANE LAW)."""
    rows = []
    for r in (getattr(card_cls, "card_outputs", None) or ()):
        d = r.model_dump(mode="json") if hasattr(r, "model_dump") else dict(r)
        rows.append({
            "patterns": list(d.get("patterns", ())),
            "label": d.get("label", ""),
            "many": bool(d.get("many", False)),
        })
    return rows


def _extra_facts(cls, card_cls) -> dict:
    """ADDITIVE (§4.3 ladder P0): new keys only — the base row above
    stays byte-identical. Conditionally-emitted keys (accepts /
    studio / requires_by_family) ride only where declared."""
    extra: dict = {
        "card_knobs": _knob_rows(cls),
        "variants": _variant_rows(cls),
        "variant_groups": _group_rows(cls),
        "outputs": _output_rows(card_cls) if card_cls is not None else [],
    }
    accepts = list(getattr(cls, "accepts", None) or ())
    if accepts:
        extra["accepts"] = accepts
    studio = getattr(cls, "studio", None)
    if studio is not None:
        extra["studio"] = (
            studio.model_dump(mode="json") if hasattr(studio, "model_dump")
            else dict(studio)
        )
    rbf = getattr(card_cls, "requires_by_family", None) if card_cls is not None else None
    if rbf:
        extra["requires_by_family"] = {
            k: list(v) for k, v in dict(rbf).items()
        }
    return extra


def main() -> None:
    from melite_models import scan_engine_models

    models = scan_engine_models(str(REPO))

    # EXTENSION-LAW node map (authored by python/card_requires.py during
    # the migration; the TS gate reads it as data).
    sys.path.insert(0, str(REPO / "packages" / "engines" / "comfyui"))
    from card_requires import EXTENSION_NODE_TYPES

    # Owning-card lookup for the outputs contract copy (+ per-family
    # requires). Card ids resolve 1:1 with model.card (the
    # cross-validation hook); a miss refuses loud, never ships
    # outputs-free rows.
    from melite_cards import scan_engine_cards

    _cards = scan_engine_cards(str(REPO))

    def _card_of(card_id: str, model_id: str):
        hit = _cards.get(card_id)
        if hit is None:
            raise RuntimeError(
                "export_model_facts: model %r names card %r which the "
                "card scan does not declare — fix the Model.card hook "
                "(outputs/requires copy needs the owning card)"
                % (model_id, card_id))
        return hit[1]

    rows: dict[str, dict] = {}
    for mid, (_path, cls) in sorted(models.items()):
        li = getattr(cls, "lane_inputs", None)
        if li is None:
            # Lane-less families (tagger T1s: the loader nodes
            # self-provision) still ship DEFAULTS — the card reads
            # no lane fields. Native/cpp families (no .card) stay out.
            if getattr(cls, "card", None):
                rows[mid] = {
                    "id": cls.id,
                    "card": cls.card,
                    "defaults": dict(cls.defaults or {}),
                    "lane_inputs": {},
                    **_extra_facts(cls, _card_of(cls.card, mid)),
                }
            continue
        try:
            unet = cls.lane_unet_basename()
        except Exception:
            unet = None  # non-unet-shaped lanes (3D/motion) derive none
        row = dict(li.model_dump()) if hasattr(li, "model_dump") else dict(li)
        row["unet"] = unet
        rows[mid] = {
            "id": cls.id,
            "card": cls.card,
            "defaults": dict(cls.defaults or {}),
            "lane_inputs": row,
            **_extra_facts(cls, _card_of(cls.card, mid)),
        }

    out = {
        "models": rows,
        "extension_node_types": {k: sorted(v) for k, v in EXTENSION_NODE_TYPES.items()},
    }
    print(json.dumps(out, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
