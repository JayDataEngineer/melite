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
>
> VERIFIED LIVE 2026-11-13 against a WINDOWED press
> (run-69bfa7fc98f6-8c7db41c — `frame_load_cap` 90 /
> `skip_first_frames` 48, 2624×1472, 90 f, 48 kHz): the window really
> reads only its slice — refined frame 0 matched the SOURCE's frame
> 48 (Δ8.99 on 0–255) and not its frame 0 (Δ25.81). Also measured,
> and what step 6 exists for: 90 f @2× is green, 141 f @2× OOM'd, and
> a 430 f window @1.0 OOM'd too (20.08 GiB allocated, 830 MiB short,
> node `MinimaxH3LatentUpscaler3DRefineHandoff`) — the WINDOW is the
> memory unit at every scale. NOT yet proven: a multi-window walk
> joined end to end; the seam tax in step 6 is measured, the join
> itself is still the operator's judgement.

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
     CAPACITY CURE, not a capacity escape: a same-size refine (no
     latent upscale) fits more than the 2x pass, but the handoff
     materialises the WHOLE window's latents at any scale — 90 f @2×
     is green, 141 f @2× OOM'd, and a 430 f window @1.0 OOM'd too
     (20.08 GiB + 830 MiB short). Narrow the window first; go 1.0
     when a specific grid matters, and accept source resolution
     instead of 1472p.
5. **Confirm.** Show the bound clip, the window in words ("from 5.0 s
   for 3.75 s"), the pass dials ("2x, denoise 0.32, 6 steps"), and
   that every other arm is empty.
   THE LANE CLAUSE: that wait is chat-lane law — on a headless
   commission the brief IS the confirmation (state the values in the
   run record, then execute; never stall a commission waiting for a
   watcher who isn't there).
6. **Press.** The user presses Run. Browser/chat agents never
   execute; headless commissions ride `melite_flow` per the maker
   runbook. A windowed film pass is a LOOP THE OPERATOR DRIVES, and
   the step is the window length MINUS the 22 f seam overlap — never
   the window length itself:

       overlap_frames = 22                    (the measured cure; 0 is a hard cut)
       step_frames    = clip_seconds × 24 − overlap_frames
       step_seconds   = step_frames / 24      e.g. 90 − 22 = 68 f = 2.833 s

   The 3.75 s window (90 f) steps **2.83 s** forward each press. A
   430 f clip at that window is six presses at `start_seconds`
   0 / 2.83 / 5.67 / 8.50 / 11.33 / 14.17 (the last one starts at clip
   length − window length, per THE WALK BOUND). A FULL-window step
   (3.75 s) shares no frames: every seam is a jump cut, not a refine
   seam. The 22 f carry exists so the next window refines frames the
   last window already covered, and the two renders agree there to
   Δ≈9 (measured on a shared 66 f offset; adjacent frames differ by
   Δ≈4.3, so the seam is a soft step, not a pop).

   SPLICE THE WINDOWS AFTERWARDS — it is part of the pass, not an
   optional extra, and there is NO trim verb to lean on: the carry is
   consumed by the crossfade, not cut out. Crossfade over the carry,
   then mux the SOURCE's audio once:

       # per join k (k = 1..n-1): duration ≈ overlap, offset ≈ k × step
       ffmpeg -i w{k-1}.mp4 -i w{k}.mp4 \
         -filter_complex "[0:v][1:v]xfade=transition=fade:duration=0.917:offset=<k*2.833>[v]" \
         -map "[v]" -c:v libx264 -crf 16 -pix_fmt yuv420p joined.mp4
       # then the soundtrack, once, from the source clip:
       ffmpeg -i joined.mp4 -i source.mp4 -map 0:v -map 1:a -c:v copy \
         -c:a aac -b:a 256k -ar 48000 -shortest final.mp4

   THE SEAM TAX, honestly: a 0.92 s dissolve per join means a 430 f
   film (six windows) spends ~26 % of its runtime in a blend.

   AND THE HARDER TRUTH (measured 2026-11-13, round 8): this splice is
   NOT a cure for the pop. Two windows are two independent denoise
   realisations of the shared frames — measured Δ8.86–9.80 across the
   carry against Δ4.3 between adjacent frames inside one window — and
   a crossfade cannot make the two renders equal. The operator's
   verdict on the blended result was "POPS DO NOT WORK", and it is
   correct. The two honest postures are:

   - a film that must be seamless: press ONE 90 f window (3.75 s) —
     a single window is seam-free by construction;
   - a film longer than one window: the join pops today. The crossfade
     is a demo of the carry law, never a delivery cure. A true carry
     (shared latents across the join) is the CHAIN door's job (§ the
     door cannot carry a run below), and that arm has no writer yet —
     do not promise it.

   Judge each window before pressing the next, and judge the splice
   before calling the film done.

## This door restyles pixels; it cannot carry a run (2026-11-13)

A saved clip is DECODED PIXELS. The latent that made it — and every
chunk's context — is gone the moment the film was encoded, so nothing
in this pass can continue what produced the clip. That is why this
arm is a RESTYLE, not a second pass:

- There is no "second pass with context" over a file: the handoff
  receives a fresh `VAEEncode` of the frames. The only metadata that
  can cross from the source run is its prompt text, and only by being
  restated (see the style law below).
- The node that does carry a seam
  (`MiniMaxH3FiniteLatentContinuation`) needs a JOINT AV latent and
  only exists inside the execution that produced one; it is not
  mountable on this seat (law: `refine-loop.spec.ts` ARM 7).
- A genuine deferred second pass exists as the CHAIN door — the
  `upscale[]` arm over a saved chain run's checkpoints + manifest,
  where per-scene prompts and lineage come from the store instead of
  the pixels. If the ask is "pass 2 with context", the source must be
  a chain run whose revisions were saved; pick that door, not this
  one.

Press this door to restyle or sharpen a clip you already have; press
the chain door for a context-carrying second pass. Never describe a
press here as "the second pass" — it re-encodes pixels and nothing
else survives.

## The prompt is the ONLY style lever (F36, 2026-11-13)

Nothing else carries. The original prompt, seed, schedule and calls do
NOT re-enter the pass — so `refine_prompt` alone decides what the
window looks like. A prompt that describes only quality ("sharper
detail, clean skin") leaves the medium and the identity unanchored,
and the low-denoise pass drifts the shot: the operator's own
two-window test restyled a 3D-anime dancer into a photoreal human from
the prompt alone.

THE LAW: `refine_prompt` MUST restate the source's own look — the
medium (e.g. "glossy 3D anime render style") and the identity anchors
(who/what, wardrobe, palette) — beside the quality asks. Never
introduce a new style or a new subject; never let a quality word
("clean skin", "photoreal", "realistic") stand where the source's
medium belongs.

Worked example (the operator's good run, `run-2d2a9db536a1`,
denoise 0.30):

    the same dancing kunoichi, sharper detail, clean hands and
    fingers, glossy 3D anime render style, unchanged pose, motion
    and background

The failure shape, for contrast (`run-3f0c…`, denoise 0.32): "sharper
detail, clean skin, unchanged motion" — no medium, no identity, and
"clean skin" pulled the render photoreal. The window stayed the same
shot; the STYLE moved. Restate the look, then ask for detail.

## Capacity, honestly

The 2x pass pays nearly the full first-pass resource bill on every
run: the resident model stack (UNET int8, the qwen3vl CLIP, two
VAEs, SLA, LoRA) is ~20 GiB of the card, and each window reloads it.
That is why this arm is window-driven rather than a whole-film loop:
one 90 f window per press is the documented cheap shape. The three
cures, in the order to try them:

1. **Narrow the window** (default 3.75 s) — 90 f is measured green;
   walk the film window by window.
2. **`scale` 1.0** — a same-size refine lifts the ceiling but does
   NOT remove it: the handoff still materialises the whole window's
   latents. Measured: 90 f at 2× green; 141 f at 2× OOM (1.06 GiB
   short); a 430 f pass at 1.0 (scale 1.0) OOM'd too — 20.08 GiB
   allocated, 830 MiB short. The window is the memory unit at every
   scale — never lengthen it just because the multiplier is 1.
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
