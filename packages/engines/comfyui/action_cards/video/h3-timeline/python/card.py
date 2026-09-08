# h3-timeline — PYTHON surface (2026-09-02, the card shape era)
#
# The parameters: block lives here, maintained by tools/gen_card_py.py
# which reads the WIRE PARSER'S output (editor_forms._parse_card_parameters)
# — zero transcription risk. Parity with the yaml-era serving is pinned
# by tests/walls/suites/test_python_cards.py against the golden form-specs.
#
# SSOT law: card.yaml keeps card:/families:/principles: (the
# identity rung folds those later); the FIELD SURFACE lives
# HERE and ONLY here — a parameters: block in card.yaml
# alongside this file is a LOUD refusal at load (two SSOTs
# is zero SSOTs).



from melite_cards import (ActionCard, Select, Textarea, Text, Number, Slider, Seed, Boolean, Image, Audio, Video, File, Loras, ControlNet, VocabRef)
from melite_cards import OutputRow


class H3TimelineCard(ActionCard):
    id = 'h3-timeline'

    # OUTPUT CONTRACT: what a completed run DELIVERS (the gateway's
    # completion gate refuses a run matching none of the rows).
    card_outputs = (
        OutputRow(patterns=('.png',), label='Timeline frames', many=True),
    )
    # the universal sidebar declaration (source declares — /v1/forms derives).
    sidebar_order = 6
    sidebar = 'video'
    default_service = 'h3-timeline'
    # stage-row id the compose emits (retired skeleton= verbatim)
    skeleton = "h3-film"
    # RENDERER VOCAB (the retired renderer's documented keys —
    # goldens + studio vocab; the contract's admission row rides the
    # decls export, the compose gate refuses everything else loud)
    admits = ('variant', 'k', 'image_name', 'noise_seed',
              'ref_image_size', 'fps_seconds',
              'ctx_*', 'sla_*', 'motion_*')
    label = 'H3 Timeline'
    description = 'THE video interface — multi-window film with SLA sparse attention, joint video+audio per window, auto-stitched into one mp4. The calls document IS the timeline.'
    genre = 'video'
    icon = 'video'
    api = True
    ability = {"default_family": 'h3-timeline'}
    requires = ('comfyui-h3-motion-context', 'ComfyUI-PlagueKind-Nodes', 'ComfyUI-Frame-Interpolation', 'ComfyUI-KJNodes', 'ComfyUI-SeedVR2_VideoUpscaler', 'ComfyUI-LTXVideo')
    principles = (
        'Describe MOTION and SOUND together — H3 generates both in one pass',
        'Draft at 768x448x56f (~2.3s); produce at 1344x768x124f (~5.2s)',
        'Length snaps to the 17k+5 frame grid at 24fps',
        'For timelines: repeat the ambient soundscape verbatim in every window; add one new layer where the story needs it',
        "Same seed across a shot's re-rolls keeps the world texture",
        'SLA at sparsity 0.90 gives ~1.75x speedup with no quality loss — use it by default',
    )
    families = ('h3-timeline', 'h3', 'h3-keyframe')

    # PRESENTATION NOTCHES (the only card that declares both deviations):
    # the timeline is the HUGE, fullscreen card and its authoring surface
    # is the interactive video_timeline body — not the fill-in form.
    size = 'huge'
    layout = 'studio'

    prompt                   = Text(label='Prompt', required=True, placeholder='the courier pushes off and rolls forward through the lantern glow; rain hisses on the stall awnings, a vendor calls out', tooltip='Verb-first motion + the sounds. For keyframes the image already sets the scene — prompt what CHANGES.')
    image = Text(label='First frame (keyframe lanes)', tooltip='Absolute path to the PNG the video must start on (h3-keyframe). Optional for h3/h3-timeline.', default=None)
    # NO ref_image (2026-09-07 defaults blanket): a dead promise —
    # the schema is extra=forbid with no such row and compose
    # never reads it. The Ref2VA lock rides the wired guide
    # image, not a card knob.
    seed                     = Seed(label='Seed', default=42, tooltip='Same seed across re-rolls = same world texture')
    width                    = Number(label='Width', min=448, max=1344, step=64, default=1344)
    height                   = Number(label='Height', min=448, max=768, step=64, default=768)
    length                   = Number(label='Frames', min=21, max=362, step=5, default=56, tooltip='17k+5 grid at 24fps: 56 = 2.33s, 124 = 5.17s, 362 = 15s')
    steps                    = Number(label='Steps', min=4, max=30, default=12, tooltip='12 for draft; 30 standard; 10 with the turbo LoRA')
    sharpen_enabled          = Boolean(label='FSR Sharpening', default=False, tooltip='Apply AMD FidelityFX RCAS sharpening to the final output. Strength 0.3 looks natural.')
    sharpen_strength         = Number(label='Sharpen Strength', min=0, max=1, step=0.05, default=0.3, tooltip='RCAS sharpening intensity. 0.3 = natural; 0.5 = crisp; 0.0 = off.')
    interpolate_enabled      = Boolean(label='FILM Interpolation', default='false', tooltip='Apply FILM (Feature-aware Interpolation for Large Motion) frame interpolation to double the frame rate. Doubles render time.')
    shift_video              = Number(label='Video Shift', min=1, max=20, step=0.5, default=8.0, tooltip='Timestep shift for video attention. Higher = more coherent motion.')
    shift_audio              = Number(label='Audio Shift', min=1, max=10, step=0.5, default=3.0, tooltip='Timestep shift for audio attention. Lower = more detailed sound.')
