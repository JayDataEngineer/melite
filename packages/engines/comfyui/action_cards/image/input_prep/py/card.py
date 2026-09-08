# input-prep — the source lane's interface card, PYTHON surface
#
# ONE CARD, ONE FAMILY: the input model (weightless — no checkpoint,
# the NATIVE quant cell). Execution rides ComfyUI CORE load/save
# nodes only (LoadImage/ImageCrop/ImageScale/SaveImage,
# LoadAudio/SaveAudio — the music3 precedent: latest-upstream core,
# no extension pack). The card is the INTERFACE; the model is the
# data (PYTHON SHAPE rung 8: cards render, models carry data).
#
# Boarded 2026-09-05 (the "input cards don't accept image files"
# incident): the lane was offered (catalog row, editor surface) but
# boarded nothing — every input run 400'd "no model unit". Offered
# means runnable.
#
# NO fill-in form: the editor's InputCardEditor is the card's
# fixed-field surface (source + the transform matrix) — the universal
# Parameters grid never authors this card. The ONE declared field
# below exists so the card has a field surface at all: the form-spec
# contract (every /v1/forms row resolves to a full spec with fields)
# and the slot vocabulary (the source IS a file slot) both read the
# class. The wire shape the editor speaks is pinned by the arm's
# schema (schema.py), not a form-spec.

import os


from melite_cards import ActionCard, File
from melite_cards import OutputRow
from melite_models import load_model_py

_HERE = os.path.dirname(os.path.abspath(__file__))
_MODELS_ROOT = os.path.normpath(os.path.join(
    _HERE, "..", "..", "..", "..", "models", "image"))

# the boarded family — the model IS the truth this card serves.
Input = load_model_py(os.path.join(_MODELS_ROOT, "input", "model.py"),
                      "comfyui")


class InputPrepCard(ActionCard):
    id = 'input-prep'

    # OUTPUT CONTRACT: what a completed run DELIVERS (the gateway's
    # completion gate refuses a run matching none of the rows).
    card_outputs = (
        OutputRow(patterns=('.png', '.jpg', '.jpeg', '.webp', '.gif', '.wav', '.mp3', '.flac',), label='Staged media artifact'),
    )
    # the universal sidebar declaration (source declares — /v1/forms derives).
    sidebar_order = 18
    # stage-row id the compose emits (retired skeleton= verbatim)
    skeleton = "input_prep"
    # contract admission (the compose surface's studio vocab —
    # golden-pinned; the gate refuses everything else loud)
    admits = (              'crop',
              'media_type',
              'scale',
              )
    sidebar = 'image'
    sidebar_hidden = True
    default_service = 'input'
    label = 'Input Prep'
    description = 'Source intake: attach an image or audio file (upload, asset drop, prior run) — staged, optionally transformed, emitted as a media artifact for downstream cards to wire.'
    genre = 'image'
    icon = 'upload'
    api = True
    ability = {"default_family": 'input'}
    # NATIVE-ONLY (no extension pack): the graph uses ComfyUI core
    # nodes exclusively — requires stays empty, the compose-time
    # gate has nothing to resolve.
    requires = ()
    principles = (
        'A source is data, not inference: the graph loads, optionally transforms, and saves — no model ever loads.',
        'Every source form the editor speaks validates at phase 1 (compile time): data: URLs, artifact URLs, input-dir names, absolute paths.',
        'Transforms ride the declared applicability matrix (image: crop+scale) — anything else refuses loudly, never silently drops.',
    )
    models = (Input,)   # families + mods derive (absorption)

    # the field surface (see the header note): the source slot the
    # editor's InputCardEditor authors — File, not Image, because the
    # lane boards image AND audio sources.
    source = File(label='Source file', group='input', order=0,
                  required=True,
                  tooltip='The file to stage — upload, asset drop, prior-run artifact, or mount path. Image or audio (video is not boarded yet).')
