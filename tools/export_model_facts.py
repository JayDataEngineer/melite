#!/usr/bin/env python3
"""Export model facts JSON for the Cordis compose plane.

Authored by the py model classes during the TS migration (PYTHON
SHAPE LAW rung 8: models ship data, cards render). One row per
boarded family + the EXTENSION-LAW node map. Regenerate:

    python3 tools/export_model_facts.py \
        > plugins/engines/comfyui/cordis/data/model-facts.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "py"))

# The boarded families, per card, migration-ladder order.
CARD_FAMILIES: dict[str, list[str]] = {
    "image-gen": ["z-image"],
}


def main() -> None:
    from melite_models import scan_engine_models

    models = scan_engine_models(str(REPO))

    # EXTENSION-LAW node map (authored by py/card_requires.py during
    # the migration; TS gate reads it as data).
    sys.path.insert(0, str(REPO / "plugins" / "engines" / "comfyui"))
    from card_requires import EXTENSION_NODE_TYPES

    rows: dict[str, dict] = {}
    for card, families in CARD_FAMILIES.items():
        for fam in families:
            if fam not in models:
                raise SystemExit(f"model '{fam}' not scanned — is it a real family dir?")
            m = models[fam][1]
            li = m.lane_inputs
            rows[fam] = {
                "id": m.id,
                "card": m.card,
                "defaults": dict(m.defaults or {}),
                "lane_inputs": {
                    "unet": m.lane_unet_basename(),
                    "text_encoder": li.text_encoder,
                    "clip_type": getattr(li.clip_type, "value", str(li.clip_type)),
                    "vae": li.vae,
                    "sampling_shift": li.sampling_shift,
                    "latent_node": getattr(li.latent_node, "value", str(li.latent_node)),
                },
            }

    out = {
        "models": rows,
        "extension_node_types": {k: sorted(v) for k, v in EXTENSION_NODE_TYPES.items()},
    }
    print(json.dumps(out, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
