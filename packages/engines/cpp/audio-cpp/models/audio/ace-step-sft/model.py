# ace-step-sft — the recent finetune of ACE-Step 1.5 (Q8 quant).
# Hand-edited 2026-09-04 to match the action_cards-compliant shape;
# one of the three "most recent" upstream families (XL, SFT,
# txt2music) the operator asked us to surface in audio_cpp.
#
# SSOT law: this file REPLACES model.yaml + variants/. A model.yaml
# reappearing next to it is a LOUD refusal.


from melite_models import Model, Variant, Cell, LoraRow, SourceRow, LaneInputs, Quant, Genre


class AceStepSFT(Model):
    id = 'ace-step-sft'
    genre = Genre.AUDIO
    label = 'ACE-Step 1.5 SFT (Q8)'
    description = 'ACE-Step 1.5 sft q8 music generation (the finetune)'
    engine = 'audio_cpp'
    card = 'music-native'  # the owning card surface
    form = 'form_music'
    source = SourceRow(type='huggingface',
                       repo_id='audio-cpp/audio.cpp-gguf',
                       filename='ACE-Step1.5-SFT-GGUF')
    # weight facts for the card renderer
    lane_inputs = LaneInputs(
        family='ace-step',
        model_path='ACE-Step-1.5-SFT-Q8',
    )

    defaults = dict(backend='cuda', duration=120, sample_rate=44100)
    # the CASCADE GATE (image-edit rework 2026-09-05) — the lane is
    # single-config (audiocore / native cpp / weightless tool). The
    # cell ships NATIVE; the engine owns whatever load it has.
    variants = (
        Variant(id='standard', label='Standard', route='ace-step-sft', cells=(
            Cell(quant=Quant.NATIVE, label='Native', route='ace-step-sft'),
        )),
    )

