# music — the audio_cpp music card (a basic, compliance card).
# One card, three boarded families: ACE-Step 1.5 XL (the flagship),
# ACE-Step 1.5 SFT (the finetune), MiniMax Music 3 / txt2music (the
# canonical example). The card surface is the interface; the
# models are the data (PYTHON SHAPE rung 8 — action cards render,
# models ship data).
#
# This is a BASIC card: prompt + duration + seed + the family knob
# the renderer reads as data. The audio_cpp binding layer is
# upstream (per docs/research/trellis2-native-method-case-study.md
# §"audio.cpp node design, verified 2026-09-03": Delusion's
# task.py + runtime.py is the binding; we ship the card surface and
# let the lane's compose arm call audiocpp_cli with the per-family
# model name from lane_inputs).

import os

from melite_cards import ActionCard, Select, Textarea, Slider, Seed
from melite_cards import OutputRow
from melite_models import load_model_py

_HERE = os.path.dirname(os.path.abspath(__file__))
_MODELS_ROOT = os.path.normpath(os.path.join(
    _HERE, "..", "..", "..", "..", "models"))

# the boarded families — the models ARE the truth this card serves
AceStepXL = load_model_py(
    os.path.join(_MODELS_ROOT, "audio", "ace-step-xl", "model.py"),
    "audio_cpp")
AceStepSFT = load_model_py(
    os.path.join(_MODELS_ROOT, "audio", "ace-step-sft", "model.py"),
    "audio_cpp")
Txt2Music = load_model_py(
    os.path.join(_MODELS_ROOT, "audio", "txt2music", "model.py"),
    "audio_cpp")


class MusicCard(ActionCard):
    id = 'music-native'

    # OUTPUT CONTRACT: what a completed run DELIVERS (the gateway's
    # completion gate refuses a run matching none of the rows).
    card_outputs = (
        OutputRow(patterns=('.wav',), label='Generated audio'),
    )
    # the universal sidebar declaration (source declares — /v1/forms derives).
    sidebar_order = 23
    sidebar = 'audio'
    default_service = 'ace-step-xl'
    label = 'Music (audio_cpp)'
    description = ('audio.cpp music lane — ACE-Step 1.5 XL / SFT or '
                   'MiniMax Music 3 text-to-music (the audio_cpp '
                   'binding layer calls audiocpp_cli with the '
                   'family + model name from each model row)')
    genre = 'audio'
    icon = 'music'
    api = True
    ability = {"default_family": 'ace-step-xl'}
    principles = (
        'family + model is the audiocpp_cli invocation pair — pick by intent, not by parameter',
        'XL is the flagship (bf16, best quality); SFT is the finetune (q8, lighter VRAM); txt2music is lyrics-aware',
        'duration is the target length in seconds (default 120); sample_rate defaults to 44.1kHz',
        'prompt is the music caption (genre/era/tempos/instruments); lyrics is the lyric block (txt2music only)',
    )
    models = (AceStepXL, AceStepSFT, Txt2Music)

    # the card surface (the boarded family's vocab)
    prompt = Textarea(label='Music prompt', group='input', order=0, width=2, tooltip='Genre, era, region, 2-3 style anchors, tempo in BPM, key if known', required=True)
    lyrics = Textarea(label='Lyrics (txt2music only)', group='input', order=1, width=2, default='', tooltip='Section tags [verse] [pre-chorus] [chorus] [bridge] [outro]; txt2music honours them, ACE-Step ignores')
    duration = Slider(default=120, min=10, max=600,
                      group='target',
                      order=0,
                      step=5,
                      tooltip='Target length in seconds (audio.cpp caps at 10 minutes)')
    seed = Seed(label='Seed',
                group='run',
                order=0,
                default=-1)
    backend = Select(label='Backend',
                    group='run',
                    order=1,
                    default='cuda',
                    options=['cuda', 'cpu'],
                    tooltip='cuda = GPU; cpu = GGUF CPU path (CUDA absent)')
    family = Select(label='Family',
                    group='run',
                    order=2,
                    default='ace-step-xl',
                    options=['ace-step-xl', 'ace-step-sft', 'minimax'],
                    tooltip='audio_cpp family — the renderer reads lane_inputs.family from the picked model row')
