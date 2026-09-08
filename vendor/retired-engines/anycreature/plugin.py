"""plugin.py — anyCreature plugin declaration (compose-first shape).

Text → skinned, animated, AO-baked creature GLB. Zero runtime deps;
the vendored engine runs via node CLI. The card is the interface;
there are no weights — the creature is COMPILED from the spec.
"""


class Plugin:
    id = "anycreature"
    label = "anyCreature"
    description = "Text → game-ready 3D creature (JSON spec → skinned GLB)"
    engines = ("anycreature",)
    genres = ("3d",)
    webui = {
        "url": None,
        "label": "Creature Forge",
        "description": "Breed a creature spec, validate, compile to GLB",
        "features": (),
        "icon": "🐉",
    }
