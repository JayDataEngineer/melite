# H3 timeline — latent-chain law (2026-08-30)

The MiniMaxH3MotionContext extension (base pack + MultiRef fork) is EXTERMINATED
(operator order, codified in plugins/comfyui/nodes/extensions.yaml). The seam
mechanism is TRUE latent chaining via the in-tree pack
`plugins/comfyui/custom_nodes/melite-h3-motion-nodes`:

- `RayH3SaveLatentTail` — SOURCE window (window1*, and every seam window):
  passthrough LATENT between KSampler and the decoders; torch.save()s the
  full AV latent (video+audio streams) to an ABSOLUTE .pt path (atomic
  tmp+rename). The decoders read THROUGH it so the save always executes.
- `RayH3ChainLatentAV` — SEAM window (window2_t4.json is the prototype the
  gateway clones for windows 3..N): splices the previous window's saved tail
  into this window's head slots behind a nested noise_mask; KSamplerX0Inpaint
  holds the carried slots bit-exact. Writes `<tail_path>.meta.json` with the
  EXACT `carried_pixel_frames` (grid math: head 2 slots = 5px, then 17/5 px
  per slot — mirrors `_carried_pixel_frames` in h3_chain.py).
- NO in-graph trim: the backend ffmpeg_concat trims each seam window's
  carried head via `trim_heads` — the gateway splices the plan-math trims
  and cross-checks them against the .meta.json (mismatch = hard error).
- Grid law: sampled lengths snap to 17k+5; zero-skip requires
  span = sampled - carried_px on seam windows (multiples of 17), span =
  sampled on window 1. The next window's carry comes from the SAMPLED tail,
  so a tail span-cut would skip motion — never span-cut a seam window below
  sampled - carried_px.
- `context_steps` / `audio_context_steps` inputs on MiniMaxH3ImageToVideo do
  NOT exist in the live node schema (patched comfy_extras) — never add them.
- window1_load.json = the continue_from variant: window1's graph with a
  ChainLatentAV fed the PRIOR run's last `windowN_tail.pt` (literal inject
  by the gateway's continue_from splice).
