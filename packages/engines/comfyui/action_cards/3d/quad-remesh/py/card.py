# quad-remesh — the autoremesher card, PYTHON surface (moved
# comfyui-side 2026-09-07 with the cpp→node cutover: the render arm
# is the Cordis TS card now, this declaration is the source the
# decl plane + editor derive from). ONE-IMPLEMENTATION RULE (the
# kimodo precedent, commit 36061914): the cpp lane's compose.py /
# schema.py / renderer.py retired with the lane — declarations
# stream (commit 852725bb: py/card.py DECLARATIONS stay).

import os

from melite_cards import ActionCard, Slider, Textarea
from melite_cards import OutputRow
from melite_models import load_model_py

_HERE = os.path.dirname(os.path.abspath(__file__))
_MODELS_ROOT = os.path.normpath(os.path.join(
    _HERE, "..", "..", "..", "..", "models"))

# the boarded family — the model IS the truth this card serves
AutoRemesher = load_model_py(
    os.path.join(_MODELS_ROOT, "3d", "autoremesher", "model.py"),
    "comfyui")


class QuadRemeshCard(ActionCard):
    id = 'quad-remesh'

    # OUTPUT CONTRACT: what a completed run DELIVERS (the gateway's
    # completion gate refuses a run matching none of the rows).
    card_outputs = (
        OutputRow(patterns=('.glb',), label='Remeshed mesh'),
    )
    # the universal sidebar declaration (source declares — /v1/forms derives).
    sidebar_order = 13
    sidebar = '3d'
    default_service = 'autoremesher'
    # stage-row id the compose emits (retired skeleton= verbatim)
    skeleton = "quad-remesh"
    label = 'Quad Remesh'
    description = 'High-poly mesh → clean quad topology'
    genre = '3d'
    icon = 'mesh'
    api = True
    ability = {"default_family": 'autoremesher'}
    principles = (
        'target_quads is the budget — lower is cleaner, higher keeps detail',
        'sharp_edge below 90 preserves creases; above smooths them',
        'adaptivity above 1 concentrates quads at curvature',
        'Feed it a dense scan or TRELLIS output; it returns clean quads',
    )
    models = (AutoRemesher,)
    # EXTENSION LAW: the lane's render rides OUR authored pack (the
    # AutoRemesher node serves the whole graph) — the compose gate
    # refuses BEFORE any graph is emitted when no pack node is live.
    requires = ('melite-autoremesher-nodes',)

    input = Textarea(label='Input mesh', tooltip='OBJ/STL/PLY path or artifact-ref from a previous card', required=True)
    target_quads = Slider(default=50000, min=100, max=1000000,
                          label="Target quads",
                          tooltip="Target quad count")
    edge_scaling = Slider(default=1.0, min=0.1, max=10.0,
                          label="Edge scaling")
    sharp_edge = Slider(default=90.0, min=0.0, max=180.0,
                        label="Sharp edge")
    smooth_normal = Slider(default=0.0, min=0.0, max=1.0,
                           label="Smooth normal")
    adaptivity = Slider(default=1.0, min=0.1, max=2.0,
                        label="Adaptivity")
    anisotropy = Slider(default=1.0, min=0.1, max=2.0,
                        label="Anisotropy")
