# seedvr2_ema — the upscale lane's family head, hand-edited since
# the 2026-09-02 flip. The class IS the unit: family head →
# variants → quant cells; merged_defaults() walks the cascade.
# Parity pinned by tests/walls/suites/test_python_models.py + the http goldens.
#
# SSOT law: this file REPLACES model.yaml + variants/. A
# model.yaml reappearing next to it is a LOUD refusal.
#
# F-cluster board (2026-09-04): rides the HIDDEN upscale-tools card
# (tool lanes are consumed BY other cards, not user surfaces). The
# defaults below speak ONLY the card's vocab — cross-val refuses a
# default the card never declares (the video-gen flip's law).


from melite_models import  KnobRow,Model, Variant, Cell, LoraRow, LaneInputs, Genre, ClipType


class Seedvr2Upscale(Model):
    id = 'seedvr2_ema'
    genre = Genre.IMAGE
    label = 'SeedVR2 Upscaler'
    description = 'SeedVR2 diffusion-based super-resolution (3B EMA FP16 default, 7B EMA FP8'
    engine = 'comfyui'
    card = 'upscale-tools'
    form = 'form_upscale'
    # lane facts (live-probed 2026-09-04: the server's model
    # registry DISCOVERS the SEEDVR2/ volume dir — the dit combo
    # lists seedvr2_ema_3b_fp16, the vae combo ema_vae_fp16)
    lane_inputs = LaneInputs(
        unet='seedvr2_ema_3b_fp16.safetensors',
        vae='ema_vae_fp16.safetensors',
    )
    # NO filename_prefix (2026-09-06 standard-fields sweep): compose
    # stamps `<run>/gen` — a family default here never reaches the
    # graph (cross-val: a default must name a card field, and the
    # card declares none). The renderer's own default names the
    # consumed-arm prefix.
    defaults = dict(
            batch_size=1,
            max_resolution=4096,
            resolution=1080,
            seed=0,
        )
    # the cascade as frozen rows (PYTHON SHAPE LAW rung 1)
    variants = (
        Variant(id='3b', label='3B FP16', hint='3B EMA fp16 — fast, ~7 GB VRAM (DEFAULT). Precision ships with this body.', route='seedvr2_ema', order=0),
        Variant(id='7b', label='7B FP8', hint='7B EMA fp8_e4m3fn (mixed block-35 fp16) — beefier fine detail, ~3× slower.', route='seedvr2_ema_7b', order=1),
        Variant(id='vae-fp16', label='VAE FP16', hint='EMA VAE helper weights — hidden (folded in 2026-08-16)', route='seedvr2_ema_vae_fp16', order=4),
    )

    # the upscale-tools card surface (row 3, 2026-09-06 — tenth card
    # in the KnobRow migration). Five rows, card vocabulary
    # throughout (no renames). dit_model/vae_model ride the step doc
    # as lane facts, never the wire — no rows.
    card_knobs = (
        KnobRow(card='input_image', inject='LoadImage.0.image', kind='s'),
        KnobRow(card='seed', inject='SeedVR2VideoUpscaler.0.seed', kind='n'),
        KnobRow(card='resolution', inject='SeedVR2VideoUpscaler.0.resolution', kind='n'),
        KnobRow(card='max_resolution', inject='SeedVR2VideoUpscaler.0.max_resolution', kind='n'),
        KnobRow(card='batch_size', inject='SeedVR2VideoUpscaler.0.batch_size', kind='n'),
    )
