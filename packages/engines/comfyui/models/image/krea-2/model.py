# krea-2 — the model matrix as DECLARATIONS (PYTHON SHAPE LAW).
#
# The family IS the one subclass of Model (taxonomy). The cascade is
# DATA: `variants` is a tuple of frozen Variant rows; each variant's
# `cells` are frozen Cell rows — one schema, validated at construction
# (an invalid url/sha/size cannot be built). merged_defaults() walks
# the tuples; resolve() addresses them. No nested classes, no
# namespace-scanning metaclass, no Turbo = Turbo wiring — rows state
# their coordinates once.
#
# The head body IS Turbo's INT8 ConvRot weights (the family default
# cell) — preserved from the yaml: family defaults carry steps=8/cfg=1.0.
#
# SSOT law: model.yaml + variant.yaml are DELETED (the flip). The dir
# keeps its data files: generate_t2i.json (the compose graph),
# inference.yaml (recipes — content strings, stay yaml), agents/,
# mods/. A model.yaml reappearing next to this file is a LOUD refusal
# at scan time (two SSOTs is zero SSOTs).
#
# (2026-09-03) The turbo/raw cells had carried ONE sha256 on two
# different checkpoint files — a copy-paste fossil the class ceremony
# hid for a day. Corrected against HF's lfs oid; rows make that diff
# legible (shape law rung 7).

from melite_models import  KnobRow,Model, Variant, Cell, CellArtifact, load_mod, VariantGroup, PromptGuide, GuideSection, LaneInputs, Genre, ClipType

# the family's mod flavors live in mods/ beside this file (one
# system for mods: per-family subclasses of the melite_cards menu)
Loras = load_mod(__file__, "loras", "Loras")

_TURBO_INT8 = CellArtifact(
    source_url=("https://huggingface.co/Comfy-Org/Krea-2/resolve/main/"
                "diffusion_models/krea2_turbo_int8_convrot.safetensors"),
    size_bytes=13492686496,
    sha256=("8e4eeda70dd5037ab1ba2bef6b417f9f901e26093117cf397f741fc1fdaaf3f1"),
    dest_sub="diffusion_models", size_hint_gb=13.5)

_RAW_INT8 = CellArtifact(
    source_url=("https://huggingface.co/Comfy-Org/Krea-2/resolve/main/"
                "diffusion_models/krea2_raw_int8_convrot.safetensors"),
    size_bytes=13492686496,
    sha256=("5585a4a38c4bcfb6fde2d480a4aa6edf7f665721ebde56d30662c35a45f5fa5c"),
    dest_sub="diffusion_models", size_hint_gb=13.5)

_QWEN3VL_4B = CellArtifact(
    source_url=("https://huggingface.co/Comfy-Org/Krea-2/resolve/main/"
                "text_encoders/qwen3vl_4b_fp8_scaled.safetensors"),
    size_bytes=5242467968,
    sha256=("54bd5144df0bbc25dd6ccadfcb826b521445a1b06ae5a42570bdd2974ca87094"),
    dest_sub="text_encoders", size_hint_gb=4.9)


class Krea2(Model):
    id = "krea-2"
    tile = "image"
    genre = Genre.IMAGE
    label = "Krea 2"
    description = "High-quality general text-to-image generation."
    engine = "comfyui"
    card = "image-gen"          # the owning card (cross-validation hook)
    mods = (Loras,)             # the flavor from mods/loras.py: the
                                # Raw-variant training loras (12 rows),
                                # applied on Turbo. No lanpaint — the t2i
                                # template carries no LanPaint branch.
    form = "form_generate"
    canvas_default = True
    timeout_floor = 300

    # core tuning ONLY — the lanpaint knobs absorb from LanPaintMod's
    # field defaults (merged_defaults base layer; hand-copies refused)
    defaults = dict(
        scheduler="normal",
        width=1024,
        height=1024,
        steps=8,
        sampler="euler",
        cfg=1.0,
    )

    variants = (
        Variant(id="turbo", label="Turbo", order=0,
                hint="8-step distilled — fast, photorealistic (DEFAULT)",
                route="krea-2",
                resolver_defaults=dict(model="krea-2"),
                cells=(
                    Cell(quant="int8", label="INT8 ConvRot", route="krea-2",
                         artifact=_TURBO_INT8),
                )),
        Variant(id="raw", label="Raw", order=1,
                hint="52-step base checkpoint — the variant the loras "
                     "train on (DEFAULT here)",
                route="krea-2-raw",
                resolver_defaults=dict(model="krea-2-raw",
                                       steps=52, cfg=3.5),
                cells=(
                    # raw's primary — the matrix coordinates of the
                    # krea-2-raw route (the yaml had to DOCUMENT this
                    # trap in a comment; here the coordinates are rows)
                    Cell(quant="int8", label="INT8 ConvRot",
                         route="krea-2-raw", vram_peak_gb=22.0,
                         artifact=_RAW_INT8),
                )),
        # RECIPE ROWS (2026-09-05, "write it up cleanly, with pydantic
        # classes"): a recipe is a patch-only Variant row in the Recipe
        # group — no route, no cells. Its `defaults` are the stamps the
        # editor applies on click (applyVariantOverrides sets the
        # loras list absolutely); firing rides the EXISTING loras door
        # (compose resolves the pick against mods/loras.py and refuses
        # unknown ids, compile-time). strength is deliberately NOT
        # restated here — the door defaults it from the LoraRow's
        # default_strength (rung 6: the catalog row is the one source).
        # The 2026-08-era frontend chips wrote `loras_selected` — a key
        # the backend NEVER read; these rows replace that fossil with
        # a stamped pick on the LIVE channel.
        Variant(id="realism", label="Realism", group="Recipe", order=0,
                hint="The realism recipe — krea2_realism_lora at the "
                     "catalog row's default strength (0.7)",
                defaults={"loras": [{"id": "krea2_realism_lora"}]}),
    )

    # loader stack (compose reads; never served on the catalog row)
    loader = "unet"
    architecture = "dit"
    # weight facts for the CARD renderer (models are data; cards
    # render) — the unet basename is DERIVED from the turbo cell's
    # artifact, never retyped beside it (rung 6)
    lane_inputs = LaneInputs(
        unet_variant="turbo", unet_quant="int8",
        text_encoder="qwen3vl_4b_fp8_scaled.safetensors",
        clip_type=ClipType.KREA2,
        vae="qwen_image_vae.safetensors")

    variant_groups = (
        VariantGroup(id="Variant", label="Variant",
             tooltip="Base checkpoint — Turbo (8-step distilled, fast/"
                     "photorealistic) or Raw (52-step base, for LoRA "
                     "training)."),
        VariantGroup(id="Quant", label="Quant",
             tooltip="Quantization tier — INT8 ConvRot (the official "
                     "Comfy-Org convrot artifact, DEFAULT)."),
        # No Recipe group here (2026-09-06: the group is
        # grammar-owned — RECIPE_GROUP rides every family with
        # landing default='default'. The realism row below stays as
        # an OPT-IN extra; a fresh card lands on Default (no LoRA
        # stamp), not realism.
    )

    prompt_guide = PromptGuide(
        title="Krea 2 Prompting Guide",
        sections=[
            GuideSection(label="Format", body="Continuous descriptive prose"),
            GuideSection(label="Length", body="60-150 words"),
            GuideSection(label="Strength",
                 body="Photorealism, fine detail, strong composition. Use "
                      "the Turbo variant for speed (8 steps) or Raw for "
                      "LoRA training (52 steps, CFG 3.5)."),
            GuideSection(label="Structure",
                 list=["Subject identity, action, expression",
                       "Environment / setting",
                       "Lighting, mood, color",
                       "Camera / composition"]),
        ])

    prompt_upscale = (
        'structure: [subject, action, environment, lighting, style, quality]',
        'rules:',
        '- pair every bare noun with 1-2 visual adjectives',
        '- name the camera or render view (e.g. "3/4 view, 50mm, soft rim light")',
        '- end with the quality block, never open with it',
        '- negations go to the negative prompt, never the positive',
        '- one style axis per prompt',
        'stacking contradictory styles muddies both',
    )

    # the image-gen card surface, one row per Field (row 3, 2026-09-06:
    # third card in the KnobRow migration). Inject targets name the
    # shared image_t2i renderer's nodes (CLIPTextEncode pos .0 / neg
    # .1, the SD3 latent, KSampler) — identical for all three
    # families; only the latent node class varies (anima rides
    # EmptyLatentImage). The loras mod is structural (compose-owned),
    # never a knob row.
    card_knobs = (
        KnobRow(card='prompt', inject='CLIPTextEncode.0.text', kind='s'),
        KnobRow(card='negative_prompt', inject='CLIPTextEncode.1.text', kind='s'),
        KnobRow(card='width', inject='EmptySD3LatentImage.0.width', kind='n'),
        KnobRow(card='height', inject='EmptySD3LatentImage.0.height', kind='n'),
        KnobRow(card='seed', inject='KSampler.0.seed', kind='n'),
        KnobRow(card='steps', inject='KSampler.0.steps', kind='n'),
        KnobRow(card='cfg', inject='KSampler.0.cfg', kind='n'),
        KnobRow(card='sampler', inject='KSampler.0.sampler_name', kind='s'),
        KnobRow(card='scheduler', inject='KSampler.0.scheduler', kind='s'),
    )
