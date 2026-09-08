# sfx — the generate_sfx interface card, PYTHON surface.
#
# MOSS-SFX v2 through melite-sfx-nodes (the AudiocoreTTS node,
# family moss_sfx_v2, task gen — its diffusion params ride the
# optional inputs). Ported 1:1 from the audio-cpp card class.

import os


from melite_cards import ActionCard, Textarea, Slider, Seed
from melite_cards import OutputRow
from melite_models import load_model_py

_HERE = os.path.dirname(os.path.abspath(__file__))
_MODELS_ROOT = os.path.normpath(os.path.join(
    _HERE, "..", "..", "..", "..", "models", "audio"))

MossSfx = load_model_py(os.path.join(_MODELS_ROOT, "moss-sfx", "model.py"),
                        "comfyui")


class SfxCard(ActionCard):
    id = 'sfx'

    # OUTPUT CONTRACT: what a completed run DELIVERS (the gateway's
    # completion gate refuses a run matching none of the rows).
    card_outputs = (
        OutputRow(patterns=('.flac', '.wav',), label='Generated sound effect'),
    )
    # the universal sidebar declaration (source declares — /v1/forms derives).
    sidebar_order = 7
    sidebar = 'audio'
    default_service = 'moss-sfx'
    # stage-row id the compose emits (retired skeleton= verbatim)
    skeleton = "sfx"
    label = 'Sound Effects'
    description = 'Generate sound effects — MOSS-SFX v2, describe the SOUND not the scene'
    genre = 'audio'
    icon = 'bolt'
    api = True
    ability = {"default_family": 'moss-sfx'}
    models = (MossSfx,)

    # Extension capabilities (Cordis card 11, 2026-09-07): renders
    # through the authored Audiocore pack; SaveAudio is core.
    requires = ("melite-audio-nodes",)

    prompt = Textarea(label='Sound Description', tooltip="Describe the SOUND itself, not the scene (e.g. 'sharp metallic clang with long decay')", required=True)
    guidance_scale           = Slider(label='CFG', min=0, max=20, step=0.1, default=5.0, tooltip='Diffusion classifier-free guidance')
    n_diffusion_steps        = Slider(label='Diffusion Steps', min=1, max=500, step=1, default=50, tooltip='More = higher quality, slower')
    duration                 = Slider(label='Duration (s)', min=0.5, max=300, step=0.5, default=10.0, tooltip='Output length in seconds')
    seed                     = Seed(label='Seed', default=-1)
