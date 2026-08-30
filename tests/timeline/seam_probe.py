#!/usr/bin/env python3
"""SEAM PROBE v2 (2026-08-28) — measure join quality of the h3-timeline stitch.

v2 lesson: cross-correlating ADJACENT spans (A tail vs B head) is NOT a valid
continuation metric for this seam design — B's head audio is the sound AFTER
the join (a fresh continuation), not a sample-locked re-render. The honest
gates for an audible join are:
  1. LEVEL FLUX: the join's RMS step (0.25s before vs after, delivered
     timeline) must sit INSIDE the distribution of 0.25s RMS steps that
     occur WITHIN the windows themselves (P95 of the internal flux). A join
     louder/quieter than the film's own dynamics = audible cut.
  2. SPECTRAL FLUX: log-spectral distance across the join vs the internal
     P95 — catches harsh timbre jumps that level alone misses.
Both are reported per join with the internal control. corr(A-tail, B-head)
is still REPORTED (re-render strength of the pinned backwards window) but
not gated.

Usage: seam_probe.py <run_dir>   → JSON verdict, exit 0 PASS / 1 FAIL.
"""
import json, math, os, re, subprocess, sys
import array

run_dir = sys.argv[1] if len(sys.argv) > 1 else "."
TRIM = 0.91667
wins = sorted(
    (f for f in os.listdir(run_dir)
     if re.fullmatch(r"window\d+_video_0\.mp4", f)),
    key=lambda f: int(re.search(r"\d+", f).group()))

def ff(*a):
    return subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", *a],
                          capture_output=True).stdout

def pcm(path, ss, t):
    b = ff("-ss", f"{ss}", "-t", f"{t}", "-i", path,
           "-ac", "1", "-ar", "16000", "-f", "s16le", "-")
    a = array.array("h"); a.frombytes(b[:len(b)//2*2])
    return a

def rms(xs):
    return math.sqrt(sum(x*x for x in xs) / max(1, len(xs))) / 32768.0

def spectrum(xs, sr=16000, nband=24):
    """coarse log-magnitude spectrum via Goertzel bands — no numpy needed"""
    n = len(xs)
    if n < 512: return None
    out = []
    for k in range(1, nband + 1):
        f = 100.0 * (2.0 ** (k * 4.0 / nband))  # 100Hz..~1.6kHz log-spaced
        w = 2.0 * math.pi * f / sr
        ci, cq = 0.0, 0.0
        step = max(1, n // 4000)
        for i in range(0, n, step):
            c, s = math.cos(w * i), math.sin(w * i)
            ci += xs[i] * c; cq += xs[i] * s
        out.append(math.log10((ci*ci + cq*cq) / (n//step) + 1e-12))
    return out

def dist(a, b):
    if a is None or b is None: return None
    return math.sqrt(sum((x-y)**2 for x, y in zip(a, b))) / math.sqrt(len(a))

def dur(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                        "format=duration", "-of", "csv=p=0", path],
                       capture_output=True, text=True)
    try: return float(r.stdout.strip())
    except ValueError: return None

def xcorr(a, b):
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

stitch = os.path.join(run_dir, "stitch_video_0.mp4")
missing = [f for f in wins + ["stitch_video_0.mp4"] if not os.path.exists(os.path.join(run_dir, f))]
if missing:
    print(json.dumps({"error": "missing artifacts", "files": missing}))
    sys.exit(1)

durs = {f: dur(os.path.join(run_dir, f)) for f in wins}
d_stitch = dur(stitch)
verdict = {"run": os.path.basename(os.path.abspath(run_dir)),
           "durations": {**{k: round(v,3) for k,v in durs.items() if v}, "stitch": round(d_stitch,3) if d_stitch else None},
           "joins": [], "pass": True}

# internal flux control: 0.25s RMS steps + spectral distances INSIDE window 1
w1 = os.path.join(run_dir, wins[0])
d1 = durs[wins[0]]
lvl_steps, spec_ds = [], []
t = 0.25
prev = pcm(w1, 0.0, 0.25); prev_s = spectrum(list(prev))
while t + 0.25 < d1 - 0.1:
    cur = pcm(w1, t, 0.25); cur_s = spectrum(list(cur))
    if rms(prev) > 1e-5 and rms(cur) > 1e-5:
        lvl_steps.append(abs(20*math.log10(rms(cur)/rms(prev))))
        dd = dist(prev_s, cur_s)
        if dd is not None: spec_ds.append(dd)
    prev, prev_s = cur, cur_s
    t += 0.25
lvl_steps.sort(); spec_ds.sort()
def pct(xs, p):
    return xs[min(len(xs)-1, int(p*len(xs)))] if xs else None
ctrl = {"internal_p95_level_db": round(pct(lvl_steps, .95), 2) if lvl_steps else None,
        "internal_p95_spec": round(pct(spec_ds, .95), 3) if spec_ds else None,
        "n_samples": len(lvl_steps)}
verdict["control"] = ctrl

# trim auto-detect: delivered join layout must match the stitch, whatever
# trim_heads the lane used (0 = none). per-input trim = (sum - stitch)/(N-1).
trim_per = max(0.0, (sum(v for v in durs.values() if v) - d_stitch) /
               max(1, len(wins) - 1)) if d_stitch else 0.0
verdict["trim_per_input_s"] = round(trim_per, 4)

# delivered join positions (windows 2/3 trimmed by trim_per)
join_ts = []
acc = 0.0
for i, w in enumerate(wins):
    if durs[w]:
        acc += durs[w] - (trim_per if i else 0)
        if i < len(wins)-1: join_ts.append(acc)

for j, jt in enumerate(join_ts, 1):
    a_tail = pcm(stitch, jt-0.25, 0.25)
    b_head = pcm(stitch, jt+0.001, 0.25)
    step_db = abs(20*math.log10((rms(b_head)+1e-9)/(rms(a_tail)+1e-9))) \
            if rms(a_tail) > 1e-5 and rms(b_head) > 1e-5 else None
    sd = dist(spectrum(list(a_tail)), spectrum(list(b_head)))
    # reported (not gated): continuation re-render strength
    wa = os.path.join(run_dir, wins[j-1]); wb = os.path.join(run_dir, wins[j])
    corr = xcorr(pcm(wa, max(0, durs[wins[j-1]]-1.0), 1.0), pcm(wb, 0.0, 1.0))
    ok_lvl = step_db is not None and ctrl["internal_p95_level_db"] is not None and step_db <= max(ctrl["internal_p95_level_db"], 6.0)
    ok_spec = sd is None or ctrl["internal_p95_spec"] is None or sd <= max(ctrl["internal_p95_spec"], 1.5)
    ok = bool(ok_lvl and ok_spec)
    verdict["joins"].append({"join": j, "t": round(jt, 3),
                             "level_step_db": None if step_db is None else round(step_db, 2),
                             "spec_dist": None if sd is None else round(sd, 3),
                             "corr_report": None if corr is None else round(corr, 3),
                             "ok": ok})
    if not ok: verdict["pass"] = False

print(json.dumps(verdict))
sys.exit(0 if verdict["pass"] else 1)