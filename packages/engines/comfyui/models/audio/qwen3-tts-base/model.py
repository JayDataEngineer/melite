# qwen3-tts — Qwen3-TTS CustomVoice 0.6B family head, comfyui lane
# (A-cluster, 2026-09-04: audio rides ComfyUI via melite-tts-nodes;
# engine retirement order). Weight facts are the LoadAudiocoreModel
# rows (family + model_path in defaults — the music3 'backend'
# precedent: non-knob facts ride defaults; the renderer reads them
# as DATA). The qvoice mod surfaces with this family (operator
# order: 'a mod for qvoice input, that triggers in qwenTTS model
# showing up').

from melite_models import  KnobRow,Model, Cell, Genre, LaneInputs, Quant, Variant
from melite_cards import QvoiceMod


class Qwen3Tts(Model):
    id = 'qwen3-tts-base'
    engine = 'comfyui'
    genre = Genre.AUDIO
    label = 'Qwen3-TTS Base 0.6B'
    description = 'Qwen3-TTS 12Hz Base 0.6B — plain text-to-speech, no persona'
    form = 'form_tts'
    card = 'tts'             # the owning card (cross-validation hook)
    lane_inputs = LaneInputs(
        family='qwen3_tts',
        model_path='qwen3-tts')

    defaults = dict(mode='tts', variant='base')
    # the CASCADE GATE (image-edit rework 2026-09-05) — this lane's
    # weight load is NOT a ComfyUI UNETLoader quant tier (audiocore
    # pack / native cpp / card-owned weightless flow / sam-or-npz
    # checkpoint). The cell ships NATIVE — the lane runs its single
    # native form; the lane's own engine owns whatever tier switching
    # the load has (NATIVE is the honest tier for "no UNETLoader
    # matrix").
    variants = (
        Variant(id='standard', label='Standard', route='qwen3-tts-base', cells=(
            Cell(quant=Quant.NATIVE, label='Native', route='qwen3-tts-base'),
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

    # the tts card surface (row 3, 2026-09-06 — same nine rows as
    # qwen3-tts: one shared tts_t1 renderer, the base variant only
    # changes the weight selection, never the graph).
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
