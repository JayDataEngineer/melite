---
name: video-timeline
description: "Current h3-timeline shot composition — direct params, one-card multi-window films, seams, audio, and the repair loop"
genre: video
---

# H3 timeline composition

The executable contract is `packages/video/h3-timeline/src/card.ts` and
`timelineContract.ts`. Use the loaded `h3-timeline` bundle from
`melite_load`; this skill is guidance, not a second schema.

## Stage shape

`melite_construct` authors one card stage:

```json
{
  "verb": "add_stage",
  "card": "h3-timeline",
  "params": {
    "seed": 42,
    "calls": [
      {
        "text": "A slow push through foggy pines at dawn; wind moves through the branches.",
        "start_frame": 0,
        "end_frame": 124
      },
      {
        "text": "The camera continues over the same water; a small boat enters from the left.",
        "start_frame": 124,
        "end_frame": 243
      }
    ],
    "audio_clips": [
      {
        "id": "line-1",
        "src": "<run-id>/<spoken-file>",
        "start_frame": 12,
        "dur_frames": 91,
        "text": "I told you we would leave before dawn."
      }
    ]
  }
}
```

Use `params.calls` and `params.audio_clips`; do not wrap the card in an
invented `document` object. A call needs `text`, integer `start_frame`, and
an integer `end_frame` greater than its start. Keep the same seed when a
re-roll should preserve world texture.

An audio row's `src` is the spoken asset itself, spelled so the run can
stage it: the run-relative `<run-id>/<file>` name of the TTS run's output,
its estate URL (`/v1/assets/runs/...`), a gallery artifact URL, an http(s)
URL, an absolute host path that exists, or a bare name already staged in
the engine input dir. Every one of those auto-stages at compose. Any other
spelling refuses at compose with `media input stages nowhere` — never ride
a display name or an invented placeholder.

## Window and seam rules

- The first call has no incoming seam.
- THE SEAM LAW: context carry is THE DEFAULT —
  omit `transition` and the latent tail continues across the seam.
  `transition: "carry+keyframe"` is the second lawful mode: the carry
  PLUS the previous window's final frame pinned as this window's first
  frame (a gen-side image anchor for the most consistent shots). NEVER
  author `transition: "cut"` — H3 hard-cuts on its own when a shot
  must start fresh; stock is the operator's manual escape hatch in the
  strip, never a parameter.
- One span grid, uniform: the first call authors `22+17k` frames in
  `[22,362]`; carried calls author `17k` frames (the carry's 22 frames come
  from the generation head). Off-grid spans are refused at admission and
  at the compose carrier, with the nearest legal frame named.
- The automatic continuation uses a fixed 22-frame overlap.
- Calls tile, enforced at admission: a cross-call gap or overlap is refused
  (`calls[i].start_frame` must equal `calls[i-1].end_frame`).

Do not send retired `context`, seam-keyframe, `bed_audio`, or other undeclared
fields. Top-level unknown fields are refused; some per-call compatibility keys
may be retained, so do not use them to add behavior.

## Identity anchoring — the character sheet

People in a multi-window film drift unless every generation window carries the
same identity reference. The estate's anchor is a CHARACTER SHEET made with the
image-edit card's design-sheet skill (`image-edit` card,
`model:qwen-img-edit-21:design-sheet` — one reference frame in, a production
sheet out with turnaround, expressions, and detail tiles; a plain subject can
use the cheaper four-panel `character-sheet` skill instead). Then attach the
sheet to the GEN WINDOWS through the keyframes lane — `keyframes:
[{frame, image}]` with FILM-absolute frames:

- ONE PIN INSIDE EVERY WINDOW'S SPAN, all pointing at the same sheet. A
  3-window film gets three pins (e.g. frames 10, 60, 120). The compose maps
  each pin into its covering window's graph (window-first-frame pins become
  that window's anchor; interior pins ride AddGuide).
- `params.image` is NOT enough: it is the frame-0 shorthand and anchors WINDOW
  1 ONLY. `ref_images` rails also ride one window. The per-window pin lane is
  the only mechanism that reaches every window.
- The same sheet is the identity seat downstream: it feeds the edit bag's
  `still` seat (the identity-swap cell's replacement-still reference) — see
  `skills/recipe/SKILL.md` for
  the production order and the limits of masked passes over an unpinned source
  (the mannequin silhouette carries the source's shapes, so
  anchor the sheet at GENERATION time, not only at swap time).

## Audio and references

THE BED IS GONE: there is no film-wide bed parameter. Generate dialogue first,
then place its returned asset reference in an `audio_clips` row and copy the
exact spoken words into `text`. Use the declared `class` (`dialogue`, `sfx`, or
`music`) when the loaded schema requires it. The card owns the lane stamps,
mix, and ducking; do not add an out-of-band film assembly step. A POSITIONED
row with no `src` is REFUSED at the compose door (`filmMix.ts`: "a positioned
clip row has no src — the film mix cannot place a source-less row"), so bind a
staged or returned asset before you place it; an unpositioned row is a
statement about the film's own audio, never a placeholder.

**The reference-voice rail.** `ref_audios` conditions each window's generated
voice: the engine loads each reference clip once per window and synthesises a
voice that is mixed UNDER a conditioned row at `duck_depth_db` (default
-14 dB). It is not a placed line — to hear your own take, place the line in
`audio_clips`. Audio rides `ref_mods` too — any media kind boards the bag, be it image, video, or audio, and the system bakes each kind; a path is a path (the operator's 1:1 law); this rail is the voice seat, the bag is the identity bake.

**NO SPOKEN LINE IS NOT SILENCE — say "no dialogue" in the window that has
none.** H3 fills any silence the audio does not account for: a window whose
`text` never mentions voices comes back with muttered or fully voiced lines in
a synthetic voice, and a later window may restate an earlier line in a
stranger's voice. So EVERY window carrying no spoken audio MUST negate it in
its OWN `text` — "no dialogue", "silence, no dialogue", "no spoken words". One
negation per silent window, not one sentence at the top of the film: `text` is
per-window conditioning, so three silent windows need three negations. Windows
that DO carry a line name the speaker and the exact words instead, and never
add "no dialogue" beside them. Treat a missing negation as a defect equal to
dropped frames — verify it window by window on the compiled prompts before
pressing, because the engine will silently invent the voices otherwise.

Use only the declared reference fields (`ref_images`, `ref_videos`,
`ref_audios`, or the first/last-frame lanes) when they serve the task. A
missing source is a load/compose refusal, not a reason to guess a path.

## Compose, validate, and run

1. `melite_discover` → `melite_load` → `melite_construct add_stage`.
2. A landing that already reports compiles ✓ needs no second opinion —
   `validate` is for a bench you did not just write (or one patched
   without a verdict); surface its exact refusal when you do run it.
3. Patch the named field and revalidate.
4. Stop at the user's **Run** press — agent mode carries no run tool.

There is no current `plan_timeline` tool in the base agent surface. A
multi-window H3 card is one queue stage and one film; it is not an executable
multi-stage flow.

## Receipt

A film receipt requires a terminal run id, the final `h3_t4_film` artifact,
and media inspection. A graph snapshot or a successfully saved intermediate
window is only a partial receipt.
