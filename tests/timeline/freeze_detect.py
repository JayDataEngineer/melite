#!/usr/bin/env python3
"""FREEZE DETECT (2026-08-28) — video-side join liveness check.

Held framing across a seam is the classic pinned-head failure: the model
renders the context as a STILL. This probe extracts grayscale frames around
each delivered join and at each window's midpoint (control), and compares
mean consecutive-frame difference. A join whose motion energy is <30% of
its window's control is flagged FROZEN.

Usage: freeze_detect.py <run_dir>  → JSON verdict, exit 0 PASS / 1 FAIL.
"""
import json, math, os, subprocess, sys
import numpy as np

run_dir = sys.argv[1] if len(sys.argv) > 1 else "."
TRIM = 0.91667
wins = ["window1_video_0.mp4", "window2_video_0.mp4", "window3_video_0.mp4"]
stitch = os.path.join(run_dir, "stitch_video_0.mp4")
if not os.path.exists(stitch):
    print(json.dumps({"error": "missing stitch"})); sys.exit(1)

dur = lambda p: float(subprocess.run(["ffprobe", "-v", "error", "-show_entries",
    "format=duration", "-of", "csv=p=0", p], capture_output=True, text=True).stdout.strip() or 0)

def frames_gray(path, ss, t, w=192, h=112, fps=12):
    """downscaled grayscale frames as an [N, h, w] uint8 array"""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error",
                        "-ss", f"{ss:.4f}", "-t", f"{t:.4f}", "-i", path,
                        "-vf", f"fps={fps},scale={w}:{h}", "-pix_fmt", "gray",
                        "-f", "rawvideo", "-"], capture_output=True)
    a = np.frombuffer(r.stdout, dtype=np.uint8)
    if a.size == 0: return None
    return a[: (a.size // (w * h)) * w * h].reshape(-1, h, w)

def motion(fr):
    """mean abs consecutive-frame diff, normalized to 0..1"""
    if fr is None or fr.shape[0] < 3: return None
    d = np.abs(fr[1:].astype(np.int16) - fr[:-1].astype(np.int16))
    return float(d.mean()) / 255.0

verdict = {"run": os.path.basename(os.path.abspath(run_dir)), "probes": [], "pass": True}
durs = {w: dur(os.path.join(run_dir, w)) for w in wins}
d1 = durs[wins[0]]
# delivered join positions in the stitch: w1 full, then each trimmed
join_ts = [d1]
if durs[wins[1]]: join_ts.append(d1 + durs[wins[1]] - TRIM)
acc = d1 + (durs[wins[1]] - TRIM if durs[wins[1]] else 0)
if durs[wins[2]]: join_ts.append(acc + durs[wins[2]] - TRIM)

mid_t = d1 / 2.0  # control: window 1 midpoint motion
ctrl = motion(frames_gray(stitch, max(0, mid_t - 0.75), 1.5))
verdict["control_motion"] = None if ctrl is None else round(ctrl, 4)

for i, jt in enumerate(join_ts, 1):
    m = motion(frames_gray(stitch, max(0, jt - 0.75), 1.5))
    row = {"join": i, "t": round(jt, 3),
           "motion": None if m is None else round(m, 4)}
    if m is None or ctrl is None:
        row["ok"] = False; verdict["pass"] = False
    else:
        row["ratio_vs_control"] = round(m / max(ctrl, 1e-6), 3)
        row["ok"] = bool(m >= 0.3 * ctrl)
        if not row["ok"]: verdict["pass"] = False
    verdict["probes"].append(row)

print(json.dumps(verdict))
sys.exit(0 if verdict["pass"] else 1)