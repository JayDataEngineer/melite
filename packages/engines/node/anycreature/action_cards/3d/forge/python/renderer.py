"""renderer.py — the forge card's render payload SSOT.

PYTHON SHAPE LAW rung 8: models don't render, ACTION CARDS render —
the argv/splice truth for the vendored engine lives HERE (card
behavior), never in the model payload and never inline in execute.
The plugin's execute calls this module; it never rebuilds argv.

The anyCreature engine is a zero-dependency node CLI:
    node engine/cli.js <spec.json> <out.glb>
The card knobs (smooth_angle/build/ao/role/shading) are SPEC FIELDS —
the renderer splices them into the creature document.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None

_HERE = Path(__file__).resolve().parent
# python/ -> forge -> creature -> action_cards -> anycreature (plugin root)
PLUGIN_ROOT = _HERE.parents[3]
VENDOR_ENGINE = PLUGIN_ROOT / "vendor" / "anyCreature" / "engine" / "cli.js"


def resolve_cli() -> "Path | None":
    """ANYCREATURE_CLI env override (BYO) → the vendored cli.js →
    None (the structural floor stands; execute refuses LOUDLY)."""
    env = os.environ.get("ANYCREATURE_CLI")
    if env:
        return Path(env)
    if VENDOR_ENGINE.is_file():
        return VENDOR_ENGINE
    return None


def spec_with_knobs(doc: ForgeParams) -> dict[str, JsonValue]:
    """The node params: THE ACTION CARD LAW — params.workflow carries
    the creature spec (the knobs spliced in as spec fields)."""
    spec = dict(doc.spec)
    spec["smooth_angle"] = doc.smooth_angle
    spec["build"] = doc.build
    spec["ao"] = doc.ao
    spec["role"] = doc.role
    if doc.shading:
        spec["shading"] = doc.shading
    return {"workflow": spec}


def resolve_node() -> "str | None":
    """The node interpreter — never spawning-shell PATH luck:
    ANYCREATURE_NODE env → which('node') → the user-local install
    dir (~/.local/bin — where node lives on this estate's hosts).
    None → execute refuses LOUDLY."""
    env = os.environ.get("ANYCREATURE_NODE")
    if env:
        return env
    import shutil
    hit = shutil.which("node")
    if hit:
        return hit
    local = os.path.expanduser("~/.local/bin/node")
    if os.path.isfile(local) and os.access(local, os.X_OK):
        return local
    return None


def build_argv(cli: Path, run_dir: str, params: dict[str, JsonValue]
               ) -> tuple[list[str], str, str, str]:
    """The argv truth: (cmd, spec_path, out_path, cwd).

    Writes the spec to disk (the CLI reads a file), returns the full
    command. The vendor root is the cwd (relative asset reads)."""
    spec = params.get("workflow")  # THE ACTION CARD LAW
    spec_path = os.path.join(run_dir, "creature_spec.json")
    out_path = os.path.join(run_dir, "creature.glb")
    with open(spec_path, "w", encoding="utf-8") as f:
        json.dump(spec, f)
    node = resolve_node()
    cmd = [node or "node", str(cli), spec_path, out_path]
    return cmd, spec_path, out_path, str(cli.parents[1])
