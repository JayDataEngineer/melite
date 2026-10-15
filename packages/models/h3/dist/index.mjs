import { fireControlNets } from "@melite/comfyui-card-kit/guard";
import { saveAudio } from "@melite/comfyui-card-kit";
import z from "@deepseek-ai/schemastery";
import { SAMPLER_OPTIONS, SCHEDULER_OPTIONS, vocabulary } from "@melite/comfyui-card-kit/vocab";
import { samplingExtra } from "@melite/comfyui-card-kit/fields";
import { bag } from "@melite/contracts/extraKeys";
import { stripAutofill } from "@melite/comfyui-card-kit/graph";
const REF_CAPS = {
	images: 8,
	videos: 3,
	audios: 3,
	refmods: 8
};
/** THE MEDIA-SHAPE PREDICATE (the guide seats' admission law, one
*  owner for every door that judges it): a guide value names MEDIA —
*  a $spell, a data: URI, a path/URL (slash), or an extension — never
*  a bare word. A bare word is a stage/card label (the UI picker's
*  run-899a8448 crime); it would compose a Load* the engine cannot
*  resolve. The schema's per-call guide gate and the keyframe pin
*  gate (actions.ts) share THIS predicate — one law, every guide
*  spelling. */
function isMediaRef(v) {
	return v.startsWith("$") || v.startsWith("data:") || v.includes("/") || /\.[A-Za-z0-9]+$/.test(v);
}
function transitionOverlap(transition) {
	return transition === "cut" ? 0 : 22;
}
function spanOverlap(span) {
	return transitionOverlap(span.transition);
}
function spanStanzaFrames(span, carry = 0) {
	const k = Math.round((span.end - span.start + carry - 22) / 17);
	return Math.min(362, Math.max(22, 22 + 17 * k));
}
function carriedSpanGrid(span, carry = 22) {
	const generatedStart = span.start - carry;
	const requestedLength = span.end - span.start + carry;
	const length = spanStanzaFrames(span, carry);
	const rawIndex = (requestedLength - 22) / 17;
	const maxIndex = 20;
	const lowerIndex = Math.max(0, Math.min(maxIndex, Math.floor(rawIndex)));
	const upperIndex = Math.max(0, Math.min(maxIndex, Math.ceil(rawIndex)));
	const endAt = (index) => generatedStart + 22 + 17 * index;
	return {
		generatedStart,
		generatedEnd: generatedStart + length,
		length,
		lowerEnd: endAt(lowerIndex),
		upperEnd: endAt(upperIndex)
	};
}
function assertCarriedSpanGrid(span, where, carry = 22) {
	const grid = carriedSpanGrid(span, carry);
	const requestedLength = span.end - span.start + carry;
	if (grid.length !== requestedLength) {
		const legal = grid.lowerEnd === grid.upperEnd ? `${grid.lowerEnd}` : `${grid.lowerEnd} and ${grid.upperEnd}`;
		throw new Error(`${where}: authored range ${span.start}→${span.end} cannot land on the 22+17k carried grid; generated snapped range ${grid.generatedStart}→${grid.generatedEnd}; legal neighboring end frames ${legal} (a carried window's span is 17f — its 22f seam is the generation head; a first or cut window is 22+17f)`);
	}
	return grid.length;
}
function gridSnap(length) {
	const k = Math.round((length - 22) / 17);
	return Math.min(362, Math.max(22, 22 + 17 * k));
}
/** THE GRID PREDICATE, one owner: a length the engine can render is
*  22+17k inside [22,362]. Every refusal door asks this question, so
*  knob pins, single windows, cut windows, and carried windows cannot
*  drift into different laws. */
function isGridLength(length) {
	return Number.isInteger(length) && length >= 22 && length <= 362 && (length - 22) % 17 === 0;
}
function assertGridLength(length, where) {
	if (typeof length !== "number" || !isGridLength(length)) {
		const nearest = typeof length === "number" && Number.isFinite(length) ? gridSnap(Math.min(362, Math.max(22, Math.round(length)))) : 124;
		throw new Error(`${where}: length ${String(length)}f is off-grid — the engine renders 22+17k frames in [22,362] (nearest legal: ${nearest}f); the doc-proven geometry is 0→124→243→362`);
	}
	return length;
}
/** THE UNIFORM SPAN GATE: one refusal for every window shape. A
*  carried window generates span+carry frames, so its authored span
*  must be 17k; a first or cut window generates its span verbatim, so
*  it must be 22+17k. Both are the same engine grid — a carried span
*  used to be the only shape that refused, while single/cut spans
*  were silently snapped (the old two-law gap, closed 2026-09-25).
*  `spanStanzaFrames` stays the render/film clock and is a no-op
*  identity for admitted spans. */
function assertSpanGrid(span, where, carry = 0) {
	if (carry > 0) return assertCarriedSpanGrid(span, where, carry);
	const length = span.end - span.start;
	if (!isGridLength(length)) throw new Error(`${where}: authored range ${span.start}→${span.end} has length ${length}f, which cannot land on the 22+17k grid (nearest legal: ${gridSnap(length)}f); the doc-proven geometry is 0→124→243→362 (a first or cut window is 22+17f; a carried window's span is 17f — its 22f seam is the generation head)`);
	return length;
}
function imageReferenceCap(hasLastFrame) {
	return hasLastFrame ? REF_CAPS.images - 1 : REF_CAPS.images;
}
function splitRefList(value) {
	if (!value) return [];
	const out = [];
	let i = 0;
	while (i < value.length) {
		while (i < value.length && (value[i] === "," || value[i] === " " || value[i] === "	")) i++;
		if (i >= value.length) break;
		const start = i;
		const isData = value.startsWith("data:", i);
		let mimeComma = false;
		while (i < value.length) {
			if (value[i] === ",") {
				if (isData && !mimeComma) {
					mimeComma = true;
					i++;
					continue;
				}
				break;
			}
			i++;
		}
		let end = i;
		while (end > start && (value[end - 1] === " " || value[end - 1] === "	")) end--;
		out.push(value.slice(start, end));
	}
	return out;
}
function normalizeDeclaredRefs(value) {
	if (Array.isArray(value)) return value.filter((entry) => typeof entry === "string" && entry.trim() !== "");
	if (typeof value === "string") return splitRefList(value);
	return [];
}
//#endregion
//#region src/schema.ts
const FAMILIES = [
	"t4r",
	"t4_open",
	"t4_chain"
];
const wireList = normalizeDeclaredRefs;
const H3_RECOMMENDED_SAMPLERS = [
	"euler",
	"euler_cfg_pp",
	"euler_ancestral",
	"dpmpp_2m",
	"dpmpp_2m_sde",
	"heun",
	"res_multistep",
	"res_multistep_cfg_pp",
	"er_sde",
	"seeds_2",
	"seeds_3"
];
const paramSchema = z.object({
	image: z.string().role("path").description("First frame (keyframe lanes)").extra("extra", bag({
		order: null,
		wtype: "image",
		tooltip: "Absolute path to the PNG the video must start on (first-frame anchoring). Optional for h3/h3-timeline."
	})),
	last_frame: z.string().role("path").description("Last frame (end anchor)").extra("extra", bag({
		order: null,
		wtype: "image",
		tooltip: "FL2VA end anchor — bundle input 2. Locks the final frame's pixels; H3 generates the motion between the two anchors."
	})),
	ref_images: z.array(z.string().role("path")).description("Reference images").max(REF_CAPS.images).extra("extra", bag({
		order: null,
		wtype: "image_list",
		max_stack: REF_CAPS.images,
		tooltip: "Loose references (identity, style, costume) → <Picture 3..9> via the bundle. 8 fills the bus; with a last frame set the cap is 7 (anchor + end + 7 = the 9-slot bus)."
	})),
	ref_videos: z.array(z.string().role("path")).description("Reference videos").max(REF_CAPS.videos).extra("extra", bag({
		order: null,
		wtype: "image_list",
		media: "video",
		max_stack: REF_CAPS.videos,
		tooltip: "Motion guides → <Video 1-3>: camera moves, timing, choreography."
	})),
	ref_video_trims: z.array(z.object({
		start_time: z.number().min(0).default(0).description("Start (s)"),
		duration: z.number().min(0).default(0).description("Duration (s)")
	})).max(REF_CAPS.videos).description("Reference video trims").extra("extra", bag({
		order: null,
		tooltip: "Per-video trims, index-paired with Reference videos — entry i slices guide i (start seconds + duration seconds) before conditioning. duration 0 = to the clip's end; an absent entry = the whole clip."
	})),
	ref_audios: z.array(z.string().role("path")).description("Reference audios").max(REF_CAPS.audios).extra("extra", bag({
		order: null,
		wtype: "image_list",
		media: "audio",
		max_stack: REF_CAPS.audios,
		tooltip: "Sound references → <Audio 1-3>: timbre, cadence, musical tone."
	})),
	ref_mods: z.array(z.string().role("path")).description("RefMods (reusable reference mods)").max(REF_CAPS.refmods).extra("extra", bag({
		order: null,
		wtype: "image_list",
		media: "mod",
		max_stack: REF_CAPS.refmods,
		tooltip: "Reusable reference mods → models/refmods/ (extracted identity/style/voice packs). Injected as reference tokens through all DiT blocks — strength 1 per mod; spends no bundle-bus slot, so it combines freely with the picture/video/audio references above. 8 max (the loader's slot count). Pack-documented limits, never silent: attributes can still mix across mods (identity, clothing, background, composition); strength blends, it never replaces outright; voice transfer does not work reliably (music references carry, speaker identity does not). A picked path commits its stem."
	})),
	duck_depth_db: z.number().description("Duck depth (dB)").min(-48).max(0).step(1).default(-14).extra("extra", bag({
		order: null,
		wtype: "number",
		columns: 2,
		width: 1,
		tooltip: "How far the generated voice ducks under a dialogue clip (−14 is the mix-desk default)."
	})),
	seed: z.number().description("Seed").step(1).default(42).extra("extra", bag({
		order: null,
		columns: 2,
		width: 1,
		tooltip: "Same seed across re-rolls = same world texture"
	})),
	width: z.number().description("Width").min(448).max(1344).step(64).default(1344).extra("extra", bag({
		order: null,
		wtype: "number",
		columns: 2,
		width: 1
	})),
	height: z.number().description("Height").min(448).max(768).step(64).default(768).extra("extra", bag({
		order: null,
		wtype: "number",
		columns: 2,
		width: 1
	})),
	length: z.number().description("Frames").min(22).max(362).step(17).default(56).extra("extra", bag({
		order: null,
		columns: 2,
		width: 1,
		tooltip: "17k+5 grid at 24fps: 56 = 2.33s, 124 = 5.17s, 362 = 15s",
		wtype: "number"
	})),
	steps: z.number().description("Steps").min(4).max(30).default(12).extra("extra", samplingExtra("steps", { tooltip: "12 for draft; 30 standard; a boarded distill lora applies its own steps (edit them on the lora entry)" })),
	second_pass_enabled: z.boolean().description("Second pass").default(false).extra("extra", bag({
		order: null,
		group: "second_pass",
		wtype: "boolean",
		tooltip: "Master switch for the entire post chain — FSR sharpening, FILM interpolation, SeedVR2 super-res, and the refine lora. Off (default) = the film lands straight from the sampler. On = the pass controls below arm."
	})),
	sharpen_enabled: z.boolean().description("FSR Sharpening").default(false).extra("extra", bag({
		order: null,
		group: "second_pass",
		visible_when: "second_pass_enabled=true",
		tooltip: "Apply AMD FidelityFX RCAS sharpening to the final output. Strength 0.3 looks natural."
	})),
	sharpen_strength: z.number().description("Sharpen Strength").min(0).max(1).step(.05).default(.3).extra("extra", bag({
		order: null,
		group: "second_pass",
		visible_when: "second_pass_enabled=true&sharpen_enabled=true",
		tooltip: "RCAS sharpening intensity. 0.3 = natural; 0.5 = crisp; 0.0 = off.",
		wtype: "number"
	})),
	interpolate_enabled: z.boolean().description("FILM Interpolation").default(false).extra("extra", bag({
		order: null,
		group: "second_pass",
		visible_when: "second_pass_enabled=true",
		wtype: "boolean",
		tooltip: "Apply FILM (Feature-aware Interpolation for Large Motion) frame interpolation to double the frame rate. Doubles render time."
	})),
	denoise: z.number().description("Denoise").min(0).max(1).step(.05).default(1).extra("extra", bag({
		order: 4,
		group: "sampling",
		columns: 2,
		width: 1,
		zone: "params",
		wtype: "number",
		tooltip: "How much of the latent the sampler rewrites. 1.0 = full denoise (fresh windows); lower inherits structure."
	})),
	sampler_name: vocabulary([...SAMPLER_OPTIONS.filter((n) => H3_RECOMMENDED_SAMPLERS.includes(n))]).description("Sampler").default("euler").extra("extra", samplingExtra("sampler", { tooltip: "The KSampler solver. euler family pairs with turbo adapters; res_multistep is the official-template solver; er_sde+beta is the Parasyte rec; seeds_2/3 are the dual-clock family." })),
	sched_name: vocabulary([...SCHEDULER_OPTIONS]).description("Scheduler").default("simple").extra("extra", samplingExtra("scheduler", { tooltip: "The sigma schedule shape." })),
	refine_lora: z.string().description("Refine lora").default("").extra("extra", bag({
		order: null,
		group: "second_pass",
		visible_when: "second_pass_enabled=true",
		wtype: "select",
		optionsFrom: "loras",
		tooltip: "Catalog id of a refiner lora (e.g. h3_taomate_3step). Empty = no refine pass. Strength/steps default from the row. LORAS ARE ONLY MODS — the pick serves from the loras flavor rows, never a hand-spelled id (the compose door refuses unknown ids loud)."
	})),
	refine_strength: z.number().description("Refine strength").min(0).max(2).step(.05).extra("extra", bag({
		order: null,
		group: "second_pass",
		visible_when: "second_pass_enabled=true",
		wtype: "number",
		tooltip: "Override the refiner row's strength. Rides only when refine_lora is set."
	})),
	refine_steps: z.number().description("Refine steps").min(1).max(10).step(1).extra("extra", bag({
		order: null,
		group: "second_pass",
		visible_when: "second_pass_enabled=true",
		wtype: "number",
		tooltip: "Override the refiner row's step count (taomate: 3). Rides only when refine_lora is set."
	})),
	attention_backend: vocabulary(["comfy kitchen attention", "pytorch attention"]).description("Attention backend").default("comfy kitchen attention").extra("extra", bag({
		order: null,
		group: "sampling",
		wtype: "select",
		tooltip: "The non-SLA arm's ModelAttentionBackend — used when the SLA sparse attention switch (Sla group) is OFF. ck-kitchen is the estate-proven default; pytorch is the engine's enumerated literal."
	})),
	interp_model: vocabulary(["film_net_fp16.safetensors", "rife47.pth"]).description("Interp model").default("film_net_fp16.safetensors").extra("extra", bag({
		order: null,
		group: "second_pass",
		visible_when: "second_pass_enabled=true&interpolate_enabled=true",
		wtype: "select",
		tooltip: "FILM or RIFE frame-interpolation weights."
	})),
	interp_multiplier: z.number().description("Interp multiplier").min(2).max(4).step(1).default(2).extra("extra", bag({
		order: null,
		group: "second_pass",
		visible_when: "second_pass_enabled=true&interpolate_enabled=true",
		wtype: "number",
		tooltip: "Frame multiple (2 = double the frame rate)."
	})),
	sr_switch: z.boolean().description("Super-Res (SeedVR2)").default(false).extra("extra", bag({
		order: null,
		group: "second_pass",
		visible_when: "second_pass_enabled=true",
		tooltip: "Upscale the final film through SeedVR2 before saving."
	})),
	sr_resolution: z.number().description("Super-Res target").min(720).max(2160).step(360).default(1080).extra("extra", bag({
		order: null,
		group: "second_pass",
		visible_when: "second_pass_enabled=true&sr_switch=true",
		wtype: "number",
		tooltip: "The SeedVR2 output height in px."
	})),
	sr_model: vocabulary(["seedvr2_ema_3b_fp16.safetensors", "seedvr2_ema_3b_fp8_e4m3fn.safetensors"]).description("Super-Res model").default("seedvr2_ema_3b_fp16.safetensors").extra("extra", bag({
		order: null,
		group: "second_pass",
		visible_when: "second_pass_enabled=true&sr_switch=true",
		wtype: "select",
		tooltip: "SeedVR2 weights (models/upscale_models/): fp16 3B default, fp8_e4m3fn 3B leaner."
	})),
	ref_image_size: z.union([
		z.const("match"),
		z.const("max"),
		z.string().pattern(/^\d+x\d+$/).description("WxH")
	]).description("Ref size").default("match").extra("extra", bag({
		order: null,
		group: "sampling",
		wtype: "select",
		tooltip: "How the bundle resizes ref images: match the anchor, take the max edge, or an explicit WxH."
	})),
	shift_video: z.number().description("Video Shift").min(1).max(20).step(.5).default(8).extra("extra", bag({
		order: 5,
		group: "sampling",
		columns: 2,
		width: 1,
		zone: "params",
		wtype: "number",
		tooltip: "Timestep shift for video attention. Higher = more coherent motion."
	})),
	shift_audio: z.number().description("Audio Shift").min(1).max(10).step(.5).default(3).extra("extra", bag({
		order: 6,
		group: "sampling",
		columns: 2,
		width: 1,
		zone: "params",
		wtype: "number",
		tooltip: "Timestep shift for audio attention. Lower = more detailed sound."
	})),
	sla_enabled: z.boolean().description("SLA sparse attention").default(true).extra("extra", bag({
		order: null,
		group: "sla",
		tooltip: "Block-sparse attention on the DiT (the primary speed arm, ~1.75x). Off falls back to the Attention backend row."
	})),
	sla_sparsity: z.number().description("SLA sparsity").min(0).max(.95).step(.05).default(.9).extra("extra", bag({
		order: null,
		group: "sla",
		visible_when: "sla_enabled=true",
		wtype: "slider",
		tooltip: "Block-sparse attention density. 0.90 ≈ 1.75x speedup, no quality loss."
	})),
	sla_block_size: vocabulary([
		"32",
		"64",
		"128"
	]).description("SLA block size").default("32").extra("extra", bag({
		order: null,
		group: "sla",
		visible_when: "sla_enabled=true",
		wtype: "select",
		tooltip: "64 = clean audio; 128 = faster, robotic."
	})),
	sla_min_seq_len: z.number().description("SLA min seq length").min(512).step(512).default(12288).extra("extra", bag({
		order: null,
		group: "sla",
		visible_when: "sla_enabled=true",
		wtype: "number",
		tooltip: "Sequences shorter than this skip sparsity."
	})),
	sla_dense_last_steps: z.number().description("SLA dense last steps").min(0).max(10).step(1).default(1).extra("extra", bag({
		order: null,
		group: "sla",
		visible_when: "sla_enabled=true",
		wtype: "number",
		tooltip: "Final steps run dense for convergence."
	})),
	sla_dense_steps: z.string().description("SLA dense steps (explicit)").default("0").extra("extra", bag({
		order: null,
		group: "sla",
		visible_when: "sla_enabled=true",
		tooltip: "e.g. 0,1 or 0-2 — explicit dense step indices."
	})),
	sla_dense_backend: vocabulary([
		"comfy_kitchen",
		"pytorch",
		"auto"
	]).description("SLA dense backend").default("comfy_kitchen").extra("extra", bag({
		order: null,
		group: "sla",
		visible_when: "sla_enabled=true",
		wtype: "select"
	})),
	sla_reference_protection: vocabulary([
		"Off",
		"Light",
		"Heavy Enforcement"
	]).description("SLA ref protection").default("Heavy Enforcement").extra("extra", bag({
		order: null,
		group: "sla",
		visible_when: "sla_enabled=true",
		wtype: "select",
		tooltip: "Protects reference frames from sparse-attention drift."
	})),
	sla_protect_audio: z.boolean().description("SLA protect audio").default(true).extra("extra", bag({
		order: null,
		group: "sla",
		visible_when: "sla_enabled=true",
		tooltip: "Keep the audio stream out of the sparse path."
	})),
	sla_stabilize_motion: z.boolean().description("SLA stabilize motion").extra("extra", bag({
		order: null,
		group: "sla",
		visible_when: "sla_enabled=true",
		tooltip: "Default on except t4r openers (the family-conditional compose fallback stays the truth at run)."
	})),
	sla_disable_fp16_accum: z.boolean().description("SLA full-precision accum").default(true).extra("extra", bag({
		order: null,
		group: "sla",
		visible_when: "sla_enabled=true",
		tooltip: "Full-precision accumulation inside the sparse kernel."
	})),
	sharpen_method: vocabulary([
		"rcas",
		"adaptive_usm",
		"high_pass",
		"deconvolution"
	]).description("Sharpen Method").extra("extra", bag({
		order: null,
		group: "second_pass",
		visible_when: "second_pass_enabled=true&sharpen_enabled=true",
		wtype: "select"
	})),
	sharpen_radius: z.number().description("Sharpen Radius").min(.5).max(5).step(.5).extra("extra", bag({
		order: null,
		group: "second_pass",
		visible_when: "second_pass_enabled=true&sharpen_enabled=true&sharpen_method=adaptive_usm|high_pass|deconvolution",
		wtype: "number",
		tooltip: "adaptive_usm / high_pass / deconvolution only."
	})),
	sharpen_threshold: z.number().description("Sharpen Noise Gate").min(0).max(1).step(.05).extra("extra", bag({
		order: null,
		group: "second_pass",
		visible_when: "second_pass_enabled=true&sharpen_enabled=true&sharpen_method=adaptive_usm",
		wtype: "number",
		tooltip: "adaptive_usm only."
	})),
	sharpen_iterations: z.number().description("Sharpen Iterations").min(1).max(100).step(1).extra("extra", bag({
		order: null,
		group: "second_pass",
		visible_when: "second_pass_enabled=true&sharpen_enabled=true&sharpen_method=deconvolution",
		wtype: "number",
		tooltip: "deconvolution only."
	})),
	k: z.number().description("Window index (film vocabulary)").step(1).extra("extra", bag({ hidden: true })),
	noise_seed: z.number().description("Per-window noise seed").step(1).extra("extra", bag({ hidden: true })),
	fps_seconds: z.number().description("Clip seconds (fps rail)").min(1).max(60).default(10).extra("extra", bag({
		order: null,
		wtype: "number",
		tooltip: "The clip's duration in seconds (the fps rail's duration primitive)."
	})),
	interp_switch: z.boolean().description("Interpolate switch (legacy alias)").extra("extra", bag({ hidden: true })),
	sharpen_switch: z.boolean().description("Sharpen switch (legacy alias)").extra("extra", bag({ hidden: true })),
	sla_switch: z.boolean().description("SLA switch (legacy alias)").extra("extra", bag({ hidden: true })),
	image_name: z.string().role("path").description("Guide image (renderer alias)").extra("extra", bag({
		hidden: true,
		tooltip: "The renderer's guide-image spelling — gate-admitted for old docs; the rail's First frame is the user face."
	}))
});
//#endregion
//#region mods/loras.ts
const H3_LORA_ROWS = [
	{
		id: "h3_lightx2v_dareties",
		filename: "h3/minimax_h3_fl2v_lightx2v_v0.1_dareties_v4_step600_comfy_fro.safetensors",
		source_url: "https://huggingface.co/silveroxides/MiniMax-H3_tests/resolve/main/minimax_h3_fl2v_lightx2v_v0.1_dareties_v4_step600_comfy_fro.safetensors",
		label: "LightX2V dareties v4",
		category: "distill",
		default_strength: .8,
		steps: 4
	},
	{
		id: "h3_lightx2v_turbo",
		filename: "h3/minimax_h3_fl2v_lightx2v_turbo_4to8step_v0.1-v1.0_768p_v4_step600_dareties.safetensors",
		source_url: "https://huggingface.co/silveroxides/MiniMax-H3_tests/resolve/main/experimental/minimax_h3_fl2v_lightx2v_turbo_4to8step_v0.1-v1.0_768p_v4_step600_dareties.safetensors",
		label: "LightX2V Turbo 4-8 step",
		category: "distill",
		default_strength: .6,
		steps: 8,
		steps_min: 4,
		steps_max: 8
	},
	{
		id: "h3_turbo4_v1",
		filename: "h3/minimax_h3_fl2v_turbo_4step_v1.0_768p_comfyui_bf16.safetensors",
		source_url: "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/loras/minimax_h3_fl2v_turbo_4step_v1.0_768p_comfyui_bf16.safetensors",
		label: "LightX2V Turbo 4-Step v1.0 (768p)",
		category: "distill",
		default_strength: 1,
		steps: 4
	},
	{
		id: "h3_turbo8_v1",
		filename: "h3/minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors",
		source_url: "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/loras/minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors",
		label: "LightX2V Turbo 8-Step v1.0",
		category: "distill",
		default_strength: 1,
		steps: 8
	},
	{
		id: "h3_ref2v_turbo4",
		filename: "h3/minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors",
		source_url: "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/loras/minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors",
		label: "LightX2V Ref Turbo 4-Step v0.1",
		category: "distill",
		default_strength: 1,
		steps: 4
	},
	{
		id: "h3_acc8_fl2va",
		filename: "h3/MiniMax-H3-FL2VA-Acc-8Step_pruned_comfy.safetensors",
		source_url: "https://huggingface.co/Kijai/MiniMax-H3-experimental/resolve/main/loras/MiniMax-H3-FL2VA-Acc-8Step_pruned_comfy.safetensors",
		label: "Kijai FL2VA Acc 8-Step",
		category: "distill",
		default_strength: 1,
		steps: 8
	},
	{
		id: "h3_acc8_ref2va",
		filename: "h3/MiniMax-H3-Ref2VA-Acc-8Step_pruned_comfy.safetensors",
		source_url: "https://huggingface.co/Kijai/MiniMax-H3-experimental/resolve/main/loras/MiniMax-H3-Ref2VA-Acc-8Step_pruned_comfy.safetensors",
		label: "Kijai Ref2VA Acc 8-Step",
		category: "distill",
		default_strength: 1,
		steps: 8
	},
	{
		id: "h3_larryvrh_v4_ema",
		filename: "h3/minimax_h3_turbo_v4_step600_ema.safetensors",
		source_url: "https://huggingface.co/larryvrh/MiniMax-H3-Turbo-Lora/resolve/main/minimax_h3_turbo_v4_step600_ema.safetensors",
		label: "Larryvrh Turbo v4-600 EMA",
		category: "distill",
		default_strength: 1,
		steps: 6,
		steps_min: 4,
		steps_max: 8
	},
	{
		id: "h3_pk_parasyte",
		filename: "h3/H3-PK-Parasyte-Turbo.safetensors",
		source_url: "https://huggingface.co/Plaguekind/H3-Lora/resolve/main/H3-PK-Parasyte-Turbo.safetensors",
		label: "PK Parasyte Turbo",
		category: "distill",
		default_strength: 1.5,
		steps: 8,
		steps_min: 6,
		steps_max: 8
	},
	{
		id: "h3_dmad_4step",
		filename: "h3/dmad_minimax_h3_4step_lora_critic_comfyui.safetensors",
		source_url: "https://huggingface.co/ZhengmingYu/DMAD/resolve/main/minimax_h3/dmad_minimax_h3_4step_lora_critic_comfyui.safetensors",
		label: "DMAD 4-Step (ByteDance/TAMU)",
		category: "distill",
		default_strength: 1,
		steps: 4
	},
	{
		id: "h3_taomate_3step",
		filename: "h3/minimax_h3_taomate_3step_lora_avg_rank_19_bf16.safetensors",
		source_url: "https://huggingface.co/Kijai/MiniMax-H3_comfy/resolve/main/loras/minimax_h3_taomate_3step_lora_avg_rank_19_bf16.safetensors",
		label: "TaoMate 3-Step (refiner)",
		category: "distill",
		default_strength: .7,
		steps: 3
	}
];
//#endregion
//#region src/filmMix.ts
/** Parse raw audio_clips rows — the card's one law for what a clip
*  IS: a src without a numeric start_frame refuses loud (never a
*  silent misplacement); a row without src is junk and skips; the
*  class auto law (text → dialogue, textless → music) rides here. */
function parseFilmMixClips(rows) {
	const clips = [];
	const INT_STRING = /^[+-]?\d+$/;
	const wireInt = (x) => typeof x === "string" && INT_STRING.test(x.trim()) ? Number(x.trim()) : x;
	for (const c of rows) {
		if (c === null || typeof c !== "object") continue;
		const row = c;
		row["start_frame"] = wireInt(row["start_frame"]);
		row["dur_frames"] = wireInt(row["dur_frames"]);
		const src = typeof row.src === "string" ? row.src.trim() : "";
		if (src === "") {
			if (row.start_frame !== void 0 || row.dur_frames !== void 0 || typeof row.text === "string" && row.text.trim() !== "" || typeof row.class === "string" && row.class.trim() !== "" || typeof row.id === "string" && row.id.trim() !== "" || typeof row.name === "string" && row.name.trim() !== "") throw new Error("audio_clips: a positioned clip row has no src — the film mix cannot place a source-less row");
			continue;
		}
		if (typeof row.start_frame !== "number" || !Number.isFinite(row.start_frame)) throw new Error(`audio_clips: a clip with src but no numeric start_frame — the audio lanes own placement (re-add the clip)`);
		const dur = typeof row.dur_frames === "number" && Number.isFinite(row.dur_frames) && row.dur_frames > 0 ? row.dur_frames : 0;
		const text = typeof row.text === "string" ? row.text.trim() : "";
		const clsRaw = typeof row.class === "string" ? row.class.trim().toLowerCase() : "";
		if (clsRaw !== "" && clsRaw !== "dialogue" && clsRaw !== "sfx" && clsRaw !== "music") throw new Error(`audio_clips: unknown class "${clsRaw}" — dialogue | sfx | music (omit for auto: text → dialogue, else music)`);
		const cls = clsRaw !== "" ? clsRaw : text !== "" ? "dialogue" : "music";
		clips.push({
			src,
			start: row.start_frame,
			dur,
			text,
			cls
		});
	}
	return clips;
}
const round3 = (v) => Math.round(v * 1e3) / 1e3;
/** The duck span string — "start:end" at ms precision, ';'-joined. */
function formatDuckSpan(start, end) {
	return `${round3(start)}:${round3(end)}`;
}
/** Per-window stanza seconds — THE compose-time windowSecs
*  (computeFilmMix's ground truth): the render grid's own promise,
*  the deliverer's contract — SaveVideo hands back exactly stanza
*  frames at 24fps. No probe, no disk: the clock is pure at
*  compose. RAW fractions (frames/24, unrounded): the manifest sums
*  these into film starts, and rounding a SUM of rounded parts
*  compounds drift (the 3-window seat 7.416 ≠ 7.417 proof) — only
*  the final seats/spans round (ms, computeFilmMix's own law). */
function stanzaSecs(spans) {
	return spans.map((s, i) => spanStanzaFrames(s, i > 0 ? spanOverlap(s) : 0) / 24);
}
function computeFilmMix(input) {
	const { spans, clips, windowSecs } = input;
	if (windowSecs.length !== spans.length) throw new Error(`film mix: ${windowSecs.length} window duration(s) for ${spans.length} span(s) — the owner map needs one duration per window (never a guess)`);
	const overlaps = spans.map(spanOverlap);
	const filmStarts = [];
	let elapsed = 0;
	for (let i = 0; i < spans.length; i++) {
		filmStarts.push(elapsed);
		elapsed += windowSecs[i] - (i > 0 ? overlaps[i] : 0) / 24;
	}
	const filmSec = round3(elapsed);
	const conditioned = /* @__PURE__ */ new Set();
	spans.forEach((span, i) => {
		if (!Number.isFinite(span.start) || !Number.isFinite(span.end) || span.end <= span.start) return;
		const carry = i > 0 ? overlaps[i] : 0;
		const genStart = span.start - carry;
		const won = {};
		for (let ci = 0; ci < clips.length; ci++) {
			const clip = clips[ci];
			if (clip.dur <= 0) continue;
			if (won[clip.cls] !== void 0) continue;
			const lo = Math.max(clip.start, genStart);
			if (Math.min(clip.start + clip.dur, span.end) - lo < 2.4) continue;
			won[clip.cls] = true;
			conditioned.add(ci);
		}
	});
	const placements = clips.map((clip, ci) => {
		let owner = 0;
		for (let w = 0; w < spans.length; w++) if (clip.start >= spans[w].start) owner = w;
		const filmSeat = Math.max(0, filmStarts[owner] + (clip.start - spans[owner].start) / 24);
		return {
			clip: ci,
			cls: clip.cls,
			filmSec: round3(filmSeat),
			durSec: clip.dur > 0 ? round3(clip.dur / 24) : 0
		};
	});
	const spanOf = (ci) => {
		const pl = placements[ci];
		if (!conditioned.has(ci) || pl.durSec <= 0) return null;
		return {
			start: pl.filmSec,
			end: round3(pl.filmSec + pl.durSec)
		};
	};
	const duckSpans = [];
	const musicDuckSpans = [];
	for (let ci = 0; ci < clips.length; ci++) {
		const s = spanOf(ci);
		if (s === null) continue;
		duckSpans.push(s);
		if (clips[ci].cls !== "music") musicDuckSpans.push(s);
	}
	const duckDb = typeof input.duckDb === "number" && Number.isFinite(input.duckDb) ? input.duckDb : -14;
	return {
		placements,
		duckSpans,
		musicDuckSpans,
		duckSpanString: duckSpans.map((s) => formatDuckSpan(s.start, s.end)).join(";"),
		musicDuckSpanString: musicDuckSpans.map((s) => formatDuckSpan(s.start, s.end)).join(";"),
		duckDb,
		filmSec
	};
}
//#endregion
//#region src/actions.ts
const loraStackDefault = () => {
	const row = H3_LORA_ROWS.find((r) => r.id === "h3_dmad_4step");
	if (row === void 0) throw new Error("h3 action: the lora catalog has no 'h3_dmad_4step' row — the absent-bag default has no source; fix the catalog row id");
	return JSON.stringify([{
		on: true,
		lora: row.filename,
		str: row.default_strength,
		v: 1,
		a: 1,
		t: 1
	}]);
};
const MATH_STEPS_GOLD = `max(5, round(a * 24)) + (5 - (max(5, round(a * 24)) % 17)) % 17`;
const I2V_MARKER_PROMPT = "i2v marker branch — orphaned, never executed (r2v is the only lane)";
const SHARPEN_DEFAULTS = {
	method: "rcas",
	strength: .3,
	radius: 1,
	threshold: .05,
	iterations: 10
};
/** The family's lane files that are NOT engine-general members
* (the complexity floor's stroke 1): the encoder and the two VAEs
* are invariants of THIS package's lane — no variant varies them,
* so they live beside the parser that reads them, never in a row
* a family could drift. The unet alone rides the DECL row: quants
* and hybrids vary it per route. sr_vae is the seedvr2_ema DECL's
* own row (its lane_inputs.vae) duplicated HERE as the invariant
* the super-resolution branch loads — the sr_model DiT rides the
* param enum instead (joined to the engine combo), and this const
* is the one home the VAE filename owns in this package (the
* video drift audit, 2026-10-13: a bare literal at the node seat
* was a second copy nobody owned). */
const LANE_FILES = {
	clip: "qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
	vae_video: "minimax_h3_video_vae_int8_convrot.safetensors",
	vae_audio: "minimax_h3_audio_vae_fp32.safetensors",
	sr_vae: "ema_vae_fp16.safetensors"
};
/** The film mux's bit depth — ONE home for the CreateVideo literal
* the four join seats wire (the video drift audit, 2026-10-13: a
* bare 8 at each seat was four copies of one truth). The engine's
* combo admits ["auto", 8, 10]; the estate always renders an exact
* 8-bit mp4 (the h264 pipeline's own depth), never "auto" — a
* deliberate pin, changed only here. */
const FILM_BIT_DEPTH = 8;
function parseH3Facts(raw) {
	const unet = (raw ?? {}).unet;
	if (typeof unet !== "string" || unet.trim() === "") throw new Error(`h3 film: lane_inputs.unet = ${JSON.stringify(unet)} — a non-empty string is required`);
	return {
		unet,
		clip: LANE_FILES.clip,
		vae_video: LANE_FILES.vae_video,
		vae_audio: LANE_FILES.vae_audio
	};
}
/** The overlay re-check the film loop voices per stanza (the same
*  carrier the card's compose gate walks — ONE schema, imported).
*  Exported so the card's single-call lift judges through the same
*  re-check (the h3-b duplicate is gone: one owner). */
const assertOverlayGated = (doc, where) => {
	try {
		paramSchema(doc);
	} catch (e) {
		throw new Error(`${where}: ${String(e)}`);
	}
};
/** THE MERGED FILM: ONE prompt, N windows under `window${k}_`
*  scopes (GraphBuilder.scoped), with real seam edges between scopes
*  (the executor orders windows off the graph) and per-window
*  stanzas in the renderer vocabulary (k, ctx_save_clip_index, the
*  per-call knobs REPLACE, the span rider per window). The seam is
*  the studio's document law (docModel): transition 'extend' (absent
*  = extend) chains the previous LATENT; 'cut' is a fresh window, and
*  'cut' + first_frame_prev_sec opens from the previous VIDEO tail
*  (the node's context_frames arm). prev_sec scales the carry:
*  picture snapped to the node's legal context lengths (5/22/39/56
*  frames — only whole latent steps), audio at 24 frames/second. */
function renderH3Film(p, g, facts, model) {
	const calls = p.calls;
	const str = (v) => typeof v === "string" ? v : "";
	const num = (v) => typeof v === "number" && Number.isFinite(v) ? v : null;
	let prev;
	const windowSaves = [];
	const clips = parseFilmMixClips(Array.isArray(p.audio_clips) ? p.audio_clips : []);
	const spans = calls.map((c) => ({
		start: c.start_frame,
		end: c.end_frame,
		transition: str(c.transition)
	}));
	const loraStepsList = (Array.isArray(p.loras) ? p.loras : []).map((r) => r.steps).filter((v) => typeof v === "number" && Number.isFinite(v));
	const loraStepsApplied = loraStepsList.length > 0 ? Math.max(...loraStepsList) : null;
	calls.forEach((call, i) => {
		const k = i + 1;
		const guide = str(call.image ?? call.ref_image ?? call.image_name);
		let text = typeof call.text === "string" ? call.text.trim() : "";
		if (text === "") throw new Error(`calls[${i}]: a call needs its own text — the film-level prompt is not a fallback (write the shot's text on the call)`);
		const overlap = transitionOverlap(typeof call.transition === "string" ? call.transition : void 0);
		const knobs = call.knobs ?? {};
		const rb = call.refs ?? {};
		const hasRefs = wireList(p.ref_images).length + wireList(p.ref_videos).length + wireList(p.ref_audios).length + wireList(rb.images).length + wireList(rb.videos).length + wireList(rb.audios).length > 0;
		const chainLike = i > 0 && overlap > 0;
		const sf = num(call.start_frame);
		const ef = num(call.end_frame);
		const stamps = {};
		if (sf !== null && ef !== null && Number.isFinite(sf) && Number.isFinite(ef) && ef > sf) {
			const genStart = sf - (i > 0 ? overlap : 0);
			for (let ci = 0; ci < clips.length; ci++) {
				const clip = clips[ci];
				if (clip.dur <= 0) continue;
				if (stamps[clip.cls] !== void 0) continue;
				const lo = Math.max(clip.start, genStart);
				const hi = Math.min(clip.start + clip.dur, ef);
				if (hi - lo < 2.4) continue;
				const ms = (frames) => Math.round(frames / 24 * 1e3) / 1e3;
				stamps[clip.cls] = {
					src: clip.src,
					slice_start_seconds: ms(Math.max(0, genStart - clip.start)),
					slice_duration_seconds: ms(hi - lo),
					delay_seconds: ms(Math.max(0, clip.start - genStart)),
					text: clip.text
				};
			}
		}
		const stampClock = (t) => {
			return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}.${String(Math.round(t % 1 * 1e3)).padStart(3, "0")}`;
		};
		const soundscapeSentences = [];
		if (stamps.dialogue !== void 0 && stamps.dialogue.text !== "") {
			const t = stampClock(stamps.dialogue.delay_seconds);
			soundscapeSentences.push(`At ${t}, the on-screen speaker says the line below, mouth visible and articulating the words; room tone continues underneath.\nThe line: <d>[English] ${stamps.dialogue.text}</d>`);
		}
		if (stamps.sfx !== void 0 && stamps.sfx.text !== "") {
			const sfxText = stamps.sfx.text.replace(/^\s*at\s+\d{1,2}:\d{2}(?:\.\d{1,3})?\s*[,-]\s*/i, "");
			soundscapeSentences.push(`At ${stampClock(stamps.sfx.delay_seconds)}, ${sfxText}`);
		}
		if (soundscapeSentences.length > 0) text = text.replace(/\s+$/, "") + "\n\noverall_soundscape:\n" + soundscapeSentences.join("\n");
		if (stamps.music !== void 0 && stamps.music.text !== "") text = text.replace(/\s+$/, "") + `\n\nnon_diegetic_music:\n${stamps.music.text}`;
		const hearsRefAudio = !(stamps.dialogue !== void 0 || stamps.sfx !== void 0) && (wireList(p.ref_audios).length > 0 || wireList(rb.audios).length > 0);
		if (stamps.dialogue === void 0 && !hearsRefAudio && !/\bno[\s_-]*(speech|dialogue|voice)/i.test(text)) text = text.replace(/\s+$/, "") + "\n\noverall_soundscape:\nNo speech or dialogue in this shot — ambient and effects only; nobody speaks on screen and there is no voice-over.";
		const stanza = {
			...p,
			...knobs,
			prompt: text,
			k
		};
		if (typeof call.last_frame === "string" && call.last_frame.trim() !== "") stanza.last_frame = call.last_frame;
		if (wireList(call.ref_images).length > 0) stanza.ref_images = call.ref_images;
		if (wireList(call.ref_videos).length > 0) stanza.ref_videos = call.ref_videos;
		if (wireList(call.ref_audios).length > 0) stanza.ref_audios = call.ref_audios;
		const hasDirectRefs = wireList(call.ref_images).length + wireList(call.ref_videos).length + wireList(call.ref_audios).length > 0 || typeof call.last_frame === "string" && call.last_frame.trim() !== "";
		const anyStamp = stamps.dialogue !== void 0 || stamps.sfx !== void 0 || stamps.music !== void 0;
		const winPins = (p.__keyframe_pins ?? {})[String(k)] ?? [];
		stanza.variant = guide !== "" || hasRefs || hasDirectRefs || anyStamp || winPins.length > 0 ? "t4r" : chainLike ? "t4_chain" : "t4_open";
		if (knobs.steps === void 0 && loraStepsApplied !== null) stanza.steps = loraStepsApplied;
		const voicePinned = stamps.dialogue !== void 0 || stamps.sfx !== void 0;
		if (voicePinned) delete stanza.ref_audios;
		const callMods = wireList(rb.mods);
		if (hasRefs || callMods.length > 0) stanza.refs = voicePinned && Array.isArray(call.refs?.audios) ? {
			...call.refs,
			audios: void 0
		} : call.refs;
		if (guide !== "") stanza.image = guide;
		else delete stanza.image;
		if (sf !== null && ef !== null && ef > sf) assertSpanGrid(spans[i], `h3-timeline window ${k}`, chainLike ? overlap : 0);
		if (sf !== null && ef !== null && ef > sf && knobs.length === void 0) {
			stanza.length = spanStanzaFrames(spans[i], chainLike ? overlap : 0);
			if (knobs.fps_seconds === void 0) stanza.fps_seconds = Math.round(stanza.length / 24 * 1e3) / 1e3;
		}
		assertGridLength(stanza.length, `h3-timeline window ${k} (span ${sf}→${ef})`);
		if (i > 0) {
			stanza.__iteration = k - 1;
			stanza.__overlap = overlap;
		}
		if (prev !== void 0) stanza.__prev = prev;
		assertOverlayGated(stanza, `h3-timeline window ${k} knobs`);
		if (stamps.dialogue !== void 0) stanza.dialogue_slice = stamps.dialogue;
		if (stamps.sfx !== void 0) stanza.sfx_slice = stamps.sfx;
		if (stamps.music !== void 0) stanza.music_slice = stamps.music;
		const h = g.scoped(`window${k}_`, (w) => renderH3Window(stanza, w, facts, model));
		prev = h;
		/* v8 ignore next 1 -- both family arms assign the passthrough (every path saves); a future arm that forgets is refused loud at the film tail */
		if (h.savePassthrough !== void 0) windowSaves.push(h.savePassthrough);
	});
	/* v8 ignore next 1 -- both family arms assign the passthrough (every path saves); a future arm that forgets refuses here, loudly */
	if (windowSaves.length === 0) throw new Error("[h3-timeline] a family arm saved no clip to pass the film boundary — the film tail cannot order its loads");
	const manifest = computeFilmMix({
		spans,
		clips,
		windowSecs: stanzaSecs(spans),
		duckDb: p.duck_depth_db
	});
	let boundaryAfter;
	for (const save of windowSaves) boundaryAfter = g.node("MeliteUnload", {
		video: save,
		unload_models: false,
		...boundaryAfter !== void 0 ? { after: boundaryAfter } : {}
	}).out(0);
	const after = boundaryAfter;
	if (clips.length > 0) {
		const mix = g.node("MeliteFilmAudioMix", {
			videos: calls.map((_c, i) => `h3_t4_w${i + 1}`).join(","),
			after,
			clips_json: JSON.stringify(manifest.placements.map((pl) => {
				return {
					src: clips[pl.clip].src,
					start_sec: pl.filmSec,
					dur_sec: pl.durSec,
					class: pl.cls
				};
			})),
			duck_spans: manifest.duckSpanString,
			music_duck_spans: manifest.musicDuckSpanString,
			duck_db: manifest.duckDb,
			film_seconds: manifest.filmSec
		});
		const meter = g.node("MeliteLoudness", { audio: mix.out(0) });
		saveAudio(g, meter.out(0), "h3_t4_film_audio");
		const join = g.node("MeliteConcatVideos", {
			videos: calls.map((_c, i) => `h3_t4_w${i + 1}`).join(","),
			after
		});
		const filmCreated = g.node("CreateVideo", {
			images: join.out(0),
			audio: meter.out(0),
			fps: join.out(2),
			bit_depth: FILM_BIT_DEPTH
		});
		return g.node("SaveVideo", {
			video: filmCreated.out(),
			filename_prefix: "h3_t4_film",
			format: "mp4",
			codec: "h264"
		}).out();
	}
	const concat = g.node("MeliteConcatVideos", {
		videos: calls.map((_c, i) => `h3_t4_w${i + 1}`).join(","),
		after
	});
	const filmCreated = g.node("CreateVideo", {
		images: concat.out(0),
		audio: concat.out(1),
		fps: concat.out(2),
		bit_depth: FILM_BIT_DEPTH
	});
	return g.node("SaveVideo", {
		video: filmCreated.out(),
		filename_prefix: "h3_t4_film",
		format: "mp4",
		codec: "h264"
	}).out();
}
/** THE FUN-CONTROLNET CHAIN (002 H2/H4 + 007 L7): family-owned,
*  the LTX_lora_loader precedent — the node pair is the family's
*  own (ModelPatchLoader + MiniMaxH3FunControlNetApply, the
*  engine's model-patch spelling), spelled HERE, never swapped
*  into the kit's still-image stackControlNets (whose node pair
*  stays z-image's). One link per fired pick, array order = apply
*  order, empty picks → the bare model (byte-stable). The control
*  source rides the pick's clip channel (a staged video artifact —
*  LoadVideo → GetVideoComponents' image stream) or its still
*  image; the mask channel rides LoadImageMask (alpha; the node
*  reads it with source_video unset — no presumption about the
*  video behind the mask). The schedule window stamps verbatim:
*  the row declares 'ranged' and the node carries the dials (the
*  kit's schedule law already refused what the row forbids). */
function applyH3FunControlNets(g, model, vae, picks) {
	let cur = model;
	for (const pick of picks) {
		const control = pick.clip !== void 0 && pick.clip !== "" ? g.node("GetVideoComponents", { video: g.node("LoadVideo", { file: pick.clip }).out() }).out(0) : pick.image !== "" ? g.node("LoadImage", {
			image: pick.image,
			upload: "image"
		}).out(0) : void 0;
		const hasMask = pick.mask !== void 0 && pick.mask !== "";
		const patch = g.node("ModelPatchLoader", { name: pick.model }).out();
		cur = g.node("MiniMaxH3FunControlNetApply", {
			model: cur,
			model_patch: patch,
			vae,
			strength: pick.strength,
			start_percent: pick.start_percent ?? 0,
			end_percent: pick.end_percent ?? 1,
			...control === void 0 ? {} : { control_video: control },
			...hasMask ? { mask: g.node("LoadImageMask", {
				image: pick.mask,
				channel: "alpha"
			}).out(0) } : {}
		}).out();
	}
	return cur;
}
function renderH3Window(p, g, facts, model) {
	const rb0 = p.refs ?? {};
	const hasRefs = wireList(p.ref_images).length + wireList(p.ref_videos).length + wireList(p.ref_audios).length + wireList(rb0.images).length + wireList(rb0.videos).length + wireList(rb0.audios).length > 0;
	const statedFamily = typeof p.variant === "string" && FAMILIES.includes(p.variant) ? p.variant : void 0;
	const guide0 = [
		p.image,
		p.image_name,
		p.ref_image
	].some((v) => typeof v === "string" && v.trim() !== "");
	const k = p.k ?? 1;
	const pinsHere = (p.__keyframe_pins ?? {})[String(k)] ?? [];
	const family = hasRefs || guide0 || pinsHere.length > 0 ? "t4r" : statedFamily ?? "t4_open";
	assertGridLength(p.length, `h3-timeline window ${k}`);
	const isT4r = family === "t4r";
	const isChain = family === "t4_chain";
	const prompt = p.prompt ?? "";
	const guideImage = p.image ?? p.image_name ?? "";
	const stabilize = p.sla_stabilize_motion ?? (isT4r ? false : true);
	const unet = g.node("UNETLoader", {
		unet_name: facts.unet,
		weight_dtype: "default"
	}).out();
	const sla = g.node("H3SLAAttention", {
		model: unet,
		sparsity_ratio: p.sla_sparsity,
		block_size: p.sla_block_size,
		min_seq_len: p.sla_min_seq_len,
		dense_last_steps: p.sla_dense_last_steps,
		protect_audio: p.sla_protect_audio,
		enabled: true,
		dense_steps: p.sla_dense_steps,
		dense_backend: p.sla_dense_backend,
		disable_fp16_accum: p.sla_disable_fp16_accum,
		stabilize_motion: stabilize,
		reference_protection: p.sla_reference_protection
	}).out();
	const chunked = g.node("MiniMaxChunkFeedForward", {
		model: g.node("MiniMaxLowVRAMAttention", {
			model: sla,
			head_chunks: 4
		}).out(),
		chunks: 2,
		seq_threshold: 4096
	}).out();
	const loraStack = Array.isArray(p.loras) && p.loras.length > 0 ? JSON.stringify(p.loras.map((r) => ({
		on: true,
		lora: r.name,
		str: r.strength,
		v: 1,
		a: 1,
		t: 1
	}))) : loraStackDefault();
	const shiftVideo = p.shift_video;
	const clip = g.node("CLIPLoader", {
		clip_name: facts.clip,
		type: "minimax",
		...isT4r ? { device: "default" } : {}
	}).out();
	const vaeVideo = g.node("VAELoader", { vae_name: facts.vae_video }).out();
	const vaeAudio = g.node("VAELoader", { vae_name: facts.vae_audio }).out();
	let cond;
	let latent;
	let sigmaModel;
	let fpsInput;
	if (isT4r) {
		const fpsNode = g.node("PrimitiveFloat", { value: 24 }).out();
		let slaSel = p.sla_enabled === false ? true : p.sla_switch ?? null;
		if (slaSel === null) slaSel = g.node("PrimitiveBoolean", { value: false }).out();
		const picked = g.node("ComfySwitchNode", {
			switch: slaSel,
			on_true: chunked,
			on_false: sla
		}).out();
		const loraModel = g.node("LTX_lora_loader", {
			model: picked,
			mode: "minimax",
			stack_data: loraStack,
			lora_ui: ""
		}).out();
		const seconds = g.node("PrimitiveFloat", { value: p.fps_seconds }).out();
		const lengthNode = g.node("ComfyMathExpression", {
			expression: MATH_STEPS_GOLD,
			"values.a": seconds
		}).out(1);
		const previewed = g.node("ModelPreviewOverrideKJ", {
			max_resolution: 512,
			jpeg_quality: 80,
			suppress_default_preview: true,
			preview_frames: lengthNode,
			preview_fps: 8,
			tiny_vae: "none",
			model: loraModel
		}).out();
		const adaln = g.node("H3AdaLNLoRAFix", {
			model: previewed,
			mode: "port"
		}).out();
		sigmaModel = g.node("MiniMaxH3SigmaShift", {
			model: adaln,
			shift_video: shiftVideo,
			shift_audio: p.shift_audio
		}).out();
		const refBag = p.refs ?? {};
		const declaredImages = wireList(p.ref_images);
		const declaredVideos = wireList(p.ref_videos);
		const declaredAudios = wireList(p.ref_audios);
		const lastFrame = p.last_frame ?? "";
		const bagImages = wireList(refBag.images);
		const refImagesAll = bagImages.length > 0 ? bagImages : declaredImages;
		const imageCap = imageReferenceCap(lastFrame !== "");
		if (lastFrame !== "" && refImagesAll.length > imageCap) throw new Error(`[h3-timeline] the image bus is full: a last frame (input 2) + ${String(refImagesAll.length)} references exceeds the 9-slot bus — keep references ≤ ${imageCap} with an end anchor (≤ ${REF_CAPS.images} without)`);
		const refImages = refImagesAll.slice(0, imageCap);
		const bagVideos = wireList(refBag.videos);
		const refVideos = (bagVideos.length > 0 ? bagVideos : declaredVideos).slice(0, REF_CAPS.videos);
		const rawTrims = Array.isArray(p.ref_video_trims) ? p.ref_video_trims : [];
		if (rawTrims.length > REF_CAPS.videos) throw new Error(`ref_video_trims: expected at most ${REF_CAPS.videos} entries (the video lane's cap) — got ${rawTrims.length}`);
		const videoTrims = rawTrims.map((e, i) => {
			if (typeof e !== "object" || e === null || Array.isArray(e)) throw new Error(`ref_video_trims: entry ${i} must be an object { start_time, duration } — got ${JSON.stringify(e).slice(0, 40)}`);
			const row = e;
			const start = row.start_time;
			const dur = row.duration;
			if (start !== void 0 && typeof start !== "number") throw new Error(`ref_video_trims: entry ${i} start_time must be a number — got ${JSON.stringify(start).slice(0, 40)}`);
			if (dur !== void 0 && typeof dur !== "number") throw new Error(`ref_video_trims: entry ${i} duration must be a number — got ${JSON.stringify(dur).slice(0, 40)}`);
			return {
				start_time: start ?? 0,
				duration: dur ?? 0
			};
		});
		const bagAudios = wireList(refBag.audios);
		const refAudios = (bagAudios.length > 0 ? bagAudios : declaredAudios).slice(0, REF_CAPS.audios);
		const bundleInputs = {};
		const isSpell = (s) => s.startsWith("$");
		const imageRef = (src) => isSpell(src) ? src : g.node("LoadImage", { image: src }).out();
		let anchorRaw;
		if (guideImage !== "") {
			anchorRaw = imageRef(guideImage);
			bundleInputs.input_1 = g.node("UnifiedResizeImageMask", {
				image: anchorRaw,
				scale_mode: "Shorter Side",
				aspect_ratio: "Auto (Input Image)",
				long_side_target: 1024,
				short_side_target: 2048,
				width: 1024,
				height: 1024,
				multiplier: 1,
				megapixels: 1,
				upscale_method: "lanczos",
				crop: "center",
				divisible_by: 32,
				maintain_aspect: false
			}).out();
		}
		const resizeRef = (src) => g.node("UnifiedResizeImageMask", {
			image: imageRef(src),
			scale_mode: "Shorter Side",
			aspect_ratio: "Auto (Input Image)",
			long_side_target: 1024,
			short_side_target: 2048,
			width: 1024,
			height: 1024,
			multiplier: 1,
			megapixels: 1,
			upscale_method: "lanczos",
			crop: "center",
			divisible_by: 32,
			maintain_aspect: false
		}).out();
		if (lastFrame !== "") bundleInputs.input_2 = resizeRef(lastFrame);
		const firstFreeSlot = lastFrame !== "" ? 3 : 2;
		refImages.forEach((src, i) => {
			const img = imageRef(src);
			if (anchorRaw === void 0 && i === 0) anchorRaw = img;
			bundleInputs[`input_${firstFreeSlot + i}`] = g.node("UnifiedResizeImageMask", {
				image: img,
				scale_mode: "Shorter Side",
				aspect_ratio: "Auto (Input Image)",
				long_side_target: 1024,
				short_side_target: 2048,
				width: 1024,
				height: 1024,
				multiplier: 1,
				megapixels: 1,
				upscale_method: "lanczos",
				crop: "center",
				divisible_by: 32,
				maintain_aspect: false
			}).out();
		});
		refVideos.forEach((src, i) => {
			let vid = isSpell(src) ? src : g.node("LoadVideo", { file: src }).out();
			const trim = videoTrims[i];
			if (trim !== void 0 && (trim.start_time > 0 || trim.duration > 0)) vid = g.node("Video Slice", {
				video: vid,
				start_time: trim.start_time,
				duration: trim.duration,
				strict_duration: false
			}).out();
			const comp = g.node("GetVideoComponents", { video: vid });
			bundleInputs[`input_${10 + 2 * i}`] = comp.out(0);
			bundleInputs[`input_${11 + 2 * i}`] = comp.out(1);
		});
		refAudios.forEach((src, i) => {
			bundleInputs[`input_${16 + i}`] = isSpell(src) ? src : g.node("LoadAudio", { audio: src }).out();
		});
		const geoSrc = anchorRaw ?? bundleInputs.input_2;
		let geoW = 768;
		let geoH = 1344;
		if (geoSrc !== void 0) {
			const geo = g.node("UnifiedResizeImageMask", {
				image: geoSrc,
				scale_mode: "Total Pixels (MP)",
				aspect_ratio: "3:4 (Portrait Standard)",
				long_side_target: 1280,
				short_side_target: 768,
				width: 768,
				height: 1344,
				multiplier: 1,
				megapixels: .98,
				upscale_method: "lanczos",
				crop: "center",
				divisible_by: 32,
				maintain_aspect: false
			});
			geoW = geo.out(2);
			geoH = geo.out(3);
		}
		const bundle = g.node("PlagueKindBundleIn", bundleInputs).out();
		const bout = g.node("PlagueKindBundleOut", { bundle });
		const refSize = p.ref_image_size;
		const r2vInputs = {
			prompt,
			width: p.width,
			height: p.height,
			length: lengthNode,
			ref_image_size: refSize,
			clip,
			vae: vaeVideo,
			audio_vae: vaeAudio
		};
		for (let i = 0; i <= 8; i++) r2vInputs[`ref_images.ref_image_${i}`] = bout.out(i);
		for (let i = 0; i < 3; i++) {
			r2vInputs[`ref_videos.ref_video_${i}`] = bout.out(9 + 2 * i);
			r2vInputs[`ref_video_audios.ref_video_audio_${i}`] = bout.out(10 + 2 * i);
			r2vInputs[`ref_audios.ref_audio_${i}`] = bout.out(15 + i);
		}
		let dialogueAudio;
		let dialogueFrameIdx = 0;
		let sfxAudio;
		let sfxFrameIdx = 0;
		let musicAudio;
		let musicFrameIdx = 0;
		{
			const read = (key) => p[key] ?? null;
			const stamp = read("dialogue_slice");
			if (stamp !== null) {
				dialogueAudio = g.node("MeliteAudioSlice", {
					audio: stamp.src,
					start_seconds: stamp.slice_start_seconds,
					duration_seconds: stamp.slice_duration_seconds
				}).out(0);
				dialogueFrameIdx = Math.round(stamp.delay_seconds * 24);
			}
			const sfxStamp = read("sfx_slice");
			if (sfxStamp !== null) {
				sfxAudio = g.node("MeliteAudioSlice", {
					audio: sfxStamp.src,
					start_seconds: sfxStamp.slice_start_seconds,
					duration_seconds: sfxStamp.slice_duration_seconds
				}).out(0);
				sfxFrameIdx = Math.round(sfxStamp.delay_seconds * 24);
			}
			const musicStamp = read("music_slice");
			if (musicStamp !== null) {
				musicAudio = g.node("MeliteAudioSlice", {
					audio: musicStamp.src,
					start_seconds: musicStamp.slice_start_seconds,
					duration_seconds: musicStamp.slice_duration_seconds
				}).out(0);
				musicFrameIdx = Math.round(musicStamp.delay_seconds * 24);
			}
		}
		const r2v = g.node("MiniMaxH3ReferenceToVideo", r2vInputs);
		g.node("MiniMaxH3ImageToVideo", {
			prompt: I2V_MARKER_PROMPT,
			width: geoW,
			height: geoH,
			length: lengthNode,
			clip,
			vae: vaeVideo,
			first_frame: bout.out(0),
			last_frame: bout.out(1)
		});
		cond = r2v.out(0);
		latent = r2v.out(1);
		fpsInput = fpsNode;
		if (dialogueAudio !== void 0) cond = g.node("MiniMaxH3AddGuide", {
			positive: cond,
			latent,
			frame_idx: dialogueFrameIdx,
			audio_vae: vaeAudio,
			audio: dialogueAudio
		}).out(0);
		if (sfxAudio !== void 0) cond = g.node("MiniMaxH3AddGuide", {
			positive: cond,
			latent,
			frame_idx: sfxFrameIdx,
			audio_vae: vaeAudio,
			audio: sfxAudio
		}).out(0);
		if (musicAudio !== void 0) cond = g.node("MiniMaxH3AddGuide", {
			positive: cond,
			latent,
			frame_idx: musicFrameIdx,
			audio_vae: vaeAudio,
			audio: musicAudio
		}).out(0);
		for (const pin of pinsHere) cond = g.node("MiniMaxH3AddGuide", {
			positive: cond,
			latent,
			frame_idx: Math.min(pin.frame_idx, p.length - 1),
			vae: vaeVideo,
			image: imageRef(pin.image)
		}).out(0);
	} else {
		const mab = g.node("ModelAttentionBackend", {
			model: chunked,
			attention: p.attention_backend
		}).out();
		const picked = g.node("ComfySwitchNode", {
			switch: p.sla_enabled,
			on_true: sla,
			on_false: mab
		}).out();
		const loraModel = g.node("LTX_lora_loader", {
			model: picked,
			mode: "minimax",
			stack_data: loraStack
		}).out();
		const adaln = g.node("H3AdaLNLoRAFix", {
			model: loraModel,
			mode: "port"
		}).out();
		sigmaModel = g.node("MiniMaxH3SigmaShift", {
			model: adaln,
			shift_video: shiftVideo,
			shift_audio: p.shift_audio
		}).out();
		const length = p.length;
		const r2v = g.node("MiniMaxH3ReferenceToVideo", {
			prompt,
			width: p.width,
			height: p.height,
			length,
			ref_image_size: p.ref_image_size,
			clip,
			vae: vaeVideo,
			audio_vae: vaeAudio
		});
		cond = r2v.out(0);
		latent = r2v.out(1);
		fpsInput = 24;
	}
	const bagMods = wireList(rb0.mods);
	const refModsAll = bagMods.length > 0 ? bagMods : wireList(p.ref_mods);
	if (refModsAll.length > 0) {
		if (refModsAll.length > REF_CAPS.refmods) throw new Error(`[h3-timeline] ref_mods exceeds the loader's ${String(REF_CAPS.refmods)} slots (saw ${String(refModsAll.length)})`);
		const modStem = (src) => {
			const base = src.trim().split("?")[0].split(/[\\/]/).pop();
			if (!base.endsWith(".safetensors")) throw new Error(`[h3-timeline] ref_mods entries are .safetensors mods under models/refmods/ (saw '${src}')`);
			return base.slice(0, -12);
		};
		const loaderInputs = { show_info: false };
		for (let i = 0; i < REF_CAPS.refmods; i++) {
			const src = refModsAll[i];
			loaderInputs[`mod_${i + 1}`] = src === void 0 ? "(none)" : modStem(src);
			loaderInputs[`strength_${i + 1}`] = 1;
			loaderInputs[`copies_${i + 1}`] = 1;
		}
		const mods = g.node("MiniMaxH3RefModsLoader", loaderInputs).out(0);
		cond = g.node("MiniMaxH3RefModApply", {
			conditioning: cond,
			mods,
			override: false,
			retention: 1,
			curve_direction: "constant",
			scramble_seed: -1,
			curve_shape: "linear",
			curve_value: 1
		}).out(0);
	}
	const noise = g.node("RandomNoise", { noise_seed: p.noise_seed ?? p.seed }).out();
	const samplerSel = g.node("KSamplerSelect", { sampler_name: p.sampler_name }).out();
	let sampler;
	if (isT4r) sampler = samplerSel;
	else {
		const ersde = g.node("SamplerER_SDE", {
			solver_type: "ODE",
			max_stage: 3,
			eta: 0,
			s_noise: 1
		}).out();
		sampler = g.node("ComfySwitchNode", {
			switch: false,
			on_true: ersde,
			on_false: samplerSel
		}).out();
	}
	sigmaModel = applyH3FunControlNets(g, sigmaModel, vaeVideo, fireControlNets(model, p));
	const schedName = p.sched_name;
	const denoiseVal = p.denoise;
	const sched = g.node("BasicScheduler", {
		model: sigmaModel,
		scheduler: schedName,
		steps: p.steps,
		denoise: denoiseVal
	}).out();
	let guider = g.node("BasicGuider", {
		model: sigmaModel,
		conditioning: cond
	}).out();
	let targetLatent = latent;
	if (isChain || isT4r) {
		const prev = p.__prev;
		/* v8 ignore next 1 -- the film loop stamps __iteration on every window k≥2 before the render (the seam block mounts only when it did) */
		const iteration = p.__iteration ?? 0;
		/* v8 ignore next 1 -- the film loop stamps __overlap on every window k≥2 before the render (the seam block mounts only when it did) */
		const overlap = p.__overlap ?? 0;
		if (prev !== void 0 && overlap > 0) {
			const cont = g.node("MiniMaxH3FiniteLatentContinuation", {
				positive: cond,
				target_latent: targetLatent,
				iteration,
				overlap_frames: overlap,
				continue_audio_latent: true,
				model: sigmaModel,
				sigmas: sched,
				previous_latent: prev.latOut
			});
			cond = cont.out(0);
			targetLatent = cont.out(1);
			guider = g.node("BasicGuider", {
				model: cont.out(3),
				conditioning: cont.out(0)
			}).out();
		}
	}
	let latOut = g.node("SamplerCustomAdvanced", {
		noise,
		guider,
		sampler,
		sigmas: sched,
		latent_image: targetLatent
	}).out(0);
	const secondPassOn = p.second_pass_enabled === true;
	const refine = secondPassOn ? p.refine : void 0;
	if (refine !== void 0) {
		const refineModel = g.node("LTX_lora_loader", {
			model: sigmaModel,
			mode: "minimax",
			stack_data: JSON.stringify([{
				on: true,
				lora: refine.name,
				str: refine.strength,
				v: 1,
				a: 1,
				t: 1
			}]),
			lora_ui: ""
		}).out();
		const refineSched = g.node("BasicScheduler", {
			model: refineModel,
			scheduler: schedName,
			steps: refine.steps,
			denoise: 1
		}).out();
		const refineGuider = g.node("BasicGuider", {
			model: refineModel,
			conditioning: cond
		}).out();
		latOut = g.node("SamplerCustomAdvanced", {
			noise,
			guider: refineGuider,
			sampler: samplerSel,
			sigmas: refineSched,
			latent_image: latOut
		}).out(0);
	}
	let vdec = g.node("VAEDecode", {
		samples: latOut,
		vae: vaeVideo
	}).out();
	let vadec = g.node("VAEDecodeAudio", {
		samples: latOut,
		vae: vaeAudio
	}).out();
	let vadecRaw;
	let delivered = null;
	const rawHandles = {
		latOut,
		vdec,
		vadec,
		filmImages: latOut,
		filmAudio: latOut
	};
	if (isChain || isT4r) {
		const prev = p.__prev;
		/* v8 ignore next 1 -- the film loop stamps __overlap on every window k≥2 before the render (the block mounts only when it did) */
		const overlap = p.__overlap ?? 0;
		if (prev !== void 0 && overlap > 0) {
			vadecRaw = vadec;
			const fin = g.node("MiniMaxH3FiniteSegmentFinalize", {
				sampled_latent: latOut,
				images: vdec,
				audio: vadec,
				iteration: 1,
				overlap_frames: overlap,
				trim_audio_head: true
			});
			vdec = fin.out(1);
			vadec = fin.out(2);
		}
	}
	if (isT4r) {
		const created = g.node("CreateVideo", {
			images: vdec,
			audio: vadec,
			fps: fpsInput,
			bit_depth: FILM_BIT_DEPTH
		});
		rawHandles.savePassthrough = g.node("SaveVideo", {
			video: created.out(),
			filename_prefix: `h3_t4_w${k}`,
			format: "auto",
			codec: "h264",
			"codec.encoding": "re-encode",
			"codec.encoding.crf": 10
		}).out(0);
		delivered = {
			images: vdec,
			audio: vadec
		};
	} else {
		const method = { ...SHARPEN_DEFAULTS };
		for (const [src, dst] of [
			["sharpen_method", "method"],
			["sharpen_strength", "strength"],
			["sharpen_radius", "radius"],
			["sharpen_threshold", "threshold"],
			["sharpen_iterations", "iterations"]
		]) {
			const val = p[src];
			if (val !== null && val !== void 0) method[dst] = val;
		}
		const film = g.node("FrameInterpolationModelLoader", { model_name: p.interp_model }).out();
		const interpMultVal = p.interp_multiplier;
		const interp = g.node("FrameInterpolate", {
			interp_model: film,
			images: vdec,
			multiplier: interpMultVal
		}).out();
		const interpSwOn = secondPassOn && p.interpolate_enabled;
		const interpSw = g.node("ComfySwitchNode", {
			switch: interpSwOn,
			on_true: interp,
			on_false: vdec
		}).out();
		const srRes = p.sr_resolution;
		const sr = g.node("SeedVR2VideoUpscaler", {
			image: interpSw,
			dit: g.node("SeedVR2LoadDiTModel", {
				model: p.sr_model,
				device: "cuda:0"
			}).out(),
			vae: g.node("SeedVR2LoadVAEModel", {
				model: LANE_FILES.sr_vae,
				device: "cuda:0"
			}).out(),
			seed: 42,
			resolution: srRes,
			max_resolution: 0,
			batch_size: 5,
			uniform_batch_size: false,
			color_correction: "lab"
		}).out();
		const srSwOn = secondPassOn && p.sr_switch;
		const srSw = g.node("ComfySwitchNode", {
			switch: srSwOn,
			on_true: sr,
			on_false: interpSw
		}).out();
		const sharpened = g.node("ImageSharpenKJ", {
			image: srSw,
			method
		}).out();
		const sharpSw = g.node("ComfySwitchNode", {
			switch: secondPassOn && p.sharpen_enabled,
			on_true: sharpened,
			on_false: srSw
		}).out();
		const interpOn = secondPassOn && p.interpolate_enabled;
		const interpMult = p.interp_multiplier;
		const created = g.node("CreateVideo", {
			images: sharpSw,
			audio: vadec,
			fps: interpOn ? 24 * interpMult : 24,
			bit_depth: FILM_BIT_DEPTH
		});
		rawHandles.savePassthrough = g.node("SaveVideo", {
			video: created.out(),
			filename_prefix: `h3_t4_w${k}`,
			format: "mp4",
			codec: "h264"
		}).out(0);
		delivered = {
			images: sharpSw,
			audio: vadec
		};
	}
	rawHandles.filmImages = delivered.images;
	rawHandles.filmAudio = vadecRaw !== void 0 ? vadecRaw : delivered.audio;
	return rawHandles;
}
/** The film action — the h3 family's whole compose segment. The
* doc arrives gated + lifted from the card; the build owns the
* lane admissions and both renderers (this module is their only
* seat). */
/** The sampler row the h3 schema itself serves: the ONE engine
* vocabulary read through the family's recommended subset (the
* schema's own filter law — a retyped list would be a second
* SSOT). */
const H3_SAMPLER_OPTIONS = SAMPLER_OPTIONS.filter((n) => H3_RECOMMENDED_SAMPLERS.includes(n));
/** THE KEYFRAME→SEAT MAPPING (the keyframe lane, slice 2 — 2026-11-05):
*  turns the doc's FILM-absolute `keyframes` pins into per-window
*  rides. Runs at the build door AFTER the plan gate (placement is
*  judged there; every pin here has exactly one covering window) and
*  BEFORE the sole-call unpack, so both window shapes consume the
*  mapped seats through their EXISTING doors — the film loop reads
*  them off the rewritten call rows (guide/seat-union/variant derive
*  with no pin awareness), the single-window shape lifts them through
*  the unpack. Per the seat canon (Layer B replaces Layer A), a pin
*  fills only a SILENT seat: a stated call guide/last_frame (or, on
*  the single-window shape, the doc-level seat) wins and the pin
*  rides the interior arm instead — at a boundary frame that is the
*  AddGuide pin at the window's first/last generated row, so BOTH
*  images reach the graph (the no-drop law: a pin never vanishes).
*  Writes `p.calls` (new row objects; the caller's doc is untouched)
*  and `p.__keyframe_pins` — the interior channel keyed by the 1-based
*  window k the renderers already carry (the `__` internal-channel
*  precedent: __iteration/__overlap). */
function applyKeyframeCompose(p) {
	const kfRows = Array.isArray(p.keyframes) ? p.keyframes : [];
	if (kfRows.length === 0) return;
	const calls = Array.isArray(p.calls) ? p.calls : [];
	const str = (v) => typeof v === "string" ? v.trim() : "";
	const num = (v) => typeof v === "number" && Number.isFinite(v) ? v : null;
	const wins = calls.map((row, i) => {
		const sf = num(row.start_frame);
		const ef = num(row.end_frame);
		if (sf === null || ef === null || ef <= sf) return null;
		return {
			sf,
			ef,
			genStart: sf - (i > 0 ? transitionOverlap(typeof row.transition === "string" ? row.transition : void 0) : 0),
			rides: { pins: [] },
			row,
			forked: false
		};
	});
	const ridesByK = /* @__PURE__ */ new Map();
	const fork = (w) => {
		if (!w.forked) {
			w.row = { ...w.row };
			w.forked = true;
		}
		return w.row;
	};
	for (const kf of kfRows) {
		const f = kf.frame;
		const image = str(kf.image);
		const w = wins.find((win) => win !== null && f >= win.sf && f <= win.ef - 1);
		if (w === void 0) continue;
		if (f === w.sf && w.rides.anchor === void 0 && !isSeatStated(w, "anchor")) {
			fork(w).image = image;
			w.rides.anchor = image;
			continue;
		}
		if (f === w.ef - 1 && w.rides.endAnchor === void 0 && !isSeatStated(w, "end")) {
			fork(w).last_frame = image;
			w.rides.endAnchor = image;
			continue;
		}
		w.rides.pins.push({
			image,
			frame_idx: f - w.genStart
		});
	}
	for (const [i, w] of wins.entries()) {
		if (w === null) continue;
		if (w.forked) calls[i] = w.row;
		if (w.rides.pins.length > 0) {
			w.rides.pins.sort((a, b) => a.frame_idx - b.frame_idx);
			ridesByK.set(i + 1, w.rides);
		}
	}
	if (ridesByK.size > 0) {
		const channel = {};
		for (const [k, rides] of ridesByK) channel[String(k)] = rides.pins;
		p.__keyframe_pins = channel;
	}
	/** A window's own stated seat (the canon's Layer B claim): the row's
	*  guide spellings (the film loop's exact union) or its end anchor;
	*  on the single-window shape the DOC-level seat is the same seat —
	*  a stated one wins over the pin there too. */
	function isSeatStated(w, seat) {
		if (seat === "anchor") {
			if (str(w.row.image) !== "" || str(w.row.ref_image) !== "" || str(w.row.image_name) !== "") return true;
			if (calls.length === 1 && str(p.image) !== "") return true;
			return false;
		}
		if (str(w.row.last_frame) !== "") return true;
		if (calls.length === 1 && str(p.last_frame) !== "") return true;
		return false;
	}
}
const film = {
	id: "film",
	inputs: [],
	outputs: [{
		name: "video",
		kind: "VIDEO"
	}],
	params: [
		{
			name: "prompt",
			type: "string"
		},
		{
			name: "image",
			type: "string"
		},
		{
			name: "last_frame",
			type: "string"
		},
		{
			name: "ref_images",
			type: "image_list"
		},
		{
			name: "ref_videos",
			type: "image_list"
		},
		{
			name: "ref_audios",
			type: "image_list"
		},
		{
			name: "ref_mods",
			type: "image_list"
		},
		{
			name: "duck_depth_db",
			type: "number",
			bounds: [-48, 0]
		},
		{
			name: "seed",
			type: "number",
			rule: "seed-sentinel"
		},
		{
			name: "width",
			type: "number",
			bounds: [448, 1344]
		},
		{
			name: "height",
			type: "number",
			bounds: [448, 768]
		},
		{
			name: "length",
			type: "number",
			bounds: [22, 362]
		},
		{
			name: "steps",
			type: "number",
			bounds: [4, 30]
		},
		{
			name: "second_pass_enabled",
			type: "boolean"
		},
		{
			name: "sharpen_enabled",
			type: "boolean"
		},
		{
			name: "sharpen_strength",
			type: "number",
			bounds: [0, 1]
		},
		{
			name: "sharpen_method",
			type: "enum",
			options: [
				"rcas",
				"adaptive_usm",
				"high_pass",
				"deconvolution"
			]
		},
		{
			name: "sharpen_radius",
			type: "number",
			bounds: [.5, 5]
		},
		{
			name: "sharpen_threshold",
			type: "number",
			bounds: [0, 1]
		},
		{
			name: "sharpen_iterations",
			type: "number",
			bounds: [1, 100]
		},
		{
			name: "interpolate_enabled",
			type: "boolean"
		},
		{
			name: "interp_model",
			type: "enum",
			options: ["film_net_fp16.safetensors", "rife47.pth"]
		},
		{
			name: "interp_multiplier",
			type: "number",
			bounds: [2, 4]
		},
		{
			name: "denoise",
			type: "number",
			bounds: [0, 1]
		},
		{
			name: "sampler_name",
			type: "enum",
			options: H3_SAMPLER_OPTIONS
		},
		{
			name: "sched_name",
			type: "enum",
			options: SCHEDULER_OPTIONS
		},
		{
			name: "refine_lora",
			type: "string"
		},
		{
			name: "refine_strength",
			type: "number",
			bounds: [0, 2]
		},
		{
			name: "refine_steps",
			type: "number",
			bounds: [1, 10]
		},
		{
			name: "attention_backend",
			type: "enum",
			options: ["comfy kitchen attention", "pytorch attention"]
		},
		{
			name: "sr_switch",
			type: "boolean"
		},
		{
			name: "sr_resolution",
			type: "number",
			bounds: [720, 2160]
		},
		{
			name: "sr_model",
			type: "enum",
			options: ["seedvr2_ema_3b_fp16.safetensors", "seedvr2_ema_3b_fp8_e4m3fn.safetensors"]
		},
		{
			name: "ref_image_size",
			type: "string"
		},
		{
			name: "shift_video",
			type: "number",
			bounds: [1, 20]
		},
		{
			name: "shift_audio",
			type: "number",
			bounds: [1, 10]
		},
		{
			name: "sla_enabled",
			type: "boolean"
		},
		{
			name: "sla_sparsity",
			type: "number",
			bounds: [0, .95]
		},
		{
			name: "sla_block_size",
			type: "enum",
			options: [
				"32",
				"64",
				"128"
			]
		},
		{
			name: "sla_min_seq_len",
			type: "number",
			bounds: [512, Number.MAX_SAFE_INTEGER]
		},
		{
			name: "sla_dense_last_steps",
			type: "number",
			bounds: [0, 10]
		},
		{
			name: "sla_dense_steps",
			type: "string"
		},
		{
			name: "sla_dense_backend",
			type: "enum",
			options: [
				"comfy_kitchen",
				"pytorch",
				"auto"
			]
		},
		{
			name: "sla_reference_protection",
			type: "enum",
			options: [
				"Off",
				"Light",
				"Heavy Enforcement"
			]
		},
		{
			name: "sla_protect_audio",
			type: "boolean"
		},
		{
			name: "sla_stabilize_motion",
			type: "boolean"
		},
		{
			name: "sla_disable_fp16_accum",
			type: "boolean"
		},
		{
			name: "interp_switch",
			type: "boolean"
		},
		{
			name: "sharpen_switch",
			type: "boolean"
		},
		{
			name: "sla_switch",
			type: "boolean"
		},
		{
			name: "image_name",
			type: "string"
		}
	],
	facts: parseH3Facts,
	build({ p: docIn, facts, g, model }) {
		const p = { ...docIn };
		const kfRows = Array.isArray(p.keyframes) ? p.keyframes : [];
		if (kfRows.length > 0) {
			const windows = (Array.isArray(p.calls) ? p.calls : []).map((c) => ({
				start: c.start_frame,
				end: c.end_frame
			})).filter((w) => typeof w.start === "number" && Number.isFinite(w.start) && typeof w.end === "number" && Number.isFinite(w.end));
			for (let ki = 0; ki < kfRows.length; ki++) {
				const kf = kfRows[ki] ?? {};
				const f = kf.frame;
				if (typeof f !== "number" || !Number.isFinite(f)) throw new Error(`keyframes[${ki}]: frame is required (a finite film-absolute frame — a row without a frame is not a pin)`);
				const image = typeof kf.image === "string" ? kf.image.trim() : "";
				if (image === "") throw new Error(`keyframes[${ki}]: image is required (the pin channel is image pins — a row without a source anchors nothing)`);
				if (!isMediaRef(image)) throw new Error(`keyframes[${ki}]: "${image}" names no media — a stage/card name is not an image (pick the artifact: a file path, URL, or \$spell rides; a label never does)`);
				if (!windows.some((w) => f >= w.start && f <= w.end - 1)) {
					const plan = windows.length > 0 ? `[${windows[0].start}, ${windows[windows.length - 1].end})` : "no windows at all (the doc names no calls)";
					throw new Error(`keyframes[${ki}]: frame ${f} falls outside every window — the plan covers ${plan}; a keyframe in a gap has no window to ride (move the pin inside a window)`);
				}
			}
			applyKeyframeCompose(p);
		}
		{
			const row = Array.isArray(p.calls) && p.calls.length === 1 ? p.calls[0] : null;
			if (row !== null) {
				if ((typeof row.text === "string" ? row.text.trim() : "") !== "") p.prompt = row.text;
				if (row.refs !== void 0 && row.refs !== null) p.refs = row.refs;
				if ((typeof row.image === "string" ? row.image.trim() : "") !== "") p.image = row.image;
				if (typeof row.last_frame === "string" && row.last_frame.trim() !== "") p.last_frame = row.last_frame;
				if (wireList(row.ref_images).length > 0) p.ref_images = row.ref_images;
				if (wireList(row.ref_videos).length > 0) p.ref_videos = row.ref_videos;
				if (wireList(row.ref_audios).length > 0) p.ref_audios = row.ref_audios;
				const rowKnobs = row.knobs ?? null;
				if (rowKnobs !== null) Object.assign(p, rowKnobs);
			}
		}
		const guideImage = p.image ?? p.image_name ?? "";
		const statedFamily = typeof p.variant === "string" && FAMILIES.includes(p.variant) ? p.variant : void 0;
		const kfLane = kfRows.length > 0 && Array.isArray(p.calls) && p.calls.length === 1;
		if ((guideImage !== "" || kfLane) && statedFamily !== void 0 && statedFamily !== "t4r") {
			const rbRef = p.refs ?? {};
			if (!(wireList(rbRef.images).length + wireList(rbRef.videos).length + wireList(rbRef.audios).length + wireList(p.ref_images).length + wireList(p.ref_videos).length + wireList(p.ref_audios).length > 0 || typeof p.last_frame === "string" && p.last_frame.trim() !== "")) throw new Error(guideImage !== "" ? `h3_window: a guide image ("${guideImage.trim()}") rides only the t4r reference lane — this doc's variant is '${String(p.variant)}'. State no variant (the walk derives t4r from the guide) or clear the guide; never a silent text-only render of a reference shot` : `h3_window: keyframe pins ride only the t4r reference lane — this doc's variant is '${String(p.variant)}'. State no variant (the walk derives t4r from the pins) or clear the keyframes; never a silent text-only render of a pinned shot`);
		}
		if (statedFamily === "t4r" && !guideImage) {
			const rbRef = p.refs ?? {};
			if (!(wireList(rbRef.images).length + wireList(rbRef.videos).length + wireList(rbRef.audios).length + wireList(p.ref_images).length + wireList(p.ref_videos).length + wireList(p.ref_audios).length > 0 || typeof p.last_frame === "string" && p.last_frame.trim() !== "" || kfLane)) throw new Error("h3_window(t4r): image-anchored window without a staged guide image — compose always injects LoadImage.0.image on this family");
		}
		const docCalls = Array.isArray(p.calls) ? p.calls : null;
		if (docCalls !== null && docCalls.length > 1 && p.k === void 0) return renderH3Film(p, g, facts, model);
		if ((p.audio_clips ?? []).some((c) => c !== null && typeof c === "object" && typeof c.src === "string" && c.src.trim() !== "")) throw new Error("h3-timeline: audio clips ride the FILM path — this single-window doc has clips but no film to mix over (add a second call to author a film, or clear the Music row)");
		if (Array.isArray(p.loras)) {
			const applied = p.loras.map((r) => r.steps).filter((v) => typeof v === "number" && Number.isFinite(v));
			const singleKnobs = docCalls !== null && docCalls.length === 1 ? docCalls[0].knobs ?? {} : {};
			if (applied.length > 0 && p.__steps_pinned !== true && singleKnobs.steps === void 0) p.steps = Math.max(...applied);
		}
		return renderH3Window(p, g, facts, model).savePassthrough;
	}
};
//#endregion
//#region src/finalize.ts
/** H3-only video lanes (2026-09-21, operator order — "there is no
*  wan-vace, there is only H3 in timeline studio"): the wan-vace
*  and scail2-animate lanes are gone with their card and families. */
const H3_T4_STRIP = {
	CLIPLoader: ["device"],
	LTX_lora_loader: ["lora_ui"],
	SeedVR2LoadDiTModel: [
		"attention_mode",
		"blocks_to_swap",
		"cache_model",
		"offload_device",
		"swap_io_components"
	],
	SeedVR2LoadVAEModel: [
		"cache_model",
		"decode_tile_overlap",
		"decode_tile_size",
		"decode_tiled",
		"encode_tile_overlap",
		"encode_tile_size",
		"encode_tiled",
		"offload_device",
		"tile_debug"
	],
	SeedVR2VideoUpscaler: [
		"enable_debug",
		"input_noise_scale",
		"latent_noise_scale",
		"offload_device",
		"prepend_frames",
		"temporal_overlap"
	]
};
/** The t4-family strip pass (`if not is_t4r`). The i2v dead-branch
*  node exists ONLY on t4r — the serialized graph's family marker —
*  so the strip stays stateless per compose. */
function finalizeH3(graph) {
	if ("MiniMaxH3ImageToVideo.0" in graph) return graph;
	return stripAutofill(graph, H3_T4_STRIP);
}
//#endregion
//#region src/index.ts
const DECL = {
	"id": "h3",
	"form": "form_video_director",
	"label": "MiniMax H3",
	"description": "MiniMax H3 joint video + audio — one model, three lanes: multi-window timeline films, single-shot FL2VA/Ref2VA clips, and keyframe-anchored beats",
	"engine": "comfyui",
	"studio": {
		"tenant": "video/h3-timeline",
		"owns_params": true,
		"writes": [
			"calls",
			"keyframes",
			"fps",
			"seed",
			"width",
			"height",
			"length",
			"steps",
			"denoise",
			"sampler_name",
			"sched_name",
			"shift_video",
			"shift_audio",
			"sla_sparsity",
			"sla_block_size",
			"sla_dense_last_steps",
			"sla_dense_steps",
			"sla_dense_backend",
			"sla_reference_protection",
			"sla_protect_audio",
			"sla_stabilize_motion",
			"sla_disable_fp16_accum",
			"sharpen_enabled",
			"sharpen_method",
			"sharpen_strength",
			"sharpen_radius",
			"sharpen_threshold",
			"sharpen_iterations",
			"interpolate_enabled",
			"interp_model",
			"interp_multiplier",
			"sr_switch",
			"sr_model",
			"sr_resolution",
			"audio_clips",
			"audio_stem",
			"loras",
			"document"
		],
		"kind": "custom",
		"size": "huge",
		"layout": "studio"
	},
	"mods": [{
		"pack": "loras",
		"marries": { "steps": "max" }
	}],
	"genre": "video",
	"variants": [
		{
			"id": "timeline",
			"label": "Standard",
			"hint": "The multi-window timeline — hybrid FL2VA/Ref2VA windows, SLA sparse attention, the film path.",
			"group": "Variant",
			"route": "h3-timeline",
			"cells": [{
				"quant": "int8",
				"label": "INT8 ConvRot",
				"route": "h3-timeline",
				"vram_peak_gb": 30
			}]
		},
		{
			"id": "standard",
			"label": "Standard",
			"hint": "The default — the ByteDance DMAD 4-step distill at the calibrated 1344×768. Steps derive from the lora marriage (4).",
			"group": "Recipe",
			"wire_defaults": { "loras": [{ "id": "h3_dmad_4step" }] },
			"cells": []
		},
		{
			"id": "draft",
			"label": "Draft",
			"hint": "Fast iteration — the same ByteDance 4-step bag at draft geometry (768×448). Steps derive from the lora marriage (4).",
			"group": "Recipe",
			"wire_defaults": {
				"loras": [{ "id": "h3_dmad_4step" }],
				"width": 768,
				"height": 448
			},
			"cells": []
		},
		{
			"id": "final",
			"label": "Final Cut",
			"hint": "The finishing pass — the 4-step bag plus the second-pass rail: sharpen + SeedVR2 super-res at 1080. Interpolation stays an explicit pick.",
			"group": "Recipe",
			"wire_defaults": {
				"loras": [{ "id": "h3_dmad_4step" }],
				"second_pass_enabled": true,
				"sr_switch": true
			},
			"cells": []
		}
	],
	"variant_groups": [
		{
			"id": "Variant",
			"label": "Variant"
		},
		{
			"id": "Quant",
			"label": "Quant"
		},
		{
			"id": "Recipe",
			"label": "Recipe",
			"tooltip": "One-click recipes — patch-only rows that stamp picks onto the draft: Draft (768×448), Standard (the calibrated default), Final Cut (the second-pass finish).",
			"default": "standard"
		}
	],
	"lane_inputs": {
		"unet": "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
		"loras": "dmad_minimax_h3_4step_lora_critic_comfyui.safetensors"
	},
	"params": [
		"prompt",
		"image",
		"last_frame",
		"ref_images",
		"ref_videos",
		"ref_video_trims",
		"ref_audios",
		"ref_mods",
		"duck_depth_db",
		"seed",
		"width",
		"height",
		"length",
		"steps",
		"denoise",
		"second_pass_enabled",
		"sharpen_enabled",
		"sharpen_method",
		"sharpen_radius",
		"sharpen_strength",
		"sharpen_threshold",
		"sharpen_iterations",
		"sharpen_switch",
		"interpolate_enabled",
		"interp_model",
		"interp_multiplier",
		"interp_switch",
		"sampler_name",
		"sched_name",
		"k",
		"noise_seed",
		"fps_seconds",
		"refine_lora",
		"refine_strength",
		"refine_steps",
		"attention_backend",
		"sr_switch",
		"sr_resolution",
		"sr_model",
		"ref_image_size",
		"shift_video",
		"shift_audio",
		"sla_enabled",
		"sla_sparsity",
		"sla_block_size",
		"sla_min_seq_len",
		"sla_dense_last_steps",
		"sla_dense_steps",
		"sla_dense_backend",
		"sla_reference_protection",
		"sla_protect_audio",
		"sla_stabilize_motion",
		"sla_disable_fp16_accum",
		"sla_switch",
		"image_name"
	],
	"provisions": [
		{
			"name": "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
			"url": "https://huggingface.co/smhfacct/Minimax-H3-fl2va-ref2va-hybrid-models/resolve/main/minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
			"folder": "diffusion_models",
			"sha256": "64f57f77ed85df04f7c0989ab84a5c3c110fb43a40dbc9badfe8ab2d5baafbca",
			"size_bytes": 20970379632
		},
		{
			"name": "minimax_h3_hybrid_fl2va_ref2va_b25-49-int8.safetensors",
			"url": "https://huggingface.co/smhfacct/Minimax-H3-fl2va-ref2va-hybrid-models/resolve/main/minimax_h3_hybrid_fl2va_ref2va_b25-49-int8.safetensors",
			"folder": "diffusion_models",
			"sha256": "a629cfea8d89a071b140c6e1935dc9a23e72de6badc18975a2bb9e6d1423d76d",
			"size_bytes": 20970379632
		},
		{
			"name": "minimax_h3_fl2va_pruned_int8_convrot.safetensors",
			"url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/diffusion_models/minimax_h3_fl2va_pruned_int8_convrot.safetensors",
			"folder": "diffusion_models",
			"sha256": "e889202c41dafb67b10d67b97f0d8541508036a6090af23425a5c2615d03c47a",
			"size_bytes": 20970379616
		},
		{
			"name": "minimax_h3_ref2va_pruned_int8_convrot.safetensors",
			"url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/diffusion_models/minimax_h3_ref2va_pruned_int8_convrot.safetensors",
			"folder": "diffusion_models",
			"sha256": "9255f52b6677845ad238f20dfaafa94727053694127ab7f255c048f0f9365779",
			"size_bytes": 20970379616
		},
		{
			"name": "qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors",
			"url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/text_encoders/qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors",
			"folder": "text_encoders",
			"sha256": "35a88d51044231fe332301d7a62aa81e3f2cba62febeb446e2c1e3e0ef76f2c6",
			"size_bytes": 15687142551
		},
		{
			"name": "minimax_h3_video_vae_fp16.safetensors",
			"url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/vae/minimax_h3_video_vae_fp16.safetensors",
			"folder": "vae",
			"sha256": "7c1f131492e7eddacaac9069a61b81bdd39de5cc96561e677c5eab1cdce5e522",
			"size_bytes": 5207808496
		},
		{
			"name": "minimax_h3_fl2v_lightx2v_v0.1_dareties_v4_step600_comfy_fro.safetensors",
			"url": "https://huggingface.co/silveroxides/MiniMax-H3_tests/resolve/main/minimax_h3_fl2v_lightx2v_v0.1_dareties_v4_step600_comfy_fro.safetensors",
			"folder": "loras/h3",
			"sha256": "ffc5386a1b97aa1bc112b56378f37ef3c1cc69d55d5282281e8c6c728811e710",
			"size_bytes": 867067150
		},
		{
			"name": "minimax_h3_fl2v_lightx2v_turbo_4to8step_v0.1-v1.0_768p_v4_step600_dareties.safetensors",
			"url": "https://huggingface.co/silveroxides/MiniMax-H3_tests/resolve/main/experimental/minimax_h3_fl2v_lightx2v_turbo_4to8step_v0.1-v1.0_768p_v4_step600_dareties.safetensors",
			"folder": "loras/h3",
			"sha256": "e14c9e78834f5fac9195cb022baf2bc83372140da5142a8c999a1f568cb4915d",
			"size_bytes": 2116726792
		},
		{
			"name": "minimax_h3_fl2v_turbo_4step_v1.0_768p_comfyui_bf16.safetensors",
			"url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/loras/minimax_h3_fl2v_turbo_4step_v1.0_768p_comfyui_bf16.safetensors",
			"folder": "loras/h3",
			"sha256": "c396a9a06f58399e9df9754b18299818d84a2ddd371724ba48fe4a41221437dc",
			"size_bytes": 1956192992
		},
		{
			"name": "minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors",
			"url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/loras/minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors",
			"folder": "loras/h3",
			"sha256": "2339acdf19bfe123f46b971ea35d367a84adb85de43627e1eceafa5a5b2b111e",
			"size_bytes": 1956193e3
		},
		{
			"name": "minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors",
			"url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/loras/minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors",
			"folder": "loras/h3",
			"sha256": "5b9ab5ade15d0775676d01a907268a69a1468dc6033b3b0d3ded5502f3ebb84c",
			"size_bytes": 1956193e3
		},
		{
			"name": "MiniMax-H3-FL2VA-Acc-8Step_pruned_comfy.safetensors",
			"url": "https://huggingface.co/Kijai/MiniMax-H3-experimental/resolve/main/loras/MiniMax-H3-FL2VA-Acc-8Step_pruned_comfy.safetensors",
			"folder": "loras/h3",
			"sha256": "e97b813a6f857b9dab310f31ec30a8334f63a3e7dcb5d07c0c91933d3447a897",
			"size_bytes": 1725921392
		},
		{
			"name": "MiniMax-H3-Ref2VA-Acc-8Step_pruned_comfy.safetensors",
			"url": "https://huggingface.co/Kijai/MiniMax-H3-experimental/resolve/main/loras/MiniMax-H3-Ref2VA-Acc-8Step_pruned_comfy.safetensors",
			"folder": "loras/h3",
			"sha256": "6f18e1c2eccb14b37322607730f26b16bf1169b56cd098ea006cffaec43d1e39",
			"size_bytes": 1725921392
		},
		{
			"name": "minimax_h3_turbo_v4_step600_ema.safetensors",
			"url": "https://huggingface.co/larryvrh/MiniMax-H3-Turbo-Lora/resolve/main/minimax_h3_turbo_v4_step600_ema.safetensors",
			"folder": "loras/h3",
			"sha256": "5f3a626cd72c93a8b9318d6760c510bc5092d2ab13aaba1f932c5bab07a416d3",
			"size_bytes": 779849816
		},
		{
			"name": "H3-PK-Parasyte-Turbo.safetensors",
			"url": "https://huggingface.co/Plaguekind/H3-Lora/resolve/main/H3-PK-Parasyte-Turbo.safetensors",
			"folder": "loras/h3",
			"sha256": "dbf74bfb490b9322bd455edff95ce222b3553bb3472e4743134755db1edfe044",
			"size_bytes": 2115774558
		},
		{
			"name": "dmad_minimax_h3_4step_lora_critic_comfyui.safetensors",
			"url": "https://huggingface.co/ZhengmingYu/DMAD/resolve/main/minimax_h3/dmad_minimax_h3_4step_lora_critic_comfyui.safetensors",
			"folder": "loras/h3",
			"sha256": "a4f54d9eb4eed9102be1adea8376e8e933cc2805f4017b95c14586290395b3a7",
			"size_bytes": 1956195960
		},
		{
			"name": "minimax_h3_taomate_3step_lora_avg_rank_19_bf16.safetensors",
			"url": "https://huggingface.co/Kijai/MiniMax-H3_comfy/resolve/main/loras/minimax_h3_taomate_3step_lora_avg_rank_19_bf16.safetensors",
			"folder": "loras/h3",
			"sha256": "de9663d974a884b477556748239c6f28239f7ca1825be270f98f023ff5dab6a7",
			"size_bytes": 181697688
		},
		{
			"name": "h3_silu_temb_grid.safetensors",
			"url": "https://huggingface.co/deAPI-ai/minimax-h3-33b-int8/resolve/main/loras/h3_silu_temb_grid.safetensors",
			"folder": "h3_adaln",
			"sha256": "30eb3c2cc7fb6b470d9717ff840d359313ac27cd64b705e32da1baa10f72d6a8",
			"size_bytes": 5510600
		},
		{
			"name": "minimax_h3_latent_upscaler_3d_bf16.safetensors",
			"url": "https://huggingface.co/LBH-123-AI/Minimax_h3_latent_Upscaler/resolve/main/minimax_h3_latent_upscaler_3d_conv_v1/minimax_h3_latent_upscaler_3d_conv_v1_bf16.safetensors",
			"folder": "diffusion_models",
			"size_bytes": 690592992,
			"sha256": "4f57821f5837f32f7142b67d815606dbd7550f194e5c769f7d6c3f83b146a5e6"
		},
		{
			"name": "film_net_fp16.safetensors",
			"url": "https://huggingface.co/Comfy-Org/frame_interpolation/resolve/main/frame_interpolation/film_net_fp16.safetensors",
			"folder": "frame_interpolation",
			"sha256": "f226e51375dc839d4b40e5c3d63da560dd1ea1c962364ec78f5adf2d05db05c0",
			"size_bytes": 68882302
		},
		{
			"name": "qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
			"url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/text_encoders/qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
			"folder": "text_encoders",
			"sha256": "bc2ced0fbea64757fa9acddccfc0b3f4819d1dcf1da6c124d690d368be283923",
			"size_bytes": 27141342152
		},
		{
			"name": "minimax_h3_video_vae_int8_convrot.safetensors",
			"url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/vae/minimax_h3_video_vae_int8_convrot.safetensors",
			"folder": "vae",
			"sha256": "52a2c8c73583c86e4f41cdcce3a6ad0ea562987bc0bf3d60a0cef5f5c8e60c0e",
			"size_bytes": 2811065184
		},
		{
			"name": "minimax_h3_audio_vae_fp32.safetensors",
			"url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/vae/minimax_h3_audio_vae_fp32.safetensors",
			"folder": "vae",
			"sha256": "8e505d95dd1561d47abd43d4238fd40d9bb1ae9e147ed0a4cba778d76ae4db48",
			"size_bytes": 605254808
		}
	],
	"has_agent": true,
	"has_inference": true,
	"actions": [film]
};
const family = {
	name: "family-h3",
	inject: ["models"],
	apply(ctx) {
		ctx.effect(() => ctx.models.registerFamily(DECL));
	}
};
//#endregion
export { DECL, H3_T4_STRIP, assertOverlayGated, family as default, family, finalizeH3 };
