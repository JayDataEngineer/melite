import z from "@deepseek-ai/schemastery";
import { finalizeH3 } from "@melite/comfyui-card-kit";
import { GatewayError, jsonLane } from "@melite/estate-call";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { emitParamsSpec } from "@melite/comfyui-cordis/params-emit";
//#region src/card.ts
const UNET_GOLD = "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors";
const CLIP_GOLD = "qwen3vl_32b_minimax_h3_int8_convrot.safetensors";
const VAE_VIDEO_GOLD = "minimax_h3_video_vae_int8_convrot.safetensors";
const VAE_AUDIO_GOLD = "minimax_h3_audio_vae_fp32.safetensors";
const LORA_STACK_GOLD = "[{\"on\":true,\"lora\":\"h3/minimax_h3_fl2v_lightx2v_v0.1_dareties_v4_step600_comfy_fro.safetensors\",\"str\":0.4,\"v\":1,\"a\":1,\"t\":1},{\"on\":true,\"lora\":\"h3/minimax_h3_fl2v_lightx2v_turbo_4to8step_v0.1-v1.0_768p_v4_step600_dareties.safetensors\",\"str\":0.6,\"v\":1,\"a\":1,\"t\":1}]";
const MATH_STEPS_GOLD = "max(5, round(a * 24)) + (5 - (max(5, round(a * 24)) % 17)) % 17";
const I2V_GOLD_PROMPT = "In a high action fun scene The character from the picture is facing the camera and sprinting towards the camera which tracks their movement, in a hitech futuristic city, dodging passing vehicles and other obstacles.\nHigh action, quick movements, cinematic. It is raining and night time, with glowing led lights.\nCars are crashing into eachother, bombs are dropping, but the character remains untouched by the chaos as they sprint.\nthey jump over a car as it slams into another car, and a bomb nearly hits the character.\nany car crashes or bomb impacts cause massive realistic destruction.\n\n[sound]\na futuristic electro cyber song plays in the background, and the background noise of crashes and explosions.\n";
const SHARPEN_DEFAULTS = {
	method: "rcas",
	strength: .3,
	radius: 1,
	threshold: .05,
	iterations: 10
};
const FAMILIES = [
	"t4r",
	"t4_open",
	"t4_chain"
];
const T4_ONLY_KEYS = [
	"sharpen_switch",
	"sharpen_method",
	"sharpen_strength",
	"sharpen_radius",
	"sharpen_threshold",
	"sharpen_iterations",
	"interp_switch",
	"interp_multiplier",
	"interp_model",
	"sr_switch",
	"sr_model",
	"sr_resolution"
];
const CHAIN_ONLY_KEYS = [
	"ctx_load_latent_path",
	"ctx_load_clip_index",
	"motion_context_length",
	"motion_audio_context_length"
];
const nullable = (inner) => z.union([inner, z.const(null)]);
const paramSchema = z.object({
	prompt: z.string().description("Prompt").extra("extra", {
		order: null,
		placeholder: "the courier pushes off and rolls forward through the lantern glow; rain hisses on the stall awnings, a vendor calls out",
		tooltip: "Verb-first motion + the sounds. For keyframes the image already sets the scene — prompt what CHANGES.",
		required: true
	}),
	image: z.string().role("path").description("First frame (keyframe lanes)").extra("extra", {
		order: null,
		tooltip: "Absolute path to the PNG the video must start on (h3-keyframe). Optional for h3/h3-timeline."
	}),
	seed: z.number().description("Seed").step(1).default(42).extra("extra", {
		order: null,
		tooltip: "Same seed across re-rolls = same world texture"
	}),
	width: z.number().description("Width").min(448).max(1344).step(64).default(1344).extra("extra", {
		order: null,
		wtype: "number"
	}),
	height: z.number().description("Height").min(448).max(768).step(64).default(768).extra("extra", {
		order: null,
		wtype: "number"
	}),
	length: z.number().description("Frames").min(21).max(362).step(5).default(56).extra("extra", {
		order: null,
		tooltip: "17k+5 grid at 24fps: 56 = 2.33s, 124 = 5.17s, 362 = 15s",
		wtype: "number"
	}),
	steps: z.number().description("Steps").min(4).max(30).default(12).extra("extra", {
		order: null,
		tooltip: "12 for draft; 30 standard; 10 with the turbo LoRA",
		wtype: "number"
	}),
	sharpen_enabled: z.boolean().description("FSR Sharpening").default(false).extra("extra", {
		order: null,
		tooltip: "Apply AMD FidelityFX RCAS sharpening to the final output. Strength 0.3 looks natural."
	}),
	sharpen_strength: z.number().description("Sharpen Strength").min(0).max(1).step(.05).default(.3).extra("extra", {
		order: null,
		tooltip: "RCAS sharpening intensity. 0.3 = natural; 0.5 = crisp; 0.0 = off.",
		wtype: "number"
	}),
	interpolate_enabled: z.boolean().description("FILM Interpolation").default("false").extra("extra", {
		order: null,
		tooltip: "Apply FILM (Feature-aware Interpolation for Large Motion) frame interpolation to double the frame rate. Doubles render time."
	}),
	shift_video: nullable(z.number().description("Video Shift").min(1).max(20).step(.5).default(8).extra("extra", {
		order: null,
		tooltip: "Timestep shift for video attention. Higher = more coherent motion.",
		wtype: "number"
	})),
	shift_audio: z.number().description("Audio Shift").min(1).max(10).step(.5).default(3).extra("extra", {
		order: null,
		tooltip: "Timestep shift for audio attention. Lower = more detailed sound.",
		wtype: "number"
	})
});
/** Schemastery objects are lenient (unknown/missing keys ride); the
*  family-admission laws are the renderer's own validators, ported:
*  unknown variant + family-conditional key admission on EXPLICIT
*  params only (the python gate reads model_fields_set). The t4r
*  staged-image law rides compose (it reads the merged value). The
*  renderer-vocabulary keys (variant, k, ctx_*, sla_*, ...) are NOT
*  declared knobs — old drafts keep working because the schema admits
*  them and the compose door overlays explicit params last (the
*  img-to-mesh filename_prefix precedent). */
function schema(v) {
	const raw = v ?? {};
	const walkInput = { ...raw };
	if (typeof walkInput.interpolate_enabled === "string") walkInput.interpolate_enabled = walkInput.interpolate_enabled === "true";
	else if (!("interpolate_enabled" in walkInput)) walkInput.interpolate_enabled = false;
	const out = paramSchema(walkInput);
	let variant = typeof raw.variant === "string" ? raw.variant : void 0;
	if (variant === void 0) {
		const calls = Array.isArray(raw.calls) ? raw.calls : [];
		if (calls.length === 0) throw new Error("h3-timeline: no calls to compose");
		const CARRY_MIN = 1, CARRY_MAX = 64;
		for (let i = 0; i < calls.length; i++) {
			const c = calls[i] ?? {};
			if (c.seam_carry !== void 0 && c.seam_carry !== null) {
				const sc = c.seam_carry;
				if (sc !== 0 && !(Number.isInteger(sc) && CARRY_MIN <= sc && sc <= CARRY_MAX)) throw new Error(`calls[${i}]: seam_carry ${sc} outside [${CARRY_MIN}, ${CARRY_MAX}] — 0 is a hard cut, otherwise carry is bounded lane physics`);
			}
			for (const name of ["start_frame", "end_frame"]) {
				const v = c[name];
				if (v === void 0 || v === null || typeof v !== "number" || !Number.isInteger(v)) throw new Error(`calls[${i}]: ${name} is required (int frames — text alone is not a shot)`);
			}
			if (c.end_frame <= c.start_frame) throw new Error(`calls[${i}]: end_frame ${c.end_frame} <= start_frame ${c.start_frame} — a reversed or empty span is not a shot`);
		}
		variant = calls.some((c) => {
			const cc = c;
			return Boolean(cc.ref_images) || Boolean(cc.ref_image) || Boolean(cc.image_name);
		}) ? "t4r" : calls.length > 1 ? "t4_chain" : "t4_open";
		out.variant = variant;
	}
	if (!FAMILIES.includes(variant)) throw new Error(`unknown window family '${variant}' (known: ${[...FAMILIES].sort().join(", ")})`);
	const explicit = new Set(Object.keys(raw));
	if (!explicit.has("shift_video")) out.shift_video = null;
	const bad = (keys) => keys.filter((kk) => explicit.has(kk)).sort();
	if (variant === "t4r") {
		const b = bad(T4_ONLY_KEYS);
		if (b.length) throw new Error(`h3_window(t4r): unsanctioned inject keys: ${b.join(", ")}`);
	}
	if (variant !== void 0 && variant !== "t4_chain") {
		const b = bad(CHAIN_ONLY_KEYS);
		if (b.length) throw new Error(`h3_window(${variant}): unsanctioned inject keys: ${b.join(", ")}`);
	}
	return out;
}
const carrier = paramSchema;
const BOARDED = [
	"h3-timeline",
	"h3",
	"h3-keyframe"
];
const identity = {
	label: "H3 Timeline",
	description: "THE video interface — multi-window film with SLA sparse attention, joint video+audio per window, auto-stitched into one mp4. The calls document IS the timeline.",
	genre: "video",
	icon: "video",
	principles: [
		"Describe MOTION and SOUND together — H3 generates both in one pass",
		"Draft at 768x448x56f (~2.3s); produce at 1344x768x124f (~5.2s)",
		"Length snaps to the 17k+5 frame grid at 24fps",
		"For timelines: repeat the ambient soundscape verbatim in every window; add one new layer where the story needs it",
		"Same seed across a shot's re-rolls keeps the world texture",
		"SLA at sparsity 0.90 gives ~1.75x speedup with no quality loss — use it by default"
	]
};
function renderH3Window(p, g) {
	const family = p.variant;
	if (!FAMILIES.includes(family)) throw new Error(`unknown window family '${String(p.variant)}' (known: ${[...FAMILIES].sort().join(", ")})`);
	const k = p.k ?? 1;
	const isT4r = family === "t4r";
	const isChain = family === "t4_chain";
	const prompt = p.prompt ?? "";
	const guideImage = p.image ?? p.image_name ?? "";
	const stabilize = p.sla_stabilize_motion ?? (isT4r ? false : true);
	const unet = g.node("UNETLoader", {
		unet_name: UNET_GOLD,
		weight_dtype: "default"
	}).out();
	const sla = g.node("H3SLAAttention", {
		model: unet,
		sparsity_ratio: p.sla_sparsity ?? .9,
		block_size: p.sla_block_size ?? "32",
		min_seq_len: p.sla_min_seq_len ?? 8192,
		dense_last_steps: p.sla_dense_last_steps ?? 1,
		protect_audio: p.sla_protect_audio ?? true,
		enabled: true,
		dense_steps: p.sla_dense_steps ?? "0",
		dense_backend: p.sla_dense_backend ?? "comfy_kitchen",
		disable_fp16_accum: p.sla_disable_fp16_accum ?? true,
		stabilize_motion: stabilize,
		reference_protection: p.sla_reference_protection ?? "Heavy Enforcement"
	}).out();
	const chunked = g.node("MiniMaxChunkFeedForward", {
		model: g.node("MiniMaxLowVRAMAttention", {
			model: sla,
			head_chunks: 4
		}).out(),
		chunks: 2,
		seq_threshold: 4096
	}).out();
	const loraStack = p.lora_stack ?? LORA_STACK_GOLD;
	const shiftVideo = p.shift_video ?? (isT4r ? 8 : 8);
	const clip = g.node("CLIPLoader", {
		clip_name: CLIP_GOLD,
		type: "minimax",
		...isT4r ? { device: "default" } : {}
	}).out();
	const vaeVideo = g.node("VAELoader", { vae_name: VAE_VIDEO_GOLD }).out();
	const vaeAudio = g.node("VAELoader", { vae_name: VAE_AUDIO_GOLD }).out();
	let cond;
	let latent;
	let sigmaModel;
	let fpsInput;
	let trimFrames;
	if (isT4r) {
		const fpsNode = g.node("PrimitiveFloat", { value: 24 }).out();
		let slaSel = p.sla_switch ?? null;
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
		const seconds = g.node("PrimitiveFloat", { value: p.fps_seconds ?? 10 }).out();
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
		const img = g.node("LoadImage", { image: guideImage }).out();
		const refR = g.node("UnifiedResizeImageMask", {
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
		const geo = g.node("UnifiedResizeImageMask", {
			image: img,
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
		const bundle = g.node("PlagueKindBundleIn", { input_1: refR }).out();
		const bout = g.node("PlagueKindBundleOut", { bundle });
		const r2vInputs = {
			prompt,
			width: p.width,
			height: p.height,
			length: lengthNode,
			ref_image_size: p.ref_image_size ?? "match",
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
		const r2v = g.node("MiniMaxH3ReferenceToVideo", r2vInputs);
		const i2v = g.node("MiniMaxH3ImageToVideo", {
			prompt: I2V_GOLD_PROMPT,
			width: geo.out(2),
			height: geo.out(3),
			length: lengthNode,
			context_steps: 1,
			audio_context_steps: 0,
			clip,
			vae: vaeVideo,
			first_frame: bout.out(0),
			last_frame: bout.out(1)
		});
		const r2vBool = g.node("PrimitiveBoolean", { value: true }).out();
		cond = g.node("ComfySwitchNode", {
			switch: r2vBool,
			on_true: r2v.out(0),
			on_false: i2v.out(0)
		}).out();
		latent = g.node("ComfySwitchNode", {
			switch: r2vBool,
			on_true: r2v.out(1),
			on_false: i2v.out(1)
		}).out();
		fpsInput = fpsNode;
	} else {
		const loraModel = g.node("LTX_lora_loader", {
			model: chunked,
			mode: "minimax",
			stack_data: loraStack
		}).out();
		const mab = g.node("ModelAttentionBackend", {
			model: loraModel,
			attention: "comfy kitchen attention"
		}).out();
		const picked = g.node("ComfySwitchNode", {
			switch: p.sla_switch ?? true,
			on_true: sla,
			on_false: mab
		}).out();
		const adaln = g.node("H3AdaLNLoRAFix", {
			model: picked,
			mode: "port"
		}).out();
		sigmaModel = g.node("MiniMaxH3SigmaShift", {
			model: adaln,
			shift_video: shiftVideo,
			shift_audio: p.shift_audio
		}).out();
		const length = p.length ?? (family === "t4_open" ? 90 : 56);
		const r2v = g.node("MiniMaxH3ReferenceToVideo", {
			prompt,
			width: p.width,
			height: p.height,
			length,
			ref_image_size: p.ref_image_size ?? "match",
			clip,
			vae: vaeVideo,
			audio_vae: vaeAudio
		});
		cond = r2v.out(0);
		latent = r2v.out(1);
		fpsInput = 24;
	}
	const noise = g.node("RandomNoise", { noise_seed: p.noise_seed ?? p.seed ?? 42 }).out();
	const samplerSel = g.node("KSamplerSelect", { sampler_name: p.sampler_name ?? "euler" }).out();
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
	const sched = g.node("BasicScheduler", {
		model: sigmaModel,
		scheduler: p.sched_name ?? "simple",
		steps: p.steps,
		denoise: p.denoise ?? 1
	}).out();
	const guider = g.node("BasicGuider", {
		model: sigmaModel,
		conditioning: cond
	}).out();
	if (isChain) {
		const path = p.ctx_load_latent_path ?? "";
		const latentPath = k >= 2 && !path ? [`window${k - 1}_MiniMaxH3MotionContextSaveLatent.0`, 0] : path;
		const prevLatent = g.node("MiniMaxH3MotionContextLoadLatent", {
			latent_path: latentPath,
			clip_index: p.ctx_load_clip_index ?? 0
		}).out();
		const mc = g.node("MiniMaxH3MotionContext", {
			conditioning: cond,
			vae: vaeVideo,
			latent,
			context_length: p.motion_context_length ?? "39",
			audio_context_length: p.motion_audio_context_length ?? 24,
			context_latent: prevLatent
		});
		cond = mc.out(0);
		trimFrames = mc.out(1);
	}
	const latOut = g.node("SamplerCustomAdvanced", {
		noise,
		guider,
		sampler,
		sigmas: sched,
		latent_image: latent
	}).out(0);
	let vdec = g.node("VAEDecode", {
		samples: latOut,
		vae: vaeVideo
	}).out();
	let vadec = g.node("VAEDecodeAudio", {
		samples: latOut,
		vae: vaeAudio
	}).out();
	if (isChain) {
		const trim = g.node("MiniMaxH3MotionContextTrim", {
			images: vdec,
			trim_frames: trimFrames,
			audio: vadec,
			fps: 24,
			match_tail: true
		});
		vdec = trim.out(0);
		vadec = trim.out(1);
	}
	if (isT4r) {
		const created = g.node("CreateVideo", {
			images: vdec,
			audio: vadec,
			fps: fpsInput,
			bit_depth: 8
		});
		g.node("SaveVideo", {
			video: created.out(),
			filename_prefix: "video/ComfyUI",
			format: "auto",
			codec: "h264",
			"codec.encoding": "re-encode",
			"codec.encoding.crf": 10
		});
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
		const sharpened = g.node("ImageSharpenKJ", {
			image: vdec,
			method
		}).out();
		const sharpSw = g.node("ComfySwitchNode", {
			switch: p.sharpen_enabled ?? p.sharpen_switch ?? false,
			on_true: sharpened,
			on_false: vdec
		}).out();
		const film = g.node("FrameInterpolationModelLoader", { model_name: p.interp_model ?? "film_net_fp16.safetensors" }).out();
		const interp = g.node("FrameInterpolate", {
			interp_model: film,
			images: sharpSw,
			multiplier: p.interp_multiplier ?? 2
		}).out();
		const interpSw = g.node("ComfySwitchNode", {
			switch: p.interpolate_enabled ?? p.interp_switch ?? false,
			on_true: interp,
			on_false: sharpSw
		}).out();
		const sr = g.node("SeedVR2VideoUpscaler", {
			image: interpSw,
			dit: g.node("SeedVR2LoadDiTModel", {
				model: p.sr_model ?? "seedvr2_ema_3b_fp8_e4m3fn.safetensors",
				device: "cuda:0"
			}).out(),
			vae: g.node("SeedVR2LoadVAEModel", {
				model: "ema_vae_fp16.safetensors",
				device: "cuda:0"
			}).out(),
			seed: 42,
			resolution: p.sr_resolution ?? 1080,
			max_resolution: 0,
			batch_size: 5,
			uniform_batch_size: false,
			color_correction: "lab"
		}).out();
		const srSw = g.node("ComfySwitchNode", {
			switch: p.sr_switch ?? false,
			on_true: sr,
			on_false: interpSw
		}).out();
		const created = g.node("CreateVideo", {
			images: srSw,
			audio: vadec,
			fps: 24,
			bit_depth: 8
		});
		g.node("SaveVideo", {
			video: created.out(),
			filename_prefix: `h3_t4_w${k}`,
			format: "mp4",
			codec: "h264"
		});
	}
	g.node("MiniMaxH3MotionContextSaveLatent", {
		latent: latOut,
		filename_prefix: p.ctx_save_prefix ?? "h3_context/clip",
		clip_index: p.ctx_save_clip_index ?? k
	});
}
function registerCard(ctx, comfy) {
	ctx.effect(() => comfy.registerCard({
		id: "h3-timeline",
		skeleton: "h3-film",
		boarded: [...BOARDED],
		tags: [
			"video",
			"timeline",
			"edit"
		],
		identity,
		sidebar: {
			key: "video",
			order: 6
		},
		surface: {
			size: "huge",
			layout: "studio"
		},
		flowKinds: {
			inputs: { image: "image" },
			outputs: { default: "video" },
			requiresModel: false
		},
		admits: [
			"ctx_*",
			"fps_seconds",
			"image_name",
			"k",
			"motion_*",
			"noise_seed",
			"quant",
			"recipe",
			"ref_image_size",
			"sla_*",
			"variant"
		],
		requires: [
			"comfyui-h3-motion-context",
			"ComfyUI-PlagueKind-Nodes",
			"ComfyUI-Frame-Interpolation",
			"ComfyUI-KJNodes",
			"ComfyUI-SeedVR2_VideoUpscaler",
			"ComfyUI-LTXVideo"
		],
		schema,
		schemaCarrier: paramSchema,
		compose(p, _model, g) {
			const guideImage = p.image ?? p.image_name ?? "";
			if (p.variant === "t4r" && !guideImage) throw new Error("h3_window(t4r): image-anchored window without a staged guide image — compose always injects LoadImage.0.image on this family");
			renderH3Window(p, g);
		},
		finalize: finalizeH3
	}));
}
//#endregion
//#region src/tool.ts
const TOOL_NAME = "h3_timeline";
const FLOW = "h3-timeline";
const DEFAULT_MODEL = BOARDED[0];
const buildH3TimelineTool = (call) => {
	const gw = jsonLane(call);
	return defineTool({
		name: TOOL_NAME,
		description: identity.description,
		parameters: {
			...emitParamsSpec(carrier, BOARDED),
			calls: {
				type: "json",
				required: true,
				description: "Shots — one per film shot: [{ text, start_frame, end_frame, image?, seam_carry?, refs?, last_frame?, audio? }]. Spans are ints (end > start); seam_carry 0 = hard cut, else 1-64."
			}
		},
		presentCall(args) {
			const a = args;
			const calls = Array.isArray(a.calls) ? a.calls.length : 0;
			return {
				card: "generic",
				title: identity.label,
				kind: "execute",
				rawInput: `model=${String(a.model ?? DEFAULT_MODEL)} shots=${calls}`
			};
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: true,
				properties: {
					flow: {
						type: "string",
						required: true
					},
					model: {
						type: "string",
						required: true
					},
					run_id: {
						type: "string",
						description: "The queue run id — poll with run_status."
					},
					draft_id: {
						type: "string",
						description: "The minted card draft id."
					},
					status: {
						type: "string",
						description: "Registration status (queued/running)."
					},
					error: {
						type: "string",
						description: "Named refusal reason, when the estate refused."
					}
				}
			},
			render: (_args, value) => {
				const v = value ?? {};
				if (typeof v.error === "string" && v.error) return [{
					type: "text",
					text: `${TOOL_NAME} REFUSED: ${v.error}`
				}];
				return [{
					type: "text",
					text: `${TOOL_NAME} [${String(v.model ?? "?")}] → ${String(v.run_id ?? "?")} — poll with run_status`
				}];
			},
			presentationMeta: (_args, value) => {
				const v = value ?? {};
				return {
					flow: String(v.flow ?? FLOW),
					model: String(v.model ?? "?"),
					...typeof v.run_id === "string" && v.run_id !== "" ? { run_id: v.run_id } : {},
					...typeof v.draft_id === "string" && v.draft_id !== "" ? { draft_id: v.draft_id } : {},
					...typeof v.status === "string" && v.status !== "" ? { status: v.status } : {},
					...typeof v.error === "string" && v.error !== "" ? { error: v.error } : {}
				};
			}
		},
		presentResult(_args, result) {
			if (result?.meta == null) return void 0;
			const m = result.meta;
			const model = typeof m.model === "string" && m.model !== "" ? m.model : "?";
			if (typeof m.error === "string" && m.error !== "") return {
				card: "generic",
				title: `${identity.label} [${model}] — REFUSED`
			};
			const runId = typeof m.run_id === "string" && m.run_id !== "" ? m.run_id : "?";
			return {
				card: "generic",
				title: `${identity.label} [${model}] → ${runId}`
			};
		},
		async execute(args, exec) {
			const a = args;
			const model = typeof a.model === "string" ? a.model : DEFAULT_MODEL;
			const params = {};
			for (const [k, v] of Object.entries(a)) if (k !== "model") params[k] = v;
			try {
				const draft = await gw("POST", "/v1/flows/drafts", {
					intent: FLOW,
					stages: [{
						title: identity.label,
						kind: "generation",
						service: model,
						params
					}]
				}, exec?.signal);
				const draftId = typeof draft.draftId === "string" ? draft.draftId : "";
				if (draftId === "") return {
					flow: FLOW,
					model,
					error: "gateway draft POST returned no draftId"
				};
				const started = await gw("POST", "/v1/flows/start", {
					...params,
					model,
					draft_id: draftId
				}, exec?.signal);
				const named = typeof started.error === "string" ? started.error : "";
				if (named !== "") return {
					flow: FLOW,
					model,
					error: named
				};
				if (typeof started.run_id !== "string" || started.run_id === "") return {
					flow: FLOW,
					model,
					error: "gateway start returned no run_id"
				};
				return {
					flow: FLOW,
					model,
					draft_id: draftId,
					run_id: started.run_id,
					status: typeof started.status === "string" ? started.status : "queued"
				};
			} catch (e) {
				if (e instanceof GatewayError) return {
					flow: FLOW,
					model,
					error: e.named || e.body || `estate ${e.status}`
				};
				throw e;
			}
		}
	});
};
//#endregion
//#region src/index.ts
const name = "@melite/video-h3-timeline";
const inject = [];
const Config = z.object({ call: z.any() });
function apply(ctx, config) {
	const comfy = ctx.get("comfyui");
	if (comfy !== void 0 && typeof comfy.registerCard === "function") registerCard(ctx, comfy);
	const tools = ctx.get("tools");
	if (tools !== void 0 && config.call !== void 0) tools.register(buildH3TimelineTool(config.call));
}
//#endregion
export { Config, apply, inject, name };
