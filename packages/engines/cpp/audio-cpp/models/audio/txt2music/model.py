# txt2music — the MiniMax Music 3 (txt2music) lane on audio.cpp.
# Hand-edited 2026-09-04 to match the action_cards-compliant shape;
# the canonical example of the three "most recent" upstream
# families (XL, SFT, txt2music) the operator asked us to surface
# in audio_cpp. The audio.cpp binary's r0.7 ships MiniMax Music 3 as
# the t2m family (the case study cites it alongside ACE-Step 1.5
# XL as the music lane's leading edge).
#
# SSOT law: this file REPLACES model.yaml + variants/. A model.yaml
# reappearing next to it is a LOUD refusal.


from melite_models import Model, Variant, Cell, LoraRow, SourceRow, LaneInputs, Quant, Genre


class Txt2Music(Model):
    id = 'txt2music'
    genre = Genre.AUDIO
    label = 'MiniMax Music 3 (txt2music)'
    description = 'MiniMax Music 3 text-to-music with lyrics (audio.cpp t2m)'
    engine = 'audio_cpp'
    card = 'music-native'  # the owning card surface
    form = 'form_music'
    source = SourceRow(type='huggingface',
                       repo_id='audio-cpp/MiniMax-Music3-GGUF',
                       filename='MiniMax-Music3-GGUF')
    # weight facts for the card renderer — the audio.cpp t2m
    # family takes family=minimax + the GGUF model name; the
    # binding layer wires them to the audiocpp_cli invocation.
    lane_inputs = LaneInputs(
        family='minimax',
        model_path='MiniMax-Music3-GGUF',
    )

    defaults = dict(backend='cuda', duration=120, sample_rate=44100)
    # the CASCADE GATE (image-edit rework 2026-09-05) — the lane is
    # single-config (audiocore / native cpp / weightless tool). The
    # cell ships NATIVE; the engine owns whatever load it has.
    variants = (
        Variant(id='standard', label='Standard', route='txt2music', cells=(
            Cell(quant=Quant.NATIVE, label='Native', route='txt2music'),
        )),
    )

