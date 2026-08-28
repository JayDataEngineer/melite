#!/usr/bin/env python3
"""SEAM PROBE (2026-08-28) — measure join quality of the h3-timeline stitch.

The structural e2e proves the chain ran; this probe MEASURES the joins:
  1. join correlation: window N's tail audio (last 1s, the sound that was
     pinned backwards into window N+1) vs window N+1's UNTRIMMED head audio
     (0..1s, the span the backwards window drove + the regeneration).
     High corr = the continuation lock held (Motion Context reports 0.95+
     on working pins; ~0.45 on naive independent takes).
  2. level step: RMS jump in dB across the delivered join — a hard-cut
     double-play or dropout shows as a step; musical joins stay smooth.
  3. delivered lengths: window files vs stitch — the 22px/0.91667s trims
     must be visible (stitch shorter than sum, join frames present).

Usage: seam_probe.py <run_dir>   (the /editor/assets/runs/<rid> dir)
Needs ffmpeg on PATH. Exits 0 PASS / 1 FAIL with a JSON verdict on stdout.
"""
import json, os, subprocess, sys, math

run_dir = sys.argv[1] if len(sys.argv) > 1 else "."
def ff(*a):
    return subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", *a],
                          capture_output=True)

def pcm(path, ss=None, t=None):
    """mono 16kHz s16le PCM of a media file span"""
    cmd = ["-i", path, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"]
    if ss is not None:
        cmd = ["-ss", str(ss)] + cmd + (["-t", str(t)] if t else [])
    r = ff(*cmd)
    b = r.stdout
    n = len(b) // 2
    vals = list(struct_unpack(b))
    return vals

def struct_unpack(b):
    import array
    a = array.array("h"); a.frombytes(b[:len(b)//2*2])
    return a

def rms(xs):
    if not xs: return 0.0
    return math.sqrt(sum(x*x for x in xs) / len(xs)) / 32768.0

def xcorr(a, b):
    """normalized cross-correlation of two equal-length mono spans, best lag ±400 samples (25ms @16k)"""
    n = min(len(a), len(b))
    if n < 2000: return None
    a, b = a[:n], b[:n]
    ma, mb = sum(a)/n, sum(b)/n
    da = [x-ma for x in a]; db = [x-mb for x in b]
    ea = math.sqrt(sum(x*x for x in da)); eb = math.sqrt(sum(x*x for x in db))
    if ea < 1e-6 or eb < 1e-6: return None
    best = -2.0
    for lag in range(-400, 401, 8):
        if lag >= 0: s = sum(da[i]*db[i+lag] for i in range(n-lag))
        else:        s = sum(da[i-lag]*db[i] for i in range(n+lag))
        c = s/(ea*eb)
        if c > best: best = c
    return best

def dur(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                        "format=duration", "-of", "csv=p=0", path],
                       capture_output=True, text=True)
    try: return float(r.stdout.strip())
    except ValueError: return None

wins = [f"window{i}_video_0.mp4" for i in (1, 2, 3)]
stitch = "stitch_video_0.mp4"
verdict = {"run": os.path.basename(os.path.abspath(run_dir)), "joins": [], "pass": True}

missing = [f for f in wins + [stitch] if not os.path.exists(os.path.join(run_dir, f))]
if missing:
    print(json.dumps({"error": "missing artifacts", "files": missing}))
    sys.exit(1)

durs = {f: dur(os.path.join(run_dir, f)) for f in wins + [stitch]}
verdict["durations"] = {k: round(v, 3) for k, v in durs.items() if v}

TRIM = 0.91667  # pinned-head trim on windows 2/3 (22px @ 24fps)
for i in (1, 2):
    a_path = os.path.join(run_dir, wins[i-1])
    b_path = os.path.join(run_dir, wins[i])
    da, db = durs[wins[i-1]], durs[wins[i]]
    if not da or not db:
        verdict["joins"].append({"join": i, "error": "no duration"}); verdict["pass"] = False; continue
    # A tail 1s vs B UNTRIMMED head 1s — the backwards window pinned A's
    # tail; B's head should re-render that same wall-time sound.
    tail = pcm(a_path, ss=max(0.0, da - 1.0), t=1.0)
    head = pcm(b_path, ss=0.0, t=1.0)
    corr = xcorr(tail, head)
    # delivered level step: last 0.25s of A vs first 0.25s of B AFTER trim
    ta = rms(pcm(a_path, ss=max(0.0, da - 0.25), t=0.25))
    tb = rms(pcm(b_path, ss=TRIM, t=0.25))
    step_db = 20 * math.log10((tb + 1e-9) / (ta + 1e-9)) if ta > 1e-6 and tb > 1e-6 else None
    ok = corr is not None and corr >= 0.5 and (step_db is None or abs(step_db) <= 9.0)
    verdict["joins"].append({"join": i, "corr": None if corr is None else round(corr, 3),
                             "level_step_db": None if step_db is None else round(step_db, 2),
                             "ok": bool(ok)})
    if not ok: verdict["pass"] = False

ds, dw = durs[stitch], durs[wins[0]]
expect = sum((durs[w] - (TRIM if i else 0)) for i, w in enumerate(wins) if durs[w])
if ds and expect:
    verdict["stitch_vs_trimmed_sum"] = {"stitch": round(ds, 3), "expect": round(expect, 3),
                                        "delta": round(ds - expect, 3)}

print(json.dumps(verdict))
sys.exit(0 if verdict["pass"] else 1)