import z from "@deepseek-ai/schemastery";
import { IMPACT_PACKS, declaredAction, instantiateAction } from "@melite/comfyui-card-kit";
import { stripAutofill } from "@melite/comfyui-card-kit/graph";
import { SAMPLERS, SCHEDULERS } from "@melite/comfyui-card-kit/vocab";
import { promptPairExtra, samplingExtra, seedExtra } from "@melite/comfyui-card-kit/fields";
import { callableSchema, gatedResolve } from "@melite/comfyui-card-kit/admission";
import { DECL } from "@melite/models-krea-2";
import { DECL as DECL$1 } from "@melite/models-z-image";
import { DECL as DECL$2 } from "@melite/models-anima";
import { DECL as DECL$3 } from "@melite/models-qwen-img-21";
import { DECL as DECL$4 } from "@melite/models-flux-klein";
import { semanticModelEntries } from "@melite/comfyui-card-kit/semanticModelKnob";
import { bag } from "@melite/contracts/extraKeys";
//#region src/card.ts
/** The card's boarding — where the card gets its models: THE AI
*  MODELS' own plugin declarations (packages/models/*), each
*  carrying its whole truth — variants, quant cells, HF artifact
*  links, mods, lane inputs. The id is spelled once, in the model
*  plugin; a rename breaks at tsc, never silently at the
*  not-boarded refusal. The model-knob enum, the tool default, and
*  the registry row all derive from this array. */
const BOARDED = [
	DECL.id,
	DECL$1.id,
	DECL$2.id,
	DECL$3.id,
	DECL$4.id
];
semanticModelEntries([
	DECL,
	DECL$1,
	DECL$2,
	DECL$3,
	DECL$4
]);
/** The action bindings (the atom vocabulary, stroke-1 pilot): a
*  boarded family with a bound action composes through the atom's
*  own declared segment — the card delegates, never authors nodes.
*  Keyed by the OWNING FAMILY (model.family, never model.id: six of
*  ten served addresses are route ids — a route-keyed lookup misses
*  and silently composes nothing). Every boarded family holds a
*  bound action; the binding per family is the card's declared
*  compose contract, never an id switch inside lane code. Exported
*  for the every-address wall: each served facts row's OWNING
*  family must hold a row here — a boarded-but-unbound family
*  refuses loud at the dispatch, never a silent miss. */
const IMAGE_GEN_STRIP = {
	CLIPLoader: ["device"],
	KSampler: ["control_after_generate"]
};
/** The card's autofill strip (the t2i family's pin defaults never ride). */
function finalizeImageGen(graph) {
	return stripAutofill(graph, IMAGE_GEN_STRIP);
}
const ACTION_BINDINGS = {
	[DECL.id]: (p, model, g, runId) => {
		instantiateAction(declaredAction(DECL, "t2i"), p, model, g, runId);
	},
	[DECL$1.id]: (p, model, g, runId) => {
		instantiateAction(declaredAction(DECL$1, "t2i"), p, model, g, runId);
	},
	[DECL$2.id]: (p, model, g, runId) => {
		instantiateAction(declaredAction(DECL$2, "t2i"), p, model, g, runId);
	},
	[DECL$3.id]: (p, model, g, runId) => {
		instantiateAction(declaredAction(DECL$3, "t2i"), p, model, g, runId);
	},
	[DECL$4.id]: (p, model, g, runId) => {
		instantiateAction(declaredAction(DECL$4, "t2i"), p, model, g, runId);
	}
};
const schema = z.object({
	prompt: z.string().description("Prompt").extra("extra", bag(promptPairExtra().prompt)),
	negative_prompt: z.string().description("Negative Prompt").extra("extra", bag(promptPairExtra().negative_prompt)),
	width: z.number().description("Width").min(256).max(2048).step(16).extra("extra", bag({
		order: 0,
		group: "resolution",
		columns: 2,
		width: 1,
		zone: "params",
		wtype: "number"
	})),
	height: z.number().description("Height").min(256).max(2048).step(16).extra("extra", bag({
		order: 1,
		group: "resolution",
		columns: 2,
		width: 1,
		zone: "params",
		wtype: "number"
	})),
	seed: z.number().description("Seed").step(1).default(-1).extra("extra", bag(seedExtra({
		order: 4,
		group: "sampling",
		width: 1,
		zone: "params"
	}))),
	steps: z.number().description("Steps").min(1).max(100).step(1).extra("extra", samplingExtra("steps")),
	cfg: z.number().description("Guidance Scale").min(1).max(20).step(.1).extra("extra", samplingExtra("cfg", { tooltip: "How closely the diffusion follows the prompt. Higher = stricter." })),
	sampler: SAMPLERS.description("Sampler").extra("extra", samplingExtra("sampler")),
	scheduler: SCHEDULERS.description("Scheduler").extra("extra", samplingExtra("scheduler")),
	reference_images: z.array(z.string()).description("Reference Images").extra("extra", bag({
		order: 9,
		group: "reference",
		width: 1,
		zone: "params",
		wtype: "image_list",
		tooltip: "Optional reference images — identity/subject anchors the qwen-img-21 encoder conditions on. Ignored-loud on other families: a stated list refuses rather than dropping."
	}))
});
const identity = {
	label: "Generate Image",
	description: "Text-to-image generation — the generate_image interface card",
	genre: "image",
	icon: "image",
	principles: [
		"prompt is required — an empty/whitespace prompt is rejected loud, never sampled with empty conditioning",
		"ONE param cascade (stroke 34 — the card-recipe layer is dead): schema defaults < model-folder defaults (the family rail resolves the model row) < your explicit values. Presets are FAMILY Recipe rows — one-click macros that stamp declared knobs/bags, never a persisted mode",
		"Sampler and scheduler option lists resolve from the ONE vocabulary (media.comfyui.sampler_vocab) — never hand-copied",
		"A preset fills untouched fields; values you have set win",
		"Mods are model-level declarations: loras ride krea-2 (apply on Turbo, train on Raw)",
		"Mask prep (grow/feather/threshold/invert) and outpaint pads are applied host-side before the run — no silent param drops"
	]
};
const schemaFn = callableSchema(schema);
/** Register the card face into the engine registry. The service
*  arrives as a parameter (index.ts probed it — comfyui is an
*  optional dependency, not an injected one). */
function registerCard(ctx, comfy) {
	ctx.effect(() => comfy.registerCard({
		id: "image-gen",
		skeleton: "generate",
		boarded: [...BOARDED],
		tags: [
			"image",
			"generate",
			"text-to-image"
		],
		identity,
		requires: [...IMPACT_PACKS],
		requiresByFamily: { [DECL$3.id]: [...IMPACT_PACKS] },
		sidebar: {
			key: "image",
			order: 1
		},
		flowKinds: {
			inputs: { prompt: "text" },
			outputs: { default: "image" },
			requiresModel: true
		},
		schema: schemaFn,
		compose(p, model, g, runId) {
			const doc = gatedResolve("image-gen", schemaFn, ["loras", "model"], p);
			if (!doc.prompt || !doc.prompt.trim()) throw new Error("required param 'prompt' missing or empty on the image-gen card (what the picture IS)");
			const statedRefs = doc.reference_images;
			if (Array.isArray(statedRefs) && statedRefs.length > 0 && (model.family ?? model.id) !== "qwen-img-21") throw new Error(`reference_images stated on family '${String(model.family ?? model.id)}' — the reference seat fires only on qwen-img-21 (its encoder reads references); this family has no reference port`);
			const bound = ACTION_BINDINGS[model.family ?? model.id];
			if (bound) {
				bound(doc, model, g, runId);
				return;
			} else throw new Error(`no declared action for family '${String(model.family ?? model.id)}' on the image-gen card — every boarded family (krea-2, z-image, anima, qwen-img-21, flux-klein) composes its own declared segment; this address owns none`);
		},
		finalize: finalizeImageGen
	}));
}
//#endregion
//#region src/index.ts
const name = "@melite/image-gen";
const inject = [];
const Config = z.object({ call: z.any() });
function apply(ctx, config) {
	const comfy = ctx.get("comfyui");
	if (comfy !== void 0) registerCard(ctx, comfy);
}
//#endregion
export { Config, apply, inject, name };
