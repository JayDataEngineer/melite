# image-gen — the generate_image interface card, PYTHON surface
#
# ONE CARD, ALL FAMILIES: this card boards krea-2, anima and z-image
# at the same time — it is the INTERFACE; the models are the data.
# The optional mods (lanpaint, loras, controlnet) are NOT declared
# here: MODS ARE DECLARED AT THE MODEL LEVEL (Model.mods) and this
# card absorbs them through the boarded model classes, each mod
# scoped to exactly the families that declare it —
#   krea-2 : loras (Raw-variant training loras)
#   anima  : lanpaint
#   z-image: lanpaint (a different mod set than krea-2 — the point)
# melite_cards._absorb_models is the interlock: card classes absorb
# model classes; model classes are designed to be absorbed.
#
# Field surface parity with the golden form-spec is pinned by
# tests/walls/suites/test_python_cards.py (field_spec == golden, per family).

import os


from melite_cards import ActionCard, Select, Textarea, Number, Slider, \
    Seed, VocabRef
from melite_cards import OutputRow
from melite_models import load_model_py

_HERE = os.path.dirname(os.path.abspath(__file__))
_MODELS_ROOT = os.path.normpath(os.path.join(
    _HERE, "..", "..", "..", "..", "models", "image"))

# the boarded families — the models ARE the truth this card serves.
# ONE CARD, ALL FAMILIES (2026-09-05: the unboarded "data family"
# era ended by operator order — every offered model runs; nothing
# is offered that cannot compose). krea-2, z-image and anima board
# with lane facts + templates complete; ideogram boards its OWN
# arm (action_cards/image/ideogram4 — the dual-guided graph) while
# riding the same editor form.
Krea2 = load_model_py(os.path.join(_MODELS_ROOT, "krea-2", "model.py"),
                      "comfyui")
ZImage = load_model_py(os.path.join(_MODELS_ROOT, "z-image", "model.py"),
                       "comfyui")
Anima = load_model_py(os.path.join(_MODELS_ROOT, "anima", "model.py"),
                      "comfyui")


class ImageGenCard(ActionCard):
    id = 'image-gen'

    # OUTPUT CONTRACT: what a completed run DELIVERS (the gateway's
    # completion gate refuses a run matching none of the rows).
    card_outputs = (
        OutputRow(patterns=('.png',), label='Generated image'),
    )
    # the universal sidebar declaration (source declares — /v1/forms derives).
    sidebar_order = 1
    sidebar = 'image'
    default_service = 'krea-2'
    # stage-row id the compose emits (retired skeleton= verbatim)
    skeleton = "generate"
    label = 'Image'
    description = 'Text-to-image generation — the generate_image interface card boarding krea-2; the family declares its mods (loras) and the surface scopes itself'
    genre = 'image'
    icon = 'image'
    api = True
    ability = {"default_family": 'krea-2'}
    principles = (
        'prompt is required — an empty/whitespace prompt is rejected loud, never sampled with empty conditioning',
        'Defaults are shape, not value: resolution/steps/cfg come from the model folder (defaults:/presets), merged at serve time',
        'Sampler and scheduler option lists resolve from the ONE vocabulary (media.comfyui.sampler_vocab) — never hand-copied',
        'A preset fills untouched fields; values you have set win',
        'Mods are model-level declarations: lanpaint rides the families that declare it (anima, z-image) — input_image + lanpaint_mask switch the builder to LanPaintKSampler; loras ride krea-2 (apply on Turbo, train on Raw)',
        'Mask prep (grow/feather/threshold/invert) and outpaint pads are applied host-side before the run — no silent param drops',
    )
    models = (Krea2, ZImage, Anima)   # families + mods derive (absorption)

    # (Cordis card 1 — reverted same stroke: ModelSamplingAuraFlow is
    # a CORE node — comfy_extras.nodes_model_advanced, live — not a
    # vnccs_utils capability. No family here needs a declared
    # extension; requires_by_family stays absent. Lesson: check
    # python_module in object_info before declaring a pack dep.)

    # the mod-absorbed wire (row 3, 2026-09-06): `loras` joins the
    # surface through krea-2's Loras mod, not as a card knob — the
    # door resolves picks into LoraLoader node chains, never a
    # NodeClass.idx.input splice. Declared structural so the knob
    # coverage wall (card fields ⊆ card_knobs rows) exempts exactly
    # what the knobmap surface calls extra_legal.
    structural_knobs = frozenset({"loras"})

    # ── the CORE surface (every boarded family) ─────────────────────────
    # (preset REMOVED 2026-09-05, mod-audit follow-up: options served
    # permanently [], no serve path reads the model's presets/ dir, no
    # frontend sender exists, and ImageGenParams refuses the key — a
    # knob that could ONLY 400. If the quick-reference UI is ever
    # wanted it belongs in spec.variants[] — the live PresetGroup
    # mechanism — never a wire param.)
    prompt = Textarea(label='Prompt', group='prompt', order=0, width=1, columns=2, required=True)
    negative_prompt = Textarea(label='Negative Prompt', group='prompt', order=1, width=1, default='')
    # UI defaults ARE the lane defaults (2026-09-06
    # frontend-impossible incident — same law as the music card:
    # an untouched knob must seed, display, AND run one value).
    # Each matches ImageGenParams' default exactly (wall-pinned).
    width                    = Number(label='Width',
        group='resolution',
        order=0,
        width=1,
        columns=3,
        min=256,
        max=2048,
        step=16,
        default=1024)
    height                   = Number(label='Height',
        group='resolution',
        order=1,
        width=1,
        min=256,
        max=2048,
        step=16,
        default=1024)
    seed                     = Seed(label='Seed', group='resolution', order=4, width=1, default=-1)
    steps                    = Number(label='Steps',
        group='sampling',
        order=0,
        width=1,
        min=1,
        max=100,
        step=1,
        default=8)
    cfg                      = Slider(label='Guidance Scale',
        group='sampling',
        order=1,
        width=1,
        min=1,
        max=20,
        step=0.1,
        default=4.5,
        tooltip='How closely the diffusion follows the prompt. Higher = stricter.')
    sampler = Select(label='Sampler', group='sampling', order=2, width=1, options=VocabRef('$samplers'), default='')
    scheduler = Select(label='Scheduler', group='sampling', order=3, width=1, options=VocabRef('$schedulers'), default='')

    # ── the MODS ride through the models — nothing hand-listed here ─────
