# autoremesher — the quad-remesh family, ComfyUI side (2026-09-07).
#
# ONE-IMPLEMENTATION RULE (the kimodo precedent, commit 36061914):
# the cpp autoremesher lane retired the day its node wrap won — the
# melite-autoremesher-nodes pack (AutoRemesher: AI triangle soup →
# clean quad topology) IS the lane now. This row boards the
# quad-remesh card's render; the node's AutoRemesher binary
# requirement is a Law-0 SYSTEM REQUIREMENT (see nodes.yaml), never
# a weight file.
#
# lane_inputs is weightless (the fit/skin shape, NOT the
# transfer_rig family+model_path shape): the lane loads NO ComfyUI
# weights — the remesh binary resolves engine-side (AUTOREMESHER_BIN
# or the references/autoremesher build). family= REFUSES without
# model_path=, and naming the binary path there would teach
# machine-state-as-declaration (the binary is install state, not a
# weight coordinate the compose routes through model_paths).
#
# PYTHON SHAPE LAW rung 8: models ship data, cards render. card_knobs
# rows are the knob SSOT (the music3 pattern): every card field has
# a row naming its inject target. Seven rows for the seven card
# fields: six splice into AutoRemesher.0's inputs (the preset rides
# as the compose literal "", never a knob — the card has no preset
# field; filename_prefix is compose-stamped per run, never a field);
# smooth_normal is the EMPTY-inject compile row (the skin kind
# precedent): the node hardcodes --smooth-normal 0.0 (nodes.py),
# so a non-zero card value can never take effect — the TS compose
# refuses it LOUD, by name, and the row exists so the both-directions
# knob audit stays whole.


from melite_models import  KnobRow,Model, Variant, Cell, LaneInputs, Genre, Quant


class AutoRemesher(Model):
    id = 'autoremesher'
    genre = Genre.THREED
    label = 'AutoRemesher'
    description = 'AI triangle soup → clean quad topology (explicit budget, no silent defaults).'
    engine = 'comfyui'
    card = 'quad-remesh'
    # the lane loads no ComfyUI weights (see header: the binary is a
    # Law-0 system requirement, not a weight coordinate).
    lane_inputs = LaneInputs(weightless=True)
    # the CASCADE GATE (image-edit rework 2026-09-05) — the lane is
    # single-config (audiocore / native cpp / weightless tool). The
    # cell ships NATIVE; the engine owns whatever load it has.
    variants = (
        Variant(id='standard', label='Standard', route='autoremesher', cells=(
            Cell(quant=Quant.NATIVE, label='Native', route='autoremesher'),
        )),
    )

    # the quad-remesh card surface (row 1, 2026-09-07) — six splice
    # rows (card field → AutoRemesher.0 input) + the smooth_normal
    # compile row (empty inject: compose-time refusal gate, never a
    # node pin — the node hardcodes --smooth-normal 0.0).
    card_knobs = (
        KnobRow(card='input', inject='AutoRemesher.0.glb_path', kind='s'),
        KnobRow(card='target_quads', inject='AutoRemesher.0.target_quads', kind='n'),
        KnobRow(card='edge_scaling', inject='AutoRemesher.0.edge_scaling', kind='n'),
        KnobRow(card='sharp_edge', inject='AutoRemesher.0.sharp_edge', kind='n'),
        KnobRow(card='smooth_normal', inject='', kind='n'),
        KnobRow(card='adaptivity', inject='AutoRemesher.0.adaptivity', kind='n'),
        KnobRow(card='anisotropy', inject='AutoRemesher.0.anisotropy', kind='n'),
    )

    # Shared quad-remesh form — the card surface the editor serves.
    form = 'form_quad_remesh'
