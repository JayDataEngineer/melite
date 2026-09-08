# skintensors — the weightless TOOL row (the weights are a runtime
# unit, not a catalog cell: the F16 GGUF bundle lives under
# data/runtime/skintokens/models/, machine state like every comfy
# weight — "weights NEVER move"). Genre 3d (a rigged GLB IS a 3d
# asset). The card attribute names the action_cards surface.

from melite_models import  KnobRow,Model, Variant, Cell, Quant, Genre


class SkinTokens(Model):
    id = 'skintokens'
    genre = Genre.THREED
    label = 'SkinTokens'
    description = ('Static mesh GLB → generated skeleton + learned '
                   'skin weights → rigged GLB (TokenRig on GGML, CPU)')
    engine = 'skintokens'
    card = 'auto-rig'
    form = 'form_auto_rig'
    defaults = dict(device='cpu', postprocess=False)
    # the CASCADE GATE — single-config native tool row (the
    # autoremesher precedent): the engine owns whatever load it has.
    variants = (
        Variant(id='standard', label='Standard', route='skintokens', cells=(
            Cell(quant=Quant.NATIVE, label='Native', route='skintokens'),
        )),
    )

    # the knob SSOT (LAYER AUDIT enforces both directions): inject
    # targets are the CLI surface the card's renderer.py owns —
    # live-probed from skintokens-cli's own usage text (2026-09-06),
    # never README memory:
    #   rig MODEL_DIR MESH.{glb,t2mesh} OUTPUT.glb
    #       [--device auto|cpu|vulkan] [--postprocess]
    card_knobs = (
        KnobRow(card='input', inject='cli:positional:mesh', kind='s'),
        KnobRow(card='device', inject='cli:--device', kind='s'),
        KnobRow(card='postprocess', inject='cli:--postprocess', kind='b'),
    )
