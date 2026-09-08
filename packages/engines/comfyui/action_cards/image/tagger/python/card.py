# tagger — the image-prompt-inversion interface card, PYTHON surface.
#
# ONE CARD, MANY FAMILIES (the image-gen pattern): every tagger lane boards
# here — wd14 + joytag + florence2 live; joycaption as the last stroke on
# the same skeleton (LoadImage → TaggerNode → SaveText). A family per card
# would strand the recreation workflow across four pickers.
#
# SSOT law: the FIELD SURFACE lives HERE and ONLY here — a parameters:
# block in a yaml sidecar alongside this file is a LOUD refusal at load.

import os


from melite_cards import (ActionCard, Text, Slider, Boolean, Image, Select)
from melite_cards import OutputRow
from melite_models import load_model_py

_HERE = os.path.dirname(os.path.abspath(__file__))
_MODELS_ROOT = os.path.normpath(os.path.join(
    _HERE, "..", "..", "..", "..", "models"))

# the boarded families — each model IS a truth this card serves.
Wd14 = load_model_py(
    os.path.join(_MODELS_ROOT, "image", "wd14", "model.py"), "comfyui")
JoyTag = load_model_py(
    os.path.join(_MODELS_ROOT, "image", "joytag", "model.py"), "comfyui")
Florence2 = load_model_py(
    os.path.join(_MODELS_ROOT, "image", "florence2", "model.py"), "comfyui")
JoyCaption = load_model_py(
    os.path.join(_MODELS_ROOT, "image", "joycaption", "model.py"), "comfyui")


class TaggerCard(ActionCard):
    id = 'tagger'

    # OUTPUT CONTRACT: what a completed run DELIVERS (the gateway's
    # completion gate refuses a run matching none of the rows).
    card_outputs = (
        OutputRow(patterns=('.txt',), label='Tags/caption text'),
    )
    # the universal sidebar declaration (source declares — /v1/forms derives).
    sidebar_order = 19
    sidebar = 'image'
    default_service = 'wd14'
    label = 'Tagger'
    description = ('Image prompt inversion — booru keyword tags (WD14, '
                   'JoyTag) and natural-language captions (Florence-2, '
                   'JoyCaption) for recreating images in NovelAI / Pony / '
                   'FLUX / Ideogram. Tags persist as a tags.txt run artifact.')
    # Per-family gates (2026-09-06): each arm's pack is checked only for
    # its own family — a wd14 run never demands the florence pack.
    requires_by_family = {
        'wd14': ('ComfyUI-WD14-Tagger',),
        'joytag': ('Comfyui_joytag',),
        'florence2': ('ComfyUI-Florence2',),
        'joycaption': ('joycaption_comfyui',),
    }
    genre = 'image'
    icon = 'tag'
    api = True
    ability = {"default_family": 'wd14'}
    principles = (
        'input_image is required — the tag is anchored on it (absolute mount path or a prior-run artifact ref)',
        'threshold is the general-tag confidence floor; character_threshold is the person-identity floor (higher — names are cheap to overclaim)',
        'exclude_tags prunes what you already know is wrong — comma-separated, matched case-insensitively by the node',
        'The lane outputs tags.txt (SaveText) — the queue trades in artifacts, not bare strings',
        'First run downloads the WD14 weights (.onnx + .csv) — light ONNX lane, ~4 GB VRAM',
        'JoyTag reads a pack-local checkpoint (no auto-download) and takes add/remove tag lists instead of WD14\'s character floor',
    )
    models = (Wd14, JoyTag, Florence2, JoyCaption,)
    # families + mods derive (absorption)

    # ── the surface (union vocab; each arm wires its subset) ──
    input_image            = Image(label='Input image',
        group='input',
        order=0,
        width=1,
        required=True,
        tooltip='The image to invert. Absolute mount path or artifact ref.')
    # KNOB NAME LAW (2026-09-06 florence2 live-fire): NEVER 'model' —
    # the {model} door key shadows it on the flat API (the family's
    # model-knob default could never stamp; florence2 compiled WD14's
    # default and ComfyUI refused it). 'checkpoint' rides clean.
    checkpoint             = Text(label='Checkpoint',
        group='tagger',
        order=0,
        width=1,
        default='wd-v1-4-moat-tagger-v2',
        tooltip='The WD14 weights name (auto-downloaded on first run).')
    threshold              = Slider(label='Threshold',
        group='tagger',
        order=1,
        width=1,
        min=0.0,
        max=1.0,
        step=0.05,
        default=0.35,
        tooltip='General-tag confidence floor.')
    character_threshold    = Slider(label='Character threshold',
        group='tagger',
        order=2,
        width=1,
        min=0.0,
        max=1.0,
        step=0.05,
        default=0.85,
        tooltip='Character-tag confidence floor — keep high.')
    exclude_tags           = Text(label='Exclude tags',
        group='tagger',
        order=3,
        width=1,
        default='',
        tooltip='Comma-separated tags to prune from the output.')
    replace_underscore     = Boolean(label='Replace underscores',
        group='tagger',
        order=4,
        width=1,
        default=False,
        tooltip='Emit "silver hair" instead of "silver_hair".')
    trailing_comma         = Boolean(label='Trailing comma',
        group='tagger',
        order=5,
        width=1,
        default=False,
        tooltip='Terminate the tag list with a comma (prompt-paste shape).')
    add_tag                = Text(label='Add tag',
        group='tagger',
        order=6,
        width=1,
        default='',
        tooltip='JoyTag: tags force-prepended to the output (comma-separated). Ignored by WD14.')
    remove_tag             = Text(label='Remove tag',
        group='tagger',
        order=7,
        width=1,
        default='',
        tooltip='JoyTag: tags pruned from the output (comma-separated). Ignored by WD14.')
    caption_task           = Select(label='Caption task',
        group='tagger',
        order=8,
        width=1,
        default='more_detailed_caption',
        options=['region_caption', 'dense_region_caption', 'region_proposal',
                 'caption', 'detailed_caption', 'more_detailed_caption',
                 'caption_to_phrase_grounding',
                 'referring_expression_segmentation', 'ocr', 'ocr_with_region',
                 'docvqa', 'prompt_gen_tags', 'prompt_gen_mixed_caption',
                 'prompt_gen_analyze', 'prompt_gen_mixed_caption_plus'],
        tooltip='Florence-2: the vision task (live task vocabulary). Ignored by WD14/JoyTag.')
    caption_type           = Select(label='Caption style',
        group='tagger',
        order=9,
        width=1,
        default='Descriptive',
        options=['Descriptive', 'Descriptive (Casual)', 'Straightforward',
                 'Stable Diffusion Prompt', 'MidJourney', 'Danbooru tag list',
                 'e621 tag list', 'Rule34 tag list', 'Booru-like tag list',
                 'Art Critic', 'Product Listing', 'Social Media Post'],
        tooltip='JoyCaption: the caption template (live vocabulary). Ignored by WD14/JoyTag/Florence-2.')
    caption_length         = Select(label='Caption length',
        group='tagger',
        order=10,
        width=1,
        default='long',
        options=['any', 'very short', 'short', 'medium-length', 'long', 'very long'],
        tooltip='JoyCaption: target length (the node also takes word counts 20-260 — bare/API bodies only). Ignored by other families.')
    extra_option           = Select(label='Extra instruction',
        group='tagger',
        order=11,
        width=1,
        default='',
        options=['',
                 'Include information about lighting.',
                 'Include information about camera angle.',
                 'Include information about whether there is a watermark or not.',
                 'Include information about whether there are JPEG artifacts or not.',
                 'Do NOT include anything sexual; keep it PG.',
                 'Do NOT mention the image\'s resolution.',
                 'You MUST include information about the subjective aesthetic quality of the image from low to very high.',
                 'Include information on the image\'s composition style, such as leading lines, rule of thirds, or symmetry.',
                 'Do NOT mention any text that is in the image.',
                 'Specify the depth of field and whether the background is in focus or blurred.',
                 'Do NOT use any ambiguous language.',
                 'ONLY describe the most important elements of the image.',
                 'Your response will be used by a text-to-image model, so avoid useless meta phrases.'],
        tooltip='JoyCaption: one appended instruction (the full 28-option list rides bare/API bodies). Ignored by other families.')
    # NO filename_prefix (2026-09-06 standard-fields sweep): the run
    # routes outputs by run id (compose stamps `<run>/tags`) — a user
    # knob here was silently overwritten, a dead promise. Internal
    # default lives in the renderer; the schema still admits the key
    # so old drafts parse.
