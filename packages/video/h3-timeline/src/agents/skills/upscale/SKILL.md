---
name: upscale
description: "Whole-film 2x upscale on the h3-timeline: name a PRIOR CHAIN RUN on the upscale mod bag; every scene resumes its checkpointed lineage, upscales through the learned 3D latent upscaler, re-renders at low denoise, and the pass assembles at <runId>/upscale. Mod-bag door — NOT the refine arm and NOT a re-render."
genre: video
---

# Upscale (deferred whole-film 2x) — SPEC

> STATUS: LANDED 2026-11-12 (the sixth mod bag, the F19 deferred loop).
> The emission composes the upstream Context-Loop family verbatim
> (`models/h3` chainUpscale.ts): CheckpointManager with a BARE chain-run
> name → UpscaleAdapter → UpscaleCurrent → ReferenceConditioning → the
> bf16 3D latent upscaler → Pass2Prepare → the res_multistep second pass
> → LoopEnd → ChainAssemble at `<runId>/upscale`. The bare run name is
> resolved to the newest per-scene lineage by the ESTATE at the execute
> door (`resolveH3ChainSelections`), never hand-authored here. Prose never
> overrides the loaded bundle: the fields below are quoted off the card's
> served upscale kind.
>
> VERIFIED LIVE 2026-11-13 against the execute door and the engine's own
> validation (run run-10100e3da0e2-8c6108ab — the prompt VALIDATED and
> SUBMITTED: round 5's `required_input_missing input_name: "mode.scale"`
> is gone) and against the tree's skill-coverage batch (receipt
> `contracts/receipts/2026-11-13-cards-bag-skills-coverage.md`).
> NOT yet verified live: an END-TO-END upscaled render — no reachable run
> carries chain checkpoints yet (every film so far is single-pass), so
> the loop's own output is unproven until a chain-route film is pressed
> and this arm re-presses on top of it.

## What it is (and is NOT)

An upscale is a SECOND PASS over a whole film that the chain route
already rendered: each scene's saved checkpoint resumes, the latent
upscales through the learned 3D upscaler, and the scene re-renders at
low denoise before the loop assembles the film again at higher
resolution.

It is NOT:
- **the refine arm** — refine takes a staged clip FILE and refines one
  window of it; upscale resumes a prior run's SCENE LATENTS and walks
  the whole film scene by scene. Refine has one latent per clip;
  upscale has one lineage per scene;
- **a re-render** — denoise stays in the partial window (0.05–0.50) and
  1 or more refuses: a full-noise pass is a reshoot;
- **a fresh generation** — the source run's own scene prompts, seed
  lineage and checkpoints carry; a blank `prompt` reuses them verbatim;
- **a staged-file door** — there is no clip to stage: the entry names a
  RUN, and the engine's chain store is the only truth for what exists.

One door per doc: ANY two armed mod bags REFUSE loud naming both —
the fifteen pairs are replace↔repair, replace↔extend, repair↔extend,
replace↔reshoot, repair↔reshoot, extend↔reshoot, replace↔refine,
repair↔refine, extend↔refine, reshoot↔refine, replace↔upscale,
repair↔upscale, extend↔upscale, refine↔upscale, reshoot↔upscale.
The upscale branch returns before the film action, so an armed upscale
beside any other arm would be silently dropped. Pick one and empty the
others. (Armed = the bag is PRESENT and non-empty; an absent or empty
`upscale` bag is an unused arm — the film composes exactly as before,
byte-identical.)

## The flow (bind, confirm, press)

1. **Find a chain run.** The source must be a run that pressed with the
   CHAIN route and therefore left per-scene checkpoints. A single-pass
   film leaves none, and the door refuses clearly when the store has no
   scene revisions for the name (it names the run, the scene, and this
   cure — the old failure was a raw JSON decode crash inside the engine
   three nodes in).
2. **Arm and bind.** Seat ONE entry on the `upscale` mod bag:
   `params.upscale = [entry]` — never flat. `chain_run` is required: a
   present-but-blank entry refuses LOUD naming the seat.
3. **Set the dials.** The entry fields (the card's served ranges):
   - `chain_run` (text) — the engine-side chain-store run name, as the
     run rows spell it. An unknown name refuses at the execute door
     naming the live runs.
   - `prompt` (text) — the pass-2 text; blank reuses the source run's
     own per-scene prompts (the documented posture for a pure
     resolution pass).
   - `denoise` (0.05–0.5, 0.24) — the pass-2 partial denoise (the
     recipe's own 0.24; lower is subtler). 1 or more refuses.
   - `steps` (1–30, 20) — the pass-2 schedule steps (the recipe runs
     20; the sampler stays res_multistep, the loop family's own
     spelling).
   - `segment_crf` (0–51, 18) — the H.264 quality of the persisted HQ
     scene segments (the adapter's own seat; 18 is its default).
4. **Confirm.** Show the source run, the pass dials, that the prompt
   will reuse the run's own (or state the new text), and that every
   other arm is empty.
   THE LANE CLAUSE: that wait is chat-lane law — on a headless
   commission the brief IS the confirmation (state the values in the
   run record, then execute; never stall a commission waiting for a
   watcher who isn't there).
5. **Press.** The user presses Run. Browser/chat agents never execute;
   headless commissions ride `melite_flow` per the maker runbook. The
   estate drives the loop scene by scene (the requeue driver patches
   the loop start) until the assembly answers complete.

## The one wiring fact that bites

The upscale family mounts `MinimaxH3LatentUpscaler3D` — a
`COMFY_DYNAMICCOMBO_V3` node whose multiplier rides the DOTTED child
key `mode.scale`. The refine arm mounts a DIFFERENT node
(`MinimaxH3LatentUpscaler3DRefineHandoff`, a plain combo with a
top-level `scale`). The two spellings are never interchangeable: the
dotted key on the flat node, or the flat key on the dynamic node, ends
in `required_input_missing` before a single pixel moves. That is what
the F23 burn was, and the composers now own one spelling each.

## Companion surfaces

- `refine` is the per-clip, per-window door for footage with no chain
  lineage; `upscale` is the whole-film door for footage that has one.
- `swap` / `repair` / `extend` runs leave checkpoints, so their runs
  are the natural upscale sources.
- `video-timeline` composes films; an upscale is its own run with its
  own `ChainAssemble` terminal.
