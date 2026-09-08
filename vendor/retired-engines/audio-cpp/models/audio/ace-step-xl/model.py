# ace-step-xl — the audio.cpp flagship (ACE-Step 1.5 XL Turbo, bf16).
# Hand-edited 2026-09-04 to match the action_cards-compliant shape
# (the other cpp/ peers — anycreature, autoremesher, kimodo — carry
# source + lane_inputs rows; audio_cpp's 10 models were skeleton
# declarations). Picks the three "most recent" upstream families
# (XL, SFT, txt2music) and equips them with the download + weight
# facts the card renderer needs.
#
# SSOT law: this file REPLACES model.yaml + variants/. A model.yaml
# reappearing next to it is a LOUD refusal.


from melite_models import Model, Variant, Cell, LoraRow, SourceRow, LaneInputs, Quant, Genre


class AceStepXL(Model):
    id = 'ace-step-xl'
    genre = Genre.AUDIO
    label = 'ACE-Step 1.5 XL Turbo'
    description = 'ACE-Step 1.5 XL turbo bf16 music generation (the audio.cpp flagship)'
    engine = 'audio_cpp'
    card = 'music-native'  # the owning card surface (cpp/audio-cpp/action_cards/audio/music)
    form = 'form_music'
    source = SourceRow(type='huggingface',
                       repo_id='audio-cpp/audio.cpp-gguf',
                       filename='ACE-Step1.5-XL-GGUF')
    # weight facts for the card renderer — the audio.cpp binary
    # takes the family + model name as a CLI pair (the binding layer
    # maps these to the underlying Hugging Face GGUF). Card renderer
    # reads them as data and splices into the audiocpp_cli invocation.
    lane_inputs = LaneInputs(
        family='ace-step',
        model_path='ACE-Step-1.5-XL-Turbo-bf16',
    )

    defaults = dict(backend='cuda', duration=120, sample_rate=44100)
    # the CASCADE GATE (image-edit rework 2026-09-05) — the lane is
    # single-config (audiocore / native cpp / weightless tool). The
    # cell ships NATIVE; the engine owns whatever load it has.
    variants = (
        Variant(id='standard', label='Standard', route='ace-step-xl', cells=(
            Cell(quant=Quant.NATIVE, label='Native', route='ace-step-xl'),
        )),
    )

