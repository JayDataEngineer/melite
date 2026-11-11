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
`params.calls`. The run starts at the user's Run press — agent mode
carries no run tool. Never shell out to ComfyUI or hand-build a graph.

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

`calls` and `audio_clips` are arrays. A call needs `text`, integer
`start_frame`, and an integer `end_frame` greater than its start. The first
call has no incoming seam. Omit `transition` for the automatic context
carry (THE DEFAULT). `transition: "carry+keyframe"` is the second lawful
mode: the carry plus the previous window's final frame pinned as this
window's first frame. NEVER author `transition: "cut"` — H3 hard-cuts on
its own when the shot must start fresh; stock is the operator's manual
escape hatch, never a parameter.

An audio row's `src` is the spoken asset itself, spelled so the run can
stage it: the run-relative `<run-id>/<file>` name of the TTS run's output,
its estate URL (`/v1/assets/runs/...`), a gallery artifact URL, an http(s)
URL, an absolute host path that exists, or a bare name already staged in
the engine input dir. Every one of those auto-stages at compose. Any other
spelling refuses at compose with `media input stages nowhere` — never ride
a display name or an invented placeholder.

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
- A POSITIONED audio row with no `src` is refused at the compose door (the film
  mix cannot place a source-less row) — bind the returned asset before you place
  it, and verify the returned manifest and final audio.

## Audio guidance

Generate a spoken asset first, then spell its returned artifact as the
run-relative `<run-id>/<file>` name or its estate URL (both auto-stage at
compose) and copy the exact words into the row's `text`. The row's `text` MUST carry the exact spoken words, unabridged. Spoken lines are NEVER a call field. Place
rows in film-time frame coordinates. Keep one conditioning class/lane per
window as required by the loaded contract. The card owns the final mix and
ducking; do not invent a film-wide bed parameter or an out-of-band ffmpeg
step.

**The reference-voice rail.** `ref_audios` conditions each window's generated
voice: the engine loads each reference clip once per window and synthesises a
voice that is mixed UNDER a conditioned row at `duck_depth_db` (default
-14 dB). It is not a placed line — to hear your own take, place the line in
`audio_clips`. Audio rides `ref_mods` too — any media boards the bag (image, video, audio; the system bakes each kind), a path is a path (the operator's 1:1 law); this rail is the voice seat, the bag is the identity bake.

**Saying nothing about voices is not the same as asking for silence.** H3
invents speech wherever the audio does not account for it — a window that never
mentions voices returns with muttered lines or whole sentences in a synthetic
voice, and a later window can restate an earlier line in the wrong register.
Every window with no spoken audio MUST carry its own explicit negation in
`text` ("no dialogue", "silence, no dialogue", "no spoken words"); one negation
per silent window, never a single sentence at the top of the film, because
`text` conditions its own window only. A window that DOES carry a line names
the speaker and the exact words and carries no negation beside them. Check this
window by window on the compiled prompts before pressing — the engine fills the
gap enthusiastically, and the mistake only shows up as a stranger talking over
your film.

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
