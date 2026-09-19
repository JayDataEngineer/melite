# The seam-swap bench (2026-09-20) — OLD MotionContext vs NEW drift-control

Same engine (RTX 4090, live ComfyUI 0.34.0), same seed (42), same two
calls (window 1: "a slow push in" 0–56; window 2: "then a turn"
56–124, carried seam). The only variable: the seam law.

- OLD — `packages/video/h3-timeline` @ `cf791e98` (MotionContext
  latent chain, carry 39, FilmConcat): `h3_bench_old_00001_.mp4`
- NEW — the working-tree swap (FiniteLatentContinuation drift-control
  carry 22, clip finalize + AudioTrimTail/AudioConcat accumulation):
  `h3_bench_new_00001_.mp4`
- `SIDE-BY-SIDE-old-vs-new.mp4` — the labeled hstack for the eye.

## Measured

| axis | OLD | NEW |
|---|---|---|
| join luma discontinuity (frames 55→56) | **71.2** (the film's largest jump by 44×; every other diff ≤ 1.6) | **0.34** (in-family with ordinary in-window motion) |
| wall time (both windows + film) | 335 s | **190 s** (1.76× faster) |
| delivered film length | 90 frames (3.75 s) — carry 39 ate 16 frames of window 2 | **107 frames (4.46 s)** — carry 22 ate 10 |

The NEW film's largest luma step anywhere (23.1, frame 62) is inside
window 2's own content — the shot's actual motion. The OLD film's
largest step anywhere IS the seam.

## The verdict

Their version is better on every axis the GPU can measure: the join
is invisible to the trace, it renders 1.76× faster, and it delivers
17 more frames of film. Per the operator's order, the MotionContext
seam is forgotten — ledger Correction #27, the drift-control
continuation is the one way, automatic.
