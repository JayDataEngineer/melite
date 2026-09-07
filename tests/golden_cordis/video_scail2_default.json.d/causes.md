# causes — video_scail2_default

2026-09-07: video-gen card golden (scail2_t1), captured from
the production python renderer via render('scail2_t1', doc,
Scail2). SCAIL-2 arm: character animation over reference + driving pose video, shift 5. Pin: seed 42.

2026-09-07 REGOLD: first-cut golden hand-shaped the doc and bypassed
compose.py's _step_doc derivation — negative_prompt rode "" instead
of the _negative() serve-time fallback ("low quality, blurry,
jitter, distorted limbs, watermark"; empty text hits the fp8 umt5
meta-tensor path server-side, wan-vace canary 2026-09-04).
Recaptured through the _step_doc derivation (fallback negative,
float dims, pose_strength float, filename_prefix "<run_id>/gen");
lane loaders now read the facts rows in the TS card. Same shape
otherwise (comfy-script coerces the float dims back to ints, pin
autofills byte-stable).
