#!/usr/bin/env python3
"""Export model facts JSON for the Cordis compose plane.

AUTO-SCAN: every comfyui family under plugins/engines/comfyui/models
that carries lane_inputs lands a row (id-keyed, card-attributed from
the model class). No manual list — a boarded family without a facts
row is unbornable. The EXTENSION-LAW node map rides along.

    python3 tools/export_model_facts.py \
        > plugins/engines/comfyui/cordis/data/model-facts.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "py"))


def main() -> None:
    from melite_models import scan_engine_models

    models = scan_engine_models(str(REPO))

    # EXTENSION-LAW node map (authored by py/card_requires.py during
    # the migration; the TS gate reads it as data).
    sys.path.insert(0, str(REPO / "plugins" / "engines" / "comfyui"))
    from card_requires import EXTENSION_NODE_TYPES

    rows: dict[str, dict] = {}
    for mid, (_path, cls) in sorted(models.items()):
        li = getattr(cls, "lane_inputs", None)
        if li is None:
            continue  # native/cpp families carry no comfyui lane rows
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
        }

    out = {
        "models": rows,
        "extension_node_types": {k: sorted(v) for k, v in EXTENSION_NODE_TYPES.items()},
    }
    print(json.dumps(out, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
