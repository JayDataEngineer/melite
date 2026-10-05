import { requireText } from "@melite/comfyui-card-kit/facts";
import { MESH_PIXAL_FOVS } from "@melite/comfyui-card-kit";
import { MESH_RESOLUTIONS, MESH_BG_MODES, MESH_ATLAS_SIZES, MESH_AO_SIZES, MESH_NORMAL_SIZES } from "@melite/comfyui-card-kit";
import { SAMPLER_OPTIONS, SCHEDULER_OPTIONS } from "@melite/comfyui-card-kit/vocab";
/** The mesh facts door: the resolved lane_inputs parsed into the
 * closed shape — a missing load key refuses field-named here,
 * never composes a loader on an empty directory.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export function parseMeshFacts(raw) {
    return {
        unet: requireText(raw, 'unet', 'pixal3d mesh'),
        vae: requireText(raw, 'vae', 'pixal3d mesh'),
        texture_vae: requireText(raw, 'texture_vae', 'pixal3d mesh'),
        clip_vision: requireText(raw, 'clip_vision', 'pixal3d mesh'),
        background_removal: requireText(raw, 'background_removal', 'pixal3d mesh'),
    };
}
const isSpell = (s) => s.startsWith('$');
/** The lift arms' admission slice for THIS family (moved verbatim
 * from the kit's admitMeshLift — the required image and closed
 * sets refuse HERE, never in the schema): the source image,
 * resolution, bg mode, the bake-size table,
 * and the pixal-only camera_fov row. */
function admitMeshLift(p) {
    if (!String(p.input_image || '').trim()) {
        throw new Error(`required param 'input_image' (Source image) missing on the img-to-mesh card — the 3D lift is image-conditioned (no text prompt rides this lane)`);
    }
    const MESH_RESOLUTIONS = ['1024', '1536'];
    const MESH_BG_MODES = ['auto', 'on', 'off'];
    const MESH_PIXAL_FOVS = ['auto', '35', '49.13', '60', '75', '90'];
    const MESH_BAKE_SIZES = [
        ['atlas_size', ['2048', '4096']],
        ['ao_size', ['512', '1024']],
        ['normal_size', ['1024', '2048']],
    ];
    if (!MESH_RESOLUTIONS.includes(String(p.resolution))) {
        throw new Error(`resolution ${JSON.stringify(p.resolution)} is not one of ${MESH_RESOLUTIONS.join('|')} — the variant table is closed`);
    }
    const bg = String(p.bg_removal || 'auto');
    if (!MESH_BG_MODES.includes(bg)) {
        throw new Error(`bg_removal ${JSON.stringify(bg)} is not one of auto|on|off — birefnet either cuts or it doesn't`);
    }
    const fov = String(p.camera_fov || 'auto').trim();
    if (!MESH_PIXAL_FOVS.includes(fov)) {
        throw new Error(`camera_fov ${JSON.stringify(fov)} is not one of ${MESH_PIXAL_FOVS.join('|')} — pixal3d either lets MoGe infer ('auto') or the operator vouches a literal degree`);
    }
    for (const [k, opts] of MESH_BAKE_SIZES) {
        if (!opts.includes(String(p[k]))) {
            throw new Error(`${k} ${JSON.stringify(p[k])} is not one of ${opts.join('|')} — the bake-size table is closed`);
        }
    }
}
/** The dual guided unet + the two VAEs — the lift chain's shared
 * head. Creation order lands the reference renderers' numbering: the SHAPE
 * pair first (CFGOverride.0/RescaleCFG.0), then the STRUCT pair
 * (.1). */
function loadLiftHeads(g, li, p) {
    const unet = g.node('UNETLoader', { unet_name: li.unet, weight_dtype: 'default' }).out();
    // shape arm (0.769 / 0.5) — numbered FIRST (served order)
    const overrideShape = g.node('CFGOverride', {
        model: unet, cfg: 1.0,
        start_percent: p.override_shape, end_percent: 1.0,
    }).out();
    const rescaleShape = g.node('RescaleCFG', {
        model: overrideShape, multiplier: p.rescale_shape,
    }).out();
    // struct arm (0.667 / 0.7) — numbered SECOND (served order)
    const overrideStruct = g.node('CFGOverride', {
        model: unet, cfg: 1.0,
        start_percent: p.override_struct, end_percent: 1.0,
    }).out();
    const rescaleStruct = g.node('RescaleCFG', {
        model: overrideStruct, multiplier: p.rescale_struct,
    }).out();
    const shifted = g.node('ModelSamplingSD3', {
        model: rescaleStruct, shift: p.sd3_shift,
    }).out();
    const shapeVae = g.node('VAELoader', { vae_name: li.vae }).out();
    const texVae = g.node('VAELoader', { vae_name: li.texture_vae }).out();
    return { unet, rescaleShape, shifted, shapeVae, texVae };
}
/** The birefnet cut (bg_removal auto/on): the cutout MASK from
 * RemoveBackground bridged to IMAGE via MaskToImage (the GPU
 * canary verdict — RemoveBackground outputs MASK, not IMAGE). */
function cutBackground(g, li, img) {
    const bgm = g.node('LoadBackgroundRemovalModel', { bg_removal_name: li.background_removal }).out();
    const mask = g.node('RemoveBackground', { bg_removal_model: bgm, image: img }).out();
    const src = g.node('MaskToImage', { mask }).out();
    return { src, mask };
}
/** The shared structure→shape→upsample→texture→bake→glb chain
 * (_shared_lift_chain verbatim — the model delta lives
 * ENTIRELY in the conditioning pair passed in). */
function sharedLiftChain(g, p, heads, pos, neg, prefix) {
    const seed = p.seed;
    const { unet, rescaleShape, shifted, shapeVae, texVae } = heads;
    // structure stage (the lift): card steps + cfg knobs
    const empty = g.node('EmptyTrellis2LatentStructure', { batch_size: 1 }).out();
    const struct = g.node('KSampler', {
        seed, steps: p.steps, cfg: p.cfg,
        sampler_name: p.struct_sampler,
        scheduler: p.struct_scheduler, denoise: 1.0,
        model: shifted, positive: pos, negative: neg, latent_image: empty,
    });
    const voxel = g.node('VaeDecodeStructureTrellis2', {
        samples: struct.out(), vae: shapeVae, resolution: '32',
    }).out();
    // shape stage: 20 steps / cfg 7.5 on the 0.5 arm (official)
    const shapeStage = g.node('Trellis2ShapeStage', { positive: pos, negative: neg, voxel });
    const shapeLatent = g.node('KSampler', {
        seed, steps: p.shape_steps,
        cfg: p.shape_cfg,
        sampler_name: p.shape_sampler,
        scheduler: p.shape_scheduler, denoise: 1.0,
        model: rescaleShape,
        positive: shapeStage.out(0), negative: shapeStage.out(1),
        latent_image: shapeStage.out(2),
    });
    // upsample + first texture pass: UNCONDITIONAL, target floored at 1024
    const up = g.node('Trellis2UpsampleStage', {
        positive: shapeStage.out(0), negative: shapeStage.out(1),
        shape_latent: shapeLatent.out(), vae: shapeVae,
        target_resolution: Math.max(Number(p.resolution), 1024),
    });
    const upLatent = g.node('KSampler', {
        seed, steps: p.tex1_steps,
        cfg: p.tex1_cfg,
        sampler_name: p.tex1_sampler,
        scheduler: p.tex1_scheduler, denoise: 1.0,
        model: rescaleShape,
        positive: up.out(0), negative: up.out(1), latent_image: up.out(2),
    });
    // mesh lineage: decode → info → UDF remesh → exact-count decimate
    const decodeShape = g.node('VaeDecodeShapeTrellis', { samples: upLatent.out(), vae: shapeVae });
    const mesh = decodeShape.out(0);
    const subdivides = decodeShape.out(1);
    const info = g.node('GetMeshInfo', { mesh }).out(0);
    const remeshed = g.node('RemeshMesh', {
        mesh: info, resolution: p.remesh_resolution,
        sign_mode: 'udf',
        // the separation knobs are card params since 2026-10-12 — the
        // card's schema defaults (false) ARE the pinned core defaults
        'sign_mode.qef': p.remesh_qef === true,
        'sign_mode.drop_inverted_components': p.remesh_drop_inverted === true,
        'sign_mode.drop_enclosed_components': p.remesh_drop_enclosed === true,
        smooth_iters: 20,
        drop_small_components: 0.01, precluster_max_verts: 20000000,
        // pin autofills leaves in place (core defaults)
        band: 1.0, fix_poles: p.remesh_fix_poles === true, project_back: 0.0,
    }).out();
    // texture stage, two passes: 12/7.5/simple feeds the stage; 12/1.0
    // on the RAW unet samples it (official template KSampler#12)
    const texStage = g.node('Trellis2TextureStage', {
        positive: up.out(0), negative: up.out(1), shape_latent: upLatent.out(),
    });
    const texLatent = g.node('KSampler', {
        seed, steps: p.tex2_steps,
        cfg: p.tex2_cfg,
        sampler_name: p.tex2_sampler,
        scheduler: p.tex2_scheduler, denoise: 1.0,
        model: unet,
        positive: texStage.out(0), negative: texStage.out(1),
        latent_image: texStage.out(2),
    });
    const voxelColors = g.node('VaeDecodeTextureTrellis', {
        samples: texLatent.out(), vae: texVae, shape_subdivides: subdivides,
    }).out();
    // bake tail: decimate → smooth → unwrap → bake color/AO/normal →
    // apply → smooth → glb (the textured mesh is the saved hero)
    const decimated = g.node('DecimateMesh', {
        mesh: remeshed, target_face_count: p.decimate_faces,
        placement_mode: 'midpoint',
    }).out();
    const smooth1 = g.node('MeshSmoothNormals', {
        mesh: decimated, crease_angle: p.smooth_angle,
    }).out();
    const unwrapped = g.node('UnwrapMesh', {
        mesh: smooth1, segmenter: 'pec', resolution: Number(p.atlas_size),
        padding: 1, weld_distance: 0.0002,
    }).out();
    const baked = g.node('BakeTextureFromVoxel', {
        mesh: unwrapped, voxel_colors: voxelColors,
        texture_size: Number(p.atlas_size), reference_mesh: mesh,
    });
    const occlusion = g.node('BakeAmbientOcclusion', {
        low_poly: unwrapped, high_poly: remeshed,
        resolution: Number(p.ao_size),
        samples: 64, max_distance: 0.71, strength: 1.0, bias: 0.01,
    }).out();
    const normalMap = g.node('BakeNormalMapFromMesh', {
        low_poly: unwrapped, high_poly: remeshed,
        resolution: Number(p.normal_size),
        cage_distance: 0.05, ignore_backfaces: true,
    }).out();
    const textured = g.node('ApplyTextureToMesh', {
        mesh: unwrapped,
        base_color: baked.out(0), metallic: baked.out(1),
        roughness: baked.out(2),
        occlusion, normal_map: normalMap,
    }).out();
    const smooth2 = g.node('MeshSmoothNormals', {
        mesh: textured, crease_angle: p.smooth_angle,
    }).out();
    const glb = g.node('MeshToFile3D', { mesh: smooth2 }).out();
    return g.node('Save3DAdvanced', {
        model_3d: glb, filename_prefix: prefix,
        viewport_state: '', width: 1024, height: 1024,
    }).out();
}
/** The mesh action: pixal_t1 — pixel-aligned conditioning. The
 * padded crop (pad 1.1) feeds BOTH Pixal3DConditioning and
 * (camera_fov=auto) the MoGe depth pass, so framing agrees by
 * construction. */
export const mesh = {
    id: "mesh",
    inputs: [],
    outputs: [{ name: "glb", kind: "GLB" }],
    // THE DECLARED SURFACE (the write plane, phase 2): the
    // img-to-mesh card schema's own types and bounds — the family
    // door judges defaults and variant presets against this row.
    // The closed sets (resolutions, bg modes, bake sizes) are the
    // card-kit's ONE mesh vocabularies; the sampler/scheduler rows
    // resolve from the ONE engine vocabulary.
    params: [
        { name: "input_image", type: "string" },
        { name: "seed", type: "number", rule: "seed-sentinel" },
        { name: "resolution", type: "enum", options: MESH_RESOLUTIONS },
        { name: "steps", type: "number", bounds: [4, 60] },
        { name: "cfg", type: "number", bounds: [1, 15] },
        { name: "bg_removal", type: "enum", options: MESH_BG_MODES },
        { name: "camera_fov", type: "enum", options: MESH_PIXAL_FOVS },
        { name: "shape_steps", type: "number", bounds: [4, 60] },
        { name: "shape_cfg", type: "number", bounds: [1, 15] },
        { name: "shape_sampler", type: "enum", options: SAMPLER_OPTIONS },
        { name: "shape_scheduler", type: "enum", options: SCHEDULER_OPTIONS },
        { name: "tex1_steps", type: "number", bounds: [4, 60] },
        { name: "tex1_cfg", type: "number", bounds: [1, 15] },
        { name: "tex1_sampler", type: "enum", options: SAMPLER_OPTIONS },
        { name: "tex1_scheduler", type: "enum", options: SCHEDULER_OPTIONS },
        { name: "tex2_steps", type: "number", bounds: [4, 60] },
        { name: "tex2_cfg", type: "number", bounds: [1, 15] },
        { name: "tex2_sampler", type: "enum", options: SAMPLER_OPTIONS },
        { name: "tex2_scheduler", type: "enum", options: SCHEDULER_OPTIONS },
        { name: "struct_sampler", type: "enum", options: SAMPLER_OPTIONS },
        { name: "struct_scheduler", type: "enum", options: SCHEDULER_OPTIONS },
        { name: "remesh_resolution", type: "number", bounds: [128, 2048] },
        { name: "remesh_qef", type: "boolean" },
        { name: "remesh_drop_inverted", type: "boolean" },
        { name: "remesh_drop_enclosed", type: "boolean" },
        { name: "remesh_fix_poles", type: "boolean" },
        { name: "decimate_faces", type: "number", bounds: [10000, 2000000] },
        { name: "smooth_angle", type: "number", bounds: [0, 180] },
        { name: "atlas_size", type: "enum", options: MESH_ATLAS_SIZES },
        { name: "ao_size", type: "enum", options: MESH_AO_SIZES },
        { name: "normal_size", type: "enum", options: MESH_NORMAL_SIZES },
        { name: "sd3_shift", type: "number", bounds: [1, 10] },
        { name: "rescale_struct", type: "number", bounds: [0.1, 1] },
        { name: "rescale_shape", type: "number", bounds: [0.1, 1] },
        { name: "override_struct", type: "number", bounds: [0, 1] },
        { name: "override_shape", type: "number", bounds: [0, 1] },
    ],
    facts: parseMeshFacts,
    build({ p, facts, g }) {
        admitMeshLift(p);
        const li = facts;
        // THE SPELLED ANCHOR (the gap-audit law: img-to-mesh seats
        // input_image, so a producer CAN wire in — the spell rides the
        // conditioning tensor verbatim, never a loader).
        const img = isSpell(p.input_image)
            ? p.input_image
            : g.node('LoadImage', { image: p.input_image }).out();
        const heads = loadLiftHeads(g, li, p);
        let cropSrc = img;
        let cropMask = img; // ImageCropToMask accepts IMAGE for masks
        if (p.bg_removal !== 'off') {
            const cut = cutBackground(g, li, img);
            cropMask = cut.mask;
            cropSrc = cut.src;
        }
        const clip = g.node('CLIPVisionLoader', { clip_name: li.clip_vision }).out();
        const cropped = g.node('ImageCropToMask', {
            images: cropSrc, masks: cropMask,
            pad_factor: 1.1, width: 1024, height: 1024,
            // pin autofills leaves in place (core defaults)
            background: '#000000', grow_mask: 0,
        }).out();
        let cameraAngleX;
        if (p.camera_fov === 'auto') {
            // MoGe weight literal — the documented one-model exception
            // (LaneInputs is closed; the row is pixal-only).
            const mogeModel = g.node('LoadMoGeModel', {
                model_name: 'moge_2_vitl_normal_fp16.safetensors',
            }).out();
            const mogeGeom = g.node('MoGeInference', {
                moge_model: mogeModel, image: cropped, resolution_level: 9,
                // pin autofills leaves in place (core defaults)
                apply_mask: true, batch_size: 4, force_projection: true,
                fov_x_degrees: 0.0,
            }).out();
            cameraAngleX = g.node('MoGeGeometryToFOV', {
                moge_geometry: mogeGeom, axis: 'horizontal', unit: 'degrees',
            }).out(0);
        }
        else {
            cameraAngleX = Number(p.camera_fov); // operator-vouched literal degree
        }
        const pos = g.node('Pixal3DConditioning', {
            clip_vision_model: clip, image: cropped, camera_angle_x: cameraAngleX,
        }).out(0);
        const neg = g.node('ConditioningZeroOut', { conditioning: pos }).out();
        // Family constant, never a knob (compose stamps the prefix
        // internally; stable).
        return sharedLiftChain(g, p, heads, pos, neg, 'pixal3d');
    },
};
//# sourceMappingURL=actions.js.map
