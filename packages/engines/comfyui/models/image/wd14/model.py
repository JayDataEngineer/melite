# wd14 — the tagger card's canary family (tagger-card stroke, 2026-09-06).
# The class IS the unit: family head → variants → quant cells;
# merged_defaults() walks the cascade.
#
# SSOT law: this file REPLACES model.yaml + variants/. A
# model.yaml reappearing next to it is a LOUD refusal.
#
# The lane has no ComfyUI loader weights: WD14Tagger manages its own
# .onnx + .csv models (auto-download from HuggingFace SmilingWolf/* on
# first run, ONNX CUDA/CPU providers) — so LaneInputs() stays empty. An
# empty row states that fact; a restated basename would be a rung-6 lie.
# The defaults below speak ONLY the tagger card's vocab — cross-val
# refuses a default the card never declares.


from melite_models import  KnobRow,Model, Variant, Cell, Genre, Quant


class Wd14Tagger(Model):
    id = 'wd14'
    genre = Genre.IMAGE
    label = 'WD14 Tagger'
    description = ('Booru keyword tagger (WaifuDiffusion v3 lineage) — comma-separated '
                   'Danbooru tags for NovelAI / Pony / Illustrious recreation. '
                   'Light ONNX lane, first run downloads weights.')
    engine = 'comfyui'
    card = 'tagger'
    form = 'form_tagger'
    # No lane_inputs row (the input-lane precedent): weightless lanes
    # declare none — WD14Tagger manages its own .onnx + .csv models.
    defaults = dict(
            checkpoint='wd-v1-4-moat-tagger-v2',
            threshold=0.35,
            character_threshold=0.85,
            exclude_tags='',
            replace_underscore=False,
            trailing_comma=False,
        )
    # the CASCADE GATE — this lane ships a single ONNX configuration.
    # The cell states the TRUE tier the node reads (no tier switch today).
    variants = (
        Variant(id='standard', label='Standard', route='wd14', cells=(
            Cell(quant=Quant.F32, label='F32', route='wd14', vram_peak_gb=4.0),
        )),
    )

    # the tagger card surface for the wd14 arm (row 3, 2026-09-06 —
    # fourth card in the KnobRow migration, first multi-arm one).
    # Inject targets name the wd14_t1 renderer's nodes (LoadImage +
    # WD14Tagger|pysssss, single instances so .0 throughout). Only
    # the arm's wired subset owns rows — JoyCaption/Florence/JoyTag
    # knobs never touch this graph (the phase-1 pool records what
    # the ARM reads, never the union).
    card_knobs = (
        KnobRow(card='input_image', inject='LoadImage.0.image', kind='s'),
        KnobRow(card='checkpoint', inject='WD14Tagger|pysssss.0.model', kind='s'),
        KnobRow(card='threshold', inject='WD14Tagger|pysssss.0.threshold', kind='n'),
        KnobRow(card='character_threshold', inject='WD14Tagger|pysssss.0.character_threshold', kind='n'),
        KnobRow(card='exclude_tags', inject='WD14Tagger|pysssss.0.exclude_tags', kind='s'),
        KnobRow(card='replace_underscore', inject='WD14Tagger|pysssss.0.replace_underscore', kind='b'),
        KnobRow(card='trailing_comma', inject='WD14Tagger|pysssss.0.trailing_comma', kind='b'),
    )
