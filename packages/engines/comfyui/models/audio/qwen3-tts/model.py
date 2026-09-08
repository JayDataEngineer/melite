# qwen3-tts — Qwen3-TTS CustomVoice 0.6B family head, comfyui lane
# (A-cluster, 2026-09-04: audio rides ComfyUI via melite-tts-nodes;
# engine retirement order). Weight facts are the LoadAudiocoreModel
# rows (family + model_path in defaults — the music3 'backend'
# precedent: non-knob facts ride defaults; the renderer reads them
# as DATA). The qvoice mod surfaces with this family (operator
# order: 'a mod for qvoice input, that triggers in qwenTTS model
# showing up').

from melite_models import  KnobRow,Model, Cell, LaneInputs, Quant, Variant, Genre
from melite_cards import QvoiceMod


class Qwen3Tts(Model):
    id = 'qwen3-tts'
    engine = 'comfyui'
    genre = Genre.AUDIO
    label = 'Qwen3-TTS CustomVoice 0.6B'
    description = 'Qwen3-TTS 12Hz CustomVoice 0.6B — preset personas and instruct-text emotion control'
    form = 'form_tts'
    card = 'tts'             # the owning card (cross-validation hook)
    lane_inputs = LaneInputs(
        family='qwen3_tts',
        model_path='Qwen3-TTS-12Hz-0.6B-CustomVoice-merged')

    defaults = dict(mode='tts',
                      # ROW 4 (2026-09-06): the lane's default persona —
                      # the card= conversion exposed that the arm built
                      # voice="" (absent) while the retired engine-only
                      # flow inherited this value from the template
                      # inject. The model owns its default (the
                      # renderer reads it as DATA); a stated doc voice
                      # always wins.
                      voice='vivian')
    # the CASCADE GATE (image-edit rework 2026-09-05) — this lane's
    # weight load is NOT a ComfyUI UNETLoader quant tier (audiocore
    # pack / native cpp / card-owned weightless flow / sam-or-npz
    # checkpoint). The cell ships NATIVE — the lane runs its single
    # native form; the lane's own engine owns whatever tier switching
    # the load has (NATIVE is the honest tier for "no UNETLoader
    # matrix").
    variants = (
        Variant(id='standard', label='Standard', route='qwen3-tts', cells=(
            Cell(quant=Quant.NATIVE, label='Native', route='qwen3-tts'),
        )),
    )

    mods = (QvoiceMod,)      # the .qvoice input surfaces HERE

    prompt_upscale = (
        'structure: [line, delivery, pacing]',
        'rules:',
        '- keep the spoken line intact — expand the DELIVERY, never the words',
        '- name emotion, intensity, and register (e.g. "wry, half-smiling, under the breath")',
        '- add pacing cues only when they change the read (beat before the last clause)',
        '- punctuation is the performer: ellipsis for hang, em dash for cut',
        '- one emotional arc per line',
        'a line that shifts emotion splits in two',
    )

    # the tts card surface (row 3, 2026-09-06 — fifth card in the
    # KnobRow migration). Nine rows: the five card Fields PLUS the
    # four schema-admitted API knobs (qvoice/voice_pca_strengths/
    # top_p/speed ride bare/API bodies, never the form — the surface
    # is the wire, not the widget list). Inject targets name the
    # tts_t1 renderer's AudiocoreTTS inputs (the model-dir template
    # is an existence gate only — it predates instruct/voice_file).
    card_knobs = (
        KnobRow(card='text', inject='AudiocoreTTS.0.prompt', kind='s'),
        KnobRow(card='voice', inject='AudiocoreTTS.0.voice', kind='s'),
        KnobRow(card='style_instruction', inject='AudiocoreTTS.0.instruct', kind='s'),
        KnobRow(card='qvoice', inject='AudiocoreTTS.0.voice_file', kind='s'),
        KnobRow(card='voice_pca_strengths', inject='AudiocoreTTS.0.voice_pca_strengths', kind='s'),
        KnobRow(card='temperature', inject='AudiocoreTTS.0.temperature', kind='n'),
        KnobRow(card='top_p', inject='AudiocoreTTS.0.top_p', kind='n'),
        KnobRow(card='speed', inject='AudiocoreTTS.0.speed', kind='n'),
        KnobRow(card='seed', inject='AudiocoreTTS.0.seed', kind='n'),
    )
