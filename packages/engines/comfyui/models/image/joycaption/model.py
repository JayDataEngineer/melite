# joycaption — the tagger card's fourth family (tagger-card stroke, 2026-09-06).
# JoyCaption beta-one captioning via fpgaminer's joycaption_comfyui pack:
# the DownloadAndLoadJoyCaptionModel loader (repo-id STRING, memory_mode
# profile, self-downloads on first run — the WD14 self-provisioning
# precedent; no estate loader row, so LaneInputs() stays empty) +
# JoyCaption (caption_type/length templates + extra options; dual output
# query STRING + caption STRING — the caption is index 1).
#
# SSOT law: this file REPLACES model.yaml + variants/. A
# model.yaml reappearing next to it is a LOUD refusal.
#
# The defaults below speak ONLY the tagger card's vocab — cross-val
# refuses a default the card never declares. memory_mode stays Default
# (renderer-fixed: 8B bf16 fits the estate 24GB card — live-fire VRAM
# evidence below; the 8/4-bit profiles are the byo escape hatch, not a
# knob). Generation params ride node defaults (renderer-pinned).

from melite_models import  KnobRow,Model, Variant, Cell, Genre, Quant


class JoyCaptioner(Model):
    id = 'joycaption'
    genre = Genre.IMAGE
    label = 'JoyCaption'
    description = ('Stylized natural-language image captioning (JoyCaption '
                   'beta-one, 8B VLM) — descriptive / SD-prompt / MJ / '
                   'booru-list templates for recreating images in '
                   'FLUX / Ideogram / image-edit.')
    engine = 'comfyui'
    card = 'tagger'
    form = 'form_tagger'
    # No lane_inputs row (the input-lane precedent): weightless lanes
    # declare none — the loader node self-provisions its checkpoint on
    # first run.
    defaults = dict(
            checkpoint='fancyfeast/llama-joycaption-beta-one-hf-llava',
            caption_type='Descriptive',
            caption_length='long',
            extra_option='',
        )
    # the CASCADE GATE — this lane ships a single configuration.
    # Live-fire VRAM evidence (2026-09-06, nvidia-smi 5s poll across the
    # arm's first queue run incl. ~16GB self-download + 8B bf16 load +
    # inference): peak 17385MB. 20GB covers larger images/longer gens.
    variants = (
        Variant(id='standard', label='Standard', route='joycaption', cells=(
            Cell(quant=Quant.F32, label='F32', route='joycaption', vram_peak_gb=20.0),
        )),
    )

    # the tagger card surface for the joycaption arm (row 3,
    # 2026-09-06) — the node spells it extra_option1 (five extras on
    # the node, the card wires the first); the card speaks
    # extra_option.
    card_knobs = (
        KnobRow(card='input_image', inject='LoadImage.0.image', kind='s'),
        KnobRow(card='checkpoint', inject='JJC_DownloadAndLoadJoyCaptionModel.0.model', kind='s'),
        KnobRow(card='caption_type', inject='JJC_JoyCaption.0.caption_type', kind='s'),
        KnobRow(card='caption_length', inject='JJC_JoyCaption.0.caption_length', kind='s'),
        KnobRow(card='extra_option', inject='JJC_JoyCaption.0.extra_option1', kind='s'),
    )
