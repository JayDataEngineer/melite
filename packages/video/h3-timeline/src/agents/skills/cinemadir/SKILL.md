---
name: cinemadir
description: "Direct the camera on h3-timeline: moves (push-in, pan, orbit, dolly, whip-pan) land as calls, keyframe pins, and reference-video transfer. Use when the brief names a camera move or a cut."
---

# CinemaDir — the camera grammar

You direct the camera on an `h3-timeline` stage through the shared bench.
H3 has NO native geometric camera node: there is no camera parameter seat
on the card (no azimuth, elevation, fov, or rig preset), and no native
geometric (Plücker-ray / CameraCtrl-style) conditioning exists for H3
anywhere on the estate. Every camera move you deliver is one of two
things — a prompt-level description the model performs, or a re-shoot
chain that re-renders footage along a trajectory. Teach yourself the
difference before promising a move; the honesty rules at the end of this
skill are hard limits, not style notes.

## The loop

```text
melite_discover → melite_load → melite_construct
```

`melite_load` for `h3-timeline` returns the live params bundle — read it
for the current caps and defaults. Compose with `melite_construct`
`verb: "add_stage"`, card `h3-timeline`. Browser sessions stop at the
user's Run press. Never shell out to ComfyUI or hand-build a graph.

## What the camera actually rides

The estate's camera knobs, in the order you should reach for them:

1. **Call prose — the primary camera seat.** Each call's `text` is ONE
   continuous action line; the camera move lives in it next to the
   subject action ("the camera pushes in on her face as she turns").
   H3 was trained on cinematic caption language, so named moves
   (push-in, pull-out, pan left, tilt up, orbit, dolly, whip-pan,
   handheld shake) move the frame. One move per window reads cleaner
   than three stacked moves.
2. **The anchor rail — `image` and the keyframes lane.** `params.image`
   pins a still at frame 0 (the frame-0 shorthand); the timeline's
   `keyframes` lane is `[{frame, image}]` — a film-absolute frame plus
   the image that must appear there, inside a window (`[start, end)`).
   Shot SIZE is a framing fact: pin a close-up still at the frame where
   the close-up lands and the film develops toward it. A pin never
   replays a literal decoded frame — it anchors, and the film generates
   under it.
3. **The reference rails — `ref_videos` camera transfer (max 3).** A
   clip that carries the desired move conditions the film's camera:
   cite it in prose as `<Video 1>` and instruct "camera follows
   `<Video 1>`'s move". `ref_video_trims` (index-paired, seconds:
   `start_time` + `duration`) slices the guide to the span that
   matters. This is the strongest native camera tool — a real rendered
   move beats an adjective.
4. **The re-shoot chain — the parallel lane's stages.** When the brief
   re-angles EXISTING footage, the re-shoot camera chain on
   h3-timeline (camera intent → warp → depth → Fun ControlNet → H3 +
   inpaint) exposes re-shoot camera stages `orbit` / `pan` / `dolly` /
   `zoom`. The chain re-renders a plate along the move; the honest
   ceiling is small-to-moderate re-angles and 2.5D parallax. Land the
   plate as a window's anchor or reference, then direct the rest of
   the film in call prose.
5. **Seams — `transition`, the stitch grammar.** The seam system has
   exactly two states: a carried seam (omit `transition` — the
   generation head hands a 22-frame drift-control overlap to the next
   window, so ONE continuous move may ride across it) and `transition:
   "cut"` on the incoming call (a fresh window, nothing carries). There
   is no crossfade or dissolve knob — a dissolve ask lands as a cut
   whose outgoing/incoming prose carries the motion. A whip-pan is a
   cut: the new window opens on the whip's arrival, and the incoming
   call's text describes the speed-blur.

The span grid is the move's metronome: the first call and every
`transition: "cut"` call author a `22+17k` span (22, 39, 56, 73, 90,
107, 124 … up to 362); a carried call authors a `17k` span (17, 34, 51,
68 …). At the schema's 24 fps default, 56 frames ≈ 2.3 s, 124 ≈ 5.2 s,
362 = 15 s — a slow push-in wants a long window, a whip-pan wants the
short side of a cut. Off-grid spans are refused with the nearest legal
frame named; do not send a move the grid cannot time.

## Worked examples

### "Slow push-in on her face, then whip-pan to the door."

```text
melite_discover  → find the video compose surface (card h3-timeline)
melite_load      → open h3-timeline; confirm calls/keyframes/anchor rails
melite_construct → add_stage below
```

```json
{
  "card": "h3-timeline",
  "params": {
    "seed": 42,
    "image": "faces/her-face-closeup.png",
    "calls": [
      {
        "text": "A slow push-in on her face; she holds still, eyes to the lens, breath visible.",
        "start_frame": 0,
        "end_frame": 124
      },
      {
        "text": "A whip-pan blurs across the room and lands hard on the door; the frame settles on the handle.",
        "start_frame": 124,
        "end_frame": 248,
        "transition": "cut"
      }
    ],
    "keyframes": [
      { "frame": 124, "image": "set/door-closeup.png" }
    ]
  }
}
```

Why each knob: the push-in is call prose (the primary seat); `image`
anchors the opening on her face (the anchor rail); the whip-pan is a
`"cut"` — its span 124 is a legal `22+17k` cut span, while the carried
case would demand a `17k` span; the keyframes pin seats the door close-up
at film-absolute frame 124, the incoming window's head, so the cut lands
on the intended framing.

### "Orbit halfway around the parked car, then hold low over the hood."

The move is re-angling existing footage, so the re-shoot chain owns the
orbit: walk the chain's `orbit` stage (camera intent → warp → depth →
Fun ControlNet → H3 + inpaint) over the source clip at a half-turn —
inside the honest ceiling (small-to-moderate arc, 2.5D parallax; a full
orbit hallucinates fill). Then compose the delivered film:

```json
{
  "card": "h3-timeline",
  "params": {
    "seed": 42,
    "calls": [
      {
        "text": "The camera orbits the parked car at walking height, the light sweeping across the hood.",
        "start_frame": 0,
        "end_frame": 90
      },
      {
        "text": "The camera settles low over the hood and holds; dust drifts through the beam.",
        "start_frame": 90,
        "end_frame": 124
      }
    ],
    "keyframes": [
      { "frame": 56, "image": "reshoot/orbit-mid-plate.png" }
    ]
  }
}
```

The re-shot plate anchors the orbit's midpoint (frame 56, inside the
first window `[0, 90)`); the carry into window two (span 34, legal
`17k`) continues the hold with no cut. When NO footage exists yet —
composing fresh — the same orbit is prose-only: say the move, keep the
window long, and expect an impressionistic arc, not a tracked path.

### "Swap in the red-jacket character and lift the dolly from this clip."

Two lanes, one film. WHO changes (the h3-timeline's own `swap` skill —
it binds the `replace` mod bag and drives the character swap through the
masked-edit chain) and HOW the frame moves (this skill). The swap produces the identity
reference; the reference clip donates the camera move:

```json
{
  "card": "h3-timeline",
  "params": {
    "seed": 42,
    "ref_images": ["characters/red-jacket-sheet.png"],
    "ref_videos": ["camera/dolly-in-clip.mp4"],
    "ref_video_trims": [{ "start_time": 2.0, "duration": 4.0 }],
    "calls": [
      {
        "text": "The red-jacket character walks the corridor while the camera follows <Video 1>'s dolly-in, closing to a medium shot.",
        "start_frame": 0,
        "end_frame": 124
      }
    ]
  }
}
```

`ref_images` carries the swapped identity (a character sheet from the
qwen-img-21 character-sheet skill is the strongest identity seat);
`ref_videos` carries the move, trimmed to the 4 s that actually dollies;
the prose CITES `<Video 1>` and names the move — the citation is what
binds the transfer. Keep the two grammars in their lanes: identity
questions (who, what they wear) ride the card's `swap` skill; camera
questions (framing, move, cut rhythm) ride this skill. One brief, two
doors, one `add_stage`.

## Honesty — what the camera cannot do here

Never promise what the graph cannot deliver:

- **No native geometric camera conditioning on H3.** No Plücker-ray or
  CameraCtrl-style adapter exists for H3 on this estate; there is no
  camera parameter seat on the card. Every move is call prose, a
  reference-video transfer, or the re-shoot chain — never a trajectory
  parameter.
- **Prompt-compiled is not geometry.** Prose moves are performed, not
  tracked: a written orbit is H3's impression of an orbit. Do not
  promise exact azimuths, lens math, fov, or that a described path is
  followed frame-exactly.
- **The re-shoot ceiling.** Real parallax only inside the chain's
  honest envelope: small-to-moderate re-angles, 2.5D parallax. Large
  view changes hallucinate fill, flatten to cardboard parallax, and
  drift identity per pass. A re-render polish pass is expected for
  anything beyond a few degrees.
- **No transition hardware.** No crossfade, dissolve, or optical-flow
  morph knob exists; the seam is carry or cut. Do not dress a cut up
  as a dissolve in the deliverable description.
- **No per-frame camera rig.** Shot size is anchored by pins and
  described in prose; there is no focal-length, height, or dolly-grip
  parameter. Fidelity comes from the reference rails, never from a rig
  that is not there.

State the move you delivered in the words the card actually accepts —
prose, pins, references, re-shoot plates — and let the user's Run press
judge it.

## swap or cinemadir — which door

- **Camera ask** (a move, a size, a cut, a rhythm): this skill. The
  frame changes; the subject's identity is already settled.
- **Subject ask** (replace the actor, put this character in that clip):
  the h3-timeline's `swap` skill (the `replace` mod bag). The
  performance stays the source's; the WHO changes.
- **Both** (the music-video shape): swap first (the `swap` skill produces the
  identity reference), then direct (this skill composes the move —
  prose, pins, `ref_videos` transfer). Example 3 above is the whole
  pattern in one `add_stage`.

## Validate and repair

1. Add or patch the card on the shared bench.
2. Trust the verdict the write already returned — a landing that
   reports compiles ✓ needs no second opinion. Run `melite_construct`
   with `verb: "validate"` only for a bench you did not just write or a
   patch that landed without a verdict.
3. Read the exact refusal and repair only the named card field — a
   span refusal names the nearest legal frame.
4. Leave the bench for the user's Run press.
