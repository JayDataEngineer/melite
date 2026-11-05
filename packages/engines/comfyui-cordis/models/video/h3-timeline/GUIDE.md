# h3-timeline CARD — OPERATING GUIDE (verified 2026-09-02, suite V7 default)

> ⛔ DEADLINE LAW (2026-09-02): the per-call REFS + AUDIO-SAMPLES bus
> (`refs`, `voice`, LoadImage.N/LoadAudio.N beyond slot 0/1) is
> EXPERIMENTAL and HALF-WIRED — the compose emits injects for loader
> nodes the templates do not carry. It fails LOUD pre-GPU (by design)
> and is NOT part of any deadline film. Deadline films use ONLY the
> verified shapes in §1. Do not build on the refs bus until it is
> completed against HIS MultiRef bundle design and re-verified.

The timeline card wraps PlagueKind's V7 ComfyUI workflow 1:1. **ALL DEFAULTS, HIS.**
The chain mechanism (motion context clip-to-clip) is PROVEN: character, scene, motion
and generated ambience cross seams with no keyframes and no shared music.

GPU budget at 1344×768: 90f opener ≈ 2–3 min, 68f chain window ≈ 1–1.5 min.

---

## 1. THE VERIFIED SHAPES

### Shot 1 — a new film (image-anchored opener + beats)

```json
melite_construct add_stage — card "h3-timeline", params:
{
  "prompt": "film label",
  "fps": 24,
  "seed": 59144818769896,
  "width": 1344, "height": 768,
  "calls": [
    { "text": "opener beat — settle, then explode into a sprint",
      "start_frame": 0, "end_frame": 90,
      "image": "example.png" },
    { "text": "continue the sprint drive, knees high, dust kicking",
      "start_frame": 90, "end_frame": 158 },
    { "text": "more beats — 51f each",
      "start_frame": 158, "end_frame": 209 }
  ]
}
```

LAWS baked in (all pre-GPU 4xx refusals, nothing silent):
- **Opener = 90 frames** (`0→90`, 3.75s) — the first window renders its
  span verbatim, so it is 22+17k (90, 107, 124, 141 …). Chain beats are
  carried, so they are 17k (51, 68, 119, 153 …) and each call starts
  exactly where the previous one ended. Off-grid spans are refused with
  the nearest legal frame — never silently re-framed.
- **`image` ONLY on calls[0].** It is the identity/guide reference for the opener.
- **NAME THE SUBJECT in the opener's text** (species, costume, colors — the text
  rides every chain prompt as `[Identity, hold exactly] …`; there is no identity
  knob, the prompt text is the only carrier). IDENTITY = CHARACTER ONLY: NEVER
  lighting/time-of-day/weather (a leaked "at night" shifts the environment across
  the seam — witnessed). Environment continuity is the chain latent's job.
- **Geometry: uniform 1344×768** (his default). Declared once; every window rides it.
- **LayerSwitch.switch = false, ALWAYS** (chain-supremacy law, hard-coded): the song
  wrapper (SongContext) replaces his direct chain at the sampler when true and the
  subject MORPHS at the seam (witnessed: rabbit → LoRA-default cat). Music never
  touches the graphs — see §3.
- **Seeds:** opener rides the card seed; window k derives `seed + 1000003·k`.
  Same seed across re-rolls keeps world texture.
- **Seam:** 39 protected frames (his smallest legal AV boundary), trimmed at stitch.

### Shot N — come back later, extend a PRIOR run's film

```json
{
  "model": "h3-timeline",
  "prompt": "shot 2 label",
  "params": {
    "fps": 24,
    "seed": 59144818769896,
    "width": 1344, "height": 768,
    "extend": [
      { "source_clip": "/melite-media/runs/<run_id>/<file>.mp4",
        "extend_prompt": "the rabbit rounds the bend at full speed" }
    ]
  }
}
```

- `extend` is the continuation arm: `source_clip` stages the prior
  run's film artifact (a `/melite-media/runs/<run_id>/<file>.mp4` URL
  from the runs list lands; the arm anchors on its LAST FRAME
  in-graph) and `extend_prompt` states the MOTION AND SOUND that
  follow — name the subject again there (species/costume/colors; the
  text is the only identity carrier).
- Numeric seats (`extend_seconds`, `seed`) ride the arm's own
  defaults (2.33s / seed 0); the engine grid refuses off-grid lengths
  loud and names the nearest legal compositions.
- The extend arm is the card's own (the one-call extend-video wrapper
  flow retired 2026-11-14, flows-are-compositions — bench the card,
  state the extend bag).- Chain more shots by extending each prior shot's film in turn.

### Music (any shot, or the final film)

```json
"params": {
  "audio_clips": [
    { "src": "RANDOM-SONG.mp3", "start_frame": 0,    "dur_frames": 96, "gain": 0.9 },
    { "src": "sting.mp3",        "start_frame": 152, "dur_frames": 56, "gain": 0.7 }
  ]
}
```

- Mixed at STITCH as amix overlays (never inside the graphs — model-native audio
  stays the spine). `start_frame` is on THIS shot's timeline; gains are linear.
- Audio files must be staged in the ComfyUI input dir first.

---

## 2. FILM ASSEMBLY

Each run stitches itself: `output/<run_id>/stitch_video_0.mp4` (identical codec/
geometry). Final film = concat of the stitches in shot order:

```bash
printf "file 'shot1/stitch_video_0.mp4'\nfile 'shot2/stitch_video_0.mp4'\n" > /tmp/list.txt
ffmpeg -y -f concat -safe 0 -i /tmp/list.txt -c copy film_final.mp4
```

Or put the whole track over the concatenated film with ONE ffmpeg amix pass.

## 3. WHAT REFUSES (all before any GPU minute — 4xx with the exact reason)

| Refusal | Meaning |
|---|---|
| extend grid off-length | `extend_seconds` off the engine grid — the door names the nearest legal compositions |
| unknown extend source | `source_clip` is not a stageable video (a browser-local URL refuses; upload first) |
| mirror-gate (-26/-27/-28) | unsanctioned inject key / severed link / sibling window drift |
| uniform-geometry | windows declared divergent geometry |

## 4. VERIFICATION WORKFLOW (window-by-window law)

Films are made ONE VERIFIED WINDOW AT A TIME. Look BEFORE more GPU burns:
1. Beat lands → extract the seam: `ffmpeg -ss <sew_t-0.15> -i stitch -frames:v 1`
   and just past it. Same subject? Ship. Morph? The identity line drifted or an
   unsanctioned switch flipped (both impossible by default now).
2. To extend a GOOD run: stage its film as the extend arm's `source_clip`
   (never re-render the head).
3. One active run at a time (serial GPU). The user's stop control on the
   card halts a run. NEVER kill processes; gateway restarts are operator-only.

## 5. THE MECHANISM (what you're trusting)

Window k loads window k−1's saved joint AV latent, copies its final valid run into
the new prefix, protects it (mask=0 — never denoised), and only the future region
diffuses. Valid runs are 2 mod 5 latent steps (90f→32, 68f→17 — both valid). The
39-frame protected prefix is trimmed at stitch → the seam is a true continuation.
Generated audio rides the same latent — ambience continues too.
