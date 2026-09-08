# img-to-mesh — the 3D interface card (grouped, the img-gen
# pattern), PYTHON surface
#
# ONE CARD, THE 3D FAMILIES: trellis2-native (image → textured mesh
# on ComfyUI's NATIVE TRELLIS.2 core, no extension pack — the
# melite-trelliscpp sidecar era is retired) + transfer_rig (copy a
# rig onto a target GLB on OUR autorig pack). The card is the wire
# contract; the mesh viewers (action_cards/3d/ui — the AnimatedGLB
# viewer) are the display layer.
#
# Boarded 3d families:
# - trellis2-native: native TRELLIS.2 core (ComfyUI 0.34+) — DINOv3
#   conditioning, no extension packs.
# - pixal3d: native Pixal3D core (ComfyUI 0.34+) — DINOv3+NAF
#   pixel-aligned conditioning; MoGe camera FOV; shares TRELLIS.2's
#   sampler chain + VAEs. The pixel-aligned hero tier.
# - transfer_rig: GPU KNN weight copy (KimodoTransferWeights on OUR
#   autorig pack) — rigged GLB donor + clothed GLB target → rigged
#   target. The rig-copy lane (different inputs/outputs).
#
# Unboarded 3d families (no lane data — phantom options are drift):
# somax (SOMA rig template absent), mesh_refine (nodes absent),
# step1x_texture (no weights + CUDA ext), trellis_native (no built
# binary). They return the day their lanes are real.

import os


from melite_cards import (ActionCard, Select, Textarea, Text,
                          Number, Slider, Seed, File, VocabRef)
from melite_cards import OutputRow
from melite_models import load_model_py

_HERE = os.path.dirname(os.path.abspath(__file__))
_MODELS_ROOT = os.path.normpath(os.path.join(
    _HERE, "..", "..", "..", "..", "models", "3d"))

Trellis2Native = load_model_py(
    os.path.join(_MODELS_ROOT, "trellis2-native", "model.py"), "comfyui")
Pixal3d = load_model_py(
    os.path.join(_MODELS_ROOT, "pixal3d", "model.py"), "comfyui")
TransferRig = load_model_py(
    os.path.join(_MODELS_ROOT, "transfer_rig", "model.py"), "comfyui")


class ImgToMeshCard(ActionCard):
    id = 'img-to-mesh'

    # OUTPUT CONTRACT: what a completed run DELIVERS (the gateway's
    # completion gate refuses a run matching none of the rows).
    card_outputs = (
        OutputRow(patterns=('.glb',), label='Generated mesh'),
    )
    # the universal sidebar declaration (source declares — /v1/forms derives).
    sidebar_order = 10
    # stage-row id the compose emits (retired skeleton= verbatim)
    skeleton = "img-to-mesh"
    sidebar = '3d'
    default_service = 'trellis2-native'
    label = 'Image → 3D'
    description = 'The 3D lane — lift one image into a textured mesh (.glb) on native TRELLIS.2 (DINOv3 conditioning) or native Pixal3D (pixel-aligned + MoGe camera FOV, hero tier), or copy a rig onto a target GLB (transfer_rig); one surface, one arm per family.'
    genre = '3d'
    icon = 'box'
    api = True
    ability = {"default_family": 'trellis2-native'}
    # THREE boarded families (cluster C + cluster P, 2026-09-05):
    # trellis2-native (the lift, default), pixal3d (pixel-aligned hero
    # tier — same surface, alt conditioning), transfer_rig (rig copy,
    # separate inputs — surfaces through the same studio). The pixal3d
    # arm owns the camera_fov knob; trellis2-native ignores it.
    models = (Trellis2Native, Pixal3d, TransferRig)
    # Presentation notch: the trellis2-native family binds the
    # 3d/img_to_mesh studio tenant (the shared generic AssemblyStudio
    # — slot rail + Stage viewport), never the schema form.
    layout = 'studio'
    # Per-family backend capabilities (2026-09-06 live-fire): merged
    # with requires by the compose gate (gateway _find_card_requires
    # -> check_card_requires) and resolved LIVE against object_info.
    # Native-core capabilities, never version strings: an older core
    # refuses at the door with the need named instead of dying at
    # prompt time. The model dirs nodes.yaml stay the human-readable
    # declaration (packs + versions for the provision plane).
    requires_by_family = {
        "trellis2-native": ("comfyui-core-trellis2",),
        "pixal3d": ("comfyui-core-trellis2", "ComfyUI-MoGe"),
        "transfer_rig": ("melite-autorig-nodes",),
    }
    # per-family extension declarations also ride the model dirs'
    # nodes.yaml (trellis2-native: none — native core; transfer_rig:
    # melite-autorig-nodes). The compose gate resolves them live.

    # ── trellis2-native's input (the lift) ────────────────────────────
    # Source image — the lift families (trellis2-native + pixal3d)
    # share this slot; transfer_rig has its own GLB slots. families=
    # scopes the field so the editor hides it under transfer_rig.
    input_image        = File(label='Source image', group='input', order=0, columns=1, required=True, families=["trellis2-native", "pixal3d"], tooltip='One clear object, tight framing. Background is removed automatically (birefnet) unless bg_removal=off.')

    # ── transfer_rig's inputs (the rig copy) ──────────────────────────
    rigged_glb         = File(label='Rigged source GLB', group='input', order=0, columns=1, families=["transfer_rig"], tooltip='The SOMA-rigged clean mesh — JOINTS_0/WEIGHTS_0 + armature. The rig donor.')
    target_glb         = File(label='Target GLB', group='input', order=1, columns=1, families=["transfer_rig"], tooltip='The clothed mesh — geometry + textures, no rig. Receives the rig.')
    seed               = Seed(label='Seed', group='input', order=1, width=1, default=42, tooltip='Same seed + image = same mesh take.')

    resolution         = Select(label='Resolution', group='generation', order=0, width=1, default='1024', options=['512', '1024', '1536'], tooltip='Upsample target (official pins 1536). All tiers run the full official chain — upsample + both texture passes + remesh tail.')
    steps              = Number(label='Steps', group='generation', order=1, width=1, min=4, max=60, step=1, default=12, tooltip='STRUCTURE stage steps (the lift). Shape + texture stages ride their own knobs in the Stage section.')
    cfg                = Slider(label='CFG', group='generation', order=2, width=1, min=1, max=15, step=0.5, default=7.5, tooltip='Structure-stage guidance. 7.5 is the official template calibration (2026-09-06: the 3.0 default sampled the coarse shape at under half guidance — blobby trash out of the box). Lower runs looser.')
    bg_removal         = Select(label='Background removal', group='generation', order=3, width=1, default='auto', options=['auto', 'on', 'off'], tooltip='auto/on: birefnet cuts the background (recommended). off: feed a pre-cleaned or alpha-cut image straight to conditioning.')

    # ── pixal3d's camera FOV knob (MoGe wiring) ──────────────────────
    # 'auto' runs MoGeInference → MoGeGeometryToFOV for a per-image
    # horizontal FoV (matches upstream default of 49.13° when MoGe
    # can't resolve). A literal float (e.g. 49.13) skips MoGe and
    # uses the value directly — the operator-vouched case (calibrated
    # camera, no MoGe pass). Scoped to pixal3d via families= so
    # TRELLIS.2's fragment stays untouched (the field is pixal3d-only).
    camera_fov         = Select(label='Camera FoV', group='generation', order=4, width=1, default='auto', options=['auto', '35', '49.13', '60', '75', '90'], families=["pixal3d"], tooltip='Pixal3D only — per-image horizontal FoV feeding the camera transform matrix. auto: MoGeInference estimates from the source image (recommended); a literal degree value skips MoGe (operator-vouched camera, e.g. calibrated).')

    # ── stage tuning (the official calibrations, knobbed) ──────────────
    # The template fixes every stage except structure; these surface
    # them per lift arm (families= keeps transfer_rig's fragment
    # byte-identical — the rig-copy lane has no stages). Each group
    # renders as its own sidebar section (the Anny parts/ingest/
    # turnaround pattern: groups, not one long generation rail).
    shape_steps        = Number(label='Shape steps', group='stage', order=0, width=1, min=4, max=60, step=1, default=20, families=["trellis2-native", "pixal3d"], tooltip='Shape-stage steps. 20 is the official template calibration.')
    shape_cfg          = Slider(label='Shape CFG', group='stage', order=1, width=1, min=1, max=15, step=0.5, default=7.5, families=["trellis2-native", "pixal3d"], tooltip='Shape-stage guidance. 7.5 is the official template calibration.')
    tex1_steps         = Number(label='Texture pass 1 steps', group='stage', order=2, width=1, min=4, max=60, step=1, default=12, families=["trellis2-native", "pixal3d"], tooltip='First texture pass steps (upsampled latent, simple scheduler). 12 is the official calibration.')
    tex1_cfg           = Slider(label='Texture pass 1 CFG', group='stage', order=3, width=1, min=1, max=15, step=0.5, default=7.5, families=["trellis2-native", "pixal3d"], tooltip='First texture pass guidance. 7.5 is the official calibration.')
    tex2_steps         = Number(label='Texture pass 2 steps', group='stage', order=4, width=1, min=4, max=60, step=1, default=12, families=["trellis2-native", "pixal3d"], tooltip='Second texture pass steps (raw unet — the detail pass). 12 is the official calibration.')
    tex2_cfg           = Slider(label='Texture pass 2 CFG', group='stage', order=5, width=1, min=1, max=15, step=0.5, default=1.0, families=["trellis2-native", "pixal3d"], tooltip='Second texture pass guidance. 1.0 is the official calibration (near-verbatim detail sampling).')

    # ── mesh density ───────────────────────────────────────────────────
    remesh_resolution  = Number(label='Remesh resolution', group='mesh', order=0, width=1, min=128, max=2048, step=64, default=768, families=["trellis2-native", "pixal3d"], tooltip='UDF remesh voxel resolution. 768 is the official calibration; lower = lighter mesh, coarser surface.')
    decimate_faces     = Number(label='Decimate faces', group='mesh', order=1, width=1, min=10000, max=2000000, step=10000, default=700000, families=["trellis2-native", "pixal3d"], tooltip='Exact face count after decimation (midpoint placement). 700000 is the official calibration.')
    smooth_angle       = Slider(label='Smooth angle', group='mesh', order=2, width=1, min=0, max=180, step=5, default=180, families=["trellis2-native", "pixal3d"], tooltip='Normal-smoothing crease angle, applied before unwrap and after texturing. 180 is the official calibration.')

    # ── bake quality ───────────────────────────────────────────────────
    atlas_size         = Select(label='Atlas size', group='bake', order=0, width=1, default='4096', options=['2048', '4096'], families=["trellis2-native", "pixal3d"], tooltip='Unwrap + baked color atlas resolution. 4096 is the official calibration (VRAM-heavy); 2048 is the lighter fallback.')
    ao_size            = Select(label='AO bake size', group='bake', order=1, width=1, default='1024', options=['512', '1024'], families=["trellis2-native", "pixal3d"], tooltip='Ambient-occlusion bake resolution. 1024 is the official calibration.')
    normal_size        = Select(label='Normal bake size', group='bake', order=2, width=1, default='2048', options=['1024', '2048'], families=["trellis2-native", "pixal3d"], tooltip='Normal-map bake resolution. 2048 is the official calibration.')

    # ── sampler lab (the template's sampler table, knobbed) ─────────────
    # Sampler/scheduler names resolve from the engine vocabulary
    # (VocabRef — the image-gen sampling precedent: ONE list, never
    # hand-copied). Officials: euler everywhere; schedulers
    # normal/normal/simple/normal; SD3 shift 5.0; rescale 0.7/0.5;
    # override percents 0.667/0.769. Lift-arm scoped like the other
    # tuning groups — its own sidebar section after Bake.
    struct_sampler     = Select(label='Structure sampler', group='lab', order=0, width=1, default='euler', options=VocabRef("$samplers"), families=["trellis2-native", "pixal3d"], tooltip='Structure-stage sampler. euler is the official template pick.')
    struct_scheduler   = Select(label='Structure scheduler', group='lab', order=1, width=1, default='normal', options=VocabRef("$schedulers"), families=["trellis2-native", "pixal3d"], tooltip='Structure-stage scheduler. normal is the official pick.')
    shape_sampler      = Select(label='Shape sampler', group='lab', order=2, width=1, default='euler', options=VocabRef("$samplers"), families=["trellis2-native", "pixal3d"], tooltip='Shape-stage sampler. euler is the official pick.')
    shape_scheduler    = Select(label='Shape scheduler', group='lab', order=3, width=1, default='normal', options=VocabRef("$schedulers"), families=["trellis2-native", "pixal3d"], tooltip='Shape-stage scheduler. normal is the official pick.')
    tex1_sampler       = Select(label='Texture pass 1 sampler', group='lab', order=4, width=1, default='euler', options=VocabRef("$samplers"), families=["trellis2-native", "pixal3d"], tooltip='First texture pass sampler. euler is the official pick.')
    tex1_scheduler     = Select(label='Texture pass 1 scheduler', group='lab', order=5, width=1, default='simple', options=VocabRef("$schedulers"), families=["trellis2-native", "pixal3d"], tooltip='First texture pass scheduler. simple is the official pick (the only non-normal scheduler in the template).')
    tex2_sampler       = Select(label='Texture pass 2 sampler', group='lab', order=6, width=1, default='euler', options=VocabRef("$samplers"), families=["trellis2-native", "pixal3d"], tooltip='Second texture pass sampler. euler is the official pick.')
    tex2_scheduler     = Select(label='Texture pass 2 scheduler', group='lab', order=7, width=1, default='normal', options=VocabRef("$schedulers"), families=["trellis2-native", "pixal3d"], tooltip='Second texture pass scheduler. normal is the official pick.')
    sd3_shift          = Number(label='SD3 shift', group='lab', order=8, width=1, min=1.0, max=10.0, step=0.5, default=5.0, families=["trellis2-native", "pixal3d"], tooltip='ModelSamplingSD3 shift on the structure arm. 5.0 is the official template calibration.')
    rescale_struct     = Slider(label='Structure rescale', group='lab', order=9, width=1, min=0.1, max=1.0, step=0.05, default=0.7, families=["trellis2-native", "pixal3d"], tooltip='Structure-arm RescaleCFG multiplier. 0.7 is the official calibration.')
    rescale_shape      = Slider(label='Shape rescale', group='lab', order=10, width=1, min=0.1, max=1.0, step=0.05, default=0.5, families=["trellis2-native", "pixal3d"], tooltip='Shape-arm RescaleCFG multiplier (also feeds texture pass 1 — one node). 0.5 is the official calibration.')
    override_struct    = Slider(label='Structure override %', group='lab', order=11, width=1, min=0.0, max=1.0, step=0.001, default=0.667, families=["trellis2-native", "pixal3d"], tooltip='Structure-arm CFGOverride start percent. 0.667 is the official calibration.')
    override_shape     = Slider(label='Shape override %', group='lab', order=12, width=1, min=0.0, max=1.0, step=0.001, default=0.769, families=["trellis2-native", "pixal3d"], tooltip='Shape-arm CFGOverride start percent. 0.769 is the official calibration.')

    # NO filename_prefix (2026-09-06 standard-fields sweep; the 09-07
    # defaults blanket caught this last survivor): the run routes
    # outputs by run id (compose stamps the prefix internally). The
    # schema still admits the key — old drafts keep working.
