---
name: recipe
description: "The h3-timeline production recipe and complaint routing — which arm answers which user complaint, the order constraints that make the order non-negotiable, and the handhold protocol for users who know nothing about making videos."
---

# The Recipe — post-production routing for the video card

Users describe what looks wrong. You name the arm. This skill is the knowledge
that makes that exchange friction-free: the order the passes may run in, the
constraints that fix the order, and the complaint → arm routing.

## The doors (the served roster)

There is ONE edit door and ONE camera door, plus a rider:

- **edit** — the mask × anchors × denoise matrix. Its postures are DIAL
  SETTINGS, not separate doors: identity swap (anchors), region repair
  (region mask, partial denoise), extend (the continuation switch), refine
  (the refine switch), upscale (the prior-run resume). One posture per doc.
- **reshoot** — camera moves: orbit, tilt, dolly, zoom, pan over a correct
  scene. The one live pair with edit.
- **loras** — the rider that arms turbo/speed lanes on generation, never a
  re-render arm.

A doc written with a legacy bag name (`replace`, `repair`, `extend`,
`refine`, `upscale`) resolves into the ONE edit bag at the compose door —
exactly one entry, translated to the dial cell the name always named; two
armed arms in one doc refuse loud (one door per doc).

## The order (constraints, not slots)

    generation (calls + per-window identity pins)
      → edit        (identity pass: anchors, whole-frame)
      → edit        (region cleanup: mask, partial denoise)
      → reshoot     (camera)
      → edit        (upscale posture: the prior-run resume — ALWAYS last)
      → sharpen / interpolate (the second-pass post chain)
      → deliver

The constraints that make this order non-negotiable:

1. **Everything that re-renders content runs at base resolution.** The 2x
   upscale posture (`chain_run` on the edit bag) resumes the PRIOR chain run
   as a deferred second pass — it is last by construction, never pay
   super-res and then re-render over it.
2. **Identity before cleanup.** The anchored identity pass before the region
   cleanup — the cleanup should target the canonical character, not a
   drifted one.
3. **Camera after character.** Reshoot re-renders the corrected scene.
   Repairing after a reshoot means re-tracking masks on new frames for
   nothing.
4. **One posture per edit doc.** The edit bag states ONE mask × anchors ×
   denoise posture; a second armed arm refuses loud. Sequence two postures
   as two docs, order per the constraints above.
5. **Refine is a dial, never a stack.** `refine: true` on the edit bag adds
   the learned second pass to THIS run (partial denoise only). It is the
   ALTERNATIVE resolution arm — never a stack on top of the chain_run
   upscale.
6. **Every re-generation re-pins the character sheet per window.** The
   keyframes lane, one pin inside EVERY window's span. `params.image` is the
   frame-0 shorthand — it anchors window 1 ONLY.
7. **The post chain has a master.** Sharpen and interpolate compose only
   when the doc states `second_pass_enabled: true`; without the master a
   pin there composes to nothing, silently.
8. **A poisoned initial limits masked cures.** The mannequin silhouette and
   the mask envelope carry the SOURCE's shapes. Shape-level identity drift
   in the source (a wrong scarf shape, a changed hairstyle) is fixed by
   re-generating with per-window pins first — a masked pass over it inherits
   the envelope.

## The routing — ask "what kind of wrong is it?"

The arm follows from the KIND of wrong, never from a memorized script:

| The complaint sounds like | Kind | The arm |
|---|---|---|
| "that's not my character" / the face, hair or outfit changes between clips | identity | edit with the identity anchors (`reference: still+mannequin`, the sheet-canonical character) — and per-window pins on any re-generation |
| "her scarf is the wrong shape" / the character's shapes drifted | identity-SHAPE in the source | re-generate the initial with per-window pins, then the anchored edit pass (a masked pass cannot cure source shapes) |
| "her hands are mangled" / a glitch in one corner | one REGION | edit with `mask_source: region` + `region_prompt`, denoise ≤ 0.50 (it polishes, never re-takes) |
| "I wanted the camera to orbit / push in / a different angle" | camera, content right | reshoot |
| "the clip ends too soon" / make it longer | length | edit with `continuation: true` + `extend_seconds` (fresh full-denoise seconds appended to the source's last frame) |
| "it looks soft / low-res" | resolution | edit with `chain_run` (the prior run resumed at 2x, whole film) — or the sharpen knob if only edges are soft |
| "motion blur in my shot" | turbo-lane rendering — EXPECTED on fast motion | a post pass that preserves the take: region-masked edit (localized) / sharpen + `chain_run` (whole frame) / interpolate (judder) — never a re-roll |
| "the motion stutters / isn't smooth" | temporal | the interpolate knob (uniform 48fps, measured) under `second_pass_enabled` |
| the words / sounds / music are wrong | audio | the producer cards (tts / sfx / music), then re-press the film |

### MOTION BLUR — expected turbo-lane rendering, not a bug

Fast motion on the turbo LoRA (the first pass's speed lane) renders motion
blur BY DESIGN — the lane trades motion fidelity for speed. It is not a flaw
and not a reason to re-roll. The cure is a POST pass that preserves the
original take:

- **LOCAL** (one region, a few frames): a region-masked edit pass at partial
  denoise — the source latent is the base, so the rest of the video is held
  untouched.
- **WHOLE-FRAME edge mush**: the sharpen knob (crisp edges) and/or the
  `chain_run` upscale posture — the learned upscaler reconstructs detail the
  turbo lane smears.
- **JUDDER** (frame-blended smear from slow motion): the interpolate knob
  (uniform 48fps) under `second_pass_enabled`.

Re-rolling the window is NOT the motion-blur answer: it re-takes the shot
(the user asked to preserve the original), and the same turbo recipe renders
the same blur back. Only re-render when the USER chooses to change the take —
for example the base (non-turbo) recipe on the first pass, which costs the
speed. Scrub the film yourself first (extract frames at the complaint, look
at them), form your own diagnosis, then propose ONE arm.

## The handhold protocol (users who know nothing about making videos)

1. **Look before asking.** Pull frames at the complaint and view them. Form
   your own diagnosis first; never interrogate the user about things you can
   see yourself.
2. **Name the kind in plain words.** "The character is right but her hands
   are broken — that's a region fix." No door names required to understand
   you.
3. **Propose ONE arm and set expectations.** Say what it will and will not
   change: "a region-masked edit can redraw her hands; it cannot move the
   camera."
4. **Constraint-check out loud when it matters.** "We upscale last so we
   don't pay for resolution twice."
5. **Press on the shared bench and show receipts.** Frames from the result
   plus the measured verdict — then ask whether it matches what they
   imagined.

Never make a no-knowledge user pick an arm name. They describe the wrong;
you name the arm. The recipe exists so that exchange is one turn, not ten.
