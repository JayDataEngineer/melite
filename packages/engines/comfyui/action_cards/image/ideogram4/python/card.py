# ideogram4 — the dual-guided t2i interface card, PYTHON surface
#
# Boards the ideogram family: typography-aware text rendering
# through the conditional/unconditional unet pair (DualModelGuider),
# the Ideogram4 scheduler (mu/std), flux2 latents. The EDITOR form
# is the shared image form (form_generate); the compose dispatch is
# by model class (card='ideogram4'), so this card owns the lane
# knowledge the KSampler families do not speak.
#
# Field surface parity with the golden form-spec is pinned by
# tests/walls/suites/test_python_cards.py.

import os


from melite_cards import ActionCard, Number, Select, Seed, Slider, \
    Textarea, VocabRef
from melite_cards import OutputRow
from melite_models import load_model_py

_HERE = os.path.dirname(os.path.abspath(__file__))
_MODELS_ROOT = os.path.normpath(os.path.join(
    _HERE, "..", "..", "..", "..", "models", "image"))

# the boarded family — the model IS the truth this card serves.
Ideogram = load_model_py(os.path.join(_MODELS_ROOT, "ideogram",
                                      "model.py"), "comfyui")


class Ideogram4Card(ActionCard):
    id = 'ideogram4'

    # OUTPUT CONTRACT: what a completed run DELIVERS (the gateway's
    # completion gate refuses a run matching none of the rows).
    card_outputs = (
        OutputRow(patterns=('.png',), label='Generated image'),
    )
    # the universal sidebar declaration (source declares — /v1/forms derives).
    sidebar_order = 17
    sidebar = 'image'
    sidebar_hidden = True
    default_service = 'ideogram'
    # stage-row id the compose emits (retired skeleton= verbatim)
    skeleton = "generate"
    label = 'Ideogram'
    description = 'Typography-aware text-to-image with clean, legible text rendering.'
    genre = 'image'
    icon = 'image'
    api = True
    ability = {"default_family": 'ideogram'}
    principles = (
        'prompt is required — an empty/whitespace prompt is rejected loud, never sampled with empty conditioning',
        'The negative channel is the zeroed conditioning (ConditioningZeroOut) — the official family graph has no negative text input',
        'mu/std ride the model defaults (merged at serve time); the universal form does not carry them as fields',
        'Sampler option lists resolve from the ONE vocabulary — never hand-copied',
    )
    models = (Ideogram,)   # families + mods derive (absorption)

    # NOTCH LAW (the studio tenant binding): the boarded model carries
    # studio.tenant='image/canvas-ideogram' — the card of that family
    # ROUTES to an interactive body, so it must declare the notch.
    layout = 'studio'
    size = 'huge'

    # ── the CORE surface ────────────────────────────────────────────────
    prompt = Textarea(label='Prompt', group='prompt', order=0, width=1, columns=2, required=True)
    width = Number(label='Width', group='resolution', order=0, width=1, columns=3, min=256, max=2048, step=16, default=None)
    height = Number(label='Height', group='resolution', order=1, width=1, min=256, max=2048, step=16, default=None)
    seed                     = Seed(label='Seed', group='resolution', order=4, width=1, default=-1)
    steps = Number(label='Steps', group='sampling', order=0, width=1, min=1, max=100, step=1, default=None)
    cfg = Slider(label='Guidance Scale', group='sampling', order=1, width=1, min=1, max=20, step=0.1, tooltip='How closely the diffusion follows the prompt. Higher = stricter.', default=None)
    mu = Slider(label='Mu', group='sampling', order=2, width=1, min=-10, max=10, step=0.05, tooltip='Ideogram4 scheduler mean shift — the official Default preset is 0.5.', default=None)
    std = Slider(label='Std', group='sampling', order=3, width=1, min=0.1, max=5, step=0.05, tooltip='Ideogram4 scheduler spread — the official Default preset is 1.75.', default=None)
    sampler = Select(label='Sampler', group='sampling', order=4, width=1, options=VocabRef('$samplers'), default=None)

    # ── the MODS ride through the models — nothing hand-listed here ─────
