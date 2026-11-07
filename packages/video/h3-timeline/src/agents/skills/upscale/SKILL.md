---
name: upscale
description: "Whole-film 2x upscale on the h3-timeline — the LEGACY `upscale` spelling of the one Video edit bag (a preset cell: chain_run names a PRIOR chain run; every scene resumes its checkpointed lineage, upscales through the learned 3D latent upscaler, re-renders at low denoise, assembles at <runId>/upscale). Old upscale docs still resolve; new docs state params.edit with chain_run."
genre: video
---

> THE COLLAPSE — THIS NAME IS A PRESET CELL, NOT A DOOR. This leaf
> documents the LEGACY spelling so old docs keep composing: state the
> cell on the ONE Video edit bag (`params.edit`).
> `upscale: [{ chain_run }]` resolves to `edit: [{ chain_run,
> denoise: 0.24 }]` — `chain_run` is the arming seat, the bare run name
> (the execute door resolves the per-scene lineage; `mode.scale` stays
> the engine's own validated child key). New docs state the edit bag.

# Upscale (deferred whole-film 2x) — SPEC

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
> Live-proven at the execute door: the prompt VALIDATES and SUBMITS
> (the engine's own validation passes — no
> `required_input_missing input_name: "mode.scale"` at the door).
> NOT yet verified live: an END-TO-END upscaled render — no reachable run
> carries chain checkpoints yet (every film so far is single-pass), so
> the loop's own output is unproven until a chain-route film is pressed
> and this arm re-presses on top of it.
>
> THE DOOR REFUSES CLEANLY PAST VALIDATION: the render path dies
> INSIDE the graph at `MiniMaxH3ChainCheckpointManager` — the node
> reads a selection file the estate never wrote — so the door refuses
> instead of submitting into that dead graph.
> Do not promise an upscale: the render itself is unproven and the
> door refuses past validation — name the open state, never sell the
> pass.
>
> THE WRITE SIDE IS LIVE: the ENGINE writes the per-scene revisions on every chain-spine run
> (swap/repair/extend checkpoint each scene), and the estate now stamps
> WHICH store on the run row — a completed chain run's stage
> `result_outputs` carries `chain_store` {run_name, scenes, end_clip}.
> The START DOOR resolves an upscale `chain_run` bound by ESTATE RUN ID
> through that stamp (the run row, never the store, answers "was this a
> chain run"), and a store-name binding passes straight through. THE
> PLAIN-FILM LAW: a single-pass film run left NO chain store — its
> windows join by file and no scene latents survive — so a film run id
> refuses at the start door naming exactly that. Bind a swap/repair/
> extend run's id or its store name; never promise an upscale over a
> plain film.

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

ONE DOOR PER DOC: the legacy names are PRESET CELLS of the ONE Video
edit bag — each resolves into `params.edit`, and a doc arming two of
them (or a legacy name beside an armed `edit` bag) REFUSES loud naming
both: one emission, never a silent winner. THE LORA BAG IS NOT AN ARM:
`loras` is the co-arming adapter bag and it COEXISTS with any armed
arm — it never disarms a pair (the lora plane rides every arm). The
upscale branch is the edit bag's chain_run posture now, so state it
there. (Armed = the bag is PRESENT and non-empty; an absent or empty
`upscale` bag is an unused arm — the film composes exactly as before,
byte-identical.)

## The flow (bind, confirm, press)

1. **Find a chain run.** The source must be a run that pressed with the
   CHAIN route and therefore left per-scene checkpoints — swap, repair
   and extend runs do; read the run row's stage `result_outputs`
   `chain_store` ({run_name, scenes, end_clip}): a chain run carries
   it, a plain film does not. Bind the entry by the ESTATE RUN ID
   (`run-…`) — the start door resolves it through that stamp — or by
   the store name (`swap_…`) directly, which passes through untouched.
   THE PLAIN-FILM LAW: a single-pass film's windows join by file and
   no scene latents survive, so a film run id refuses at the START
   door — "left no chain store — plain films don't checkpoint" — never
   as a typo-reading unknown-run 404 at the execute door. (A store
   name the store does not hold still refuses at the execute door,
   naming the live runs — the store is the only existence truth for
   spellings.)
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
   - `denoise` (0.05–1, 0.24) — the edit bag's band (the pass-2 partial window is 0.05–0.5); the
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
in `required_input_missing` before a single pixel moves. The
composers own one spelling each.

## Companion surfaces

- `refine` is the per-clip, per-window door for footage with no chain
  lineage; `upscale` is the whole-film door for footage that has one.
- `swap` / `repair` / `extend` runs leave checkpoints, so their runs
  are the natural upscale sources.
- `video-timeline` composes films; an upscale is its own run with its
  own `ChainAssemble` terminal.
