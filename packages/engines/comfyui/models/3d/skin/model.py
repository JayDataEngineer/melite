# skin — the character-skinning family (skin-card stroke 2, 2026-09-06).
#
# Deterministic seeded detail maps (the meld skin_detail.py method, new
# seed SKIN_SEED 20260906) attached to a SOMAX body GLB as baseColor +
# muted normal (scale 0 — meld 4.38 v1.4 bump OFF; matte roughness
# 0.82), plus the kind sidecar JSON the CharacterSkinController
# schema consumes. Tint stays DATA (sidecar), never baked — the 6
# textures / infinite kinds economy survives.
#
# WEIGHTLESS (the fit precedent): pure numpy/PIL generation + bytes
# surgery, no checkpoint — the grammar's weightless shape (2026-09-06).
#
# SSOT law: this file REPLACES model.yaml + variants/. A model.yaml
# reappearing next to it is a LOUD refusal.


from melite_models import  KnobRow,Model, Variant, Cell, LaneInputs, Genre, Quant


class Skin(Model):
    id = 'skin'
    genre = Genre.THREED
    label = 'Skin'
    description = 'Deterministic skin detail maps onto a SOMAX body (albedo + normal + kind sidecar) and the proof turnaround.'
    engine = 'comfyui'
    card = 'skin'
    form = 'form_3d_skin'
    lane_inputs = LaneInputs(weightless=True)
    variants = (
        Variant(id='standard', label='Standard', route='skin', cells=(
            Cell(quant=Quant.NATIVE, label='Native', route='skin'),
        )),
    )

    # the skin card surface (row 3, 2026-09-06 — seventeenth card in
    # the KnobRow migration). Nine rows: the body path constant, the
    # SkinPack pair, the five-view turnaround block, and kind as a
    # compile row (the selector the voice compiles to sidecar JSON
    # via skin_spec — no node input). sidecar itself is
    # voice-derived, never wire — no row (fit's model_name
    # precedent). Card vocabulary throughout.
    card_knobs = (
        KnobRow(card='body_glb', inject='PrimitiveString.0.value', kind='s'),
        KnobRow(card='kind', inject='', kind='s'),
        KnobRow(card='map_size', inject='SkinPack.0.size', kind='n'),
        KnobRow(card='seed', inject='SkinPack.0.seed', kind='n'),
        KnobRow(card='resolution', inject='RayRenderGLBViews.0.resolution', kind='n'),
        KnobRow(card='framing', inject='RayRenderGLBViews.0.framing', kind='n'),
        KnobRow(card='focal_length', inject='RayRenderGLBViews.0.focal_length', kind='n'),
        KnobRow(card='samples', inject='RayRenderGLBViews.0.samples', kind='n'),
        KnobRow(card='transparent', inject='RayRenderGLBViews.0.transparent', kind='b'),
    )
