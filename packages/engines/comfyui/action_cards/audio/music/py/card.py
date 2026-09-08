# music — the generate_music interface card, PYTHON surface
#
# ONE CARD, ALL FAMILIES: this card boards music3 (MiniMax Music 3
# on NATIVE ComfyUI core nodes — EmptyMiniMaxMusic3LatentAudio /
# MiniMaxMusic3TextEncode ride upstream core; no extension pack,
# latest-upstream integration is a pin bump). The card is the
# INTERFACE; the model is the data (PYTHON SHAPE rung 8: cards
# render, models carry data).
#
# Ported from the audio-cpp card class — then PRUNED 2026-09-05
# (mod-audit follow-up): the port carried four knobs with NO graph
# slot (negative_prompt — the negative leg is ConditioningZeroOut,
# no second encode node; language / temperature / top_p — no node
# input accepts them). Offered-but-unwirable is the image-edit
# incident class, so they were deleted, not admitted. What remains
# is exactly what the lane wires.

import os


from melite_cards import (ActionCard, Textarea, Number,
                          Slider, Seed)
from melite_cards import OutputRow
from melite_models import load_model_py

_HERE = os.path.dirname(os.path.abspath(__file__))
_MODELS_ROOT = os.path.normpath(os.path.join(
    _HERE, "..", "..", "..", "..", "models", "audio"))

# the boarded families — the models ARE the truth this card serves.
Music3 = load_model_py(os.path.join(_MODELS_ROOT, "music3", "model.py"),
                       "comfyui")


class MusicCard(ActionCard):
    id = 'music'

    # OUTPUT CONTRACT: what a completed run DELIVERS (the gateway's
    # completion gate refuses a run matching none of the rows).
    card_outputs = (
        OutputRow(patterns=('.mp3', '.flac', '.wav',), label='Generated audio'),
    )
    # the universal sidebar declaration (source declares — /v1/forms derives).
    sidebar_order = 5
    sidebar = 'audio'
    default_service = 'music3'
    # stage-row id the compose emits (retired skeleton= verbatim)
    skeleton = "music"
    label = 'Music'
    description = 'Generate music — MiniMax Music 3, structured captions (Genre + Vocal Details + Arrangement) with tagged lyrics'
    genre = 'audio'
    icon = 'music'
    api = True
    ability = {"default_family": 'music3'}
    models = (Music3,)   # families + mods derive (absorption)

    # (Cordis card 13, 2026-09-07: stock-only, verified — the
    # MiniMax nodes ride upstream core (comfy_extras.
    # nodes_minimax_music), SaveAudioAdvanced/VAEDecodeAudio are
    # core audio. No extension to declare; requires stays absent.)

    # UI defaults ARE the lane defaults (2026-09-06 frontend-impossible
    # incident: these fields carried no default, so the form seeded ""
    # and every untouched knob failed the click gate as "null but has
    # no default" while the backend row defaulted it. What the widget
    # shows untouched is what the run uses — the tooltips already
    # stated these values; now the fields declare them. Each matches
    # MusicParams' default exactly (the wall pins the equality — a
    # second SSOT would be zero SSOTs).
    prompt = Textarea(label='Tags / Description', group='prompt', order=0, columns=1, tooltip="Structured caption: Genre + Vocal Details + Arrangement. E.g. 'funk, pop, soul, guitar, 105 BPM'.", required=True)
    lyrics                   = Textarea(label='Lyrics', group='prompt', order=1, default='', tooltip='Lyrics with structure tags: [verse], [chorus], [bridge]. Empty = instrumental.')
    duration                 = Slider(label='Duration (s)', group='generation', order=0, width=1, min=5, max=360, step=1, default=30, tooltip='Target audio length in seconds (5-360).')
    guidance_scale           = Slider(label='CFG', group='generation', order=1, width=1, min=0.1, max=10, step=0.1, default=1.7, tooltip='Classifier-free guidance (KSampler cfg). 1.7 = lane default.')
    n_diffusion_steps        = Number(label='Diffusion Steps', group='generation', order=2, width=1, min=1, max=200, step=1, default=30, tooltip='Flow-matching denoising steps. 30 = lane default. Never 0.')
    lm_cfg_scale             = Slider(label='LM CFG', group='generation', order=3, width=1, min=0, max=10, step=0.1, default=1.7, tooltip='Lyric-encoder guidance (MiniMaxMusic3TextEncode cfg_scale). 1.7 = lane default.')
    seed                     = Seed(label='Seed', group='seed', order=0, width=1, default=-1)
