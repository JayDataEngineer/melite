import z from "@deepseek-ai/schemastery";
import { maskT1 } from "@melite/comfyui-card-kit";
import { vocabulary } from "@melite/comfyui-card-kit/vocab";
//#region src/card.ts
const schema = z.object({
	input_image: z.string().role("path").description("Input image").extra("extra", {
		order: null,
		tooltip: "The photo to select from — absolute path or an artifact ref from a prior run.",
		required: true,
		wtype: "image"
	}),
	detect_mode: vocabulary([
		"body",
		"face",
		"hands"
	]).description("Detect").default("body").extra("extra", {
		order: 0,
		group: "detect",
		width: 1,
		tooltip: "What the primary selection targets. body → RT-DETR person boxes refined by SAM3; face/hands → SAM3 open-vocabulary text selection.",
		wtype: "select"
	}),
	detection_threshold: z.number().description("Detection threshold").min(.05).max(.95).step(.05).default(.35).extra("extra", {
		order: 1,
		group: "detect",
		width: 1,
		tooltip: "RT-DETR box confidence. Lower catches more instances, noisier boxes."
	}),
	sam_threshold: z.number().description("SAM3 threshold").min(.5).max(1).step(.01).default(.93).extra("extra", {
		order: 2,
		group: "detect",
		width: 1,
		tooltip: "SAM3 mask confidence."
	}),
	sam_dilation: z.number().description("Dilation (px)").min(0).max(64).step(1).default(0).extra("extra", {
		order: 3,
		group: "detect",
		width: 1,
		tooltip: "Grow the final mask N pixels — the inpaint bleed margin.",
		wtype: "slider"
	}),
	output_mode: vocabulary(["segm", "bbox"]).description("Output").default("segm").extra("extra", {
		order: 4,
		group: "detect",
		width: 1,
		tooltip: "segm saves masks; bbox saves the drawn-box manifest preview.",
		wtype: "select"
	}),
	instance_filter: z.string().description("Instance filter").default("all").extra("extra", {
		order: 5,
		group: "detect",
		tooltip: "'all' | 'largest' | comma indices '0,2' — which detected instances the primary keeps."
	}),
	max_instances: z.number().description("Max instances").min(0).max(100).step(1).default(0).extra("extra", {
		order: 6,
		group: "detect",
		tooltip: "Cap detected instances (0 = no cap). Read the manifest first, then filter.",
		wtype: "number"
	}),
	sam3_prompt: z.string().description("SAM3 prompt").extra("extra", {
		order: 0,
		group: "refine",
		tooltip: "Open-vocabulary text selection — e.g. 'the red hat', 'left shoe'. Rides INSTEAD of detect_mode when set.",
		wtype: "textarea"
	}),
	export_boxes: z.boolean().description("Export box manifest").default(true).extra("extra", {
		order: 0,
		group: "exports",
		tooltip: "Draw RT-DETR boxes on the image — the instance manifest (read it, then set instance_filter)."
	}),
	export_face: z.boolean().description("Export face mask").default(false).extra("extra", {
		order: 1,
		group: "exports"
	}),
	export_hands: z.boolean().description("Export hands mask").default(false).extra("extra", {
		order: 2,
		group: "exports"
	}),
	export_body: z.boolean().description("Export body mask").default(false).extra("extra", {
		order: 3,
		group: "exports"
	}),
	export_paint: z.boolean().description("Export paint mask").default(false).extra("extra", {
		order: 4,
		group: "exports",
		tooltip: "ON when a brush stroke exists — the painted payload becomes its own mask export."
	}),
	paint_mask: z.string().role("path").description("Paint payload").extra("extra", {
		order: 5,
		group: "exports",
		tooltip: "The painted PNG (alpha channel = strokes). Required when export_paint is true.",
		wtype: "image"
	}),
	roi: z.string().description("Scope ROI").extra("extra", {
		order: 0,
		group: "advanced",
		tooltip: "[x, y, w, h] fractions — run-global crop of every selection. Recipe filters may carry their own; identical scopes only."
	}),
	outputs: z.string().description("Recipe (outputs)").default("[]").extra("extra", {
		order: 1,
		group: "advanced",
		tooltip: "THE recipe form: one entry per mask, filter (where) over selection (how). Non-empty ⇒ overrides the flat params. See AGENT.md.",
		wtype: "textarea"
	})
});
const inject = ["comfyui"];
const PINS = {
	checkpoint: "sam3.1_multiplex_fp16.safetensors",
	unet: "rt_detr_v4-x-hgnet_fp32.safetensors"
};
const identity = {
	label: "Mask Studio",
	description: "Selection-only mask card: detect people/subjects, refine with SAM3, paint corrections → mask artifacts for inpaint flows.",
	genre: "image",
	icon: "mask"
};
const provisions = [{
	name: "rt_detr_v4-x-hgnet_fp32.safetensors",
	folder: "diffusion_models",
	url: "https://huggingface.co/Comfy-Org/SDPose/resolve/main/diffusion_models/rt_detr_v4-x-hgnet_fp32.safetensors",
	sha256: "1ba4a7794c2f8b176327c887ba38fbe0f977049cbef149960288aa923d0239f3"
}];
function apply(ctx) {
	ctx.effect(() => ctx.comfyui.registerCard({
		id: "mask-studio",
		skeleton: "mask-studio",
		boarded: [],
		tags: [
			"image",
			"mask",
			"edit"
		],
		requiresModel: false,
		identity,
		provisions,
		sidebar: {
			key: "image",
			order: 8
		},
		surface: { layout: "studio" },
		flowKinds: {
			inputs: { input_image: "image" },
			outputs: { default: "seg" },
			requiresModel: false
		},
		admits: [
			"export_kind",
			"exports",
			"primary_class",
			"primary_is_paint",
			"primary_via_rtdetr",
			"refine_iterations",
			"scope_bbox",
			"union_paint_into_combined"
		],
		schema,
		compose(p, _model, g, runId) {
			if (typeof p.input_image !== "string" || !p.input_image.trim()) throw new Error("required param 'input_image' missing on the mask-studio card — the mask lane selects FROM an image");
			maskT1(p, PINS, g, runId);
		}
	}));
}
//#endregion
export { apply, identity, inject, provisions };
