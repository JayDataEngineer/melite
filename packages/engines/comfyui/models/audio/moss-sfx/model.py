# moss-sfx — MOSS-SFX v2 family head, comfyui lane (A-cluster:
# melite-sfx-nodes). Sound effects via the AudiocoreTTS node,
# family moss_sfx_v2, task gen — the diffusion params ride the
# node's optional inputs.

from melite_models import  KnobRow,Model, Cell, Genre, LaneInputs, Quant, Variant


class MossSfx(Model):
    id = 'moss-sfx'
    engine = 'comfyui'
    genre = Genre.AUDIO
    label = 'MOSS-SFX v2'
    description = 'MOSS-SFX v2 sound-effect generation — describe the SOUND not the scene'
    form = 'form_sound'
    card = 'sfx'             # the owning card (cross-validation hook)
    lane_inputs = LaneInputs(
        family='moss_sfx_v2',
        model_path='MOSS-SoundEffect-v2.0-src')
    # the CASCADE GATE (image-edit rework 2026-09-05) — this lane's
    # weight load is NOT a ComfyUI UNETLoader quant tier (audiocore
    # pack / native cpp / card-owned weightless flow / sam-or-npz
    # checkpoint). The cell ships NATIVE — the lane runs its single
    # native form; the lane's own engine owns whatever tier switching
    # the load has (NATIVE is the honest tier for "no UNETLoader
    # matrix").
    variants = (
        Variant(id='standard', label='Standard', route='moss-sfx', cells=(
            Cell(quant=Quant.NATIVE, label='Native', route='moss-sfx'),
        )),
    )

    # the sfx card surface (row 3, 2026-09-06 — sixth card in the
    # KnobRow migration). Five rows, card vocabulary (the node
    # spells them num_inference_steps/duration_seconds — the
    # renderer call site translates).
    card_knobs = (
        KnobRow(card='prompt', inject='AudiocoreTTS.0.prompt', kind='s'),
        KnobRow(card='guidance_scale', inject='AudiocoreTTS.0.guidance_scale', kind='n'),
        KnobRow(card='n_diffusion_steps', inject='AudiocoreTTS.0.num_inference_steps', kind='n'),
        KnobRow(card='duration', inject='AudiocoreTTS.0.duration_seconds', kind='n'),
        KnobRow(card='seed', inject='AudiocoreTTS.0.seed', kind='n'),
    )

