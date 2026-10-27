---
name: directing
description: "Current H3 timeline authoring — direct card params, calls, seams, audio, and repair loop"
---

# Directing the H3 timeline

You author one `h3-timeline` card stage through the shared bench. The card
schema is the source of truth; do not rely on an older nested `document`
shape or a retired timeline tool.

## Agent loop

```text
melite_discover → melite_load → melite_construct
```

Use `melite_construct` with `verb: "add_stage"`, card `h3-timeline`, and
`params.calls`. Browser sessions stop at the user's Run press. A sanctioned
headless commission may use `melite_flow` and `run_status` under the 3088
runbook. Never shell out to ComfyUI or hand-build a graph.

## Direct card shape

```json
{
  "card": "h3-timeline",
  "params": {
    "seed": 42,
    "width": 1344,
    "height": 768,
    "calls": [
      {
        "text": "A slow push through foggy pines at dawn; wind moves through the branches.",
        "start_frame": 0,
        "end_frame": 124
      },
      {
        "text": "The camera continues over the same water; the light warms as a small boat enters from the left.",
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

`calls` and `audio_clips` are arrays. A call needs `text`, integer
`start_frame`, and an integer `end_frame` greater than its start. The first
call has no incoming seam. Omit `transition` for the automatic carry and set
`transition: "cut"` on an incoming call when the shot should start fresh.

## Timeline rules

- Calls tile the delivered film, enforced at admission: a cross-call gap
  or overlap is refused (`calls[i].start_frame` must equal
  `calls[i-1].end_frame`).
- One span grid covers every window shape: first and `cut` calls author
  `22+17k` frames in `[22,362]`, carried calls `17k` frames. Off-grid
  spans are refused with the nearest legal frame named.
- Unknown per-call keys may be retained for compatibility and are not a
  reliable way to add behavior. Use only fields returned by `melite_load`.
- There is no live seam-keyframe/context field. Do not send retired fields
  and do not claim a keyframe conflict check that the current card does not
  perform.
- A source-less audio row can be skipped by the film-mix path. Verify the
  returned manifest and final audio; do not treat the row as delivered merely
  because it was present in the input.

These gaps are recorded as owed work. The current card source and focused
tests are authoritative over this prose.

## Audio guidance

Generate a spoken asset first, then use its returned artifact reference and
copy the exact words into the row's `text`. The row's `text` MUST carry the exact spoken words, unabridged. Spoken lines are NEVER a call field. Place
rows in film-time frame coordinates. Keep one conditioning class/lane per
window as required by the loaded contract. The card owns the final mix and
ducking; do not invent a film-wide bed parameter or an out-of-band ffmpeg
step.

## References

Use the declared `ref_images`, `ref_videos`, and `ref_audios` fields when the
loaded schema offers them. Reference lists have declared caps. Cite the
corresponding reference in prompt prose when the card's skill instructs you
to do so. A missing or invalid source is a load/compose refusal, not a
reason to guess a path.

## Validate and repair

1. Add or patch the card on the shared bench.
2. Trust the verdict the write already returned — a landing that reports
   compiles ✓ needs no second opinion. Run `melite_construct` with
   `verb: "validate"` only for a bench you did not just write or a patch
   that landed without a verdict.
3. Read the exact refusal and repair only the named card field.
4. Repeat until the card compiles.
5. Leave the bench for the user's Run press, or use the sanctioned headless
   flow for a commissioned task.

There is no current `plan_timeline` tool in the base agent surface. Do not
search for or call one.

## Output

A multi-call card is one queue stage and one film. The card saves each
window, chains transient-tensor release boundaries, and then creates the
final film artifact. A window render without the final verified film is only
a partial receipt.
