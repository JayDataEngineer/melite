# motion — the text→motion interface card, PYTHON surface
#
# ONE CARD, ONE FAMILY (the stopgap arc): kimodo rides OUR OWN pack
# (melite-kimodo-nodes — the ray-era hand-roll, reborn per the
# operator's stopgap order) with the poser pack's somax bake for
# character preview. The studio body (motion/motion-studio — the
# tenant) authors the interactive surface; THIS card is the wire
# contract both the studio and headless agents speak.
#
# v1 lane truth (honest edges, documented): the render_*/openpose
# knobs are the studio's CLIENT-SIDE preview bake (glbSkin.ts does
# the LBS in-browser); they ride params{} un-graphed until the
# NPZ→JOINTS bridge exists. The NPZ + somax-baked GLB are the
# server-side artifacts.

import os


from melite_cards import (ActionCard, Select, Textarea, Text,
                          Number, Slider, Seed, File)
from melite_cards import OutputRow
from melite_models import load_model_py

_HERE = os.path.dirname(os.path.abspath(__file__))
_MODELS_ROOT = os.path.normpath(os.path.join(
    _HERE, "..", "..", "..", "..", "models", "motion"))

# the boarded family — the model IS the truth this card serves.
Kimodo = load_model_py(os.path.join(_MODELS_ROOT, "kimodo", "model.py"),
                       "comfyui")


class MotionCard(ActionCard):
    id = 'motion'

    # OUTPUT CONTRACT: what a completed run DELIVERS (the gateway's
    # completion gate refuses a run matching none of the rows).
    card_outputs = (
        OutputRow(patterns=('.npz',), label='Motion clip'),
    )
    # the universal sidebar declaration (source declares — /v1/forms derives).
    sidebar_order = 9
    sidebar = 'motion'
    default_service = 'kimodo'
    # stage-row id the compose emits (retired skeleton= verbatim)
    skeleton = "motion"
    label = 'Motion'
    description = 'Text → 3D human motion (SOMA-77 pose NPZ). Chain segments, constrain joints, skin onto a rigged character GLB.'
    genre = 'motion'
    icon = 'motion'
    api = True
    ability = {"default_family": 'kimodo'}
    # the notch declaration law: kimodo claims the motion-studio body
    # (Studio tenant) — the family's card MUST declare layout=studio
    # (G-wall, 2026-09-04: the claim and the frame are one seam)
    size = 'huge'
    layout = 'studio'
    models = (Kimodo,)   # families + mods derive (absorption)
    requires = ('melite-kimodo-nodes', 'melite-poser-nodes')

    prompt = Textarea(label='Prompt', group='prompt', order=0, columns=1, tooltip='What the body DOES — verb-first, one continuous action per segment. Multi-segment: separate with | and pair with motion_prompts.', required=True)
    seed                    = Seed(label='Seed', group='prompt', order=1, width=1, default=42, tooltip='Same seed + prompt = same motion take.')

    duration_sec            = Slider(label='Duration (s)', group='generation', order=0, width=1, min=1, max=30, step=0.5, default=5, tooltip='Length of the generated motion segment.')
    diffusion_steps         = Number(label='Diffusion steps', group='generation', order=1, width=1, min=10, max=200, step=1, default=25, tooltip='More steps = smoother arcs; 25 is the calibrated default.')
    num_samples             = Number(label='Samples', group='generation', order=2, width=1, min=1, max=4, step=1, default=1, tooltip='Takes per prompt (each becomes its own NPZ).')
    num_transition_frames   = Number(label='Transition frames', group='generation', order=3, width=1, min=0, max=60, step=1, default=10, tooltip='Blend frames when chaining onto a previous motion (motion_npz).')

    cfg_type                = Select(label='CFG mode', group='guidance', order=0, width=1, default='separated', options=['separated', 'regular', 'nocfg'], tooltip='separated = independent text/action guidance (calibrated); nocfg = fastest.')
    cfg_weight_a            = Slider(label='CFG weight A', group='guidance', order=1, width=1, min=0, max=15, step=0.5, default=2.5, tooltip='Text guidance weight (separated mode).')
    cfg_weight_b            = Slider(label='CFG weight B', group='guidance', order=2, width=1, min=0, max=15, step=0.5, default=5, tooltip='Action guidance weight (separated mode).')

    motion_npz = Text(label='Chain from NPZ', group='chain', order=0, tooltip='Previous motion NPZ to continue — the new prompt takes over after num_transition_frames of blend.', default='')
    motion_prompts = Textarea(label='Multi-segment prompts', group='chain', order=1, tooltip='Segment prompts joined with | — one motion per segment, auto-chained in order.', default='')
    motion_constraints = Textarea(label='Joint constraints', group='chain', order=2, tooltip='Pin joints (e.g. left_foot:ground) — JSON or key:value lines, applied per segment.', default='')

    preview_glb             = File(label='Preview character GLB', group='output', order=0, tooltip='SOMAX-rigged character GLB — the motion is skinned onto it (somax bake) as an animated GLB artifact.')
