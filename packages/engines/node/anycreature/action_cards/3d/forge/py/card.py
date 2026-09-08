# forge — the anyCreature creature card.
# Single-card engine: compose/__init__.py owns the full compose logic.
# This package exists for the card declaration (param surface) and
# future renderer if the card grows complex enough to need one.

import os

from melite_cards import ActionCard, Slider, Select, Textarea
from melite_cards import OutputRow
from melite_models import load_model_py

_HERE = os.path.dirname(os.path.abspath(__file__))
_MODELS_ROOT = os.path.normpath(os.path.join(
    _HERE, "..", "..", "..", "..", "models"))

# the boarded family — the model IS the truth this card serves
AnyCreature = load_model_py(
    os.path.join(_MODELS_ROOT, "3d", "anycreature", "model.py"),
    "anycreature")


class ForgeCard(ActionCard):
    id = 'forge'

    # OUTPUT CONTRACT: what a completed run DELIVERS (the gateway's
    # completion gate refuses a run matching none of the rows).
    card_outputs = (
        OutputRow(patterns=('.glb',), label='Forged creature mesh'),
    )
    # the universal sidebar declaration (source declares — /v1/forms derives).
    sidebar_order = 11
    sidebar = '3d'
    default_service = 'anycreature'
    label = 'Creature Forge'
    description = 'Breed a creature spec → validate → compile to GLB'
    genre = '3d'
    icon = 'creature'
    api = True
    ability = {"default_family": 'anycreature'}
    principles = (
        'The spec is the creature — joints/chains/volumes/parts/anims as JSON',
        'volumes + parts are the structural floor; everything else sharpens',
        "build:rigid for robots and crystals, default for flesh",
        'role presets set budget and thresholds — boss costs more',
    )
    models = (AnyCreature,)

    smooth_angle = Slider(default=50, min=1, max=180,
                          label="Smooth angle",
                          tooltip="Crease threshold — higher = smoother")
    build = Select(default='default', options=['default', 'rigid'],
                   label="Build mode",
                   tooltip="'rigid' for robots/crystals")
    ao = Select(default='true', options=['true', 'false'],
                label="Ambient occlusion",
                tooltip="Per-vertex AO bake")
    role = Select(default='npc', options=['minion', 'npc', 'boss'],
                  label="Role preset",
                  tooltip="Budget and threshold presets")
    shading = Textarea(default='', label="Shading",
                       tooltip="Colour ramp JSON — {gradient:{top,bottom}, noise:{size,amount}}")
