# mask_studio — the mask-studio interface card, PYTHON surface
#
# ONE CARD, ONE FAMILY: the mask lane. RT-DETR proposes, SAM3
# refines — the selection layer for every inpaint/outpaint
# flow. NATIVE ComfyUI core nodes only (RTDETR_detect /
# SAM3_Detect ride comfy_extras; no extension pack — music3
# precedent). The card is the INTERFACE; the model is the data
# (PYTHON SHAPE rung 8: cards render, models carry data).
#
# The recipe form: ONE entry per mask, two levels — Filter
# (where) over Selection (how). When `outputs` is non-empty it
# IS the recipe; the flat detect_mode/export_* params are
# overridden (thresholds + paint_mask stay flat). Pinned by the
# form-spec goldens + AGENT.md's contract.

import os


from melite_cards import (ActionCard, Field, Select, Textarea, Text,
                          Number, Slider, Boolean, Image)
from melite_cards import OutputRow
from melite_models import load_model_py

_HERE = os.path.dirname(os.path.abspath(__file__))
_MODELS_ROOT = os.path.normpath(os.path.join(
    _HERE, "..", "..", "..", "..", "models", "image"))

# the boarded family — the model IS the truth this card serves.
MaskStudio = load_model_py(os.path.join(_MODELS_ROOT, "mask-studio", "model.py"),
                           "comfyui")


class MaskStudioCard(ActionCard):
    id = 'mask-studio'

    # OUTPUT CONTRACT: what a completed run DELIVERS (the gateway's
    # completion gate refuses a run matching none of the rows).
    card_outputs = (
        OutputRow(patterns=('.png',), label='Mask PNG'),
    )
    # the universal sidebar declaration (source declares — /v1/forms derives).
    sidebar_order = 8
    # stage-row id the compose emits (retired skeleton= verbatim)
    skeleton = "mask-studio"
    # contract admission (the compose surface's studio vocab —
    # golden-pinned; the gate refuses everything else loud)
    admits = (              'export_kind',
              'exports',
              'primary_class',
              'primary_is_paint',
              'primary_via_rtdetr',
              'refine_iterations',
              'scope_bbox',
              'union_paint_into_combined',
              )
    sidebar = 'image'
    default_service = 'mask-studio'
    label = 'Mask Studio'
    description = 'Selection-only mask card: detect people/subjects, refine with SAM3, paint corrections → mask artifacts for inpaint flows.'
    genre = 'image'
    icon = 'mask'
    api = True
    ability = {"default_family": 'mask-studio'}
    models = (MaskStudio,)   # families + mods derive (absorption)

    # PRESENTATION NOTCH: the interactive studio body authors the
    # params; the fill-in form is the fallback authoring surface.
    layout = 'studio'

    input_image             = Image(label='Input image', required=True, tooltip='The photo to select from — absolute path or an artifact ref from a prior run.')

    detect_mode             = Select(label='Detect', group='detect', order=0, width=1, default='body', options=['body', 'face', 'hands'], tooltip='What the primary selection targets. body → RT-DETR person boxes refined by SAM3; face/hands → SAM3 open-vocabulary text selection.')
    detection_threshold     = Slider(label='Detection threshold', group='detect', order=1, width=1, min=0.05, max=0.95, step=0.05, default=0.35, tooltip='RT-DETR box confidence. Lower catches more instances, noisier boxes.')
    sam_threshold           = Slider(label='SAM3 threshold', group='detect', order=2, width=1, min=0.5, max=1.0, step=0.01, default=0.93, tooltip='SAM3 mask confidence.')
    sam_dilation            = Slider(label='Dilation (px)', group='detect', order=3, width=1, min=0, max=64, step=1, default=0, tooltip='Grow the final mask N pixels — the inpaint bleed margin.')
    output_mode             = Select(label='Output', group='detect', order=4, width=1, default='segm', options=['segm', 'bbox'], tooltip='segm saves masks; bbox saves the drawn-box manifest preview.')
    instance_filter         = Text(label='Instance filter', group='detect', order=5, default='all', tooltip="'all' | 'largest' | comma indices '0,2' — which detected instances the primary keeps.")
    max_instances           = Number(label='Max instances', group='detect', order=6, min=0, max=100, step=1, default=0, tooltip='Cap detected instances (0 = no cap). Read the manifest first, then filter.')

    sam3_prompt = Textarea(label='SAM3 prompt', group='refine', order=0, tooltip="Open-vocabulary text selection — e.g. 'the red hat', 'left shoe'. Rides INSTEAD of detect_mode when set.", default='')

    export_boxes            = Boolean(label='Export box manifest', group='exports', order=0, default=True, tooltip='Draw RT-DETR boxes on the image — the instance manifest (read it, then set instance_filter).')
    export_face             = Boolean(label='Export face mask', group='exports', order=1, default=False)
    export_hands            = Boolean(label='Export hands mask', group='exports', order=2, default=False)
    export_body             = Boolean(label='Export body mask', group='exports', order=3, default=False)
    export_paint            = Boolean(label='Export paint mask', group='exports', order=4, default=False, tooltip='ON when a brush stroke exists — the painted payload becomes its own mask export.')
    paint_mask              = Image(label='Paint payload', group='exports', order=5, tooltip='The painted PNG (alpha channel = strokes). Required when export_paint is true.')

    roi = Text(label='Scope ROI', group='advanced', order=0, tooltip='[x, y, w, h] fractions — run-global crop of every selection. Recipe filters may carry their own; identical scopes only.', default='')
    outputs                 = Textarea(label='Recipe (outputs)', group='advanced', order=1, default='[]', tooltip='THE recipe form: one entry per mask, filter (where) over selection (how). Non-empty ⇒ overrides the flat params. See AGENT.md.')
