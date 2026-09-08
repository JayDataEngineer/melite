# voice-lock — the lock_voice interface card, PYTHON surface.
#
# Nearly one-to-one with the TTS card (operator brainstorm,
# 2026-09-04): same QwenTTS engine, but the OUTPUT is a .qvoice
# persona file, not audio — the AudiocoreVoiceStudio export. The
# locked persona feeds back through the tts card's qvoice mod.
#
# Ported 1:1 from the audio-cpp card class (wire contract pinned
# by the form-spec golden).

import os


from melite_cards import (ActionCard, Textarea, Text, Slider, Seed)
from melite_cards import OutputRow
from melite_models import load_model_py

_HERE = os.path.dirname(os.path.abspath(__file__))
_MODELS_ROOT = os.path.normpath(os.path.join(
    _HERE, "..", "..", "..", "..", "models", "audio"))

# the boarded family — the VoiceDesign lane (the export view)
Qwen3TtsVoiceDesign = load_model_py(
    os.path.join(_MODELS_ROOT, "qwen3-tts-voicedesign", "model.py"),
    "comfyui")


class VoiceLockCard(ActionCard):
    id = 'voice-lock'

    # OUTPUT CONTRACT: what a completed run DELIVERS (the gateway's
    # completion gate refuses a run matching none of the rows).
    card_outputs = (
        OutputRow(patterns=('.flac', '.mp3', '.wav',), label='Voice-locked audio'),
    )
    # the universal sidebar declaration (source declares — /v1/forms derives).
    sidebar_order = 4
    sidebar = 'audio'
    default_service = 'qwen3-tts-voicedesign'
    # stage-row id the compose emits (retired skeleton= verbatim)
    skeleton = "voicelock"
    label = 'Voice Lock'
    description = 'Lock a voice persona — design, export, and reuse .qvoice embeddings for consistent character voices'
    genre = 'audio'
    icon = 'fingerprint'
    api = True
    ability = {"default_family": 'qwen3-tts-voicedesign'}
    models = (Qwen3TtsVoiceDesign,)

    # Extension capabilities (Cordis card 12, 2026-09-07): the voice
    # studio node rides the authored Audiocore pack; SaveAudio core.
    requires = ("melite-audio-nodes",)

    voice_name = Text(label='Voice Name', group='voice', order=0, width=1, tooltip='Name for the locked persona — becomes the .qvoice filename stem. Reused across every future TTS render.', required=True)
    style_instruction = Textarea(label='Style Instruction', group='voice', order=1, columns=1, tooltip="The voice description — becomes the VoiceDesign prompt (e.g. 'A warm female voice with a British accent').", required=True)
    temperature              = Slider(label='Temperature', group='sampling', order=0, width=1, min=0, max=2, step=0.05, default=0.7)
    top_p                    = Slider(label='Top-P', group='sampling', order=1, width=1, min=0, max=1, step=0.01, default=0.9)
    speed                    = Slider(label='Speed', group='sampling', order=2, width=1, min=0.5, max=2, step=0.1, default=1.0)
    repetition_penalty       = Slider(label='Repetition Penalty', group='sampling', order=3, width=1, min=0.8, max=2, step=0.01, default=1.05)
    seed                     = Seed(label='Seed', group='seed', order=0, width=1, default=-1)
