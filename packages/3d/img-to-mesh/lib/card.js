import z from "@deepseek-ai/schemastery";
import { MESH_AO_SIZES, MESH_ATLAS_SIZES, MESH_BG_MODES, MESH_NORMAL_SIZES, MESH_PIXAL_FOVS, MESH_RESOLUTIONS, declaredAction, instantiateAction } from "@melite/comfyui-card-kit";
import { DECL } from "@melite/models-pixal3d";
import { DECL as DECL$1 } from "@melite/models-trellis2-native";
import { DECL as DECL$2 } from "@melite/models-transfer_rig";
import { SAMPLERS, SCHEDULERS, vocabulary } from "@melite/comfyui-card-kit/vocab";
import { bag } from "@melite/contracts/extraKeys";
import { gatedResolve } from "@melite/comfyui-cordis";
//#region src/card.ts
/** The schema's callable face — ONE cast serving both seams (the
*  registration's schema carrier and the compose strict resolve's
*  judge): schemastery schemas are callable (Schema.resolve) but
*  carry a typed data parameter, while both card-seam consumers
*  take unknown. */
const schemaFn = z.object({
	input_image: z.string().role("path").description("Source image").extra("extra", bag({
		order: 0,
		group: "input",
		columns: 1,
		tooltip: "One clear object, tight framing. Background is removed automatically (birefnet) unless bg_removal=off.",
		required: true,
		families: ["pixal3d", "trellis2-native"],
		wtype: "image"
	})),
	rigged_glb: z.string().role("path").description("Rigged source GLB").extra("extra", bag({
		order: 0,
		group: "input",
		columns: 1,
		tooltip: "The SOMA-rigged clean mesh — JOINTS_0/WEIGHTS_0 + armature. The rig donor.",
		families: ["transfer_rig"],
		wtype: "mesh"
	})),
	target_glb: z.string().role("path").description("Target GLB").extra("extra", bag({
		order: 1,
		group: "input",
		columns: 1,
		tooltip: "The clothed mesh — geometry + textures, no rig. Receives the rig.",
		families: ["transfer_rig"],
		wtype: "mesh"
	})),
	seed: z.number().description("Seed").step(1).extra("extra", bag({
		order: 1,
		group: "input",
		width: 1,
		tooltip: "Same seed + image = same mesh take.",
		families: ["pixal3d", "trellis2-native"]
	})),
	resolution: vocabulary(MESH_RESOLUTIONS).description("Resolution").extra("extra", bag({
		order: 0,
		group: "generation",
		width: 1,
		tooltip: "Upsample target (the live node accepts 1024–2048; the family routes serve 1024 and 1536). All tiers run the full official chain — upsample + both texture passes + remesh tail.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "select"
	})),
	steps: z.number().description("Steps").min(4).max(60).step(1).extra("extra", bag({
		order: 1,
		group: "generation",
		width: 1,
		tooltip: "STRUCTURE stage steps (the lift). Shape + texture stages ride their own knobs in the Stage section.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "number"
	})),
	cfg: z.number().description("CFG").min(1).max(15).step(.5).extra("extra", bag({
		order: 2,
		group: "generation",
		width: 1,
		tooltip: "Structure-stage guidance. 7.5 is the official template calibration (2026-09-06: the 3.0 default sampled the coarse shape at under half guidance — blobby trash out of the box). Lower runs looser.",
		families: ["pixal3d", "trellis2-native"]
	})),
	bg_removal: vocabulary(MESH_BG_MODES).description("Background removal").extra("extra", bag({
		order: 3,
		group: "generation",
		width: 1,
		tooltip: "auto/on: birefnet cuts the background (recommended). off: feed a pre-cleaned or alpha-cut image straight to conditioning.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "select"
	})),
	camera_fov: vocabulary(MESH_PIXAL_FOVS).description("Camera FoV").extra("extra", bag({
		order: 4,
		group: "generation",
		width: 1,
		tooltip: "Pixal3D only — per-image horizontal FoV feeding the camera transform matrix. auto: MoGeInference estimates from the source image (recommended); a literal degree value skips MoGe (operator-vouched camera, e.g. calibrated).",
		families: ["pixal3d"],
		wtype: "select"
	})),
	shape_steps: z.number().description("Shape steps").min(4).max(60).step(1).extra("extra", bag({
		order: 0,
		group: "stage",
		width: 1,
		tooltip: "Shape-stage steps. 20 is the official template calibration.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "number"
	})),
	shape_cfg: z.number().description("Shape CFG").min(1).max(15).step(.5).extra("extra", bag({
		order: 1,
		group: "stage",
		width: 1,
		tooltip: "Shape-stage guidance. 7.5 is the official template calibration.",
		families: ["pixal3d", "trellis2-native"]
	})),
	tex1_steps: z.number().description("Texture pass 1 steps").min(4).max(60).step(1).extra("extra", bag({
		order: 2,
		group: "stage",
		width: 1,
		tooltip: "First texture pass steps (upsampled latent, simple scheduler). 12 is the official calibration.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "number"
	})),
	tex1_cfg: z.number().description("Texture pass 1 CFG").min(1).max(15).step(.5).extra("extra", bag({
		order: 3,
		group: "stage",
		width: 1,
		tooltip: "First texture pass guidance. 7.5 is the official calibration.",
		families: ["pixal3d", "trellis2-native"]
	})),
	tex2_steps: z.number().description("Texture pass 2 steps").min(4).max(60).step(1).extra("extra", bag({
		order: 4,
		group: "stage",
		width: 1,
		tooltip: "Second texture pass steps (raw unet — the detail pass). 12 is the official calibration.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "number"
	})),
	tex2_cfg: z.number().description("Texture pass 2 CFG").min(1).max(15).step(.5).extra("extra", bag({
		order: 5,
		group: "stage",
		width: 1,
		tooltip: "Second texture pass guidance. 1.0 is the official calibration (near-verbatim detail sampling).",
		families: ["pixal3d", "trellis2-native"]
	})),
	remesh_resolution: z.number().description("Remesh resolution").min(128).max(2048).step(64).extra("extra", bag({
		order: 0,
		group: "mesh",
		width: 1,
		tooltip: "UDF remesh voxel resolution. 768 is the official calibration; lower = lighter mesh, coarser surface.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "number"
	})),
	decimate_faces: z.number().description("Decimate faces").min(1e4).max(2e6).step(1e4).extra("extra", bag({
		order: 1,
		group: "mesh",
		width: 1,
		tooltip: "Exact face count after decimation (midpoint placement). 700000 is the official calibration.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "number"
	})),
	smooth_angle: z.number().description("Smooth angle").min(0).max(180).step(5).extra("extra", bag({
		order: 2,
		group: "mesh",
		width: 1,
		tooltip: "Normal-smoothing crease angle, applied before unwrap and after texturing. 180 is the official calibration.",
		families: ["pixal3d", "trellis2-native"]
	})),
	atlas_size: vocabulary(MESH_ATLAS_SIZES).description("Atlas size").extra("extra", bag({
		order: 0,
		group: "bake",
		width: 1,
		tooltip: "Unwrap + baked color atlas resolution. 4096 is the official calibration (VRAM-heavy); 2048 is the lighter fallback.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "select"
	})),
	ao_size: vocabulary(MESH_AO_SIZES).description("AO bake size").extra("extra", bag({
		order: 1,
		group: "bake",
		width: 1,
		tooltip: "Ambient-occlusion bake resolution. 1024 is the official calibration.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "select"
	})),
	normal_size: vocabulary(MESH_NORMAL_SIZES).description("Normal bake size").extra("extra", bag({
		order: 2,
		group: "bake",
		width: 1,
		tooltip: "Normal-map bake resolution. 2048 is the official calibration.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "select"
	})),
	struct_sampler: SAMPLERS.description("Structure sampler").extra("extra", bag({
		order: 0,
		group: "lab",
		width: 1,
		tooltip: "Structure-stage sampler. euler is the official template pick.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "select"
	})),
	struct_scheduler: SCHEDULERS.description("Structure scheduler").extra("extra", bag({
		order: 1,
		group: "lab",
		width: 1,
		tooltip: "Structure-stage scheduler. normal is the official pick.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "select"
	})),
	shape_sampler: SAMPLERS.description("Shape sampler").extra("extra", bag({
		order: 2,
		group: "lab",
		width: 1,
		tooltip: "Shape-stage sampler. euler is the official pick.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "select"
	})),
	shape_scheduler: SCHEDULERS.description("Shape scheduler").extra("extra", bag({
		order: 3,
		group: "lab",
		width: 1,
		tooltip: "Shape-stage scheduler. normal is the official pick.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "select"
	})),
	tex1_sampler: SAMPLERS.description("Texture pass 1 sampler").extra("extra", bag({
		order: 4,
		group: "lab",
		width: 1,
		tooltip: "First texture pass sampler. euler is the official pick.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "select"
	})),
	tex1_scheduler: SCHEDULERS.description("Texture pass 1 scheduler").extra("extra", bag({
		order: 5,
		group: "lab",
		width: 1,
		tooltip: "First texture pass scheduler. simple is the official pick (the only non-normal scheduler in the template).",
		families: ["pixal3d", "trellis2-native"],
		wtype: "select"
	})),
	tex2_sampler: SAMPLERS.description("Texture pass 2 sampler").extra("extra", bag({
		order: 6,
		group: "lab",
		width: 1,
		tooltip: "Second texture pass sampler. euler is the official pick.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "select"
	})),
	tex2_scheduler: SCHEDULERS.description("Texture pass 2 scheduler").extra("extra", bag({
		order: 7,
		group: "lab",
		width: 1,
		tooltip: "Second texture pass scheduler. normal is the official pick.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "select"
	})),
	sd3_shift: z.number().description("SD3 shift").min(1).max(10).step(.5).extra("extra", bag({
		order: 8,
		group: "lab",
		width: 1,
		tooltip: "ModelSamplingSD3 shift on the structure arm. 5.0 is the official template calibration.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "number"
	})),
	rescale_struct: z.number().description("Structure rescale").min(.1).max(1).step(.05).extra("extra", bag({
		order: 9,
		group: "lab",
		width: 1,
		tooltip: "Structure-arm RescaleCFG multiplier. 0.7 is the official calibration.",
		families: ["pixal3d", "trellis2-native"]
	})),
	rescale_shape: z.number().description("Shape rescale").min(.1).max(1).step(.05).extra("extra", bag({
		order: 10,
		group: "lab",
		width: 1,
		tooltip: "Shape-arm RescaleCFG multiplier (also feeds texture pass 1 — one node). 0.5 is the official calibration.",
		families: ["pixal3d", "trellis2-native"]
	})),
	override_struct: z.number().description("Structure override %").min(0).max(1).step(.001).extra("extra", bag({
		order: 11,
		group: "lab",
		width: 1,
		tooltip: "Structure-arm CFGOverride start percent. 0.667 is the official calibration.",
		families: ["pixal3d", "trellis2-native"]
	})),
	override_shape: z.number().description("Shape override %").min(0).max(1).step(.001).extra("extra", bag({
		order: 12,
		group: "lab",
		width: 1,
		tooltip: "Shape-arm CFGOverride start percent. 0.769 is the official calibration.",
		families: ["pixal3d", "trellis2-native"]
	}))
});
const inject = ["comfyui"];
const identity = {
	label: "Generate 3D",
	description: "The 3D lane — lift one image into a textured mesh (.glb) on native TRELLIS.2 (DINOv3 conditioning) or native Pixal3D (pixel-aligned + MoGe camera FOV, hero tier), or copy a rig onto a target GLB (transfer_rig); one surface, one arm per family.",
	genre: "3d",
	icon: "box"
};
const ACTION_BINDINGS = {
	[DECL.id]: (p, model, g, runId) => void instantiateAction(declaredAction(DECL, "mesh"), p, model, g, runId),
	[DECL$1.id]: (p, model, g, runId) => void instantiateAction(declaredAction(DECL$1, "mesh"), p, model, g, runId),
	[DECL$2.id]: (p, model, g, runId) => void instantiateAction(declaredAction(DECL$2, "transfer"), p, model, g, runId)
};
function apply(ctx) {
	ctx.effect(() => ctx.comfyui.registerCard({
		id: "img-to-mesh",
		skeleton: "img-to-mesh",
		boarded: [
			DECL.id,
			DECL$1.id,
			DECL$2.id
		],
		tags: [
			"3d",
			"image",
			"generate"
		],
		identity,
		sidebar: {
			key: "3d",
			order: 10
		},
		surface: {
			layout: "studio",
			size: "huge"
		},
		flowKinds: {
			inputs: {
				input_image: "image",
				rigged_glb: "mesh",
				target_glb: "mesh"
			},
			outputs: { default: "mesh" },
			requiresModel: true
		},
		flowOutputBindings: [{
			channel: "default",
			node: "Save3DAdvanced.0",
			nodeClass: "Save3DAdvanced",
			when: (params) => String(params.rigged_glb ?? "").trim() === "" && String(params.target_glb ?? "").trim() === ""
		}, {
			channel: "default",
			node: "SaveRiggedModel.0",
			nodeClass: "SaveRiggedModel",
			when: (params) => String(params.rigged_glb ?? "").trim() !== "" && String(params.target_glb ?? "").trim() !== ""
		}],
		requires: [
			"comfyui-core-trellis2",
			"ComfyUI-MoGe",
			"melite-autorig-nodes"
		],
		requiresByFamily: {
			"trellis2-native": ["comfyui-core-trellis2"],
			pixal3d: ["comfyui-core-trellis2", "ComfyUI-MoGe"],
			transfer_rig: ["melite-autorig-nodes"]
		},
		schema: schemaFn,
		compose(p, model, g, runId) {
			const doc = gatedResolve("img-to-mesh", schemaFn, [
				"model",
				"input_image",
				"rigged_glb",
				"target_glb"
			], p);
			const bound = ACTION_BINDINGS[model.family ?? model.id];
			if (bound) bound(doc, model, g, runId);
			else throw new Error(`no declared action for family '${String(model.family ?? model.id)}' on the img-to-mesh card — every boarded family (pixal3d, trellis2-native, transfer_rig) composes its own segment; this address owns none`);
		}
	}));
}
//#endregion
export { ACTION_BINDINGS, apply, identity, inject };
