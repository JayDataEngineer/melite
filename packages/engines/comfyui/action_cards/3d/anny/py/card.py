# anny — the character-assembly interface card, PYTHON surface
#
# ONE CARD, ONE FAMILY (the C2 stopgap arc): anny rides OUR OWN
# poser pack (melite-poser-nodes — the ray character studio's
# engine room). The studio body (3d/body — the tenant) authors the
# interactive surface; THIS card is the wire contract both the
# studio and headless agents speak.
#
# v1 lane truth (honest edges, documented): the identity arc
# (SMPLx estimation from a photo) is deferred — the v1 surface is
# ASSEMBLY: parts in, one character out, the turnaround sheet as
# proof. The SAM segment (source_image → hair/outfit sprites)
# feeds the estimator arc when it lands; today it is the ingest
# side standing alone.

import os


from melite_cards import (ActionCard, Select, Textarea, Text,
                          Number, Slider, Seed, File)
from melite_cards import OutputRow
from melite_models import load_model_py

_HERE = os.path.dirname(os.path.abspath(__file__))
_MODELS_ROOT = os.path.normpath(os.path.join(
    _HERE, "..", "..", "..", "..", "models", "3d"))

# the boarded family — the model IS the truth this card serves.
Anny = load_model_py(os.path.join(_MODELS_ROOT, "anny", "model.py"),
                     "comfyui")


class AnnyCard(ActionCard):
    id = 'anny'

    # OUTPUT CONTRACT: what a completed run DELIVERS (the gateway's
    # completion gate refuses a run matching none of the rows).
    card_outputs = (
        OutputRow(patterns=('.glb',), label='Rigged body mesh'),
    )
    # the universal sidebar declaration (source declares — /v1/forms derives).
    sidebar_order = 14
    sidebar = '3d'
    default_service = 'anny'
    # stage-row id the compose emits (retired skeleton= verbatim)
    skeleton = "anny"
    label = 'Anny'
    description = 'Assemble a character — composite body/hair/outfit GLBs, render the 8-view turnaround, segment a source photo into part sprites.'
    genre = '3d'
    icon = 'person'
    api = True
    ability = {"default_family": 'anny'}
    models = (Anny,)   # families + mods derive (absorption)
    requires = ('melite-poser-nodes',)
    # Presentation notch: the anny family binds the 3d/anny studio tenant
    # (the shared Stage viewport) — this card routes to that interactive
    # body, never the schema form.
    layout = 'studio'

    body_glb               = File(label='Body GLB', group='parts', order=0, columns=1, required=False, tooltip='The base body — empty autoloads the Model-declared neutral body (anny-base-body.glb, provisioned); or attach a rigged/static character GLB. (Photo→body estimation is the pilot arc; clothing composite moves to its own card later.)')

    source_image           = File(label='Source photo', group='ingest', order=0, tooltip='Character photo — SAM segments hair/outfit sprites (feeds the estimator arc).')

    resolution             = Slider(label='View resolution', group='turnaround', order=0, width=1, min=256, max=2048, step=64, default=768, tooltip='Pixel size of each turnaround view.')
    framing                = Slider(label='Framing', group='turnaround', order=1, width=1, min=1.0, max=3.0, step=0.05, default=1.2, tooltip='Camera distance factor — larger frames the whole body looser.')
    focal_length           = Slider(label='Focal length (mm)', group='turnaround', order=2, width=1, min=10, max=400, step=1, default=50, tooltip='Lens focal length — lower = wider perspective.')
    samples                = Number(label='Samples', group='turnaround', order=3, width=1, min=1, max=4096, step=1, default=64, tooltip='Render samples per view — more = cleaner but slower.')
    transparent            = Select(label='Background', group='turnaround', order=4, width=1, default='true', options=['true', 'false'], tooltip='Transparent turnaround background (for compositing into sheets).')
