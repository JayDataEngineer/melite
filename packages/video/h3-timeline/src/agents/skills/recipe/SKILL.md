---
name: recipe
description: "The h3-timeline production recipe and complaint routing — which mod answers which user complaint, the order constraints that make the order non-negotiable, and the handhold protocol for users who know nothing about making videos."
---

# The Recipe — post-production routing for the video card

Users describe what looks wrong. You name the arm. This skill is the knowledge
that makes that exchange friction-free: the order the passes may run in, the
constraints that fix the order, and the complaint → arm routing.

## The order (constraints, not slots)

    generation (calls + per-window identity pins)
      → extend[]            (grow the film)
      → replace[]           (identity: the sheet-canonical character)
      → repair[]            (region cleanup)
      → reshoot[]           (camera)
      → upscale[]           (resolution — ALWAYS last)
      → sharpen / interpolate knobs
      → deliver

The constraints that make this order non-negotiable:

1. **Everything that re-renders content runs at base resolution.** `upscale[]`
   is last — never pay super-res and then re-render over it.
2. **Identity before cleanup.** `replace[]` before `repair[]` — the cleanup
   should target the canonical character, not a drifted one.
3. **Camera after character.** `reshoot[]` re-renders the corrected scene.
   Repairing after a reshoot means re-tracking masks on new frames for nothing.
4. **`refine[]` 2x is OUT of the delivery path** until the multi-window splice
   carry is cured — the splice pops, the loader drops
   frames, long films OOM into the windowed sharding that pops. Even cured, it
   is an ALTERNATIVE resolution arm — never a stack on top of SeedVR2.
5. **Every re-generation re-pins the character sheet per window.** The
   keyframes lane, one pin inside EVERY window's span. `params.image` is the
   frame-0 shorthand — it anchors window 1 ONLY.
6. **A poisoned initial limits masked cures.** The mannequin silhouette and the
   mask envelope carry the SOURCE's shapes. Shape-level identity drift in
   the source (a wrong scarf shape, a changed hairstyle) is fixed by
   re-generating with per-window pins first — a masked pass over it inherits
   the envelope.

## The routing — ask "what kind of wrong is it?"

The arm follows from the KIND of wrong, never from a memorized script:

| The complaint sounds like | Kind | The arm |
|---|---|---|
| "that's not my character" / the face, hair or outfit changes between clips | identity | `replace[]` with the character sheet — and per-window pins on any re-generation |
| "her scarf is the wrong shape" / the character's shapes drifted | identity-SHAPE in the source | re-generate the initial with per-window pins, then `replace[]` (a masked pass cannot cure source shapes) |
| "her hands are mangled" / a glitch in one corner | one REGION | `repair[]` — region_prompt + repair_prompt, denoise ≤ 0.50 (it polishes, never re-takes) |
| "I wanted the camera to orbit / push in / a different angle" | camera, content right | `reshoot[]` |
| "the clip ends too soon" / make it longer | length | `extend[]` (latent-anchored continuation) |
| "it looks soft / low-res" | resolution | `upscale[]` (whole film) — or the sharpen knob if only edges are soft |
| "motion blur in my shot" | turbo-lane rendering — EXPECTED on fast motion | a post pass that preserves the take: `repair[]` (localized) / sharpen + `upscale[]` (whole frame) / interpolate (judder) — never a re-roll |
| "the motion stutters / isn't smooth" | temporal | the interpolate knob (uniform 48fps, measured) |
| the words / sounds / music are wrong | audio | the producer cards (tts / sfx / music), then re-press the film |

### MOTION BLUR — expected turbo-lane rendering, not a bug

Fast motion on the turbo LoRA (the first pass's speed lane) renders motion
blur BY DESIGN — the lane trades motion fidelity for speed. It is not a flaw
and not a reason to re-roll. The cure is a POST pass that preserves the
original take:

- **LOCAL** (one region, a few frames): `repair[]` that region at partial
  denoise — the source latent is the base, so the rest of the video is held
  untouched.
- **WHOLE-FRAME edge mush**: the sharpen knob (crisp edges) and/or
  `upscale[]` — SeedVR2 reconstructs detail the turbo lane smears.
- **JUDDER** (frame-blended smear from slow motion): the interpolate knob
  (uniform 48fps).

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
2. **Name the kind in plain words.** "The character is right but her hands are
   broken — that's a region fix." No mod names required to understand you.
3. **Propose ONE arm and set expectations.** Say what it will and will not
   change: "repair can redraw her hands; it cannot move the camera."
4. **Constraint-check out loud when it matters.** "We upscale last so we don't
   pay for resolution twice."
5. **Press on the shared bench and show receipts.** Frames from the result plus
   the measured verdict — then ask whether it matches what they imagined.

Never make a no-knowledge user pick a mod name. They describe the wrong; you
name the arm. The recipe exists so that exchange is one turn, not ten.
