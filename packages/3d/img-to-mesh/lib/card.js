import z from "@deepseek-ai/schemastery";
import { admitMeshLift, pixalArm, transferRigArm, trellisArm } from "@melite/comfyui-card-kit";
import { SAMPLERS, SCHEDULERS, vocabulary } from "@melite/comfyui-card-kit/vocab";
//#region src/card.ts
const schema = z.object({
	input_image: z.string().role("path").description("Source image").extra("extra", {
		order: 0,
		group: "input",
		columns: 1,
		tooltip: "One clear object, tight framing. Background is removed automatically (birefnet) unless bg_removal=off.",
		required: true,
		families: ["pixal3d", "trellis2-native"],
		wtype: "file"
	}),
	rigged_glb: z.string().role("path").description("Rigged source GLB").extra("extra", {
		order: 0,
		group: "input",
		columns: 1,
		tooltip: "The SOMA-rigged clean mesh — JOINTS_0/WEIGHTS_0 + armature. The rig donor.",
		families: ["transfer_rig"],
		wtype: "mesh"
	}),
	target_glb: z.string().role("path").description("Target GLB").extra("extra", {
		order: 1,
		group: "input",
		columns: 1,
		tooltip: "The clothed mesh — geometry + textures, no rig. Receives the rig.",
		families: ["transfer_rig"],
		wtype: "mesh"
	}),
	seed: z.number().description("Seed").step(1).default(42).extra("extra", {
		order: 1,
		group: "input",
		width: 1,
		tooltip: "Same seed + image = same mesh take."
	}),
	resolution: vocabulary([
		"512",
		"1024",
		"1536"
	]).description("Resolution").default("1024").extra("extra", {
		order: 0,
		group: "generation",
		width: 1,
		tooltip: "Upsample target (official pins 1536). All tiers run the full official chain — upsample + both texture passes + remesh tail.",
		wtype: "select"
	}),
	steps: z.number().description("Steps").min(4).max(60).step(1).default(12).extra("extra", {
		order: 1,
		group: "generation",
		width: 1,
		tooltip: "STRUCTURE stage steps (the lift). Shape + texture stages ride their own knobs in the Stage section.",
		wtype: "number"
	}),
	cfg: z.number().description("CFG").min(1).max(15).step(.5).default(7.5).extra("extra", {
		order: 2,
		group: "generation",
		width: 1,
		tooltip: "Structure-stage guidance. 7.5 is the official template calibration (2026-09-06: the 3.0 default sampled the coarse shape at under half guidance — blobby trash out of the box). Lower runs looser."
	}),
	bg_removal: vocabulary([
		"auto",
		"on",
		"off"
	]).description("Background removal").default("auto").extra("extra", {
		order: 3,
		group: "generation",
		width: 1,
		tooltip: "auto/on: birefnet cuts the background (recommended). off: feed a pre-cleaned or alpha-cut image straight to conditioning.",
		wtype: "select"
	}),
	camera_fov: vocabulary([
		"auto",
		"35",
		"49.13",
		"60",
		"75",
		"90"
	]).description("Camera FoV").default("auto").extra("extra", {
		order: 4,
		group: "generation",
		width: 1,
		tooltip: "Pixal3D only — per-image horizontal FoV feeding the camera transform matrix. auto: MoGeInference estimates from the source image (recommended); a literal degree value skips MoGe (operator-vouched camera, e.g. calibrated).",
		families: ["pixal3d"],
		wtype: "select"
	}),
	shape_steps: z.number().description("Shape steps").min(4).max(60).step(1).default(20).extra("extra", {
		order: 0,
		group: "stage",
		width: 1,
		tooltip: "Shape-stage steps. 20 is the official template calibration.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "number"
	}),
	shape_cfg: z.number().description("Shape CFG").min(1).max(15).step(.5).default(7.5).extra("extra", {
		order: 1,
		group: "stage",
		width: 1,
		tooltip: "Shape-stage guidance. 7.5 is the official template calibration.",
		families: ["pixal3d", "trellis2-native"]
	}),
	tex1_steps: z.number().description("Texture pass 1 steps").min(4).max(60).step(1).default(12).extra("extra", {
		order: 2,
		group: "stage",
		width: 1,
		tooltip: "First texture pass steps (upsampled latent, simple scheduler). 12 is the official calibration.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "number"
	}),
	tex1_cfg: z.number().description("Texture pass 1 CFG").min(1).max(15).step(.5).default(7.5).extra("extra", {
		order: 3,
		group: "stage",
		width: 1,
		tooltip: "First texture pass guidance. 7.5 is the official calibration.",
		families: ["pixal3d", "trellis2-native"]
	}),
	tex2_steps: z.number().description("Texture pass 2 steps").min(4).max(60).step(1).default(12).extra("extra", {
		order: 4,
		group: "stage",
		width: 1,
		tooltip: "Second texture pass steps (raw unet — the detail pass). 12 is the official calibration.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "number"
	}),
	tex2_cfg: z.number().description("Texture pass 2 CFG").min(1).max(15).step(.5).default(1).extra("extra", {
		order: 5,
		group: "stage",
		width: 1,
		tooltip: "Second texture pass guidance. 1.0 is the official calibration (near-verbatim detail sampling).",
		families: ["pixal3d", "trellis2-native"]
	}),
	remesh_resolution: z.number().description("Remesh resolution").min(128).max(2048).step(64).default(768).extra("extra", {
		order: 0,
		group: "mesh",
		width: 1,
		tooltip: "UDF remesh voxel resolution. 768 is the official calibration; lower = lighter mesh, coarser surface.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "number"
	}),
	decimate_faces: z.number().description("Decimate faces").min(1e4).max(2e6).step(1e4).default(7e5).extra("extra", {
		order: 1,
		group: "mesh",
		width: 1,
		tooltip: "Exact face count after decimation (midpoint placement). 700000 is the official calibration.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "number"
	}),
	smooth_angle: z.number().description("Smooth angle").min(0).max(180).step(5).default(180).extra("extra", {
		order: 2,
		group: "mesh",
		width: 1,
		tooltip: "Normal-smoothing crease angle, applied before unwrap and after texturing. 180 is the official calibration.",
		families: ["pixal3d", "trellis2-native"]
	}),
	atlas_size: vocabulary(["2048", "4096"]).description("Atlas size").default("4096").extra("extra", {
		order: 0,
		group: "bake",
		width: 1,
		tooltip: "Unwrap + baked color atlas resolution. 4096 is the official calibration (VRAM-heavy); 2048 is the lighter fallback.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "select"
	}),
	ao_size: vocabulary(["512", "1024"]).description("AO bake size").default("1024").extra("extra", {
		order: 1,
		group: "bake",
		width: 1,
		tooltip: "Ambient-occlusion bake resolution. 1024 is the official calibration.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "select"
	}),
	normal_size: vocabulary(["1024", "2048"]).description("Normal bake size").default("2048").extra("extra", {
		order: 2,
		group: "bake",
		width: 1,
		tooltip: "Normal-map bake resolution. 2048 is the official calibration.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "select"
	}),
	struct_sampler: SAMPLERS.description("Structure sampler").default("euler").extra("extra", {
		order: 0,
		group: "lab",
		width: 1,
		tooltip: "Structure-stage sampler. euler is the official template pick.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "select"
	}),
	struct_scheduler: SCHEDULERS.description("Structure scheduler").default("normal").extra("extra", {
		order: 1,
		group: "lab",
		width: 1,
		tooltip: "Structure-stage scheduler. normal is the official pick.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "select"
	}),
	shape_sampler: SAMPLERS.description("Shape sampler").default("euler").extra("extra", {
		order: 2,
		group: "lab",
		width: 1,
		tooltip: "Shape-stage sampler. euler is the official pick.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "select"
	}),
	shape_scheduler: SCHEDULERS.description("Shape scheduler").default("normal").extra("extra", {
		order: 3,
		group: "lab",
		width: 1,
		tooltip: "Shape-stage scheduler. normal is the official pick.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "select"
	}),
	tex1_sampler: SAMPLERS.description("Texture pass 1 sampler").default("euler").extra("extra", {
		order: 4,
		group: "lab",
		width: 1,
		tooltip: "First texture pass sampler. euler is the official pick.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "select"
	}),
	tex1_scheduler: SCHEDULERS.description("Texture pass 1 scheduler").default("simple").extra("extra", {
		order: 5,
		group: "lab",
		width: 1,
		tooltip: "First texture pass scheduler. simple is the official pick (the only non-normal scheduler in the template).",
		families: ["pixal3d", "trellis2-native"],
		wtype: "select"
	}),
	tex2_sampler: SAMPLERS.description("Texture pass 2 sampler").default("euler").extra("extra", {
		order: 6,
		group: "lab",
		width: 1,
		tooltip: "Second texture pass sampler. euler is the official pick.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "select"
	}),
	tex2_scheduler: SCHEDULERS.description("Texture pass 2 scheduler").default("normal").extra("extra", {
		order: 7,
		group: "lab",
		width: 1,
		tooltip: "Second texture pass scheduler. normal is the official pick.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "select"
	}),
	sd3_shift: z.number().description("SD3 shift").min(1).max(10).step(.5).default(5).extra("extra", {
		order: 8,
		group: "lab",
		width: 1,
		tooltip: "ModelSamplingSD3 shift on the structure arm. 5.0 is the official template calibration.",
		families: ["pixal3d", "trellis2-native"],
		wtype: "number"
	}),
	rescale_struct: z.number().description("Structure rescale").min(.1).max(1).step(.05).default(.7).extra("extra", {
		order: 9,
		group: "lab",
		width: 1,
		tooltip: "Structure-arm RescaleCFG multiplier. 0.7 is the official calibration.",
		families: ["pixal3d", "trellis2-native"]
	}),
	rescale_shape: z.number().description("Shape rescale").min(.1).max(1).step(.05).default(.5).extra("extra", {
		order: 10,
		group: "lab",
		width: 1,
		tooltip: "Shape-arm RescaleCFG multiplier (also feeds texture pass 1 — one node). 0.5 is the official calibration.",
		families: ["pixal3d", "trellis2-native"]
	}),
	override_struct: z.number().description("Structure override %").min(0).max(1).step(.001).default(.667).extra("extra", {
		order: 11,
		group: "lab",
		width: 1,
		tooltip: "Structure-arm CFGOverride start percent. 0.667 is the official calibration.",
		families: ["pixal3d", "trellis2-native"]
	}),
	override_shape: z.number().description("Shape override %").min(0).max(1).step(.001).default(.769).extra("extra", {
		order: 12,
		group: "lab",
		width: 1,
		tooltip: "Shape-arm CFGOverride start percent. 0.769 is the official calibration.",
		families: ["pixal3d", "trellis2-native"]
	})
});
const inject = ["comfyui"];
const identity = {
	label: "Generate 3D",
	description: "The 3D lane — lift one image into a textured mesh (.glb) on native TRELLIS.2 (DINOv3 conditioning) or native Pixal3D (pixel-aligned + MoGe camera FOV, hero tier), or copy a rig onto a target GLB (transfer_rig); one surface, one arm per family.",
	genre: "3d",
	icon: "box"
};
function apply(ctx) {
	ctx.effect(() => ctx.comfyui.registerCard({
		id: "img-to-mesh",
		skeleton: "img-to-mesh",
		boarded: [
			"pixal3d",
			"trellis2-native",
			"transfer_rig"
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
			requiresModel: false
		},
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
		schema,
		compose(p, model, g, runId) {
			const doc = schema(p);
			if (model.id === "transfer_rig") {
				const missing = [];
				if (!String(doc.rigged_glb || "").trim()) missing.push("rigged_glb");
				if (!String(doc.target_glb || "").trim()) missing.push("target_glb");
				if (missing.length > 0) {
					const label = {
						rigged_glb: "Rigged source GLB",
						target_glb: "Target GLB"
					};
					throw new Error(`required param(s) ${missing.map((m) => `'${m}' (${label[m]})`).join(", ")} missing on the transfer_rig lane — the rig copy needs the donor rig AND the clothed target`);
				}
				transferRigArm(g, doc);
				return;
			}
			admitMeshLift(doc, model);
			if (model.id === "pixal3d") pixalArm(g, doc, model);
			else trellisArm(g, doc, model);
		}
	}));
}
//#endregion
export { apply, identity, inject };
