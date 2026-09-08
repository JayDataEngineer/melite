// models/cardIdentity.generated.ts — THE CARD IDENTITY RING +
// CAPABILITY TILES + SLOT VOCAB, frozen from the py truth.
//
// The TS card plane (comfyui-cordis registerCard) carries the LIVE
// system (schema/compose/boarded) but NOT the identity rung —
// label/description/genre/icon/ability died with card.py. This is
// that rung as FROZEN DATA, extracted by running the golden's own
// builder (python/catalog.py scan_catalog @ 034e1f97^ — the last
// state with card.py classes) against the archived tree: 19 cards
// + 19 capability tiles + the slot SSOT, ALL byte-equal to the
// tree golden (tests/golden_http/model-catalog.json) on shared
// ids. The 3 since-deleted cards (music-native/auto-rig/forge)
// and the TS-added clothing-placement are NAMED divergences in
// the wall, not drift. Phase 2 (card DSL port) owns moving this
// rung onto the TS cards natively; until then this is the wire's
// identity truth — one copy, never restated.

export interface CardIdentityRow {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly genre: string;
  readonly icon?: string;
  readonly families: readonly string[];
  readonly principles: readonly unknown[];
  readonly skills: readonly unknown[];
  readonly ability_route?: string | null;
  readonly inference_path?: string | null;
  readonly rubric_path?: string | null;
  readonly has_inference?: boolean;
  readonly has_rubric?: boolean;
}

export interface CapabilityRow {
  readonly label: string;
  readonly description: string;
  readonly default_family: string;
  readonly families: readonly string[];
  readonly kind: string;
  readonly icon?: string;
  /** The resolved default family row (variant groups, prompts) —
   *  the tile's live resolution snapshot from the py builder. */
  readonly resolved?: Record<string, unknown>;
}

export const CARD_IDENTITY: ReadonlyArray<CardIdentityRow> =[
 {
  "id": "anny",
  "label": "Anny",
  "description": "Assemble a character — composite body/hair/outfit GLBs, render the 8-view turnaround, segment a source photo into part sprites.",
  "genre": "3d",
  "families": [
   "anny"
  ],
  "principles": [],
  "skills": [],
  "has_inference": false,
  "has_rubric": false
 },
 {
  "id": "fit",
  "label": "Fit",
  "description": "Seat a static prop onto a SOMAX body under the placement laws.",
  "genre": "3d",
  "families": [
   "fit"
  ],
  "principles": [],
  "skills": [],
  "has_inference": false,
  "has_rubric": false
 },
 {
  "id": "img-to-mesh",
  "label": "Image → 3D",
  "description": "The 3D lane — lift one image into a textured mesh (.glb) on native TRELLIS.2 (DINOv3 conditioning) or native Pixal3D (pixel-aligned + MoGe camera FOV, hero tier), or copy a rig onto a target GLB (transfer_rig); one surface, one arm per family.",
  "genre": "3d",
  "families": [
   "trellis2-native",
   "pixal3d",
   "transfer_rig"
  ],
  "principles": [],
  "skills": [],
  "has_inference": false,
  "has_rubric": false
 },
 {
  "id": "quad-remesh",
  "label": "Quad Remesh",
  "description": "High-poly mesh → clean quad topology",
  "genre": "3d",
  "families": [
   "autoremesher"
  ],
  "principles": [
   "target_quads is the budget — lower is cleaner, higher keeps detail",
   "sharp_edge below 90 preserves creases; above smooths them",
   "adaptivity above 1 concentrates quads at curvature",
   "Feed it a dense scan or TRELLIS output; it returns clean quads"
  ],
  "skills": [],
  "has_inference": false,
  "has_rubric": false
 },
 {
  "id": "skin",
  "label": "Skin",
  "description": "Deterministic skin detail maps onto a SOMAX body (kind sidecar + proof turnaround).",
  "genre": "3d",
  "families": [
   "skin"
  ],
  "principles": [],
  "skills": [],
  "has_inference": false,
  "has_rubric": false
 },
 {
  "id": "music",
  "label": "Music",
  "description": "Generate music — MiniMax Music 3, structured captions (Genre + Vocal Details + Arrangement) with tagged lyrics",
  "genre": "audio",
  "families": [
   "music3"
  ],
  "principles": [],
  "skills": [],
  "has_inference": false,
  "has_rubric": false
 },
 {
  "id": "sfx",
  "label": "Sound Effects",
  "description": "Generate sound effects — MOSS-SFX v2, describe the SOUND not the scene",
  "genre": "audio",
  "families": [
   "moss-sfx"
  ],
  "principles": [],
  "skills": [],
  "has_inference": false,
  "has_rubric": false
 },
 {
  "id": "tts",
  "label": "TTS",
  "description": "Text-to-speech — Qwen3-TTS with CustomVoice personas and instruct-text emotion control",
  "genre": "audio",
  "families": [
   "qwen3-tts",
   "qwen3-tts-base"
  ],
  "principles": [
   "text is required — empty text fails",
   "Use Voice Embedding (.qvoice) for consistent character voices",
   "Style Instruction controls emotion and delivery",
   "One line per call — serial execution for multi-line sequences"
  ],
  "skills": [],
  "has_inference": false,
  "has_rubric": false
 },
 {
  "id": "voice-lock",
  "label": "Voice Lock",
  "description": "Lock a voice persona — design, export, and reuse .qvoice embeddings for consistent character voices",
  "genre": "audio",
  "families": [
   "qwen3-tts-voicedesign"
  ],
  "principles": [],
  "skills": [],
  "has_inference": false,
  "has_rubric": false
 },
 {
  "id": "ideogram4",
  "label": "Ideogram",
  "description": "Typography-aware text-to-image with clean, legible text rendering.",
  "genre": "image",
  "families": [
   "ideogram"
  ],
  "principles": [
   "prompt is required — an empty/whitespace prompt is rejected loud, never sampled with empty conditioning",
   "The negative channel is the zeroed conditioning (ConditioningZeroOut) — the official family graph has no negative text input",
   "mu/std ride the model defaults (merged at serve time); the universal form does not carry them as fields",
   "Sampler option lists resolve from the ONE vocabulary — never hand-copied"
  ],
  "skills": [],
  "has_inference": false,
  "has_rubric": false
 },
 {
  "id": "image-edit",
  "label": "Image Edit",
  "description": "Instruction-driven image editing — the edit_image interface card boarding the Qwen-Image-Edit 2511 lane; the family carries the lightning / standard cascade (variant/quant always shown) plus the lanpaint flavor (required anchor image). The surface scopes itself.",
  "genre": "image",
  "families": [
   "qwen-img-edit-2511"
  ],
  "principles": [
   "image1 is required — the edit is anchored on it (the lanpaint flavor declares it; slots image1..image3, input_image is the retired alias)",
   "Qwen-Image-Edit uses low CFG (flow-matching) — the Guidance Scale slider tops out at 10.0",
   "A lanpaint_mask alongside input_image patches the model with the DiffSynth inpaint ControlNet",
   "Region Mode controls how the mask is honored: auto / crop_stitch / full_frame",
   "Mask prep (grow/feather/threshold/invert) uses the same host-side chain the Inpaint card uses",
   "Iterate HERE, not in video — an edit costs seconds, a render minutes; name what changes, state the rest as unchanged",
   "Previous card outputs ride as artifact URLs (/v1/assets/runs/<run>/<file>); the compose resolves them to data/runs/output/<run>/<file> and stages into the comfy input dir (phase 1 validates on the mounts BEFORE registration)"
  ],
  "skills": [],
  "has_inference": false,
  "has_rubric": false
 },
 {
  "id": "image-gen",
  "label": "Image",
  "description": "Text-to-image generation — the generate_image interface card boarding krea-2; the family declares its mods (loras) and the surface scopes itself",
  "genre": "image",
  "families": [
   "krea-2",
   "z-image",
   "anima"
  ],
  "principles": [
   "prompt is required — an empty/whitespace prompt is rejected loud, never sampled with empty conditioning",
   "Defaults are shape, not value: resolution/steps/cfg come from the model folder (defaults:/presets), merged at serve time",
   "Sampler and scheduler option lists resolve from the ONE vocabulary (media.comfyui.sampler_vocab) — never hand-copied",
   "A preset fills untouched fields; values you have set win",
   "Mods are model-level declarations: lanpaint rides the families that declare it (anima, z-image) — input_image + lanpaint_mask switch the builder to LanPaintKSampler; loras ride krea-2 (apply on Turbo, train on Raw)",
   "Mask prep (grow/feather/threshold/invert) and outpaint pads are applied host-side before the run — no silent param drops"
  ],
  "skills": [],
  "has_inference": false,
  "has_rubric": false
 },
 {
  "id": "input-prep",
  "label": "Input Prep",
  "description": "Source intake: attach an image or audio file (upload, asset drop, prior run) — staged, optionally transformed, emitted as a media artifact for downstream cards to wire.",
  "genre": "image",
  "families": [
   "input"
  ],
  "principles": [
   "A source is data, not inference: the graph loads, optionally transforms, and saves — no model ever loads.",
   "Every source form the editor speaks validates at phase 1 (compile time): data: URLs, artifact URLs, input-dir names, absolute paths.",
   "Transforms ride the declared applicability matrix (image: crop+scale) — anything else refuses loudly, never silently drops."
  ],
  "skills": [],
  "has_inference": false,
  "has_rubric": false
 },
 {
  "id": "mask-studio",
  "label": "Mask Studio",
  "description": "Selection-only mask card: detect people/subjects, refine with SAM3, paint corrections → mask artifacts for inpaint flows.",
  "genre": "image",
  "families": [
   "mask-studio"
  ],
  "principles": [],
  "skills": [],
  "has_inference": false,
  "has_rubric": false
 },
 {
  "id": "tagger",
  "label": "Tagger",
  "description": "Image prompt inversion — booru keyword tags (WD14, JoyTag) and natural-language captions (Florence-2, JoyCaption) for recreating images in NovelAI / Pony / FLUX / Ideogram. Tags persist as a tags.txt run artifact.",
  "genre": "image",
  "families": [
   "wd14",
   "joytag",
   "florence2",
   "joycaption"
  ],
  "principles": [
   "input_image is required — the tag is anchored on it (absolute mount path or a prior-run artifact ref)",
   "threshold is the general-tag confidence floor; character_threshold is the person-identity floor (higher — names are cheap to overclaim)",
   "exclude_tags prunes what you already know is wrong — comma-separated, matched case-insensitively by the node",
   "The lane outputs tags.txt (SaveText) — the queue trades in artifacts, not bare strings",
   "First run downloads the WD14 weights (.onnx + .csv) — light ONNX lane, ~4 GB VRAM",
   "JoyTag reads a pack-local checkpoint (no auto-download) and takes add/remove tag lists instead of WD14's character floor"
  ],
  "skills": [],
  "has_inference": false,
  "has_rubric": false
 },
 {
  "id": "upscale-tools",
  "label": "Upscale Tools",
  "description": "Diffusion upscale (SeedVR2-3B fp16) — the hidden tool card; also home of the consumed tool fragments (resize, pixel-upscale, rtx-vsr, concat, input)",
  "genre": "image",
  "families": [
   "seedvr2_ema"
  ],
  "principles": [
   "A tool lane boards only with real weight facts — the weightless fragments render as consumed arms, never as phantom submit options",
   "SeedVR2 restores detail (diffusion); plain resize resamples pixels — pick by intent, not by size",
   "resolution is the TARGET short side (1080 = FHD rail); max_resolution is the hard ceiling the lane refuses past",
   "Defaults are shape, not value: filenames and knobs come from the model folder, merged at serve time",
   "rtx-vsr is NVIDIA-SDK-only: the arm is compose-truth, execution needs the RTX stack"
  ],
  "skills": [],
  "has_inference": false,
  "has_rubric": false
 },
 {
  "id": "motion",
  "label": "Motion",
  "description": "Text → 3D human motion (SOMA-77 pose NPZ). Chain segments, constrain joints, skin onto a rigged character GLB.",
  "genre": "motion",
  "families": [
   "kimodo"
  ],
  "principles": [],
  "skills": [],
  "has_inference": false,
  "has_rubric": false
 },
 {
  "id": "h3-timeline",
  "label": "H3 Timeline",
  "description": "THE video interface — multi-window film with SLA sparse attention, joint video+audio per window, auto-stitched into one mp4. The calls document IS the timeline.",
  "genre": "video",
  "families": [
   "h3-timeline",
   "h3",
   "h3-keyframe"
  ],
  "principles": [
   "Describe MOTION and SOUND together — H3 generates both in one pass",
   "Draft at 768x448x56f (~2.3s); produce at 1344x768x124f (~5.2s)",
   "Length snaps to the 17k+5 frame grid at 24fps",
   "For timelines: repeat the ambient soundscape verbatim in every window; add one new layer where the story needs it",
   "Same seed across a shot's re-rolls keeps the world texture",
   "SLA at sparsity 0.90 gives ~1.75x speedup with no quality loss — use it by default"
  ],
  "skills": [],
  "has_inference": false,
  "has_rubric": false
 },
 {
  "id": "video-gen",
  "label": "Video",
  "description": "Text/reference-to-video — the generate_video interface card boarding wan-vace and scail2-animate; one surface, one arm per family",
  "genre": "video",
  "families": [
   "wan-vace",
   "scail2-animate"
  ],
  "principles": [
   "prompt is required — an empty/whitespace prompt is rejected loud, never sampled with empty conditioning",
   "The reference image anchors identity/scene — prompt the MOTION, not the subject",
   "Wan frames are 4n+1 (49 ≈ 2s at 24fps); SCAIL-2 drives a character from a pose video",
   "Defaults are shape, not value: resolution/steps/cfg come from the model folder, merged at serve time",
   "A family boards only when it can feed truthfully — lane facts + the arm template, no phantom options"
  ],
  "skills": [],
  "has_inference": false,
  "has_rubric": false
 }
] as const;

export const CAPABILITIES: Readonly<Record<string, CapabilityRow>> ={
 "anny": {
  "label": "Anny",
  "description": "Assemble a character — composite body/hair/outfit GLBs, render the 8-view turnaround, segment a source photo into part sprites.",
  "default_family": "anny",
  "families": [
   "anny"
  ],
  "kind": "generation",
  "icon": "person",
  "resolved": {
   "family": "anny",
   "model": "anny",
   "params": {}
  }
 },
 "fit": {
  "label": "Fit",
  "description": "Seat a static prop onto a SOMAX body under the placement laws.",
  "default_family": "fit",
  "families": [
   "fit"
  ],
  "kind": "generation",
  "icon": "person",
  "resolved": {
   "family": "fit",
   "model": "fit",
   "params": {}
  }
 },
 "img-to-mesh": {
  "label": "Image → 3D",
  "description": "The 3D lane — lift one image into a textured mesh (.glb) on native TRELLIS.2 (DINOv3 conditioning) or native Pixal3D (pixel-aligned + MoGe camera FOV, hero tier), or copy a rig onto a target GLB (transfer_rig); one surface, one arm per family.",
  "default_family": "trellis2-native",
  "families": [
   "trellis2-native",
   "pixal3d",
   "transfer_rig"
  ],
  "kind": "generation",
  "icon": "box",
  "resolved": {
   "family": "trellis2-native",
   "model": "trellis2-native",
   "params": {}
  }
 },
 "quad-remesh": {
  "label": "Quad Remesh",
  "description": "High-poly mesh → clean quad topology",
  "default_family": "autoremesher",
  "families": [
   "autoremesher"
  ],
  "kind": "generation",
  "icon": "mesh",
  "resolved": {
   "family": "autoremesher",
   "model": "autoremesher",
   "params": {}
  }
 },
 "skin": {
  "label": "Skin",
  "description": "Deterministic skin detail maps onto a SOMAX body (kind sidecar + proof turnaround).",
  "default_family": "skin",
  "families": [
   "skin"
  ],
  "kind": "generation",
  "icon": "person",
  "resolved": {
   "family": "skin",
   "model": "skin",
   "params": {}
  }
 },
 "music": {
  "label": "Music",
  "description": "Generate music — MiniMax Music 3, structured captions (Genre + Vocal Details + Arrangement) with tagged lyrics",
  "default_family": "music3",
  "families": [
   "music3"
  ],
  "kind": "generation",
  "icon": "music",
  "resolved": {
   "family": "music3",
   "model": "music3",
   "params": {}
  }
 },
 "sfx": {
  "label": "Sound Effects",
  "description": "Generate sound effects — MOSS-SFX v2, describe the SOUND not the scene",
  "default_family": "moss-sfx",
  "families": [
   "moss-sfx"
  ],
  "kind": "generation",
  "icon": "bolt",
  "resolved": {
   "family": "moss-sfx",
   "model": "moss-sfx",
   "params": {}
  }
 },
 "tts": {
  "label": "TTS",
  "description": "Text-to-speech — Qwen3-TTS with CustomVoice personas and instruct-text emotion control",
  "default_family": "qwen3-tts",
  "families": [
   "qwen3-tts",
   "qwen3-tts-base"
  ],
  "kind": "generation",
  "icon": "microphone",
  "resolved": {
   "family": "qwen3-tts",
   "model": "qwen3-tts",
   "params": {}
  }
 },
 "voice-lock": {
  "label": "Voice Lock",
  "description": "Lock a voice persona — design, export, and reuse .qvoice embeddings for consistent character voices",
  "default_family": "qwen3-tts-voicedesign",
  "families": [
   "qwen3-tts-voicedesign"
  ],
  "kind": "generation",
  "icon": "fingerprint",
  "resolved": {
   "family": "qwen3-tts-voicedesign",
   "model": "qwen3-tts-voicedesign",
   "params": {}
  }
 },
 "ideogram4": {
  "label": "Ideogram",
  "description": "Typography-aware text-to-image with clean, legible text rendering.",
  "default_family": "ideogram",
  "families": [
   "ideogram"
  ],
  "kind": "generation",
  "icon": "image",
  "resolved": {
   "family": "ideogram",
   "model": "ideogram",
   "params": {}
  }
 },
 "image-edit": {
  "label": "Image Edit",
  "description": "Instruction-driven image editing — the edit_image interface card boarding the Qwen-Image-Edit 2511 lane; the family carries the lightning / standard cascade (variant/quant always shown) plus the lanpaint flavor (required anchor image). The surface scopes itself.",
  "default_family": "qwen-img-edit-2511",
  "families": [
   "qwen-img-edit-2511"
  ],
  "kind": "generation",
  "icon": "edit",
  "resolved": {
   "family": "qwen-img-edit-2511",
   "model": "qwen-img-edit-2511",
   "params": {}
  }
 },
 "image-gen": {
  "label": "Image",
  "description": "Text-to-image generation — the generate_image interface card boarding krea-2; the family declares its mods (loras) and the surface scopes itself",
  "default_family": "krea-2",
  "families": [
   "krea-2",
   "z-image",
   "anima"
  ],
  "kind": "generation",
  "icon": "image",
  "resolved": {
   "family": "krea-2",
   "model": "krea-2",
   "params": {}
  }
 },
 "input-prep": {
  "label": "Input Prep",
  "description": "Source intake: attach an image or audio file (upload, asset drop, prior run) — staged, optionally transformed, emitted as a media artifact for downstream cards to wire.",
  "default_family": "input",
  "families": [
   "input"
  ],
  "kind": "generation",
  "icon": "upload",
  "resolved": {
   "family": "input",
   "model": "input",
   "params": {}
  }
 },
 "mask-studio": {
  "label": "Mask Studio",
  "description": "Selection-only mask card: detect people/subjects, refine with SAM3, paint corrections → mask artifacts for inpaint flows.",
  "default_family": "mask-studio",
  "families": [
   "mask-studio"
  ],
  "kind": "generation",
  "icon": "mask",
  "resolved": {
   "family": "mask-studio",
   "model": "mask-studio",
   "params": {}
  }
 },
 "tagger": {
  "label": "Tagger",
  "description": "Image prompt inversion — booru keyword tags (WD14, JoyTag) and natural-language captions (Florence-2, JoyCaption) for recreating images in NovelAI / Pony / FLUX / Ideogram. Tags persist as a tags.txt run artifact.",
  "default_family": "wd14",
  "families": [
   "wd14",
   "joytag",
   "florence2",
   "joycaption"
  ],
  "kind": "generation",
  "icon": "tag",
  "resolved": {
   "family": "wd14",
   "model": "wd14",
   "params": {}
  }
 },
 "upscale-tools": {
  "label": "Upscale Tools",
  "description": "Diffusion upscale (SeedVR2-3B fp16) — the hidden tool card; also home of the consumed tool fragments (resize, pixel-upscale, rtx-vsr, concat, input)",
  "default_family": "seedvr2_ema",
  "families": [
   "seedvr2_ema"
  ],
  "kind": "generation",
  "icon": "maximize",
  "resolved": {
   "family": "seedvr2_ema",
   "model": "seedvr2_ema",
   "params": {}
  }
 },
 "motion": {
  "label": "Motion",
  "description": "Text → 3D human motion (SOMA-77 pose NPZ). Chain segments, constrain joints, skin onto a rigged character GLB.",
  "default_family": "kimodo",
  "families": [
   "kimodo"
  ],
  "kind": "generation",
  "icon": "motion",
  "resolved": {
   "family": "kimodo",
   "model": "kimodo",
   "params": {}
  }
 },
 "h3-timeline": {
  "label": "H3 Timeline",
  "description": "THE video interface — multi-window film with SLA sparse attention, joint video+audio per window, auto-stitched into one mp4. The calls document IS the timeline.",
  "default_family": "h3-timeline",
  "families": [
   "h3-timeline",
   "h3",
   "h3-keyframe"
  ],
  "kind": "generation",
  "icon": "video",
  "resolved": {
   "family": "h3-timeline",
   "model": "h3-timeline",
   "params": {}
  }
 },
 "video-gen": {
  "label": "Video",
  "description": "Text/reference-to-video — the generate_video interface card boarding wan-vace and scail2-animate; one surface, one arm per family",
  "default_family": "wan-vace",
  "families": [
   "wan-vace",
   "scail2-animate"
  ],
  "kind": "generation",
  "icon": "video",
  "resolved": {
   "family": "wan-vace",
   "model": "wan-vace",
   "params": {}
  }
 }
} as const;

export const SLOT_VOCABULARY: Readonly<Record<string, unknown>> ={
 "slots": [
  "input_image",
  "image1",
  "image2",
  "image3",
  "reference_image",
  "end_image",
  "first_frame",
  "last_frame",
  "lanpaint_mask",
  "input_mask",
  "source_image",
  "source_glb",
  "input_glb",
  "prev_motion_artifact",
  "preview_glb",
  "reference_audio",
  "voice_file"
 ],
 "slot_kinds": {
  "input_image": "image",
  "image1": "image",
  "image2": "image",
  "image3": "image",
  "reference_image": "image",
  "end_image": "image",
  "first_frame": "image",
  "last_frame": "image",
  "lanpaint_mask": "mask",
  "input_mask": "mask",
  "source_image": "image",
  "source_glb": "glb",
  "input_glb": "glb",
  "prev_motion_artifact": "motion",
  "preview_glb": "glb",
  "reference_audio": "audio",
  "voice_file": "voice"
 },
 "undeclared_slots": [
  "lanpaint_mask"
 ],
 "form_slots": {
  "form_3d_anny": [
   "body_glb",
   "source_image"
  ],
  "form_3d_fit": [
   "body_glb",
   "prop_glb"
  ],
  "form_img_to_mesh": [
   "input_image",
   "rigged_glb",
   "target_glb"
  ],
  "form_3d_skin": [
   "body_glb"
  ],
  "form_edit": [
   "image2",
   "image3",
   "image1"
  ],
  "form_input": [
   "source"
  ],
  "form_mask_studio": [
   "input_image",
   "paint_mask"
  ],
  "form_tagger": [
   "input_image"
  ],
  "form_upscale": [
   "input_image"
  ],
  "form_motion_kimodo": [
   "preview_glb"
  ],
  "form_video_director": [
   "reference_image",
   "pose_video"
  ]
 },
 "model_slots": {
  "anny": [
   "body_glb",
   "source_image"
  ],
  "fit": [
   "body_glb",
   "prop_glb"
  ],
  "trellis2-native": [
   "input_image",
   "rigged_glb",
   "target_glb"
  ],
  "pixal3d": [
   "input_image",
   "rigged_glb",
   "target_glb"
  ],
  "transfer_rig": [
   "input_image",
   "rigged_glb",
   "target_glb"
  ],
  "skin": [
   "body_glb"
  ],
  "qwen-img-edit-2511": [
   "image2",
   "image3",
   "image1"
  ],
  "input": [
   "source"
  ],
  "mask-studio": [
   "input_image",
   "paint_mask"
  ],
  "wd14": [
   "input_image"
  ],
  "joytag": [
   "input_image"
  ],
  "florence2": [
   "input_image"
  ],
  "joycaption": [
   "input_image"
  ],
  "seedvr2_ema": [
   "input_image"
  ],
  "kimodo": [
   "preview_glb"
  ],
  "wan-vace": [
   "reference_image",
   "pose_video"
  ],
  "scail2-animate": [
   "reference_image",
   "pose_video"
  ]
 }
} as const;
