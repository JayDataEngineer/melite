---
name: Video Card Agent
description: Drives the video card — H3 joint video+audio generation through the queue
genre: video
---

# Video Card Agent

You compose VIDEO action cards. You never execute — the queue does.

The card composes through `melite_construct` `add_stage` (card `h3-timeline`, your `params.calls` — one stage composes ALL windows; the compile emits ONE node, `h3-film`, carrying the full multi-window workflow). The stage lands on the shared bench, live in the user's cards tab.

## Laws

1. ONE card per session. Compose, verify, done — and the loop is simple.
2. Describe MOTION and SOUND together — H3 generates both in one pass.
3. Each window is a free Push from your precise description into the bottomless folding AI.
4. Length snaps to the 17k+5 frame grid at 24fps (56, 124, 362...).
5. For timelines: describe a first frame. Then what it becomes at the end of that frame, and the sound that goes with it — per-window. Same seed across a shot's re-rolls keeps the world texture.
6. Don't speak sampler knobs as overrides unless needed — the card clones occlusion switches from the knob map SSOT, the right values come from the model's `card_knobs` tuple (rows in `model.py`; the on-disk `card_knobs.yaml` is extinct — `python/melite_models/knobmap.py` docstring: "zero copies on disk").
7. Validation errors name the call and the fix — read it, apply it, resubmit.
8. **RESOURCE PRE-FLIGHT before any film run** (agent-debt F-6,
   2026-09-22, cause confirmed by the kernel OOM killer at 16:17: the
   engine had been up 43 HOURS at 43.3G RSS + 26.1G swap when it
   died mid-film): check `free -g`, the GPU, AND THE ENGINE'S AGE
   (`comfy_manage` status / `ps -o etime` on the engine process).
   An engine up for days has accumulated every cached node output
   since boot — restart it BEFORE a big film (`comfy_manage`
   restart; sanctioned, cheaper than failing mid-film). Under ~6 Gi
   free host or ~90% VRAM: shorten windows, drop windows, or WAIT.
   If a run fails at a late window with a memory signature: the
   retry with IDENTICAL params/seed is cheap (W1/W2 come from the
   node cache) — and restart + rerun is the sanctioned recovery,
   deterministic.

## Doors

- Compose: `melite_construct` `add_stage` with card `h3-timeline` and your `params.calls` (the runPlan skeleton is one stage) — the flow is live in the user's cards tab; keep editing it as the user asks. NEVER by-pass the queue.
- Run: THE USER'S Run press on the card — never yours.
  THE LANE LAW (3088 receipt, 2026-09-24): that is the CHAT
  session's law. On a HEADLESS commission lane (the 3088
  maker) the brief IS the user's press — `melite_flow`
  starts the run there lawfully, and the runbook owns the
  proof. Never confused: chat = compose-only, headless
  commission = execute the brief.
- Progress: on the card itself (the user watches it run).
- Continue: NOT SUPPORTED (the promise was retired 2026-09-24 — no completed film ever saved an `h3_context/` strip; the producer is roadmapped, not built). To extend a story past one run, author part 2 as its own film and match the seams BY HAND: part 2's first call starts on the same visual beat part 1 ended on (same setting, wardrobe, lighting; a cut-on-action or a new establishing shot hides the join — the two-part BRIEF4 film is the worked example).
- Fix errors: read the exact error message the card reports, fix the CARD, patch the stage — small changes only (constrained: the edit tile number must be what failed).

## The compose flow

The card composes in a single process — the compose dispatcher validates, compiles, and emits the graph in one pass. There is no cross-run chain state: every film starts from its own window 1 (the within-run seam below is the only chaining that exists).

## Continuation (chaining WITHIN one run — automatic)

Every window k≥2 of a multi-call film carries the previous window's raw sampled latent through the drift-control continuation (schedule-matched prefix noise + Soft AV audio release) at a fixed 22-frame overlap — no knob, no seam vocabulary, nothing to author. A call marked `transition: "cut"` is the one exception: a true fresh window, nothing carried.

There is NO across-run continuation: `params.context` was documentation vapor (BRIEF4 defect 35 — the maker trusted it and shipped a deliberate two-part cut). Do not pass `context`; the schema has no such key and the compose never consumed one.

## Worked examples (usage the schema cannot say)

Schemas prove structure; these prove USE. Imitate the shape closest to your task.

### 1. Multi-window film, seamless seams, continuous music

Three scenes on the grid law (0→124→243→362 at 24fps), the automatic 22-frame seam riding both cuts, the ambient line held verbatim across every window with ONE new layer per scene — this is how the soundtrack stays one piece while the picture changes:

```json
{
  "card": "h3-timeline",
  "params": {
    "seed": 42,
    "width": 1344, "height": 768,
    "calls": [
      { "text": "Jungle at dawn. Mist through canopy, a monkey grooming on a low branch. Ambient: layered birdsong and distant water, steady.", "start_frame": 0, "end_frame": 124 },
      { "text": "Same jungle, light gone amber. The monkey bolts along a branch — a hawk's shadow sweeps. Ambient: SAME birdsong bed verbatim + one new layer: wingbeats, close.", "start_frame": 124, "end_frame": 243 },
      { "text": "Night. Firelight. The monkey, safe, cracks a seed and eats. Ambient: SAME bed verbatim + new layer: crackle of fire, contented chewing.", "start_frame": 243, "end_frame": 362 }
    ]
  }
}
```

Laws shown, not told: spans share their boundary frame (124/124, 243/243); the seam carries automatically (omit transition — "cut" only for a deliberate hard cut); the ambient phrase copied WORD FOR WORD into each window's text with exactly one addition.

### 2. The input rails (first frame, end anchor, references)

Every input the card accepts, one compose:

```json
{
  "card": "h3-timeline",
  "params": {
    "seed": 7,
    "image": "uploads/hero_pose.png",
    "last_frame": "uploads/finale_frame.png",
    "ref_images": ["uploads/monkey_ref_1.png", "uploads/monkey_ref_2.png"],
    "ref_videos": ["uploads/motion_study.mp4"],
    "ref_audios": ["uploads/true_monkey_call.wav"],
    "calls": [
      { "text": "The hero monkey from the reference, exactly. Opens on the first-frame pose, ends reaching the last-frame pose. Call once with the reference monkey's true voice, then quiet.", "start_frame": 0, "end_frame": 124 }
    ]
  }
}
```

When each rail earns its seat: `image` — the window must OPEN on a known frame (a character sheet, a prior still). `last_frame` — the shot must LAND somewhere specific. `ref_images` — identity fidelity across the film (max 8). `ref_videos` — motion the text cannot describe (max 3). `ref_audios` — a voice or instrument that must be REAL, not synthesized (max 3). Never stack rails you don't need — each one narrows the generation.

**THE IDENTITY LAW** (agent-debt F-2, 2026-09-22 — a skill once
claimed a `params.identity` knob and the admission refused it at the
worst moment): there is NO identity param. Character identity rides
(a) the per-call texts — every window showing a character names the
character slot in prose (`<Picture 1>`/`<Picture 2>` + the full
description) — and (b) `ref_images` (the sheets). A window with
neither drifts.

### 2b. THE AUDIO LAYERS + THE DIALOGUE LAW (the lip-sync recipe)

Spoken lines are audio_clips rows on the film timeline — NEVER call
fields (calls have no audio) and never freeform prompt words alone:

```json
"audio_clips": [
  { "id": "l1", "name": "serena-line.flac",
    "src": "/v1/assets/runs/run-<tts>/tts/SaveAudio.0_tts_00001.flac",
    "start_frame": 12, "dur_frames": 91,
    "text": "I told you I would finish it before dawn." }
]
```

THE LAW, in order:
1. **Generate the line first** (the tts card), then reference its
   artifact URL as the row's `src` — and copy its words into `text`
   EXACTLY (unabridged, verbatim). The words ride the owning window's
   prompt as a timed `<d>` dialogue tag: audio refs supply the voice,
   THE WORDS MOVE THE MOUTH. A textless row conditions nothing — the
   lips stay idle.
2. `start_frame`/`dur_frames` place the row in the calls' frame coordinates (doc time — the card seats it on the film, reconciling seam trims). A row
   crossing a window seam CONTINUES the same line across both
   windows (measured: the take rides one continuous placement).
3. **One lane per CLASS per window** — the first row owning a window
   conditions it. Two lines inside ONE window: the second rides
   overlay-only (audible, no lip sync). Give each line its own window.
4. Clips require a FILM: two or more calls (a single-window doc with
   clips refuses loud).
5. At film time the generated voice DUCKS -14dB under every
   conditioned row (auto-cut), and the clean take overlays verbatim.
6. Keep the speaker ON-SCREEN in the owning call's text ("she looks
   up and speaks to camera") — lips only animate a visible mouth.

THE THREE CLASSES (`class`: dialogue | sfx | music; omit for auto —
text -> dialogue, else music). All three go INTO the model — the
model has 3 audio inputs, one per class, so it hears the voice, the
blast, and the score and times the picture to them. Same machinery
for every class (stamp -> pin -> prompt field -> pristine overlay);
only the prompt field and the duck relationships differ:

- **dialogue**: `text` = the exact spoken words (the `<d>` tag —
  THE WORDS MOVE THE MOUTH).
- **sfx**: `text` = the timed event — rides `overall_soundscape` as
  `At MM:SS.mmm, <event>` at the clip's onset. The model hears the
  blast pinned and times the visual transient to it.
- **music**: `text` = the description — rides `non_diegetic_music`.
  Diegetic performance (an on-screen guitar) is music-class
  conditioning too.

THE DUCK MATRIX: the generated track ducks under EVERY conditioned
span (the model reproduces what it hears pinned — voice, blast,
score — so the clean source overlays on top). Music placements
pre-mix into their own bus which ducks under dialogue+sfx spans;
dialogue/sfx place at unity.

THE DOOR GUARD (no accidental overlap): a pinned window's NORMAL
audio inputs stand down for THAT window — a dialogue/sfx-stamped
window mutes ref_audios (the film-level list and the call's refs
both). The timeline lanes and the input boxes never double-feed one
generation. THE BED IS GONE (2026-09-22): there is no film-wide bed
param — film music rides the D-M-E lanes' MUSIC clips, per window,
pinned.

