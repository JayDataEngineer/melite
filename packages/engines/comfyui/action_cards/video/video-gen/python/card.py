# video-gen — the generate_video interface card, PYTHON surface
#
# ONE CARD, ALL NON-H3 VIDEO FAMILIES (the img-gen pattern, operator
# order 2026-09-04: "the action card GROUPS and provides a SINGLE
# INTERFACE for a series of similar models"): this card boards
# wan-vace and scail2-animate at the same time — it is the
# INTERFACE; the models are the data. h3/h3-keyframe stay on THEIR
# card (h3-timeline, the studio surface); this card serves the rest.
#
# The per-family GRAPH lives in this card's renderer as one arm per
# family (each video family has a different node topology — the
# h3 consolidation proved embedding per-lane graphs in one card's
# code is the estate's shape); the per-family TEMPLATE (the
# recorded graph) lives in each model dir.
#
# Unboarded families stay OUT of models= (offered means runnable,
# 2026-09-05): ltx-2-3 and ltx-director-distilled have no card arm
# wired on this estate — phantom dropdown options are drift. They
# board (and return to the covers) the day their lanes land.

import os


from melite_cards import (ActionCard, Select, Textarea, Text,
                          Number, Slider, Seed, Image, Video, VocabRef)
from melite_cards import OutputRow
from melite_models import load_model_py

_HERE = os.path.dirname(os.path.abspath(__file__))
_MODELS_ROOT = os.path.normpath(os.path.join(
    _HERE, "..", "..", "..", "..", "models", "video"))

WanVace = load_model_py(
    os.path.join(_MODELS_ROOT, "wan-vace", "model.py"), "comfyui")
Scail2Animate = load_model_py(
    os.path.join(_MODELS_ROOT, "scail2-animate", "model.py"), "comfyui")


class VideoGenCard(ActionCard):
    id = 'video-gen'

    # OUTPUT CONTRACT: what a completed run DELIVERS (the gateway's
    # completion gate refuses a run matching none of the rows).
    card_outputs = (
        OutputRow(patterns=('.mp4', '.webm',), label='Generated video'),
    )
    # the universal sidebar declaration (source declares — /v1/forms derives).
    sidebar_order = 15
    sidebar = 'video'
    default_service = 'wan-vace'
    # stage-row id the compose emits (retired skeleton= verbatim)
    skeleton = "generate"
    label = 'Video'
    description = ('Text/reference-to-video — the generate_video interface '
                   'card boarding wan-vace and scail2-animate; one surface, '
                   'one arm per family')
    genre = 'video'
    icon = 'video'
    api = True
    ability = {"default_family": 'wan-vace'}
    principles = (
        'prompt is required — an empty/whitespace prompt is rejected loud, never sampled with empty conditioning',
        'The reference image anchors identity/scene — prompt the MOTION, not the subject',
        'Wan frames are 4n+1 (49 ≈ 2s at 24fps); SCAIL-2 drives a character from a pose video',
        'Defaults are shape, not value: resolution/steps/cfg come from the model folder, merged at serve time',
        'A family boards only when it can feed truthfully — lane facts + the arm template, no phantom options',
    )
    models = (WanVace, Scail2Animate)   # families + mods derive (absorption)

    # Extension capabilities (Cordis card 9, 2026-09-07): the Wan
    # sampler nodes are core (comfy_extras.nodes_wan/nodes_scail)
    # but every render loads/combines video through VideoHelperSuite
    # (VHS_LoadVideoPath + VHS_VideoCombine) — card-level, both
    # families ride the shared renderer.
    requires = ("comfyui-videohelpersuite",)

    # ── the CORE surface (every boarded family) ─────────────────────────
    prompt = Textarea(label='Prompt', group='prompt', order=0, width=1, columns=2, required=True)
    negative_prompt = Textarea(label='Negative Prompt', group='prompt', order=1, width=1, default='')
    width = Number(label='Width', group='resolution', order=0, width=1, columns=3, min=320, max=1280, step=16, default=None)
    height = Number(label='Height', group='resolution', order=1, width=1, min=320, max=720, step=16, default=None)
    length = Number(label='Frames', group='resolution', order=2, width=1, columns=3, min=9, max=121, step=4, tooltip='4n+1 (Wan latent grid). 49 ≈ 2s, 81 ≈ 3.4s at 24fps.', default=None)
    fps = Number(label='FPS', group='resolution', order=3, width=1, min=8, max=30, step=1, default=None)
    seed                     = Seed(label='Seed',
        group='resolution',
        order=4,
        width=1,
        default=-1)
    steps = Number(label='Steps', group='sampling', order=0, width=1, min=1, max=50, step=1, default=None)
    cfg = Slider(label='Guidance Scale', group='sampling', order=1, width=1, min=1, max=12, step=0.1, tooltip='Lightning-distilled lanes run CFG 1 (guidance baked in).', default=None)
    sampler = Select(label='Sampler', group='sampling', order=2, width=1, options=VocabRef('$samplers'), default='')
    scheduler = Select(label='Scheduler', group='sampling', order=3, width=1, options=VocabRef('$schedulers'), default='')

    # ── family-scoped inputs (the preset precedent: fields scoped by
    # families= notch; each family sees only what its lane consumes) ────
    reference_image          = Image(label='Reference image',
        group='input',
        order=0,
        width=1,
        families=["wan-vace", "scail2-animate"],
        tooltip='The anchor frame — identity, subject, scene (wan-vace); the character to animate (scail2-animate).')
    pose_video               = Video(label='Driving video',
        group='input',
        order=1,
        width=1,
        families=["scail2-animate"],
        tooltip='The motion source — SCAIL-2 drives the reference character with this video.')
    # UI default IS the lane default (2026-09-06
    # frontend-impossible incident — same law as the music card).
    pose_strength            = Slider(label='Pose strength',
        group='sampling',
        order=2,
        width=1,
        min=0.0,
        max=2.0,
        step=0.05,
        default=1.0,
        families=["scail2-animate"],
        tooltip='How tightly SCAIL-2 follows the driving motion.')
