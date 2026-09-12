import z from "@deepseek-ai/schemastery";
import { finalizeIdeogram, ideogramLane } from "@melite/comfyui-card-kit";
import { SAMPLERS } from "@melite/comfyui-card-kit/vocab";
//#region src/card.ts
const schema = z.object({
	prompt: z.string().description("Prompt").extra("extra", {
		order: 0,
		group: "prompt",
		columns: 2,
		width: 1,
		required: true,
		wtype: "textarea"
	}),
	width: z.number().description("Width").min(256).max(2048).step(16).extra("extra", {
		order: 0,
		group: "resolution",
		columns: 3,
		width: 1,
		min: 256,
		max: 2048,
		wtype: "number"
	}),
	height: z.number().description("Height").min(256).max(2048).step(16).extra("extra", {
		order: 1,
		group: "resolution",
		width: 1,
		min: 256,
		max: 2048,
		wtype: "number"
	}),
	seed: z.number().description("Seed").step(1).default(-1).extra("extra", {
		order: 4,
		group: "resolution",
		width: 1
	}),
	steps: z.number().description("Steps").min(1).max(100).step(1).extra("extra", {
		order: 0,
		group: "sampling",
		width: 1,
		min: 1,
		max: 100,
		wtype: "number"
	}),
	cfg: z.number().description("Guidance Scale").min(1).max(20).step(.1).extra("extra", {
		order: 1,
		group: "sampling",
		width: 1,
		tooltip: "How closely the diffusion follows the prompt. Higher = stricter."
	}),
	mu: z.number().description("Mu").min(-10).max(10).step(.05).extra("extra", {
		order: 2,
		group: "sampling",
		width: 1,
		tooltip: "Ideogram4 scheduler mean shift — the official Default preset is 0.5."
	}),
	std: z.number().description("Std").min(.1).max(5).step(.05).extra("extra", {
		order: 3,
		group: "sampling",
		width: 1,
		tooltip: "Ideogram4 scheduler spread — the official Default preset is 1.75."
	}),
	sampler: SAMPLERS.description("Sampler").extra("extra", {
		order: 4,
		group: "sampling",
		width: 1,
		wtype: "select"
	})
});
const inject = ["comfyui"];
const identity = {
	label: "Ideogram",
	description: "Typography-aware text-to-image with clean, legible text rendering.",
	genre: "image",
	icon: "image",
	principles: [
		"prompt is required — an empty/whitespace prompt is rejected loud, never sampled with empty conditioning",
		"The negative channel is the zeroed conditioning (ConditioningZeroOut) — the official family graph has no negative text input",
		"mu/std ride the model defaults (merged at serve time); the universal form does not carry them as fields",
		"Sampler option lists resolve from the ONE vocabulary — never hand-copied"
	]
};
function apply(ctx) {
	ctx.effect(() => ctx.comfyui.registerCard({
		id: "ideogram4",
		skeleton: "generate",
		boarded: ["ideogram"],
		tags: [
			"image",
			"generate",
			"text-to-image"
		],
		identity,
		sidebar: {
			key: "image",
			order: 17,
			hidden: true
		},
		surface: {
			size: "huge",
			layout: "studio"
		},
		flowKinds: {
			inputs: { prompt: "text" },
			outputs: { default: "image" },
			requiresModel: false
		},
		schema,
		compose(p, model, g, runId) {
			if (!p.prompt || !p.prompt.trim()) throw new Error("required param 'prompt' missing or empty on the ideogram4 card (what the picture IS)");
			ideogramLane(p, model, g, runId);
		},
		finalize: finalizeIdeogram
	}));
}
//#endregion
export { apply, identity, inject };
