# causes — video_wan-vace_default

2026-09-07: video-gen card golden (wan_vace_t1), captured from
the production python renderer via render('wan_vace_t1', doc,
WanVace). VACE arm: merged checkpoint + Lightning LoRA, shift 8. Pin: seed 42.

2026-09-07 REGOLD: first-cut golden hand-shaped the doc and bypassed
compose.py's _step_doc derivation — negative_prompt rode "" instead
of the _negative() serve-time fallback ("low quality, blurry,
jitter, distorted limbs, watermark"; empty text hits the fp8 umt5
meta-tensor path server-side, wan-vace canary 2026-09-04).
Recaptured through the _step_doc derivation (fallback negative,
float dims, filename_prefix "<run_id>/gen"); lane loaders now read
the facts rows in the TS card. Same shape otherwise (comfy-script
coerces the float dims back to ints, pin autofills byte-stable).
