# auto-rig — the skintensors card.
# Single-card engine: compose/__init__.py owns the full compose logic.

import os

from melite_cards import ActionCard, Boolean, Select, Textarea
from melite_cards import OutputRow
from melite_models import load_model_py

_HERE = os.path.dirname(os.path.abspath(__file__))
_MODELS_ROOT = os.path.normpath(os.path.join(
    _HERE, "..", "..", "..", "..", "models"))

# the boarded family — the model IS the truth this card serves
SkinTokens = load_model_py(
    os.path.join(_MODELS_ROOT, "3d", "skintokens", "model.py"),
    "skintokens")


class AutoRigCard(ActionCard):
    id = 'auto-rig'

    # OUTPUT CONTRACT: what a completed run DELIVERS (the gateway's
    # completion gate refuses a run matching none of the rows).
    card_outputs = (
        OutputRow(patterns=('.glb',), label='Rigged mesh'),
    )
    # the universal sidebar declaration (source declares — /v1/forms derives).
    sidebar_order = 22
    sidebar = '3d'
    default_service = 'skintokens'
    label = 'Auto Rig'
    description = ('Static mesh GLB → generated skeleton + learned '
                   'skin weights → rigged GLB (TokenRig on GGML)')
    genre = '3d'
    icon = 'mesh'
    api = True
    ability = {"default_family": 'skintokens'}
    principles = (
        'the statue leg of the chain — feed it an anny bake or a trellis lift, it returns an animatable character',
        'CPU generation takes minutes (upstream recomputes the Qwen graph without a KV cache) — queue-shaped, not interactive',
        'device cpu is the lane default — vulkan contends with the ComfyUI GPU; flip it only deliberately',
        'postprocess opt-in matches the upstream demo default: raw learned weights unless you ask',
    )
    models = (SkinTokens,)

    input = Textarea(label='Input mesh', tooltip='Static .glb/.t2mesh path or artifact-ref from a previous card (anny bake, trellis lift)', required=True)
    device = Select(default='cpu', options=['cpu', 'auto', 'vulkan'],
                    label="Device",
                    tooltip="cpu (lane default — never touches the GPU) / auto / vulkan (contends with ComfyUI)")
    postprocess = Boolean(default=False, label="Postprocess",
                          tooltip="Opt-in surface-locality heuristic (upstream demo's own default is off — raw learned weights)")
