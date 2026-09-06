"""The headless character pipeline (2026-09-06, design record
docs/design/character-pipeline.md — THINKING to headless proof).

The verbatim order: z-image character -> ANNY body (the MHR
image import) -> SOMAX convert -> pixal3d garments + hair -> topology
fix (FOLDED: the pixal arm carries the RemeshMesh -> DecimateMesh tail
in-chain, renderer docstring) -> skin -> automatic attach -> export,
with the skin stage added mid-order — as ONE flow the queue runs
headlessly. starter_image / garment_image_1 branch keys skip the two
z-image stages (skip_when present); every other initial is REQUIRED
and explicit (no silent placement/fit defaults — QUEUE LANE LAW).
Step (c) rides as the anny rig-somax VERB at the card surface; the
FLOW wires the same body-to-somax stage directly.

Truth chain (each stage cites its SSOT, walls pin the citations):
  img/gimg ... the z-image lane template generate_t2i.json
  body ...... Stage.from_flow: anny-hmr-commercial/estimate (same row)
  rig ....... Stage.from_flow: body-to-somax/rig (same row)
  garment ... the pixal_t1 renderer output, canonical doc
              (PixalT1Doc(input_image, seed=42)) — topology tail folded
  coat ...... Stage.from_flow: skin-apply/coat (same row)
  seat ...... Stage.from_flow: fit-seat/seat (same row)
Export (g) is the run artifacts: the seat stage emits the dressed GLB
+ proof views; the queue run dir IS the export convention (no extra
stage — an empty exporter would be ceremony).
"""

from flow import (
    Flow,
    FromInitial,
    FromStage,
    Kind,
    SkipWhen,
    Stage,
    StageSkip,
)
from melite_models import EstatePhotoRef


def _z_image_workflow(text_channel, seed, prefix):
    """The z-image text-to-image graph, hand-wired from the lane SSOT
    (plugins/engines/comfyui/models/image/z-image/generate_t2i.json —
    the Comfy-Org z_image_turbo official template the ZImage model row
    pins). Only three cells differ per stage: the prompt channel, the
    sampler seed (baked proof pins, deterministic), and the save
    prefix (one run dir serves BOTH t2i stages — a shared prefix
    would overwrite). Everything else is the template verbatim; the
    drift wall replays this builder against the template file."""
    return {
        "UNETLoader.0": {
            "class_type": "UNETLoader",
            "inputs": {
                "unet_name": "z_image_turbo_int8_convrot.safetensors",
                "weight_dtype": "default",
            },
        },
        "ModelSamplingAuraFlow.0": {
            "class_type": "ModelSamplingAuraFlow",
            "inputs": {"model": ["UNETLoader.0", 0], "shift": 3},
        },
        "CLIPLoader.0": {
            "class_type": "CLIPLoader",
            "inputs": {"clip_name": "qwen_3_4b.safetensors",
                       "type": "lumina2"},
        },
        "VAELoader.0": {
            "class_type": "VAELoader",
            "inputs": {"vae_name": "ae.safetensors"},
        },
        "CLIPTextEncode.0": {
            "class_type": "CLIPTextEncode",
            "inputs": {"text": text_channel,
                       "clip": ["CLIPLoader.0", 0]},
        },
        "CLIPTextEncode.1": {
            "class_type": "CLIPTextEncode",
            "inputs": {"text": "",
                       "clip": ["CLIPLoader.0", 0]},
        },
        "EmptySD3LatentImage.0": {
            "class_type": "EmptySD3LatentImage",
            "inputs": {"width": 1024, "height": 1024,
                       "batch_size": 1},
        },
        "KSampler.0": {
            "class_type": "KSampler",
            "inputs": {
                "seed": seed,
                "steps": 8,
                "cfg": 1.0,
                "sampler_name": "res_multistep",
                "scheduler": "simple",
                "denoise": 1.0,
                "model": ["ModelSamplingAuraFlow.0", 0],
                "positive": ["CLIPTextEncode.0", 0],
                "negative": ["CLIPTextEncode.1", 0],
                "latent_image": ["EmptySD3LatentImage.0", 0],
            },
        },
        "VAEDecode.0": {
            "class_type": "VAEDecode",
            "inputs": {"samples": ["KSampler.0", 0],
                       "vae": ["VAELoader.0", 0]},
        },
        "SaveImage.0": {
            "class_type": "SaveImage",
            "inputs": {"images": ["VAEDecode.0", 0],
                       "filename_prefix": prefix},
        },
    }


# The pixal3d garment lift — render_pixal_t1(PixalT1Doc(input_image,
# seed=42)) VERBATIM, mechanically emitted (never hand-typed): the
# LoadImage cell carries the stage channel, the harvest publishes the
# .glb onto the garment channel, and the RemeshMesh -> DecimateMesh
# tail in-chain IS step (e).
_GARMENT_WORKFLOW = {'UNETLoader.0': {'inputs': {'unet_name': 'pixal3d_int8_convrot.safetensors', 'weight_dtype': 'default'}, 'class_type': 'UNETLoader'}, 'CFGOverride.0': {'inputs': {'cfg': 1.0, 'end_percent': 1.0, 'start_percent': 0.769, 'model': ['UNETLoader.0', 0]}, 'class_type': 'CFGOverride'}, 'RescaleCFG.0': {'inputs': {'multiplier': 0.5, 'model': ['CFGOverride.0', 0]}, 'class_type': 'RescaleCFG'}, 'LoadMoGeModel.0': {'inputs': {'model_name': 'moge_2_vitl_normal_fp16.safetensors'}, 'class_type': 'LoadMoGeModel'}, 'LoadBackgroundRemovalModel.0': {'inputs': {'bg_removal_name': 'birefnet.safetensors'}, 'class_type': 'LoadBackgroundRemovalModel'}, 'LoadImage.0': {'inputs': {'image': '$garment_image'}, 'class_type': 'LoadImage'}, 'RemoveBackground.0': {'inputs': {'bg_removal_model': ['LoadBackgroundRemovalModel.0', 0], 'image': ['LoadImage.0', 0]}, 'class_type': 'RemoveBackground'}, 'MaskToImage.0': {'inputs': {'mask': ['RemoveBackground.0', 0]}, 'class_type': 'MaskToImage'}, 'ImageCropToMask.0': {'inputs': {'background': '#000000', 'grow_mask': 0, 'height': 1024, 'pad_factor': 1.1, 'width': 1024, 'images': ['MaskToImage.0', 0], 'masks': ['RemoveBackground.0', 0]}, 'class_type': 'ImageCropToMask'}, 'MoGeInference.0': {'inputs': {'apply_mask': True, 'batch_size': 4, 'force_projection': True, 'fov_x_degrees': 0.0, 'resolution_level': 9, 'moge_model': ['LoadMoGeModel.0', 0], 'image': ['ImageCropToMask.0', 0]}, 'class_type': 'MoGeInference'}, 'MoGeGeometryToFOV.0': {'inputs': {'axis': 'horizontal', 'unit': 'degrees', 'moge_geometry': ['MoGeInference.0', 0]}, 'class_type': 'MoGeGeometryToFOV'}, 'CLIPVisionLoader.0': {'inputs': {'clip_name': 'dino_v3_L_naf_fp32.safetensors'}, 'class_type': 'CLIPVisionLoader'}, 'Pixal3DConditioning.0': {'inputs': {'camera_angle_x': ['MoGeGeometryToFOV.0', 0], 'clip_vision_model': ['CLIPVisionLoader.0', 0], 'image': ['ImageCropToMask.0', 0]}, 'class_type': 'Pixal3DConditioning'}, 'ConditioningZeroOut.0': {'inputs': {'conditioning': ['Pixal3DConditioning.0', 0]}, 'class_type': 'ConditioningZeroOut'}, 'CFGOverride.1': {'inputs': {'cfg': 1.0, 'end_percent': 1.0, 'start_percent': 0.667, 'model': ['UNETLoader.0', 0]}, 'class_type': 'CFGOverride'}, 'RescaleCFG.1': {'inputs': {'multiplier': 0.7, 'model': ['CFGOverride.1', 0]}, 'class_type': 'RescaleCFG'}, 'ModelSamplingSD3.0': {'inputs': {'shift': 5.0, 'model': ['RescaleCFG.1', 0]}, 'class_type': 'ModelSamplingSD3'}, 'EmptyTrellis2LatentStructure.0': {'inputs': {'batch_size': 1}, 'class_type': 'EmptyTrellis2LatentStructure'}, 'KSampler.0': {'inputs': {'cfg': 7.5, 'denoise': 1.0, 'sampler_name': 'euler', 'scheduler': 'normal', 'seed': 42, 'steps': 12, 'model': ['ModelSamplingSD3.0', 0], 'positive': ['Pixal3DConditioning.0', 0], 'negative': ['ConditioningZeroOut.0', 0], 'latent_image': ['EmptyTrellis2LatentStructure.0', 0]}, 'class_type': 'KSampler'}, 'VAELoader.0': {'inputs': {'vae_name': 'trellis_2_shape_vae_bf16.safetensors'}, 'class_type': 'VAELoader'}, 'VaeDecodeStructureTrellis2.0': {'inputs': {'resolution': '32', 'samples': ['KSampler.0', 0], 'vae': ['VAELoader.0', 0]}, 'class_type': 'VaeDecodeStructureTrellis2'}, 'Trellis2ShapeStage.0': {'inputs': {'positive': ['Pixal3DConditioning.0', 0], 'negative': ['ConditioningZeroOut.0', 0], 'voxel': ['VaeDecodeStructureTrellis2.0', 0]}, 'class_type': 'Trellis2ShapeStage'}, 'KSampler.1': {'inputs': {'cfg': 7.5, 'denoise': 1.0, 'sampler_name': 'euler', 'scheduler': 'normal', 'seed': 42, 'steps': 20, 'model': ['RescaleCFG.0', 0], 'positive': ['Trellis2ShapeStage.0', 0], 'negative': ['Trellis2ShapeStage.0', 1], 'latent_image': ['Trellis2ShapeStage.0', 2]}, 'class_type': 'KSampler'}, 'Trellis2UpsampleStage.0': {'inputs': {'target_resolution': 1024, 'positive': ['Trellis2ShapeStage.0', 0], 'negative': ['Trellis2ShapeStage.0', 1], 'shape_latent': ['KSampler.1', 0], 'vae': ['VAELoader.0', 0]}, 'class_type': 'Trellis2UpsampleStage'}, 'KSampler.2': {'inputs': {'cfg': 7.5, 'denoise': 1.0, 'sampler_name': 'euler', 'scheduler': 'simple', 'seed': 42, 'steps': 12, 'model': ['RescaleCFG.0', 0], 'positive': ['Trellis2UpsampleStage.0', 0], 'negative': ['Trellis2UpsampleStage.0', 1], 'latent_image': ['Trellis2UpsampleStage.0', 2]}, 'class_type': 'KSampler'}, 'VaeDecodeShapeTrellis.0': {'inputs': {'samples': ['KSampler.2', 0], 'vae': ['VAELoader.0', 0]}, 'class_type': 'VaeDecodeShapeTrellis'}, 'GetMeshInfo.0': {'inputs': {'mesh': ['VaeDecodeShapeTrellis.0', 0]}, 'class_type': 'GetMeshInfo'}, 'RemeshMesh.0': {'inputs': {'band': 1.0, 'drop_small_components': 0.01, 'fix_poles': False, 'precluster_max_verts': 20000000, 'project_back': 0.0, 'resolution': 768, 'smooth_iters': 20, 'mesh': ['GetMeshInfo.0', 0], 'sign_mode': 'udf', 'sign_mode.qef': False, 'sign_mode.drop_inverted_components': False, 'sign_mode.drop_enclosed_components': False}, 'class_type': 'RemeshMesh'}, 'DecimateMesh.0': {'inputs': {'target_face_count': 700000, 'mesh': ['RemeshMesh.0', 0], 'placement_mode': 'midpoint'}, 'class_type': 'DecimateMesh'}, 'MeshSmoothNormals.0': {'inputs': {'crease_angle': 180.0, 'mesh': ['DecimateMesh.0', 0]}, 'class_type': 'MeshSmoothNormals'}, 'UnwrapMesh.0': {'inputs': {'padding': 1, 'resolution': 4096, 'segmenter': 'pec', 'weld_distance': 0.0002, 'mesh': ['MeshSmoothNormals.0', 0]}, 'class_type': 'UnwrapMesh'}, 'Trellis2TextureStage.0': {'inputs': {'positive': ['Trellis2UpsampleStage.0', 0], 'negative': ['Trellis2UpsampleStage.0', 1], 'shape_latent': ['KSampler.2', 0]}, 'class_type': 'Trellis2TextureStage'}, 'KSampler.3': {'inputs': {'cfg': 1.0, 'denoise': 1.0, 'sampler_name': 'euler', 'scheduler': 'normal', 'seed': 42, 'steps': 12, 'model': ['UNETLoader.0', 0], 'positive': ['Trellis2TextureStage.0', 0], 'negative': ['Trellis2TextureStage.0', 1], 'latent_image': ['Trellis2TextureStage.0', 2]}, 'class_type': 'KSampler'}, 'VAELoader.1': {'inputs': {'vae_name': 'trellis_2_texture_vae_bf16.safetensors'}, 'class_type': 'VAELoader'}, 'VaeDecodeTextureTrellis.0': {'inputs': {'samples': ['KSampler.3', 0], 'vae': ['VAELoader.1', 0], 'shape_subdivides': ['VaeDecodeShapeTrellis.0', 1]}, 'class_type': 'VaeDecodeTextureTrellis'}, 'BakeTextureFromVoxel.0': {'inputs': {'texture_size': 4096, 'mesh': ['UnwrapMesh.0', 0], 'voxel_colors': ['VaeDecodeTextureTrellis.0', 0], 'reference_mesh': ['VaeDecodeShapeTrellis.0', 0]}, 'class_type': 'BakeTextureFromVoxel'}, 'BakeAmbientOcclusion.0': {'inputs': {'bias': 0.01, 'max_distance': 0.71, 'resolution': 1024, 'samples': 64, 'strength': 1.0, 'low_poly': ['UnwrapMesh.0', 0], 'high_poly': ['RemeshMesh.0', 0]}, 'class_type': 'BakeAmbientOcclusion'}, 'BakeNormalMapFromMesh.0': {'inputs': {'cage_distance': 0.05, 'ignore_backfaces': True, 'resolution': 2048, 'low_poly': ['UnwrapMesh.0', 0], 'high_poly': ['RemeshMesh.0', 0]}, 'class_type': 'BakeNormalMapFromMesh'}, 'ApplyTextureToMesh.0': {'inputs': {'mesh': ['UnwrapMesh.0', 0], 'base_color': ['BakeTextureFromVoxel.0', 0], 'metallic': ['BakeTextureFromVoxel.0', 1], 'roughness': ['BakeTextureFromVoxel.0', 2], 'occlusion': ['BakeAmbientOcclusion.0', 0], 'normal_map': ['BakeNormalMapFromMesh.0', 0]}, 'class_type': 'ApplyTextureToMesh'}, 'MeshSmoothNormals.1': {'inputs': {'crease_angle': 180.0, 'mesh': ['ApplyTextureToMesh.0', 0]}, 'class_type': 'MeshSmoothNormals'}, 'MeshToFile3D.0': {'inputs': {'mesh': ['MeshSmoothNormals.1', 0]}, 'class_type': 'MeshToFile3D'}, 'Save3DAdvanced.0': {'inputs': {'filename_prefix': 'pixal3d', 'height': 1024, 'width': 1024, 'model_3d': ['MeshToFile3D.0', 0], 'viewport_state': ''}, 'class_type': 'Save3DAdvanced'}}


FLOW = Flow(
    id="character",
    description=(
        "Headless keeper pipeline: z-image character + garment images "
        "(or operator-supplied starters) -> ANNY commercial body -> "
        "SOMAX rig -> pixal3d garment (remesh tail folded) -> skin "
        "detail -> automatic fit-seat attach -> dressed-GLB export."),
    stages=(
        Stage(
            id="img",
            engine="comfyui",
            description="z-image character sheet (skipped when the "
            "operator brings starter_image)",
            inputs={"character_prompt": FromInitial(
                key="character_prompt")},
            expected={"character_prompt": Kind.text},
            outputs={"photo": Kind.image},
            params={
                "out_dir": "./output",
                "timeout_s": 900,
                "workflow": _z_image_workflow(
                    "$character_prompt", 20260906, "character_img"),
            },
            skip_when=StageSkip(initial="starter_image",
                                when=SkipWhen.present),
        ),
        Stage(
            id="gimg",
            engine="comfyui",
            description="z-image garment sheet (skipped when the "
            "operator brings garment_image_1)",
            inputs={"garment_prompt": FromInitial(key="garment_prompt")},
            expected={"garment_prompt": Kind.text},
            outputs={"gimg": Kind.image},
            params={
                "out_dir": "./output",
                "timeout_s": 900,
                "workflow": _z_image_workflow(
                    "$garment_prompt", 20260907, "character_gimg"),
            },
            skip_when=StageSkip(initial="garment_image_1",
                                when=SkipWhen.present),
        ),
        Stage.from_flow(
            "anny-hmr-commercial", "estimate", id="body",
            inputs={"photo": FromStage(stage="img", output="photo")},
        ),
        Stage.from_flow(
            "body-to-somax", "rig",
            inputs={"glb": FromStage(stage="body", output="body")},
        ),
        Stage(
            id="garment",
            engine="comfyui",
            description="pixal3d garment lift incl. the remesh tail "
            "(step e folded — GetMeshInfo -> RemeshMesh -> "
            "DecimateMesh ride in-chain)",
            inputs={"garment_image": FromStage(stage="gimg",
                                                 output="gimg")},
            expected={"garment_image": Kind.image},
            outputs={"garment": Kind.mesh},
            params={
                "out_dir": "./output",
                "timeout_s": 3600,
                "workflow": _GARMENT_WORKFLOW,
            },
        ),
        Stage.from_flow(
            "skin-apply", "coat",
            inputs={
                "body": FromStage(stage="rig", output="body"),
                "kind": FromInitial(key="kind"),
                "map_size": FromInitial(key="map_size"),
                "seed": FromInitial(key="seed"),
            },
        ),
        Stage.from_flow(
            "fit-seat", "seat",
            inputs={
                "body": FromStage(stage="coat", output="skin"),
                "prop": FromStage(stage="garment", output="garment"),
                "model_name": FromInitial(key="model_name"),
                "bone": FromInitial(key="bone"),
                "align": FromInitial(key="align"),
                "position": FromInitial(key="position"),
                "rotation": FromInitial(key="rotation"),
                "fit_ratio": FromInitial(key="fit_ratio"),
                "fit_ref_bone": FromInitial(key="fit_ref_bone"),
                "fit_ref_bone2": FromInitial(key="fit_ref_bone2"),
                "seat_ratio": FromInitial(key="seat_ratio"),
                "finger_bone": FromInitial(key="finger_bone"),
                "thumb_bone": FromInitial(key="thumb_bone"),
                "target_width": FromInitial(key="target_width"),
            },
        ),
    ),
    initial_validators={
        "starter_image": EstatePhotoRef,
        "garment_image_1": EstatePhotoRef,
    },
)
