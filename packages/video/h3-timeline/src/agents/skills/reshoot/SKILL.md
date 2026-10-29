---
name: reshoot
description: "Camera re-shoot on the h3-timeline: seat a source clip plus one camera intent (orbit/tilt/dolly/zoom/pan) on the reshoot mod bag, the scene rebuilds from depth and renders from the moved camera. Mod-bag door — NOT a fresh regen and NOT the replace mod."
genre: video
---

# Reshoot (camera re-shoot) — SPEC

> STATUS: LANDED (feature 024; fourth-mod-bag law §8, 2026-11-12).
> The chain composes per the family renderer (`models/h3`
> reshoot.ts): depth estimation → reprojection under the new camera
> → Fun ControlNet depth conditioning per window, disocclusions
> inpainted. Prose never overrides the loaded bundle: the fields
> below are quoted off the card's served reshoot kind.

## What it is (and is NOT)

A camera re-shoot: the SAME scene, viewed from a MOVED camera. The
source clip's frames rebuild the scene (video depth), the new camera
pose reprojects it, and the regions the moved camera reveals are
invented. The camera control IS this depth-warp chain — no native H3
camera conditioning exists.

It is NOT:
- **a fresh regen** — re-rolling the same shot is a new seed on an
  ordinary film run; reshoot MOVES the camera, it does not re-roll;
- **the replace mod** — replace swaps a person (a different render
  branch with its own terminal); reshoot augments the normal film:
  calls, windows, and audio compose exactly as before, every window's
  model stack just renders from the moved camera.

One door per doc: an armed replace + an armed reshoot REFUSES loud —
pick one. (Armed = the bag is PRESENT and non-empty; an absent or
empty `reshoot` bag is an unused arm — the film composes exactly as
before, byte-identical.)

## The flow (bind, confirm, press)

1. **Compose the film as usual.** `calls`, audio, windows — the
   ordinary h3-timeline doc. Reshoot changes where the camera sits,
   not what the film is.
2. **Arm and bind.** Seat ONE entry on the `reshoot` mod bag:
   `params.reshoot = [entry]` — never flat (a flat `reshoot_clip`
   or `reshoot_orbit` beside the doc refuses as unknown param(s)).
   The entry's `source_clip` (the video whose scene the new camera
   views; its soundtrack does NOT carry over — the film doc's own
   audio lanes still work) is required: a present-but-clip-less
   entry refuses LOUD naming the seat — the arm never silently
   disarms.
3. **Set ONE camera intent.** The entry fields (the card's served
   ranges, tested guidance):
   - `orbit` (±180, 0) — orbit left/right. ±45° tested;
     past 90° the hidden side is invented.
   - `tilt` (±90, 0) — raise/lower the camera. Rising is
     the weak direction — keep above about −20°.
   - `dolly` (0.1–3, 1.0) — distance; below 1 dollies in,
     above 1 pulls back (pulling back reveals more invented area).
   - `zoom` (20–120, 50) — lens FOV; change it when the
     clip is clearly wide-angle or telephoto.
   - `pan` (−1–1, 0) — framing shift without camera motion;
     rescues a clipped head.
   - `strength` (0–10, 1.0) — raise toward 2 only when the
     shot ignores the camera move.
   - `depth_ratio` (1.5–1000, 6) — scene depth: 2.5–4
     close-up faces, 4–8 mid shots, 8–16 deep/wide scenes.
   - `smooth_depth` / `invert_depth` (false) —
     depth postures; invert only if the depth source's polarity
     is flipped.
   Out-of-band dials refuse LOUD at the compose door (ahead of the
   engine, never a widget 400). Untouched dials = the identity camera:
   an armed re-shoot with no move re-renders the scene from the SAME
   viewpoint.
4. **Confirm.** Show the bound clip, the camera intent in words
   ("orbit 30° right, dolly to 0.8"), and that replace is empty.
   THE LANE CLAUSE: that wait is chat-lane law — on a headless
   commission the brief IS the confirmation (state the values in
   the run record, then execute; never stall a commission waiting
   for a watcher who isn't there).
5. **Press.** The user presses Run. Browser/chat agents never
   execute; headless commissions ride `melite_flow` per the maker
   runbook.

## Companion surfaces

- `cinemadir` composes camera-language films — its keyframe plates
  (e.g. an orbit mid-plate) pair with a reshoot's move.
- Depth cost is paid ONCE per run (the chain builds one shared
  warp + patch; every window consumes the same handles) — multi-
  window films do not multiply the depth bill.
