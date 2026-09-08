# tts — the speak_text interface card, PYTHON surface
#
# ONE CARD, ALL FAMILIES: the CustomVoice 0.6B (default) and Base
# 0.6B variants board here; the VoiceDesign 1.7B lane belongs to
# voice-lock (its export view — the cross-validation hook is
# single-owner: a model claims the ONE card that owns it). The
# card is the INTERFACE; the models are the data (PYTHON SHAPE
# rung 8: cards render, models carry data).
#
# Ported 1:1 from the audio-cpp card class (the field surface is
# the wire contract — pinned by the form-spec goldens).

import os


from melite_cards import (ActionCard, Select, Textarea, Slider, Seed)
from melite_cards import OutputRow
from melite_models import load_model_py

_HERE = os.path.dirname(os.path.abspath(__file__))
_MODELS_ROOT = os.path.normpath(os.path.join(
    _HERE, "..", "..", "..", "..", "models", "audio"))

# the boarded families — the models ARE the truth this card serves
Qwen3Tts = load_model_py(os.path.join(_MODELS_ROOT, "qwen3-tts", "model.py"),
                         "comfyui")
Qwen3TtsBase = load_model_py(
    os.path.join(_MODELS_ROOT, "qwen3-tts-base", "model.py"), "comfyui")


class TtsCard(ActionCard):
    id = 'tts'

    # OUTPUT CONTRACT: what a completed run DELIVERS (the gateway's
    # completion gate refuses a run matching none of the rows).
    card_outputs = (
        OutputRow(patterns=('.flac', '.mp3', '.wav',), label='Spoken audio'),
    )
    # the universal sidebar declaration (source declares — /v1/forms derives).
    sidebar_order = 3
    sidebar = 'audio'
    default_service = 'qwen3-tts'
    # stage-row id the compose emits (retired skeleton= verbatim)
    skeleton = "tts"
    label = 'TTS'
    description = 'Text-to-speech — Qwen3-TTS with CustomVoice personas and instruct-text emotion control'
    genre = 'audio'
    icon = 'microphone'
    api = True
    ability = {"default_family": 'qwen3-tts'}
    principles = (
        'text is required — empty text fails',
        'Use Voice Embedding (.qvoice) for consistent character voices',
        'Style Instruction controls emotion and delivery',
        'One line per call — serial execution for multi-line sequences',
    )
    models = (Qwen3Tts, Qwen3TtsBase)

    # Extension capabilities (Cordis card 10, 2026-09-07): both
    # families render through the authored Audiocore pack (Load +
    # TTS); SaveAudio is core.
    requires = ("melite-audio-nodes",)

    text = Textarea(label='Text', placeholder='The words to speak', tooltip='The text to synthesize', required=True)
    voice                    = Select(label='Voice', default='ryan', tooltip='Preset speaker persona (CustomVoice) or .qvoice embedding path', options=['ryan', 'serena', 'vivian', 'aiden', 'eric', 'dylan', 'sohee', 'ono_anna', 'uncle_fu'])
    style_instruction = Textarea(label='Style Instruction', tooltip="Emotion and delivery control (e.g. 'speak with warm confidence')", default='')
    temperature              = Slider(label='Temperature', min=0, max=2, step=0.05, default=0.7)
    seed                     = Seed(label='Seed', default=-1)
