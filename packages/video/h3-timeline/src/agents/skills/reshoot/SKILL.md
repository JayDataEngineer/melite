---
name: reshoot
description: "Camera re-shoot on the h3-timeline: seat a source clip plus one camera intent (orbit/tilt/dolly/zoom/pan) on the reshoot mod bag; the official comfy-reshoot chain reprojects the scene from MoGe metric depth and H3 re-renders it from the moved camera (warp guide + the CrossView LoRA, trigger `crossview`). Mod-bag door — NOT a fresh regen and NOT the replace mod."
genre: video
---

# Reshoot (camera re-shoot) — SPEC

> STATUS: LANDED (feature 024; fourth-mod-bag law §8, 2026-11-12;
> REWORKED 2026-11-13 onto the OFFICIAL chain — Comfy-Org's
> comfy-reshoot reference app). The chain composes per the family
> renderer (`models/h3` reshoot.ts): core LoadVideo →
> CrossViewPrepareClip (24 fps + H3 grid snap) → MoGe metric
> geometry → ONE CrossViewWarp; the prepared clip rides the r2v
> reference seat, the warp pins through MiniMaxH3AddGuide, and the
> CrossView LoRA (trigger `crossview`, 0.5–1) loads on every
> window's model. Prose never overrides the loaded bundle: the
> fields below are quoted off the card's served reshoot kind.
>
> VERIFIED LIVE 2026-11-12 against the compose door + the bag surface (run run-e7a5182d153c-88fd3236 — orbit and dolly dials composed live; that run rode the predecessor depth chain, since superseded by the official rework) and 2026-10-30 against the Comfy-Org reference graph, receipt `contracts/receipts/2026-11-13-cards-h3-reshoot-official.md` — the current authority. NOT yet verified live: a rendered re-shoot on the GPU lane — treat the chain's visual output as unproven until the post-cure press lands.

## What it is (and is NOT)

A camera re-shoot: the SAME scene, viewed from a MOVED camera. The
official chain (Comfy-Org's comfy-reshoot reference app, the verified
mainstream implementation) reprojects the scene: MoGe-2 estimates
METRIC depth with intrinsics, CrossViewWarp reprojects it under the
new camera pose, the warp guides H3 through its native
reference+guide seats while the original clip anchors
appearance/identity, and the CrossView LoRA makes the model follow
the moved view.

It is NOT:
- **a fresh regen** — re-rolling the same shot is a new seed on an
  ordinary film run; reshoot MOVES the camera, it does not re-roll;
- **the replace mod** — replace swaps a person (a different render
  branch with its own terminal); reshoot augments the normal film:
  calls, windows, and audio compose exactly as before, every window's
  model stack just renders from the moved camera.

One door per doc: ANY two armed mod bags REFUSE loud naming both —
the fifteen pairs are replace↔repair, replace↔extend, repair↔extend,
replace↔reshoot, repair↔reshoot, extend↔reshoot, replace↔refine,
repair↔refine, extend↔refine, reshoot↔refine, replace↔upscale,
repair↔upscale, extend↔upscale, refine↔upscale, reshoot↔upscale.
The three edit branches, the refine branch, and the upscale branch
each return before the film action, so an armed reshoot under any of
them would be silently dropped; two edit arms would race for one
emission. Pick one and empty the
others. (Armed = the bag is PRESENT and non-empty; an absent or
empty `reshoot` bag is an unused arm — the film composes exactly
as before, byte-identical.)

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
   - `strength` (0.5–1, 0.8) — the CrossView LoRA's strength, the
     official tested band; push toward 1 when the shot ignores the
     camera move.
   - `depth_ratio` (1.5–1000, 6) — scene depth: 2.5–4
     close-up faces, 4–8 mid shots, 8–16 deep/wide scenes.
   - `smooth_depth` / `invert_depth` (false) —
     depth postures; smooth trades a little sharpness for cleaner
     disocclusion holes, invert only if the render looks
     inside-out.
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
- Geometry cost is paid ONCE per run (the chain builds one shared
  prepare + MoGe + warp; every window consumes the same handles) —
  multi-window films do not multiply the geometry bill.
