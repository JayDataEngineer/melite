# kimodo — the motion lane's family head. The ray-era kimodo motion
# (text → SOMA-77 pose NPZ) reborn as a STOPGAP on our own pack
# (operator order, 2026-09-04: "kimido (motion/pose) and anny — these
# can be stopgaps") while the upstream estimator lane is evaluated.
#
# The class IS the unit (PYTHON SHAPE LAW); parity pinned by
# tests/walls/suites/test_python_models.py + the http goldens. SSOT law: this file
# REPLACES model.yaml + variants/.
#
# Lane truth (live-probed 2026-09-04, melite-kimodo-nodes on the
# managed ComfyUI): KimodoLoader(model_name) → KimodoTextToPose
# (prompt/seed + diffusion/chain knobs) → NPZ in the output dir
# (ui.three_model). preview_glb chains RaySomaxBake (melite-poser
# — the ANNY stopgap pack) to skin the motion onto a SOMAX-rigged
# character GLB. The render_*/openpose knobs are the studio body's
# client-side preview concerns (lib/glbSkin.ts bakes in-browser);
# they return server-side when the JOINTS bridge exists.


from melite_models import (
    KnobRow,Model, Cell, Genre, LaneInputs, Provision,
                           Quant, SourceRow, Studio, Variant)

# The SOMA-77 template skin — the LBS bind (bind mesh + rig + weights)
# the motion viewers deform client-side (packages/web-kit/formats somaSkin.ts) and
# the SAME file transfer_rig's lane_inputs names (somaskel77/
# skin_standard.npz — one download place, two consumers). PUBLIC
# upstream asset (nv-tlabs/kimodo ships it in-repo; the HF weight
# repos carry only diffusion weights + stats). Declared, not
# committed: the provision walk downloads it on demand and the
# provision door (/v1/models/kimodo/provisions/<name>) streams it —
# the viewer NEVER points at a vite-public blob again (the
# /editor/soma-skin-standard.npz 404 class, 2026-09-06).
_SOMA_SKIN = Provision(
    name='skin_standard.npz',
    url='https://raw.githubusercontent.com/nv-tlabs/kimodo/main/'
        'kimodo/assets/skeletons/somaskel77/skin_standard.npz',
    folder='somaskel77',
    sha256='90ee2cdf50f168382a7dd7e9c88b118298aba0aca4b72022080c89c4bab0ceb2',
    size_bytes=531434,
)


class Kimodo(Model):
    id = 'kimodo'
    genre = Genre.MOTION
    label = 'Kimodo (text → motion)'
    description = 'Kinematic motion diffusion (NVIDIA Kimodo-SOMA): text → SOMA-77 pose NPZ, chainable, skinnable onto rigged GLBs.'
    engine = 'comfyui'
    card = 'motion'
    form = 'form_motion_kimodo'
    source = SourceRow(repo_id='nvidia/Kimodo-SOMA-RP-v1.1')
    # The studio-body claim (the G-wall seam: every ui/studio body is
    # claimed by exactly one family). The motion-studio body owns the
    # client-side preview (lib/glbSkin.ts bakes in-browser); the pose
    # NPZ lane itself submits through the motion card — owns_params
    # stays False (the body previews, the card composes).
    studio = Studio(tenant='motion/motion-studio')
    # The custom-loader source shape (the audiocore precedent): the
    # pack's own loader node resolves the checkpoint (CHECKPOINT_DIR
    # on the deployment points at the weights volume) — no unet/vae/
    # checkpoint combo rows, the loader facts are absent by truth.
    lane_inputs = LaneInputs(
        family='kimodo',
        model_path='Kimodo-SOMA-RP-v1.1',
    )
    # the declared viewer template (see _SOMA_SKIN above) — the
    # provision walk downloads it (setup/provisioning) and the
    # provision door streams or fetches it ON DEMAND
    provisions = (_SOMA_SKIN,)
    defaults = dict(
            cfg_type='separated',
            cfg_weight_a=2.5,
            cfg_weight_b=5.0,
            duration_sec=5.0,
            diffusion_steps=25,
            num_samples=1,
            num_transition_frames=10,
            seed=42,
        )
    # the CASCADE GATE (image-edit rework 2026-09-05) — this lane's
    # weight load is NOT a ComfyUI UNETLoader quant tier (audiocore
    # pack / native cpp / card-owned weightless flow / sam-or-npz
    # checkpoint). The cell ships NATIVE — the lane runs its single
    # native form; the lane's own engine owns whatever tier switching
    # the load has (NATIVE is the honest tier for "no UNETLoader
    # matrix").
    variants = (
        Variant(id='standard', label='Standard', route='kimodo', cells=(
            Cell(quant=Quant.NATIVE, label='Native', route='kimodo'),
        )),
    )

    # the motion card surface (row 3, 2026-09-06 — fourteenth card in
    # the KnobRow migration). Thirteen rows: nine direct injects onto
    # the always-built KimodoTextToPose node plus four config-gated
    # rows (the chain trio are conditional INPUTS on the built node;
    # preview_glb's bake node builds only when set). fps is a
    # lane-internal doc default (not wire) — no row. Card vocabulary
    # throughout.
    card_knobs = (
        KnobRow(card='prompt', inject='KimodoTextToPose.0.prompt', kind='s'),
        KnobRow(card='seed', inject='KimodoTextToPose.0.seed', kind='n'),
        KnobRow(card='duration_sec', inject='KimodoTextToPose.0.duration_sec', kind='n'),
        KnobRow(card='diffusion_steps', inject='KimodoTextToPose.0.diffusion_steps', kind='n'),
        KnobRow(card='num_samples', inject='KimodoTextToPose.0.num_samples', kind='n'),
        KnobRow(card='num_transition_frames', inject='KimodoTextToPose.0.num_transition_frames', kind='n'),
        KnobRow(card='cfg_type', inject='KimodoTextToPose.0.cfg_type', kind='s'),
        KnobRow(card='cfg_weight_a', inject='KimodoTextToPose.0.cfg_weight_a', kind='n'),
        KnobRow(card='cfg_weight_b', inject='KimodoTextToPose.0.cfg_weight_b', kind='n'),
        KnobRow(card='motion_npz', inject='', kind='s'),
        KnobRow(card='motion_prompts', inject='', kind='s'),
        KnobRow(card='motion_constraints', inject='', kind='s'),
        KnobRow(card='preview_glb', inject='', kind='s'),
    )

