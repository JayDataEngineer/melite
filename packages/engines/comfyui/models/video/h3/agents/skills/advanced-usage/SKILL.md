---
name: advanced-usage
description: "Full H3 video-studio workflow — pre-flight spec, AV prompt shape, conditioning slots, submit, poll."
---

# H3 Video Studio Workflow

## 1. Pre-flight — ALWAYS

Call `tools.get_flow_spec("h3")` first. It returns the live form
fields + defaults; the compile layer rejects unknown params loudly, so the
spec IS the vocabulary.

## 2. The prompt — H3's native three-field format

H3 is a JOINT video+audio model: one prompt conditions both tracks. The
native shape (official guide, served by `h3_prompt_library`):

- `integrated_multimodal_description:` the timeline — `[Shot 1] <style,
  composition, subjects, actions, camera, dialogue, diegetic sound>`,
  later shots `[Shot 2] At 00:03.500, the camera cuts to ...`
- `overall_soundscape:` ambient + action + non-verbal sound (1-4 sentences).
- `non_diegetic_music:` the score, or `N/A`.

Dialogue is `<d>[Language] the line.</d>` after the speaker is
introduced. With keyframes, the mode's alignment instruction line comes
FIRST (verbatim templates in the guide / the prompt-enhance recipe).
Which weave slots are filled picks the mode: none = T2VA, first-frame =
I2VA, first+last = FL2VA (head route), last = L2VA; reference sets go to
the `h3-ref2va` route (six-field rewrite format).

The `h3-prompt-writing` skill carries the full guides; the
`prompt-enhance` skill condenses the same rules for the Enhance button.

## 3. Conditioning (optional)

- **First/last-frame keyframes** — the weave slots; H3 is trained for
  positions 0 and N-1 only (a keyframe anywhere else is a dead param —
  the builder fails LOUD, never warns-and-skips).
- **Reference images / videos / guides** — via the spec's weave-slot
  params; media must be artifact ids from the editor's media library.

## 4. Submit + poll

```python
res = tools.submit_video_run(prompt=prompt, audio_mode="auto")  # or defaults
run_id = res["run_id"]
tools.get_run_status(run_id)   # until done — output is an MP4/WebM artifact
```

## Gotchas

- `frames` at 124/24fps ≈ 5s of video — scale both together.
- `seed=42` is the catalog default; a fixed seed reproduces the clip.
- The timeline skills (persistent audio lane, beat/keyframe slots) belong
  to the editor UI — as the agent, compose the prompt + conditioning, not
  the timeline graph.
- A failed submission returns the compile-layer violation list — surface
  the actual error to the user, never a summary.
