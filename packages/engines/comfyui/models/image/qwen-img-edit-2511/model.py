# qwen-img-edit-2511 — the edit lane's sole family head (image-edit rework
# 2026-09-05). The pre-flip `img-edit` family head is RETIRED — it was
# the same physical lane (identical lane_inputs) with no variant/quant
# cascade, and the card surface served an empty selector in default
# mode (the "rides on defaults" fossil). The cascade gate (ONE PATTERN,
# OR COMPILE ERROR) killed it; this row carries the full lightning /
# standard cascade plus the merged agent assets (AGENT.md + the
# pose-iteration skill) and the prompt_upscale recipes.
#
# The class IS the unit (PYTHON SHAPE LAW); parity pinned by
# tests/walls/suites/test_python_models.py + the http goldens.
# SSOT law: this file REPLACES model.yaml + variants/. A
# model.yaml reappearing next to it is a LOUD refusal.


from melite_models import  KnobRow,Model, Variant, Cell, LoraRow, LaneInputs, Genre, ClipType, VariantGroup, PromptGuide, GuideSection
from melite_models import load_mod
from melite_cards import MaskMod
Lanpaint = load_mod(__file__, "lanpaint", "Lanpaint")
Loras = load_mod(__file__, "loras", "Loras")


class QwenImgEdit2511(Model):
    id = 'qwen-img-edit-2511'
    engine = 'comfyui'
    genre = Genre.IMAGE
    label = 'Image Edit'
    description = ('Instruction-driven image editing and manipulation — the '
                   'Qwen-Image-Edit 2511 lane (the image-edit card arms this '
                   'family; the pre-flip img-edit head is retired, same '
                   'physical lane, its assets merged here 2026-09-05).')
    form = 'form_edit'
    # weight facts for the CARD renderer — single source (the lane is
    # one: the unet is the int8 ConvRot merge; the lightning variant
    # routes to its own distilled checkpoint via the variant cell —
    # the lane_inputs row states the BASELINE unet the renderer
    # reads when no per-variant artifact owns it)
    lane_inputs = LaneInputs(
        unet='qwen_image_edit_2511_int8_convrot.safetensors',
        text_encoder='qwen_2.5_vl_7b_fp8_scaled.safetensors',
        clip_type=ClipType.QWEN_IMAGE,
        vae='qwen_image_vae.safetensors')
    card = "image-edit"        # the owning card (cross-validation hook)
    # the lanpaint mod rides as a declaration (the flavor in mods/):
    # its field defaults ride through merged_defaults absorption —
    # the hand-copied restatements that used to live in defaults=
    # were the mod-system leak this flip repaid
    # Loras (2026-09-05): the runtime-catalog door — no family rows,
    # the picker serves the estate union, picks validate at compose.
    mods = (Lanpaint, Loras, MaskMod)
    # SURFACE STANDARD (2026-09-06): no width/height — this is an
    # input-anchored lane (output follows the anchor's own size), so
    # resolution knobs never ride the family (cross-val: a default
    # must name a card field, and the card declares none). steps=4
    # is the lightning recipe AND the card/surface default — one
    # value seeded, displayed, and run (the pre-standard steps=8
    # matched nothing: not the card's 4, not Standard's 20).
    defaults = dict(
            use_stock_nodes=False,
            steps=4,
            sampler='euler',
            scheduler='simple',
            cfg=1.0,
            double_reference=False,
        )
    # the cascade as frozen rows (PYTHON SHAPE LAW rung 1).
    # resolver_defaults STAMP the variant selection onto the served
    # form-spec defaults (the route lens, _form_spec_routed) — so
    # selecting "Lightning" actually drops steps to 4 (the
    # pre-flip default, when the lightning recipe was the family
    # head), and "Standard" stamps the 20-step / cfg 2.5 reference
    # workflow. Without these, the variant label promised a recipe
    # the surface never delivered.
    variants = (
        Variant(id='lightning', label='Lightning', order=0,
                hint="4-step distilled checkpoint (lightx2v Lightning) — fast (DEFAULT)",
                route='qwen-img-edit-2511-lightning4',
                resolver_defaults=dict(steps=4),
                cells=(
                    Cell(quant='lightning4', label='FP8 Lightning', route='qwen-img-edit-2511-lightning4', vram_peak_gb=20.0),
        )),
        Variant(id='standard', label='Standard', order=1,
                hint='20 steps, cfg 2.5 — highest quality path, the INT8 ConvRot merge.',
                route='qwen-img-edit-2511',
                resolver_defaults=dict(steps=20, cfg=2.5),
                cells=(
                    Cell(quant='int8', label='INT8 ConvRot', route='qwen-img-edit-2511-int8', vram_peak_gb=20.0),
        )),
    )
    # VARIANT / QUANT chrome (2026-09-06 parity with the image card:
    # the edit surface serves the same Model/Variant/Quant/profile
    # rails — an absent group renders an absent rail, never a
    # fallback). No canvas_default: anchored lanes have no canvas.
    variant_groups = (
        VariantGroup(id="Variant", label="Variant",
             tooltip="Base checkpoint — Lightning (4-step distilled, "
                       "fast default) or Standard (20-step reference, "
                       "highest quality)."),
        VariantGroup(id="Quant", label="Quant",
             tooltip="Quantization tier — FP8 Lightning (the distilled "
                       "checkpoint) or INT8 ConvRot (the reference "
                       "merge)."),
    )
    prompt_guide = PromptGuide(
        title="Qwen Image Edit Prompting Guide",
        sections=[
            GuideSection(label="Format",
                 body="One edit per instruction: target region, single "
                      "change, what stays identical"),
            GuideSection(label="Rules",
                 body="Open with the region or subject, then the change; "
                      "state identity/pose/framing/background as unchanged; "
                      "match the source style vocabulary"),
            GuideSection(label="Cost",
                 body="An edit costs seconds, a render minutes — iterate "
                      "here, chain edits, never merge them"),
            GuideSection(label="CFG",
                 body="Flow-matching lane: keep Guidance low (default 1.0; "
                      "Standard stamps 2.5)"),
        ])

    # the EDIT PROMPT RECIPES — migrated from the retired img-edit
    # family head (2026-09-05 merge). The pose-iteration skill under
    # agents/skills/ is the human-facing companion; this is the
    # agent's prompt_upscale the family class carries (the has_inference
    # catalog row reflects it).
    prompt_upscale = (
        'structure: [region, change, preserve, style match]',
        'rules:',
        '- open with the target region or subject, then the single change',
        '- state what must stay identical (identity, pose, framing, background)',
        "- match the source image's style vocabulary",
        'never invent a new style',
        '- one edit per instruction',
        'chain edits, never merge them',
        '- describe the result, not the process ("night scene, cool moonlight" not "make it darker")',
    )

    # the image-edit card surface, plain-edit core (row 3, 2026-09-06
    # — seventh card in the KnobRow migration). Eight rows: the
    # anchor (image1 — the card-primary name; input_image/image are
    # retired aliases) plus the prompt/sampler block. The two
    # TextEncodeQwenImageEditPlus instances are build-ordered
    # (positive .0, negative .1) so the negative row targets .1.
    card_knobs = (
        KnobRow(card='image1', inject='LoadImage.0.image', kind='s'),
        KnobRow(card='prompt', inject='TextEncodeQwenImageEditPlus.0.prompt', kind='s'),
        KnobRow(card='negative_prompt', inject='TextEncodeQwenImageEditPlus.1.prompt', kind='s'),
        KnobRow(card='seed', inject='KSampler.0.seed', kind='n'),
        KnobRow(card='steps', inject='KSampler.0.steps', kind='n'),
        KnobRow(card='cfg', inject='KSampler.0.cfg', kind='n'),
        KnobRow(card='sampler', inject='KSampler.0.sampler_name', kind='s'),
        KnobRow(card='scheduler', inject='KSampler.0.scheduler', kind='s'),
    )
