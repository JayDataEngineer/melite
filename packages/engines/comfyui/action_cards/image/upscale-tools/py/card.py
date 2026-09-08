# upscale-tools — the F-cluster tool card, PYTHON surface
#
# ONE SUBMITTABLE FAMILY + FIVE CONSUMED FRAGMENTS (operator order
# 2026-09-04, the F mandate: "tool cards consumed BY other cards,
# not user submits — integration is compose-level walls, GPU
# optional per lane"): the card is HIDDEN in the form table. It
# boards seedvr2_ema (the weight-real diffusion upscale lane: the
# 3B fp16 DiT + ema VAE discovered on the weights volume) — the one
# lane whose submit through the queue is meaningful and proven.
#
# The weightless tool fragments (basic_resize, pixel_upscale,
# rtx_vsr, concat, input) have no lane facts — they consume nothing
# but tensors — so their families stay card='' (the wall's honest
# skip: not card families) and their GRAPHS live in this card's
# renderer as consumed-only arms (PYTHON SHAPE LAW rung 8: models
# don't render, cards do — a consuming card imports the arm).
#
# Honest no-boards on THIS estate (documented, not phantom):
#   - seedvr2 7B variants (fp16/fp8-mixed) sit on the volume but
#     stay unboarded — the 3B fp16 is the canary shape, 7B is a
#     deliberate VRAM decision for another day
#   - rtx-vsr needs the NVIDIA Video Effects SDK stack to EXECUTE;
#     the arm renders (compose-level truth) and rides consumed-only

import os


from melite_cards import (ActionCard, Select, Number, Slider,
                          Seed, Image)
from melite_cards import OutputRow
from melite_models import load_model_py

_HERE = os.path.dirname(os.path.abspath(__file__))
_MODELS_ROOT = os.path.normpath(os.path.join(
    _HERE, "..", "..", "..", "..", "models"))

SeedVr2Ema = load_model_py(
    os.path.join(_MODELS_ROOT, "image", "seedvr2_ema", "model.py"),
    "comfyui")


class UpscaleToolsCard(ActionCard):
    id = 'upscale-tools'

    # OUTPUT CONTRACT: what a completed run DELIVERS (the gateway's
    # completion gate refuses a run matching none of the rows).
    card_outputs = (
        OutputRow(patterns=('.png',), label='Upscaled image'),
    )
    # the universal sidebar declaration (source declares — /v1/forms derives).
    sidebar_order = 16
    sidebar = 'image'
    sidebar_hidden = True
    default_service = 'seedvr2_ema'
    # stage-row id the compose emits (retired skeleton= verbatim)
    skeleton = "generate"
    # save-tail override (the kit derives `${runId}/gen`; the
    # image-upscale flow's polish stage pins it — pinned by the
    # test_two_card_flow plan legs)
    admits = ('filename_prefix',)
    # the wired-stage-input vocabulary (row-4: "$image" from the
    # tagger stage composes NO graph at phase-1 — the runtime wires
    # the producer link on the merged path)
    spell_params = ('input_image',)
    label = 'Upscale Tools'
    description = ('Diffusion upscale (SeedVR2-3B fp16) — the hidden '
                   'tool card; also home of the consumed tool fragments '
                   '(resize, pixel-upscale, rtx-vsr, concat, input)')
    genre = 'image'
    icon = 'maximize'
    api = True
    ability = {"default_family": 'seedvr2_ema'}
    principles = (
        'A tool lane boards only with real weight facts — the weightless fragments render as consumed arms, never as phantom submit options',
        'SeedVR2 restores detail (diffusion); plain resize resamples pixels — pick by intent, not by size',
        'resolution is the TARGET short side (1080 = FHD rail); max_resolution is the hard ceiling the lane refuses past',
        'Defaults are shape, not value: filenames and knobs come from the model folder, merged at serve time',
        'rtx-vsr is NVIDIA-SDK-only: the arm is compose-truth, execution needs the RTX stack',
    )
    models = (SeedVr2Ema,)

    # Extension capabilities (Cordis card 5, 2026-09-07): the card
    # owns the renderer module — the submittable SeedVR2 lane plus
    # the registered rtx_vsr/concat fragments — so all three packs
    # gate here, card-level. All installed on the estate server.
    requires = ("ComfyUI-SeedVR2_VideoUpscaler", "ComfyUI-KJNodes",
                "comfyui_nvidia_rtx_nodes")

    # ── the surface (the boarded family's vocab) ────────────────────────
    input_image              = Image(label='Input image',
        group='input',
        order=0,
        width=1,
        required=True,
        tooltip='The frame to restore. Absolute mount path.')
    resolution = Number(label='Target short side', group='target', order=0, width=1, columns=2, min=256, max=2160, step=2, tooltip='1080 = FHD rail. SeedVR2 redraws detail at this size.', default=None)
    max_resolution = Number(label='Max resolution', group='target', order=1, width=1, columns=2, min=512, max=4096, step=64, tooltip='The hard ceiling — inputs already past it pass through.', default=None)
    batch_size = Number(label='Batch size', group='run', order=0, width=1, min=1, max=16, step=1, tooltip='Video frames ride batches; images are batch 1.', default=None)
    seed                     = Seed(label='Seed',
        group='run',
        order=1,
        width=1,
        default=-1)
    # NO filename_prefix (2026-09-06 standard-fields sweep): the run
    # routes outputs by run id (compose stamps `<run>/gen`) — a user
    # knob here was silently overwritten, a dead promise. Internal
    # default lives in the renderer; the schema still admits the key
    # so old drafts parse.
