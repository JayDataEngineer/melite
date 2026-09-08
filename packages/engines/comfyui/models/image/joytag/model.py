# joytag — the tagger card's second family (tagger-card stroke, 2026-09-06).
# JoyTag (fancyfeast) booru tagger via StartHua's Comfyui_joytag pack
# (CXH_JoyTag node): threshold + add/remove tag lists, dual STRING+INT
# output (tags, count) — the arm wires tags[0] into the shared SaveText.
#
# SSOT law: this file REPLACES model.yaml + variants/. A
# model.yaml reappearing next to it is a LOUD refusal.
#
# The lane has no ComfyUI loader weights: the node reads its checkpoint
# from its own pack dir (custom_nodes/Comfyui_joytag/checkpoints/
# model.safetensors — provisioned 2026-09-06 from
# huggingface.co/fancyfeast/joytag, 366011736 bytes, sha256
# 5304065c0e4fb26b265194fa2209b8dddfa2b9a7239397c1ae0f47649f91e293;
# the node does NOT auto-download, a missing file refuses at runtime).
# So LaneInputs() stays empty — weightless-lane precedent. The defaults
# below speak ONLY the tagger card's vocab — cross-val refuses a default
# the card never declares.

from melite_models import  KnobRow,Model, Variant, Cell, Genre, Quant


class JoyTagger(Model):
    id = 'joytag'
    genre = Genre.IMAGE
    label = 'JoyTag'
    description = ('Booru keyword tagger (JoyTag lineage) — thresholded '
                   'Danbooru tags with add/remove lists for recreation '
                   'workflows. Torch lane, node-local checkpoint.')
    engine = 'comfyui'
    card = 'tagger'
    form = 'form_tagger'
    # No lane_inputs row (the input-lane precedent): weightless lanes
    # declare none — CXH_JoyTag manages its own pack-local checkpoint.
    defaults = dict(
            threshold=0.2,
            add_tag='',
            remove_tag='',
        )
    # the CASCADE GATE — this lane ships a single torch configuration.
    variants = (
        Variant(id='standard', label='Standard', route='joytag', cells=(
            Cell(quant=Quant.F32, label='F32', route='joytag', vram_peak_gb=4.0),
        )),
    )

    # the tagger card surface for the joytag arm (row 3, 2026-09-06).
    # Inject targets name the joytag_t1 renderer's nodes — the node
    # spells it THRESHOLD/addTag/removeTag (upstream CXH_JoyTag
    # INPUT_TYPES); the card speaks threshold/add_tag/remove_tag.
    card_knobs = (
        KnobRow(card='input_image', inject='LoadImage.0.image', kind='s'),
        KnobRow(card='threshold', inject='CXH_JoyTag.0.THRESHOLD', kind='n'),
        KnobRow(card='add_tag', inject='CXH_JoyTag.0.addTag', kind='s'),
        KnobRow(card='remove_tag', inject='CXH_JoyTag.0.removeTag', kind='s'),
    )
