---
name: refine
description: "Second-pass refine on the h3-timeline: seat a source clip plus one window (start + length) and a refine prompt per entry on the refine mod bag; the RefineHandoff applies a 2x learned latent upscale and a low-denoise H3 pass to THAT WINDOW, decoding to <run>/refine. The bag takes multiple window entries, but ABUTTING starts only: a carried join (overlap of 1 f or more) is REFUSED at the compose door — that carry is DEAD in the engine today (F3-14: window 0 bills, then window 1 dies at its handoff with a Drift-Control packed-mask error) — so the hard cut (0 overlap, the plain concat, up to 32 window entries) is the lawful tile. One window per press is the DECLARED ALTERNATIVE — judge each window before pressing the next. Mod-bag door — NOT a re-render and NOT the upscale arm."
genre: video
---

# Refine (second-pass detail pass) — SPEC

> The
> emission composes per the family renderer (`models/h3` refine.ts):
> VHS window load → VAEEncode + VAEEncodeAudio → ONE
> MinimaxH3LatentUpscaler3DRefineHandoff (learned 3D-conv latent
> upscale + the low-sigma MiniMax H3 pass in one node) → decode →
> CreateVideo + SaveVideo at `<run>/refine`. Prose never overrides
> the loaded bundle: the fields below are quoted off the card's
> served refine kind.
>
> Live-proven on the GPU lane: a 56 f clip refined at 2x to
> 2624×1472, 48 kHz, and a WINDOWED press (`frame_load_cap` 90 /
> `skip_first_frames` 48, 2624×1472, 90 f, 48 kHz): the window really
> reads only its slice — refined frame 0 matched the SOURCE's frame
> 48 (Δ8.99 on 0–255) and not its frame 0 (Δ25.81). Also measured,
> and what step 6 exists for: 90 f @2× is green, 141 f @2× OOM'd, and
> a 430 f window @1.0 OOM'd too (20.08 GiB allocated, 830 MiB short,
> node `MinimaxH3LatentUpscaler3DRefineHandoff`) — the WINDOW is the
> memory unit at every scale. BURNED live (F3-14): the
> carried multi-window bag dies at window 1's handoff with
> `ValueError: Drift-Control AV packed mask does not match its audio
> stream`, after window 0 billed and saved. The door now REFUSES that
> shape before any node, so the only multi-window press that runs is
> the ABUTTING bag (0 overlap, the plain concat); the carried seam
> waits on the engine cure (ROADMAP F3-14). NOT yet proven live: an
> ABUTTING multi-window bag press (the concat composes in-graph and is
> walled — `refine-bag.spec.ts` + `refine-carry-standdown.spec.ts` — but
> the live GPU press over a multi-window bag is the operator's runbook);
> the carried face is burned and refused, never a promise.

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

One door per doc: ANY two of the SIX armed mod bags REFUSE loud naming both —
the fifteen pairs are replace↔repair, replace↔extend, repair↔extend,
replace↔reshoot, repair↔reshoot, extend↔reshoot, replace↔refine,
repair↔refine, extend↔refine, reshoot↔refine, replace↔upscale,
repair↔upscale, extend↔upscale, refine↔upscale, reshoot↔upscale.
THE LORA BAG IS NOT AN ARM: `loras` is the SEVENTH bag and it
COEXISTS with any armed arm — it never disarms a pair (the lora
plane rides every arm; only the six arm bags refuse).
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
   THE SOUNDTRACK REQUIREMENT: this arm builds the window's joint AV
   latent (the source frames AND its soundtrack ride
   `MiniMaxH3FantasticVideoEditLatent` with `keep_audio`), so the
   source MUST carry an audio track. A silent clip fails inside the loader
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
     Advance it window by window to walk a longer film — the walk is
     the DECLARED ALTERNATIVE (step 6); stacking the entries on the
     bag at ABUTTING starts lets one press tile it (the hard cut — a
     carried join is refused today, F3-14).
   A window past 141 f (5.875 s) REFUSES at the compose door before
   the engine runs: 141 f is the measured OOM (it missed by 1.06 GiB
   with 20.13 GiB already resident), and H3 memory
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
    THE AUTO-TILE (one entry tiles the film, no hand math):
    `windows` (1–32, 1) states how many windows this ONE entry
    covers, and `overlap_frames` (whole frames at or above zero, 22)
    states the join's carry. The compose derives every window's start
    (Start seconds + k × (window − overlap)), so a human states a
    SIZE and a COUNT instead of hand-tiling entries with frame-exact
    starts. THE CARRY IS DEAD IN THE ENGINE TODAY (F3-14): an overlap
    of 1 or more mounts the film's continuation, and that press dies
    at window 1's handoff after window 0 bills — so the door REFUSES
    every overlap ≥ 1, including the default 22. The lawful auto-tile
    states `overlap_frames` 0: the windows ABUT, the join is the
    plain concat, every seam is a hard cut. `windows` above 1 on ANY
    entry of a MULTI-entry bag refuses — the bag already IS the
    tiling, so auto-tile lives on a lone entry only. A lone window
    ignores the overlap seat (no join). The ceiling still judges each
    derived window (past 141 f refuses naming the numbers), and the
    overlap must be shorter than the window. The carried seam waits
    on the engine cure (ROADMAP F3-14).
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
   - `windows` (1–32, 1) — how many windows this ONE entry tiles
     (the auto-tile: the compose derives every window's start,
     so one press covers the film with no hand-tiled entries). 1 is
     the single-window walk posture. A carry above 0 is refused
     today (F3-14), so an auto-tile states `overlap_frames` 0.
   - `overlap_frames` (0+, 22) — the join's carry in whole frames.
     0 is the ONLY lawful join today: the abutting hard cut (the
     plain concat, no carried continuation). 22 is the film's own
     seam and token-exact, but the carried continuation it mounts is
     DEAD in the engine today (F3-14: window 0 bills, then window 1
     dies at its handoff with a Drift-Control packed-mask error), so
     every overlap of 1 or more REFUSES at the door until the engine
     cure lands. Rides only with `windows` above 1 (a lone window has
     no join) and must be shorter than the window.
5. **Confirm.** Show the bound clip, the window in words ("from 5.0 s
   for 3.75 s"), the pass dials ("2x, denoise 0.32, 6 steps"), and
   that every other arm is empty.
   THE LANE CLAUSE: that wait is chat-lane law — on a headless
   commission the brief IS the confirmation (state the values in the
   run record, then execute; never stall a commission waiting for a
   watcher who isn't there).
6. **Press.** The user presses Run. Browser/chat agents never
   execute; headless commissions ride `melite_flow` per the maker
   runbook. The bag takes multiple window entries, so ONE press tiles
   a long film at ABUTTING starts (up to 32 window entries, one
   `start_seconds` per entry, same source clip) — a carried join is
   refused today (F3-14). THE WALK IS THE
   DECLARED ALTERNATIVE: a windowed film pass driven press by press,
   where you judge each window before pressing the next — lawful,
   byte-cheap, and the posture the walk below spells out.

   ### The walk's loop and splice (the declared alternative, step by step)

   The walk's step is the FULL window length: the windows ABUT, and
   every seam is a hard cut. At the 3.75 s window (90 f):

       overlap_frames = 0                     (the hard cut; a carried join refuses today, F3-14)
       step_frames    = clip_seconds × 24      e.g. 90 f = 3.75 s
       step_seconds   = step_frames / 24

   A 430 f clip at that window is five presses at `start_seconds`
   0 / 3.75 / 7.50 / 11.25 / 15.00 (the last one starts at clip length
   − window length, per THE WALK BOUND). The 22 f carry step
   (90 − 22 = 68 f = 2.83 s) belongs to the carried face: it composes
   (the soft seam below), but it is DEAD in the engine today (F3-14)
   and refused at the door — do not plan a press around it until the
   engine cure lands.

   SPLICE THE WINDOWS — it is part of the pass, not an optional
   extra. The composed carrier still builds the film's own carry:
   each window builds its joint AV target (the source frames + its
   own soundtrack), window k≥2 receives window k−1's joint latent
   through `MiniMaxH3FiniteLatentContinuation` with the film's own
   seats (iteration, the carried overlap, continue_audio_latent, the
   model + sigmas the handoff samples with), the handoff re-renders
   from the provided prefix, and `MiniMaxH3FiniteSegmentFinalize`
   trims the carried head. The tail is the plain file concat. But
   that shape REFUSES at the door today (F3-14): no node is emitted,
   so window 0 never bills. What runs is the ABUTTING bag: windows
   butted end to end, the plain file concat, hard cuts at every seam,
   assembled length = Σ windows, frame-exact. NO hand ffmpeg, NO trim verb,
   nothing to run afterwards: press the bag, judge the seams.

   There are exactly TWO joins: a TOKEN-EXACT carry (5, 22, 39 …) —
   the composed continuation, REFUSED today (F3-14); and a
   ZERO-carry join, the plain hard cut, the only join that runs.
   Anything else refuses at compose, naming the measured carry, the
   token grid, and the start that lands 22 f.

   THE SEAM, when the engine cure lands: a 22 f carry means each join
   re-renders ~0.92 s the previous window already covered, and the
   finalize drops that span from the member — the film does not
   replay it and nothing is crossfaded. The previous window's tail is
   in the model's prefix; the incoming window's head is generated
   under it. Today's abutting cut has no re-rendered span at all: the
   seam is a jump cut.

   NO CROSSFADE, EVER: a blend of two INDEPENDENT renders is
   a DOUBLE EXPOSURE (the ghost),
   not a soft step and not a cure for
   the pop — measured Δ8.86–9.80 across the
   carry against Δ4.3 between adjacent frames inside one window.
   The crossfade is not served; an off-grid carry
   REFUSES at compose instead. The carried span is BIT-IDENTICAL:
   the finalize drops the incoming window's re-rendered head, so
   every frame the film emits across the join is the previous
   window's own decode, never a blend — and
   the audio seam keeps its soft step.

   PER-WINDOW FREEDOM: each entry states its OWN prompt, denoise,
   steps and seed — the continuation wraps the sampler's model, never
   the text. Only the member geometry must agree: `mode` and `scale`
   on every entry of one bag (one film joins one shape). A bag whose
   entries state different mode/scale refuses, naming both values.

   The live-press judgement (SSIM chain, viewed strips) still belongs
   to the restart window — press and judge before promising a
   seam-free delivery.

   The two honest postures stand:

   - a film that must be seamless TODAY on the audio too: press ONE
     90 f window (3.75 s) — a single window is seam-free by
     construction;
   - a film longer than one window: tile it with ABUTTING windows
     (0 overlap — the hard cut, the plain concat) or press window by
     window; the token-exact carried seam composes but is REFUSED at
     the door today (F3-14, the engine burns window 1's handoff), so
     do not promise a carried seam until the engine cure lands. A bag
     that cannot abut (gaps, out-of-order, disagreeing seats) is
     REFUSED — state the starts abutting and the seats agreeing. Do
     not promise more than the face you mounted.

   Judge each window before pressing the next, and judge the join
   before calling the film done.

## This door restyles pixels; it cannot carry a run

A saved clip is DECODED PIXELS. The latent that made it is gone the
moment the film was encoded, so this pass cannot inherit the ORIGINAL
sampler's state. That is why the arm is a RESTYLE of the pixels —
but it is not context-free inside itself:

- Every window builds a JOINT AV latent from its own frames +
  soundtrack, and the carried face mounts the film's own
  `MiniMaxH3FiniteLatentContinuation` over window k−1's joint latent
  (the harness the stand-down holds: `refine-loop.spec.ts` ARM 3b).
  That carry is DEAD in the engine today (F3-14) and the door refuses
  it; what runs is the abutting concat. Either way the carry would
  cross joins INSIDE this execution — never from the source run,
  whose latent does not exist any more.
- The only metadata that can cross from the source run is its prompt
  text, and only by being restated (see the style law below).
- A genuine deferred second pass — one that inherits the source
  run's sampler state and revision lineage — exists as the CHAIN
  door: the `upscale[]` arm over a saved chain run's checkpoints +
  manifest. If the ask is "pass 2 with the original context", the
  source must be a chain run whose revisions were saved; pick that
  door, not this one.

There is no "second pass with context" over a file: the file's
latent is gone, and no door can rebuild it. Press this door to
restyle or sharpen a clip you already have; press the CHAIN door
for a context-carrying second pass. Never describe a
press here as "the second pass" — it re-encodes pixels and nothing
else survives.

## The prompt is the ONLY style lever

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

Worked example (denoise 0.30):

    the same dancing kunoichi, sharper detail, clean hands and
    fingers, glossy 3D anime render style, unchanged pose, motion
    and background

The failure shape, for contrast (denoise 0.32): "sharper
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
   walk the film window by window (the DECLARED ALTERNATIVE), or
   stack the bag's window entries at ABUTTING starts and let one press
   tile it (the hard cut; a carried join is refused today — F3-14).
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
