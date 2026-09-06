"""The card-road wall (ledger row 3, 2026-09-06): ONE arm shape.

Seventeen arms walked the same unshared road (schema gate -> dice
-> template -> phase split -> render_card -> compose_skeleton);
compose/card.py's emit_render() IS that road now, emit() the Chain
road (h3's emission). Every py/compose.py under action_cards must
delegate to one of the two doors — a bespoke walk is the drift
class row 3 exists to kill. The import IS the proof: no migrated
set to maintain, the wall only ever tightens.

Run: pytest tests/walls/suites/test_card_road.py -v
"""

import ast
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]

# road doors: (module, name) pairs a compose.py may delegate to.
ROAD_DOORS = {("card", "emit_render"), ("card", "emit")}


def _card_arms() -> list[Path]:
    out = []
    for plugin_root in sorted((REPO / "plugins" / "engines").glob("*")):
        cards = plugin_root / "action_cards"
        if not cards.is_dir():
            continue
        for arm in sorted(cards.glob("*/*/py/compose.py")):
            out.append(arm)
    return out


def _delegates(arm: Path) -> bool:
    # the whole py/ package speaks for the arm (h3's compose.py
    # delegates to its emission/graph.py, which walks card.emit —
    # the road door lives one hop in; a bespoke walk means NO file
    # in the package delegates).
    for sib in sorted(arm.parent.rglob("*.py")):
        try:
            tree = ast.parse(sib.read_text())
        except (OSError, SyntaxError):
            continue
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom) and node.module == "card":
                if any(a.name in {"emit_render", "emit"}
                       for a in node.names):
                    return True
    return False


def test_every_arm_walks_a_road_door() -> None:
    arms = _card_arms()
    assert arms, "no card arms found — the scan is broken, not the cards"
    bespoke = sorted(str(a.relative_to(REPO)) for a in arms
                     if not _delegates(a))
    assert not bespoke, (
        "bespoke compose walks (migrate to compose/card.py emit_render; "
        "the golden_compose wall pins each migration byte-identical): %s"
        % bespoke)


def test_road_doors_exist() -> None:
    road = (REPO / "plugins" / "engines" / "comfyui" / "compose"
            / "card.py")
    text = road.read_text()
    assert "def emit_render(" in text, "render road missing from card.py"
    assert "def emit(" in text, "Chain road missing from card.py"
