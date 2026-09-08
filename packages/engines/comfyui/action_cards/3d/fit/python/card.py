# fit — the 3D placement (fitting) interface card, PYTHON surface.
#
# ONE CARD, ONE FAMILY: fit seats a static prop onto a SOMAX body under
# the three meld fit laws (socket seats, fit measures, grip aims) and
# renders the 8-view turnaround as proof. The queue run executes the
# SAME solver the e2e wall pins (FitProp node = fit_surgery.py, the
# tools/fit_prop.py twin) — the card is the queue-native door, never a
# second implementation.
#
# Division (fit-card design): this card owns BYTES (the fitted GLB + proof
# views + measurement record); Unity owns LAW (AttachToBones consumes
# the meld row verbatim — the row_json the node runs is the manifest row).

import os


from melite_cards import (ActionCard, Select, Text,
                          Number, Slider, File)
from melite_cards import OutputRow
from melite_models import load_model_py

_HERE = os.path.dirname(os.path.abspath(__file__))
_MODELS_ROOT = os.path.normpath(os.path.join(
    _HERE, "..", "..", "..", "..", "models", "3d"))

# the boarded family — the model IS the truth this card serves.
Fit = load_model_py(os.path.join(_MODELS_ROOT, "fit", "model.py"),
                    "comfyui")


class FitCard(ActionCard):
    id = 'fit'

    # OUTPUT CONTRACT: what a completed run DELIVERS (the gateway's
    # completion gate refuses a run matching none of the rows).
    card_outputs = (
        OutputRow(patterns=('.glb',), label='Fitted prop-in-hand mesh'),
        OutputRow(patterns=('.json',), label='Fit record'),
    )
    # the universal sidebar declaration (source declares — /v1/forms derives).
    sidebar_order = 20
    sidebar = '3d'
    default_service = 'fit'
    # stage-row id the compose emits (retired skeleton= verbatim)
    skeleton = "fit"
    label = 'Fit'
    description = 'Seat a static prop onto a SOMAX body under the placement laws.'
    genre = '3d'
    icon = 'person'
    api = True
    ability = {"default_family": "fit"}
    models = (Fit,)
    requires = ('melite-poser-nodes',)
    body_glb = File(label="Body GLB", group="parts", order=0, required=True)
    prop_glb = File(label="Prop GLB", group="parts", order=1, required=True)
    bone = Text(label="Bone", group="placement", order=0, default="mixamorig:Head")
    align = Select(label="Law", group="placement", order=1, default="socket", options=["socket", "fit", "grip"])
    position = Text(label="Offset", group="placement", order=2, default="0,0,0")
    rotation = Text(label="Rotation", group="placement", order=3, default="0,0,0")
    fit_ratio = Number(label="Fit ratio", group="fit", order=0, min=0, max=10, step=0.01, default=0)
    fit_ref_bone = Text(label="Measure to", group="fit", order=1, default="")
    fit_ref_bone2 = Text(label="Measure from", group="fit", order=2, default="")
    seat_ratio = Number(label="Seat ratio", group="fit", order=3, min=0, max=1, step=0.01, default=0.22)
    finger_bone = Text(label="Finger bone", group="grip", order=0, default="")
    thumb_bone = Text(label="Thumb bone", group="grip", order=1, default="")
    target_width = Number(label="Target width", group="grip", order=2, min=0, max=10, step=0.01, default=0)
    resolution = Slider(label="View resolution", group="turnaround", order=0, min=256, max=2048, step=64, default=768)
    framing = Slider(label="Framing", group="turnaround", order=1, min=1.0, max=3.0, step=0.05, default=1.2)
    focal_length = Slider(label="Focal length", group="turnaround", order=2, min=10, max=400, step=1, default=50)
    samples = Number(label="Samples", group="turnaround", order=3, min=1, max=4096, step=1, default=64)
    transparent = Select(label="Background", group="turnaround", order=4, default="true", options=["true", "false"])
