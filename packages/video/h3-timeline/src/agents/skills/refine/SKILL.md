---
name: refine
description: "Second-pass refine on the h3-timeline: seat a source clip plus one window (start + length) and a refine prompt on the refine mod bag; the RefineHandoff applies a 2x learned latent upscale and a low-denoise H3 pass to THAT WINDOW, decoding to <run>/refine. A long film is refined window by window. Mod-bag door — NOT a re-render and NOT the upscale arm."
genre: video
---

# Refine (second-pass detail pass) — SPEC

> STATUS: LANDED 2026-10-30 (the fifth mod bag, F19/F24; WINDOWED
> 2026-11-13 — the arm used to load the whole staged clip and the 2x
> handoff OOM'd past the measured ceiling, report §13.2). The
> emission composes per the family renderer (`models/h3` refine.ts):
> VHS window load → VAEEncode + VAEEncodeAudio → ONE
> MinimaxH3LatentUpscaler3DRefineHandoff (learned 3D-conv latent
> upscale + the low-sigma MiniMax H3 pass in one node) → decode →
> CreateVideo + SaveVideo at `<run>/refine`. Prose never overrides
> the loaded bundle: the fields below are quoted off the card's
> served refine kind.
>
> VERIFIED LIVE 2026-10-30 against a real GPU render (run
> run-3dad106712a8-8b8c7098 — a 56 f clip refined at 2x to
> 2624×1472, 48 kHz, 190 s end to end) and against the measured
> capacity sweep (run run-fc1bb9054282-8bace0aa — the 141 f source
> OOM'd at the handoff with clip_seconds ignored, the burn this
> window cure closes), receipt
> `contracts/receipts/2026-10-30-flows-refine-capacity-seats.md`.
> NOT yet verified live: a WINDOWED pass over a clip longer than one
> window (the loader's frame_load_cap / skip_first_frames path is
> wired and walled, never yet rendered on the GPU lane) — treat
> multi-window film coverage as unproven until a windowed press
> lands.

## What it is (and is NOT)

A refine is a SECOND PASS over a clip you already have: the frames
are upscaled by a learned 3D-conv latent upscaler and re-rendered at
low denoise, so detail tightens while the shot stays the shot. The
soundtrack is the source's own and is locked through the pass.

It is NOT:
- **a re-render** — denoise stays inside the refinement window
  (0.05–0.50); a full-noise pass would discard the learned upscaled
  latent and the node throws. Re-rendering the same scene from a new
  camera is the reshoot arm;
- **a fresh generation** — the original prompt, seed, schedule and
  calls do NOT carry. The only text is `refine_prompt`, the only
  seed is this bag's own, and the schedule is a fresh low-denoise
  one. Nothing from the source generation re-enters;
- **the upscale arm** — upscale resumes a PRIOR chain run's saved
  scene latents (whole film, engine-side lineage); refine takes a
  staged clip file and reads it through the shared loader;
- **the replace/repair/extend arms** — those render a new edit of
  the scene; refine only sharpens what is already there.

One door per doc: ANY two armed mod bags REFUSE loud naming both —
the fifteen pairs are replace↔repair, replace↔extend, repair↔extend,
replace↔reshoot, repair↔reshoot, extend↔reshoot, replace↔refine,
repair↔refine, extend↔refine, reshoot↔refine, replace↔upscale,
repair↔upscale, extend↔upscale, refine↔upscale, reshoot↔upscale.
The refine branch returns before the film action, so an armed refine
beside any other arm would be silently dropped. Pick one and empty
the others. (Armed = the bag is PRESENT and non-empty; an absent or
empty `refine` bag is an unused arm — the film composes exactly as
before, byte-identical.)

## The flow (bind, confirm, press)

1. **Get the clip.** A refine reads a STAGED video leaf by name
   (`source_clip`) — normally a prior run's harvested film, or the
   source footage you are polishing. It is one file, not a run
   lineage: there is no chain store involved on this arm.
   THE SOUNDTRACK REQUIREMENT: this arm encodes the window's audio
   (`VAEEncodeAudio` → the handoff's `audio_latent`), so the source
   MUST carry an audio track. A silent clip fails inside the loader
   with the engine's own ffmpeg error ("failed to extract audio"),
   not with a card refusal — the card cannot see a file's tracks.
   Every film this estate renders carries 48 kHz sound, so a
   harvested prior film is always a valid source; a hand-staged or
   muted clip must be given a soundtrack first.
2. **Arm and bind.** Seat ONE entry on the `refine` mod bag:
   `params.refine = [entry]` — never flat (a flat `refine_clip` or
   `refine_prompt_value` beside the doc refuses as unknown param(s)).
   The entry's `source_clip` and `refine_prompt` are both required:
   a present-but-empty entry refuses LOUD naming the seat — the arm
   never silently disarms.
3. **Set the window.** The pass refines ONE WINDOW of the clip, and
   the window is what keeps the 2x pass inside the card's memory:
   - `clip_seconds` (0.5–60, 3.75) — how much of the clip this pass
     reads, from the window start. 3.75 s = 90 f at 24 fps, the
     widest window the operator's box measured GREEN at 2x
     (2688×1536, 48 kHz). It is the loader's `frame_load_cap`
     (seconds × 24), so the pass really reads only that much; the
     soundtrack is trimmed to the same window.
   - `start_seconds` (0–3600, 0) — where the window starts (the
     loader's `skip_first_frames`, seconds × 24). 0 is the clip head.
     Advance it window by window to walk a longer film.
   A window past 141 f (5.875 s) REFUSES at the compose door before
   the engine runs: 141 f is the measured OOM (it missed by 1.06 GiB
   with 20.13 GiB already resident, report §13.2), and H3 memory
   grows with the window, so a wider one cannot fit. THE CEILING IS
   THE WINDOW'S: it applies to EVERY upsizing mode — `scale by
   multiplier` at ≥ 2, and both exact-size modes (`target
   dimensions`, `megapixels`) ship the same learned 3D upscaler and
   take the same ceiling. Only a same-size multiplier pass
   (`scale` < 2) is exempt, because its upscaler is the identity —
   that is what made a 144 f window fit at 1x. The refusal names the
   numbers and the cures below.
   THE WALK BOUND: the window must start INSIDE the clip. A
   `start_seconds` past the last frame yields no frames and the
   engine answers "No frames generated" — the walk's last step
   starts at (clip length − window length), never past it. A
   `clip_seconds` longer than what remains is quietly SHORTENED to
   the frames that exist (VHS yields `min(cap, available)`), so the
   produced window can be shorter than the number you stated: know
   the clip's length and state both seats from it.
4. **Set the pass dials.** The entry fields (the card's served ranges,
   tested guidance):
   - `denoise` (0.05–0.5, 0.32) — the partial-denoise strength of the
     refinement pass; the researched window is 0.30–0.35, lower is
     subtler. 1 or more refuses — a refine is never a re-render (the
     handoff's sigmas law: 0 <= sigmas[0] < 1).
   - `steps` (1–30, 6) — the refinement schedule steps (the low-sigma
     second pass; the sampler itself stays the family's euler).
   - `seed` (0–4294967295, 0) — the refinement noise seed (0 is the
     reference posture).
   - `mode` (select, 'scale by multiplier') — how the handoff sizes
     the pass: a multiplier, exact target dimensions (1280×704), or a
     megapixel budget. The node's own three options, verbatim.
   - `scale` (1–4, 2) — the multiplier mode's scale. 1.0 is the
     capacity cure: a same-size refine (no latent upscale) fits what
     the 2x pass OOMs, and the refinement pass still runs — the
     result is cleaner at source resolution, never 1472p.
5. **Confirm.** Show the bound clip, the window in words ("from 5.0 s
   for 3.75 s"), the pass dials ("2x, denoise 0.32, 6 steps"), and
   that every other arm is empty.
   THE LANE CLAUSE: that wait is chat-lane law — on a headless
   commission the brief IS the confirmation (state the values in the
   run record, then execute; never stall a commission waiting for a
   watcher who isn't there).
6. **Press.** The user presses Run. Browser/chat agents never
   execute; headless commissions ride `melite_flow` per the maker
   runbook. A windowed film pass is a LOOP THE OPERATOR DRIVES: one
   run per window, `start_seconds` moved forward by the window
   length each press (a second or two of overlap is normal — both
   sides of a cut anchor to the same source pixels, so expect subtle
   texture discontinuity at the seams, never generative breaks).
   Judge each run's own output before pressing the next.

## Capacity, honestly

The 2x pass pays nearly the full first-pass resource bill on every
run: the resident model stack (UNET int8, the qwen3vl CLIP, two
VAEs, SLA, LoRA) is ~20 GiB of the card, and each window reloads it.
That is why this arm is window-driven rather than a whole-film loop:
one 90 f window per press is the documented cheap shape. The three
cures, in the order to try them:

1. **Narrow the window** (default 3.75 s) — 90 f is measured green;
   walk the film window by window.
2. **`scale` 1.0** — a same-size refine fits a VRAM-bound card and
   still sharpens; quality caps at source resolution.
3. **The exact-size modes** (`target dimensions`, `megapixels`) —
   the node's own sizing routes when a specific output grid is
   wanted instead of a multiplier. They take the SAME window ceiling
   as the 2x multiplier (both ship the learned 3D upscaler), so they
   are a SIZING choice, never a capacity escape: narrow the window or
   go same-size when VRAM is the wall.

## Companion surfaces

- `reshoot` moves the camera; `refine` sharpens what a clip already
  holds — a reshoot's output is a normal candidate to refine.
- The `upscale` arm does the whole-film 2x pass over a PRIOR chain
  run; refine is the per-clip, per-window door for clips that have
  no chain lineage.
- `video-timeline` composes films; the refine arm never edits the
  film doc — it is its own run with its own terminal.
