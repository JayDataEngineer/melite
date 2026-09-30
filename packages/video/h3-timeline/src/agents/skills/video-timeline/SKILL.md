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
        "end_frame": 243,
        "transition": "extend"
      }
    ],
    "audio_clips": [
      {
        "id": "line-1",
        "src": "<returned artifact reference>",
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

## Window and seam rules

- The first call has no incoming seam.
- Omit `transition` for the automatic continuation; set `transition: "cut"`
  on an incoming call for an independent window.
- One span grid, uniform: first and `cut` calls author `22+17k` frames in
  `[22,362]`; carried calls author `17k` frames (the carry's 22 frames come
  from the generation head). Off-grid spans are refused at admission and
  at the compose carrier, with the nearest legal frame named.
- The automatic continuation uses a fixed 22-frame overlap; `transition:
  "cut"` is the deliberate independent-window choice.
- Calls tile, enforced at admission: a cross-call gap or overlap is refused
  (`calls[i].start_frame` must equal `calls[i-1].end_frame`).

Do not send retired `context`, seam-keyframe, `bed_audio`, or other undeclared
fields. Top-level unknown fields are refused; some per-call compatibility keys
may be retained, so do not use them to add behavior.

## Audio and references

THE BED IS GONE: there is no film-wide bed parameter. Generate dialogue first,
then place its returned asset reference in an `audio_clips` row and copy the
exact spoken words into `text`. Use the declared `class` (`dialogue`, `sfx`, or
`music`) when the loaded schema requires it. The card owns the lane stamps,
mix, and ducking; do not add an out-of-band film assembly step. A source-less
positioned row can be skipped by the current mix path, so verify the returned
manifest and final audio.

Use only the declared reference fields (`ref_images`, `ref_videos`,
`ref_audios`, or the first/last-frame lanes) when they serve the task. A
missing source is a load/compose refusal, not a reason to guess a path.

## Compose, validate, and run

1. `melite_discover` → `melite_load` → `melite_construct add_stage`.
2. Run `melite_construct validate` and surface the exact refusal, if any.
3. Patch the named field and revalidate.
4. In browser mode, stop at the user's **Run** press.
5. In a sanctioned headless commission, use `melite_flow` and `run_status`.

There is no current `plan_timeline` tool in the base agent surface. A
multi-window H3 card is one queue stage and one film; it is not an executable
multi-stage flow.

## Receipt

A film receipt requires a terminal run id, the final `h3_t4_film` artifact,
and media inspection. A graph snapshot or a successfully saved intermediate
window is only a partial receipt.
