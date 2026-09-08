# qwen3-tts-voicedesign — the VoiceDesign 1.7B family head. Serves
# BOTH audio voices: the tts card (a design-mode synthesis variant)
# and the voice-lock card (exports .qvoice personas). One family,
# two cards — models=() is per-card boarding; card= names the
# cross-validation owner (voice-lock: the export view).

from melite_models import  KnobRow,Model, Cell, Genre, LaneInputs, Quant, Variant


class Qwen3TtsVoiceDesign(Model):
    id = 'qwen3-tts-voicedesign'
    engine = 'comfyui'
    genre = Genre.AUDIO
    label = 'Qwen3-TTS VoiceDesign 1.7B'
    description = 'Qwen3-TTS 12Hz VoiceDesign 1.7B — instruction-following voice design; the voice-lock lane'
    form = 'form_tts'
    card = 'voice-lock'      # the owning card (cross-validation hook)
    lane_inputs = LaneInputs(
        family='qwen3_tts',
        model_path='Qwen3-TTS-12Hz-0.6B-CustomVoice-merged')

    defaults = dict(mode='design', variant='voicedesign')
    # the CASCADE GATE (image-edit rework 2026-09-05) — this lane's
    # weight load is NOT a ComfyUI UNETLoader quant tier (audiocore
    # pack / native cpp / card-owned weightless flow / sam-or-npz
    # checkpoint). The cell ships NATIVE — the lane runs its single
    # native form; the lane's own engine owns whatever tier switching
    # the load has (NATIVE is the honest tier for "no UNETLoader
    # matrix").
    variants = (
        Variant(id='standard', label='Standard', route='qwen3-tts-voicedesign', cells=(
            Cell(quant=Quant.NATIVE, label='Native', route='qwen3-tts-voicedesign'),
        )),
    )

    # (QvoiceMod DESCOPED 2026-09-05, mod-audit follow-up: the mod's
    # order was "qvoice INPUT that triggers in qwenTTS" — a
    # CONSUMPTION surface. This family's card (voice-lock) is the
    # EXPORT view: it PRODUCES .qvoice personas; nothing in its
    # compose/renderer reads a qvoice input or PCA steering (verified
    # — the absorbed fields were dead knobs the schema rightly
    # refused, the last _NARROW dispensation). The mod rides the
    # consumption families: qwen3-tts-base, qwen3-tts — the TTS card
    # where a locked persona feeds back in.)
    # (Collision probe 2026-09-06: voice-lock + tts stay TWO cards
    # (operator ruling — shared SamplerParams base instead). A
    # save/add-qvoice mod on qwen3-tts is capability-dead: the
    # AudiocoreTTS node offers modes tts/clone/design only, no
    # export path, and its speaker_name input is unread dead code
    # (vendor melite-tts-nodes) — only VoiceStudio (this family)
    # exports personas. A union card would share five sampler knobs
    # and nothing else.)

    # the voice-lock card surface, one row per Field (row 3, 2026-09-06:
    # the second card_knobs migration after music3). Inject targets name
    # the renderer-built AudiocoreVoiceStudio inputs 1:1 (the template
    # carries the same three nodes — voicelock_t1.json). The tts
    # design-mode variant rides family routing, not card boarding, so
    # its fields stay out of these rows (card.models is the boarding
    # truth — the covers↔models pin wall owns that boundary).
    card_knobs = (
        KnobRow(card='voice_name', inject='AudiocoreVoiceStudio.0.name', kind='s'),
        KnobRow(card='style_instruction', inject='AudiocoreVoiceStudio.0.instruct', kind='s'),
        KnobRow(card='temperature', inject='AudiocoreVoiceStudio.0.temperature', kind='n'),
        KnobRow(card='top_p', inject='AudiocoreVoiceStudio.0.top_p', kind='n'),
        KnobRow(card='speed', inject='AudiocoreVoiceStudio.0.speed', kind='n'),
        KnobRow(card='repetition_penalty', inject='AudiocoreVoiceStudio.0.repetition_penalty', kind='n'),
        KnobRow(card='seed', inject='AudiocoreVoiceStudio.0.seed', kind='n'),
    )
