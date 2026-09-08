# fit — the prop-fitting family (fit-card stroke 2b, 2026-09-06).
#
# Seats a static prop (hat / sword / coat) onto a SOMAX body GLB via the
# FitProp node (melite-poser-nodes): the three meld fit laws (socket / fit
# / grip) as bytes-in / bytes-out GLB surgery, then the 8-view turnaround
# as proof. The lane is WEIGHTLESS (pure numpy placement math — no
# checkpoint, no UNETLoader matrix): LaneInputs rides bare and the cell
# ships NATIVE, the transfer_rig precedent for a native-only lane.
#
# SSOT law: this file REPLACES model.yaml + variants/. A model.yaml
# reappearing next to it is a LOUD refusal.


from melite_models import  KnobRow,Model, Variant, Cell, LoraRow, LaneInputs, Genre, Quant


class Fit(Model):
    id = 'fit'
    genre = Genre.THREED
    label = 'Fit'
    description = 'Seat a static prop onto a SOMAX body (socket/fit/grip placement laws) and render the proof turnaround.'
    engine = 'comfyui'
    card = 'fit'
    # the editor form this family boards (slot bindings derive from
    # the card class at scan time — form_slots[form_3d_fit] carries
    # body_glb + prop_glb with no registry edit).
    form = 'form_3d_fit'
    # WEIGHTLESS (see header): the solver measures bone spans, never
    # loads weights — the grammar's weightless shape (2026-09-06).
    lane_inputs = LaneInputs(weightless=True)
    variants = (
        Variant(id='standard', label='Standard', route='fit', cells=(
            Cell(quant=Quant.NATIVE, label='Native', route='fit'),
        )),
    )

    # the fit card surface (row 3, 2026-09-06 — sixteenth card in the
    # KnobRow migration). Eighteen rows, all direct: the two GLB path
    # constants, the twelve FitRow placement inputs, the five-view
    # turnaround block. model_name is voice-derived (prop stem),
    # never wire — no row. Card vocabulary throughout.
    card_knobs = (
        KnobRow(card='body_glb', inject='PrimitiveString.0.value', kind='s'),
        KnobRow(card='prop_glb', inject='PrimitiveString.1.value', kind='s'),
        KnobRow(card='bone', inject='FitRow.0.bone', kind='s'),
        KnobRow(card='align', inject='FitRow.0.align', kind='s'),
        KnobRow(card='position', inject='FitRow.0.position', kind='s'),
        KnobRow(card='rotation', inject='FitRow.0.rotation', kind='s'),
        KnobRow(card='fit_ratio', inject='FitRow.0.fit_ratio', kind='n'),
        KnobRow(card='fit_ref_bone', inject='FitRow.0.fit_ref_bone', kind='s'),
        KnobRow(card='fit_ref_bone2', inject='FitRow.0.fit_ref_bone2', kind='s'),
        KnobRow(card='seat_ratio', inject='FitRow.0.seat_ratio', kind='n'),
        KnobRow(card='finger_bone', inject='FitRow.0.finger_bone', kind='s'),
        KnobRow(card='thumb_bone', inject='FitRow.0.thumb_bone', kind='s'),
        KnobRow(card='target_width', inject='FitRow.0.target_width', kind='n'),
        KnobRow(card='resolution', inject='RayRenderGLBViews.0.resolution', kind='n'),
        KnobRow(card='framing', inject='RayRenderGLBViews.0.framing', kind='n'),
        KnobRow(card='focal_length', inject='RayRenderGLBViews.0.focal_length', kind='n'),
        KnobRow(card='samples', inject='RayRenderGLBViews.0.samples', kind='n'),
        KnobRow(card='transparent', inject='RayRenderGLBViews.0.transparent', kind='b'),
    )
