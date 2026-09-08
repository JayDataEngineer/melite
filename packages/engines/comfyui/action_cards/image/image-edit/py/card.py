# image-edit — the edit_image interface card, PYTHON surface.
#
# ONE CARD, ONE FAMILY (image-edit rework 2026-09-05): this card
# boards the edit-lane family head — qwen-img-edit-2511. The pre-flip
# `img-edit` family head is RETIRED (same physical lane, identical
# lane_inputs, but no variant/quant cascade — the "rides on defaults"
# fossil: the card surface in default mode rendered an empty
# model/variant/quant selector, and the user could not tell which
# lane they were on). The cascade gate (Model declares no variants →
# compile error, ONE PATTERN, OR COMPILE ERROR) killed the fossil; the
# card now serves one family, the cascade (lightning / standard) is
# always visible, and the qwen-scoped tuning knobs
# (use_stock_nodes, double_reference) ride the surface (no families=
# filter — one family, the scoping is dead weight). No preset knob
# (2026-09-06, the image-gen pattern: a Select with options=[] whose
# every selection refused at compose is a dropdown that can ONLY
# 400 — preset died on image-gen 2026-09-05 for the same three
# reasons. Quick-reference recipes belong in spec.variants[], never
# a wire param).
#
# The pose TOOL lanes (dwpose / gem_soma / latentsync / see-through /
# stretchy-rig) are NOT boarded: preprocessors and lip-sync have no
# edit-lane weights — phantom dropdown options that refuse at render
# (the ControlNetMod law: wait in the menu until one truthfully
# serves; they return when their own nodesets/cards exist).
#
# SSOT law: card.yaml keeps card:/families:/principles: (the
# identity rung folds those later); the FIELD SURFACE lives
# HERE and ONLY here — a parameters: block in card.yaml
# alongside this file is a LOUD refusal at load (two SSOTs
# is zero SSOTs).

import os


from melite_cards import (ActionCard, Field, Select, Textarea, Text, Number, Slider, Seed, Boolean, Image, Audio, Video, File, VocabRef)
from melite_cards import OutputRow
from melite_models import load_model_py

_HERE = os.path.dirname(os.path.abspath(__file__))
_MODELS_ROOT = os.path.normpath(os.path.join(
    _HERE, "..", "..", "..", "..", "models"))

# the boarded family — the model IS the truth this card serves.
# Single-family card (the post-merge surface): no model= enum on the
# wire, the family id is the card's identity (the tool manifest's
# `model` field names it as the default; nothing else to pick).
QwenImgEdit2511 = load_model_py(os.path.join(
    _MODELS_ROOT, "image", "qwen-img-edit-2511", "model.py"), "comfyui")


class ImageEditCard(ActionCard):
    id = 'image-edit'

    # OUTPUT CONTRACT: what a completed run DELIVERS (the gateway's
    # completion gate refuses a run matching none of the rows).
    card_outputs = (
        OutputRow(patterns=('.png',), label='Edited image'),
    )
    # the universal sidebar declaration (source declares — /v1/forms derives).
    sidebar_order = 2
    sidebar = 'image-edit'
    default_service = 'qwen-img-edit-2511'
    # stage-row id the compose emits (retired skeleton= verbatim)
    skeleton = "edit"
    # structural keys (row 3): the mod-firing surface the voice gates
    # LOUD (compose refuses a set firing key the plain-edit graph
    # cannot honor — the key lists mirror the voice's own gate
    # loops) plus the tile bags the mods consume. Legal in presets
    # and surfaces, never knob-spliced.
    structural_knobs = frozenset({
        "loras", "mask",
        "image2", "image3", "reference_images",
        "use_stock_nodes", "double_reference",
        "lanpaint_enabled", "lanpaint_num_steps", "lanpaint_step_size",
        "lanpaint_lambda", "lanpaint_beta", "lanpaint_friction",
        "lanpaint_prompt_mode",
        "outpaint_top", "outpaint_right", "outpaint_bottom",
        "outpaint_left", "outpaint_overlap",
        "input_mask", "mask_mode", "mask_context_pad", "mask_grow",
        "mask_feather", "mask_threshold", "mask_invert",
    })
    label = 'Image Edit'
    description = ('Instruction-driven image editing — the edit_image '
                   'interface card boarding the Qwen-Image-Edit 2511 '
                   'lane; the family carries the lightning / standard '
                   'cascade (variant/quant always shown) plus the '
                   'lanpaint flavor (required anchor image). The '
                   'surface scopes itself.')
    genre = 'image'
    icon = 'edit'
    api = True
    ability = {"default_family": 'qwen-img-edit-2511'}
    principles = (
        'image1 is required — the edit is anchored on it (the lanpaint flavor declares it; slots image1..image3, input_image is the retired alias)',
        'Qwen-Image-Edit uses low CFG (flow-matching) — the Guidance Scale slider tops out at 10.0',
        'A lanpaint_mask alongside input_image patches the model with the DiffSynth inpaint ControlNet',
        'Region Mode controls how the mask is honored: auto / crop_stitch / full_frame',
        'Mask prep (grow/feather/threshold/invert) uses the same host-side chain the Inpaint card uses',
        'Iterate HERE, not in video — an edit costs seconds, a render minutes; name what changes, state the rest as unchanged',
        'Previous card outputs ride as artifact URLs (/v1/assets/runs/<run>/<file>); the compose resolves them to data/runs/output/<run>/<file> and stages into the comfy input dir (phase 1 validates on the mounts BEFORE registration)',
    )
    models = (QwenImgEdit2511,)
    # families + mods derive (absorption)

    # ── the CORE surface (every boarded family) ─────────────────────────
    # image1 rides the lanpaint flavor (mods/lanpaint.py) — the
    # mod owns the slot; the flavor makes it required + input-zoned
    # OPTIONAL SLOTS (operator order, 2026-09-05: "image 2 and 3 are
    # optional... user doesn't have to put it in"): the declared default
    # is what makes an EMPTY square legal on the wire — the click-time
    # family contract refuses a null on a field with no default
    # ('image2 is null but has no default'), and the backend row below
    # coerces null to the same empty sentinel.
    image2                   = Image(label='Image 2', group='input', zone='inputs', order=0, width=1, default='')
    image3                   = Image(label='Image 3', group='input', zone='inputs', order=1, width=1, default='')
    reference_images         = Field(type='image_list', label='Reference Images', group='input', zone='inputs', order=2, default=[], tooltip='Multi-image picker (up to 3). Used by workflows that pass resolved image lists; complements the individual Image 2 / Image 3 slots above.')
    prompt = Textarea(label='Prompt', group='prompt', order=0, width=1, columns=2, required=True)
    negative_prompt = Textarea(label='Negative Prompt', group='prompt', order=1, width=1, default='')
    # UI defaults ARE the lane defaults (2026-09-06
    # frontend-impossible incident — same law as the music card:
    # an untouched knob must seed, display, AND run one value).
    # Each matches ImageEditParams' default exactly (wall-pinned).
    # NO width/height (2026-09-06 surface standard): this is an
    # input-anchored lane — output follows the anchor image's own
    # size (VAEEncode → KSampler → VAEDecode preserves dims), so
    # resolution knobs are dead promises here (they implied a 1024
    # canvas the graph never renders — the crop-confusion incident).
    # Generative lanes (image-gen) carry them; anchored lanes never
    # do. The schema still admits them for old drafts; compose
    # refuses a stated non-anchor value as a retired knob.
    seed                     = Seed(label='Seed', group='resolution', order=4, width=1, default=-1)
    steps                    = Number(label='Steps', group='sampling', order=0, width=1, min=1, max=50, step=1, default=4)
    cfg                      = Slider(label='Guidance Scale', group='sampling', order=1, width=1, min=0.1, max=10, step=0.1, default=1.0, tooltip='Qwen-Image-Edit uses low CFG (flow-matching).')
    sampler = Select(label='Sampler', group='sampling', order=2, width=1, options=VocabRef('$samplers'), default='')
    scheduler = Select(label='Scheduler', group='sampling', order=3, width=1, options=VocabRef('$schedulers'), default='')

    # ── edit tuning (qwen-scoped — single family now, no families= filter) ─
    use_stock_nodes          = Boolean(label='Use Stock Nodes', group='edit_tuning', order=1, width=1, default=False, tooltip='When true, build_img2img_edit emits the stock Qwen-Image-Edit node graph (no DiffSynth patches, no custom ControlNet wiring). Useful for reproducing upstream behavior exactly.')
    double_reference         = Boolean(label='Double Reference', group='edit_tuning', order=2, width=1, default=False, tooltip='Encode the input image twice (VAE + vision encoder) for stronger identity preservation. Disable for faster runs where identity drift is acceptable.')

    # ── the MODS ride through the model — nothing hand-listed here ─────
