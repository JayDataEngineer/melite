# anyCreature — weightless model row (no weights; the creature is
# COMPILED from the spec, not downloaded). PYTHON SHAPE LAW rung 8:
# models ship data, cards render. The card attribute names the
# action_cards surface. card_knobs rows are the knob SSOT (the
# music3 pattern): every card field has a row naming its inject
# target (spec field, for this engine) — LAYER AUDIT enforces both
# directions; card_knobs.yaml is extinct tree-wide.

from melite_models import  KnobRow,Model, Variant, Cell, Quant, Genre


class AnyCreature(Model):
    id = 'anycreature'
    genre = Genre.THREED
    label = 'anyCreature'
    description = 'Text → game-ready 3D creature (JSON spec → skinned GLB)'
    engine = 'anycreature'
    card = 'forge'
    form = 'form_forge'
    defaults = dict(smooth_angle=50, build='default', ao=True, role='npc')
    # the CASCADE GATE (image-edit rework 2026-09-05) — the lane is
    # single-config (audiocore / native cpp / weightless tool). The
    # cell ships NATIVE; the engine owns whatever load it has.
    variants = (
        Variant(id='standard', label='Standard', route='anycreature', cells=(
            Cell(quant=Quant.NATIVE, label='Native', route='anycreature'),
        )),
    )

    card_knobs = (
        KnobRow(card='spec', inject='spec', kind='s'),
        KnobRow(card='smooth_angle', inject='spec.smooth_angle', kind='n'),
        KnobRow(card='build', inject='spec.build', kind='s'),
        KnobRow(card='ao', inject='spec.ao', kind='b'),
        KnobRow(card='role', inject='spec.role', kind='s'),
        KnobRow(card='shading', inject='spec.shading', kind='s'),
    )
