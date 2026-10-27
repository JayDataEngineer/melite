---
description: The Openjutsu swap lane — Viggle-Animate INT8 (MiniMax H3 Ref2VA fine-tune) character/subject replacement in video, one reference still + one driving clip.
kind: package-library
---

# @melite/models-viggle-animate

The viggle-animate family — character/subject swap in video (the Openjutsu lane). One model, one lane: the INT8 MiniMax H3 Ref2VA fine-tune (DMD2-distilled) replaces the person in a driving clip with the identity from a reference still — no pose extractor, no skeleton prep; motion rides the clip, identity rides the image. The family serves the estate's `viggle-animate` route; the `openjutsu` card (packages/video/openjutsu) boards it.

Provisions pin seven downloaded weights with sha256 digests, byte sizes, and target folders: the INT8 Ref2VA pruned body, the DMD2 r64 distill LoRA (REQUIRED on the active path — strength 1.0 with the 4-point sigma schedule), the character-swap LoRA, the Fun ControlNet Union 2.0 patch and the VDA-Small depth model (the secondary paths), the H3 video VAE (h3's digest, re-declared — the family owns every weight its lane loads), and the frozen text embed that is the lane's WHOLE text surface (no prompt seat, no text encoder; the run gate probes the `text_cond` home and refuses loud with the fetch hint when the channel is unfulfilled).

The animate action is the single seat: the card's schema gate runs card-side, then dispatches here; the action owns the `$`-spell clip wire, the DMD2 sigma schedule (`dmd2Sigmas`: t_i = 1 − i/n through the 3t/(1+2t) mapping — 3 steps mints "1, 0.8571…, 0.6, 0"), and the loras marriage. Steps marry from the bag by the h3 law — a bag row's stated knob beats the catalog column by filename, Math.max across rows — and the action layers doc-stated steps over the marriage over the schema default of 3. Euler is fixed (the DMD assumption); BasicGuider runs CFG-free.

Beyond the package entry, the manifest exports `./mods/loras` (the flavor rows: `viggle_dmd_r64` steps-counting 2–4, `viggle_char_swap_v15`).

## License

All MiniMax H3 derivative weights carry the MiniMax H3 Community License Agreement — commercial use permitted, worldwide EXCLUDING the EU, UK, South Korea and the US (excluded territories: api@minimax.io). H3 is the estate's licensed exception to its open-weights rule: MiniMax permits this distribution arrangement; it is not an open-weights release. The ComfyUI-Viggle-Animate-H3 pack itself is Apache-2.0; Video-Depth-Anything-Small is Apache-2.0. See ATTRIBUTION.

## Declaration

`src/index.ts` declares the DECL and the `family-viggle-animate` plugin; `src/actions.ts` is the family's published seam for the card. Variants: the `ref2va` body row carries the INT8 cell; the Recipe group offers `standard` (birth: DMD on, the upstream baseline), `four-step`, and `identity-lock` (DMD + swap LoRA, the drift cure). `has_agent` serves the authored openjutsu skill (`src/agents/skills/openjutsu/SKILL.md`, byte-equal served twin at the engine tree's `models/video/viggle-animate/agents/skills/openjutsu/`).

## Model Experience

#### What the model sees

None — the package contributes no model-visible input. The DECL serves the estate's model catalog and the openjutsu card that boards the family; it registers no session events and writes no prompt segments (the frozen text embed is the text surface).

#### Token effect

Zero-direct token effect — the package registers a model family and composes engine graphs; it writes no prompt text into any model request.

#### KV Cache effect

Independent — the package contributes no persistent prompt prefix, so registering or removing the family invalidates nothing cached.

## Known Limitations and Deferred Work

- **The chunked lanes are unboarded** — `ViggleAnimateConditioningWindowed` / `ViggleChunkedSampler` / the loop classes serve the engine (installed at the pin) but no action addresses them yet; the single-shot lane is the whole surface until a lane needs multi-window takes.
- **The secondary paths are provisioned, not wired** — the Fun ControlNet Union 2.0 patch and VDA-Small are declared and downloadable, but pose/depth-directed swaps ride the h3-timeline card today; no openjutsu action addresses the controlnet or the depth model.
- **Steps marry at max, bag-only** — while a counting bag row rides, steps are the bag's; the authored count loses to the designed one exactly as the h3 family's law states.
