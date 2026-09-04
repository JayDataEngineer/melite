#!/usr/bin/env python3
"""END-TO-END agent-door proof: h3-timeline card -> N-window film.

THE LAW THIS PROVES (operator demand, 2026-08-30):
  A video made THROUGH THE AGENT PATH (POST /v1/cards/h3-timeline/agent)
  must (1) produce a real film on disk, (2) show EVERY model call in the
  reconstructed action card — N calls face N window films, never 1/4 —
  (3) carry latent seams whose meta math matches the gateway plan, and
  (4) land in the media sidebar (draft result.assetUrls).

FIVE calls on purpose: window expansion must synthesize window5 (the
static graph ships 4) — the exact spot the old writer hid calls 5+.

Usage: python3 tests/timeline/e2e_agent_video.py [gateway_base]
Default gateway http://127.0.0.1:18090. Exit 0 = proof; 1 = failure.
"""
import glob
import json
import os
import subprocess
import sys
import time
import urllib.request
import urllib.error

GW = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:18090"
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BUILD = os.path.join(REPO, "build")
FPS = 24
W1 = 56            # 17*3+5  — call[0] tile (grid: 17k+5)
WN = 89            # 107-18  — later-call tile (sampled 107, carry head 18)
N = 5              # FIVE calls: forces window5 synthesis
TOTAL = W1 + WN * (N - 1)

# EXACT authored calls — the agent composes THIS document verbatim
CALLS = [
    ("a lone lighthouse keeper climbs the spiral staircase at dawn, "
     "lantern swinging, cold sea light through salt-streaked windows",
     0, W1),
    ("he reaches the lamp room and throws open the storm shutters, "
     "wind roaring, gulls scattering off the railing", W1, W1 + WN),
    ("his weathered hands strike the match; the great lens flares "
     "alight, gears turning, beams sweeping out over dark water",
     W1 + WN, W1 + 2 * WN),
    ("far below on the rocks, a fishing boat answers with a green "
     "flare, tumbling in the swell", W1 + 2 * WN, W1 + 3 * WN),
    ("the keeper leans on the rail and exhales; the beam steadies, "
     "dawn cracks the horizon, the boat crawls home",
     W1 + 3 * WN, TOTAL),
]
SEED = 20260830

REQUEST = f"""Compose one h3-timeline card and run it. Use the
h3_timeline_card tool with EXACTLY these parameters — do not paraphrase,
do not change any number:
- intent: "lighthouse keeper dawn watch, one continuous fabric"
- seed: {SEED}, fps: {FPS}
- calls (exactly {N}, contiguous, these exact texts and frames):
{chr(10).join(f'  {i+1}. text: "{t}" start_frame: {s} end_frame: {e}' for i, (t, s, e) in enumerate(CALLS))}
No image, no audio_stem, no other fields beyond defaults."""


def req(method, path, body=None, timeout=30):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(GW + path, data=data, method=method)
    if data:
        r.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(r, timeout=timeout) as resp:
            return resp.status, json.loads(resp.read() or b"{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b"{}")
        except Exception:
            return e.code, {}
    except Exception as e:
        return 0, {"error": str(e)}


fails = []
def check(name, cond, detail=""):
    print(("PASS " if cond else "FAIL ") + name + ((" | " + str(detail)) if detail and not cond else ""), flush=True)
    if not cond:
        fails.append(name)


def main():
    # serial GPU law: never barge onto an active run
    code, q = req("GET", "/v1/queue")
    active = [r for r in q.get("runs", []) if r.get("state") in ("queued", "running")]
    if code != 200 or active:
        print(f"ABORT: gateway queue not idle/reachable: {code} active={active}")
        return 1

    print(f"[e2e] agent door: {N} calls, {TOTAL}f = {TOTAL/FPS:.3f}s target")
    code, r = req("POST", "/v1/cards/h3-timeline/agent", {"prompt": REQUEST}, timeout=60)
    if code != 200:
        print(f"FAIL agent door rejected: {code} {r}")
        return 1
    token = r.get("session") or r.get("token") or ""
    print(f"[e2e] agent session {token} spawned; log {r.get('log')}")

    # ── wait for auto-arm to register the run (agent LLM round) ─────────
    # (prompt law, 2026-08-30: the run's visible prompt is now WINDOW 1'S
    # CALL TEXT — the "lane-auto-arm" label must never leak into a render.
    # So discovery keys on the DRAFT LINKAGE: the agent session lands a
    # fresh draft, auto-arm starts it, and the runs listing carries
    # draft_id + created_at.)
    drafts_before = set()
    code, dl = req("GET", "/v1/flows/drafts")
    for x in dl.get("drafts", dl if isinstance(dl, list) else []):
        if x.get("draft_id"):
            drafts_before.add(x["draft_id"])
    spawn_ts = time.time()
    run_id, draft_id = None, None
    deadline = time.time() + 420
    while time.time() < deadline:
        code, st = req("GET", "/v1/flows/runs")
        runs = st.get("runs", st if isinstance(st, list) else [])
        for rr in runs:
            did = rr.get("draft_id") or ""
            # (discovery law, 2026-08-31) this e2e watches THE LANE'S
            # OWN run only. A concurrent test suite on the shared
            # gateway (chaos / card-lifecycle scratch boots share
            # build/output) registers fresh-draft runs inside any 60s
            # window — an unfiltered scan locked onto a foreign
            # _lc_ok fixture run and graded it against this lane's
            # expectations (14 bogus failures, real run ignored).
            if (did and did not in drafts_before
                    and (rr.get("created_at") or 0) > spawn_ts - 60
                    and rr.get("flow") == "h3-timeline"
                    and rr.get("status") in ("queued", "running",
                                             "success", "completed",
                                             "error", "failed")):
                run_id = rr.get("run_id")
                draft_id = did
                break
        if run_id:
            break
        time.sleep(5)
    check("auto-arm registered a run through the agent session", bool(run_id))
    if not run_id:
        # dump the agent log tail for diagnosis
        for lg in sorted(glob.glob(os.path.join(BUILD, "agent-sessions", "*.log")),
                         key=os.path.getmtime)[-1:]:
            print("--- agent log tail:", lg)
            print("\n".join(open(lg, errors="replace").read().splitlines()[-25:]))
        return 1
    print(f"[e2e] run {run_id}")

    # ── poll to completion ──────────────────────────────────────────────
    state, err = "", ""
    deadline = time.time() + 2400
    while time.time() < deadline:
        code, st = req("GET", f"/v1/flows/status/{run_id}")
        state = st.get("state", st.get("status", ""))
        err = st.get("error", "")
        if state in ("success", "completed", "error", "failed", "stopped"):
            break
        time.sleep(10)
    check(f"run reached success (state={state})", state in ("success", "completed"),
          err or state)
    if state not in ("success", "completed"):
        print(json.dumps(st, indent=1)[:2000])
        return 1

    outdir = os.path.join(BUILD, "output", run_id)

    # ── THE FILM ────────────────────────────────────────────────────────
    stitch = os.path.join(outdir, "stitch_video_0.mp4")
    check("stitch film exists", os.path.isfile(stitch))
    dur = None
    if os.path.isfile(stitch):
        p = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                            "format=duration", "-of", "csv=p=0", stitch],
                           capture_output=True, text=True)
        try:
            dur = float(p.stdout.strip())
        except ValueError:
            pass
    want = TOTAL / FPS
    check(f"film duration ≈ plan ({want:.3f}s)", dur is not None and abs(dur - want) < 0.75,
          f"ffprobe={dur}")

    # ── N WINDOW FILMS + TAILS (the 1/4 lie cannot hide) ───────────────
    for k in range(1, N + 1):
        check(f"window{k}_video_0.mp4 exists",
              os.path.isfile(os.path.join(outdir, f"window{k}_video_0.mp4")))
    for k in range(1, N):     # every seam window saved its tail
        check(f"window{k}_tail.pt exists",
              os.path.isfile(os.path.join(outdir, f"window{k}_tail.pt")))

    # ── META CROSS-CHECK EVIDENCE (chain truth == plan) ─────────────────
    for k in range(2, N + 1):
        mp = os.path.join(outdir, f"window{k-1}_tail.pt.meta.json")
        ok = False
        got = None
        if os.path.isfile(mp):
            m = json.load(open(mp))
            got = m.get("carried_pixel_frames")
            ok = got == 18          # carry=6 -> head 2*2 + 4*17//5 = 18
        check(f"window{k} chain meta carried_pixel_frames == 18", ok, f"got {got} at {mp}")

    # ── CARD RECONSTRUCTION: N calls face N films ───────────────────────
    draft = None
    for d in glob.glob(os.path.join(BUILD, "drafts", "*.json")):
        if os.path.getmtime(d) < time.time() - 900:
            continue
        try:
            doc = json.load(open(d))
        except ValueError:
            continue
        stg = (doc.get("stages") or [{}])[0]
        if run_id in json.dumps(stg.get("result", {})):
            draft = (d, doc)
            break
    check("draft card carries this run's result", draft is not None)
    if draft:
        dpath, doc = draft
        draft_id = os.path.basename(dpath)[:-5]
        params = (doc.get("stages") or [{}])[0].get("params", {})
        calls = params.get("calls", [])
        if isinstance(calls, str):
            calls = json.loads(calls)
        check(f"card params.calls == {N} (verbatim, never split)", len(calls) == N,
              f"got {len(calls)}")
        for i, (t, s, e) in enumerate(CALLS):
            ok = (i < len(calls) and calls[i].get("text") == t
                  and calls[i].get("start_frame") == s
                  and calls[i].get("end_frame") == e)
            check(f"call[{i}] verbatim in the card", ok)
        result = (doc.get("stages") or [{}])[0].get("result", {})
        films = result.get("artifacts", {}).get("windowFilms", [])
        check(f"card lists ALL {N} window films", len(films) == N, f"got {len(films)}")
        urls = result.get("assetUrls", [])
        check(f"assetUrls carries stitch + {N} windows ({N+1})", len(urls) == N + 1,
              f"got {len(urls)}")
        # media-sidebar truth: the film URL must point at this run
        check("stitch film URL in card result",
              any("stitch_video_0.mp4" in u and run_id in u for u in urls))

    # ── the standing reconstruction test on this run ────────────────────
    p = subprocess.run([sys.executable,
                        os.path.join(REPO, "tests/timeline/reconstruction_accuracy.py"),
                        outdir], capture_output=True, text=True)
    check("reconstruction_accuracy.py green on this run", p.returncode == 0,
          p.stdout[-400:] + p.stderr[-200:])

    print()
    if fails:
        print(f"E2E AGENT VIDEO: {len(fails)} FAILURES -> {fails}")
        return 1
    print(f"E2E AGENT VIDEO: ALL PASS — {run_id} ({TOTAL/FPS:.2f}s film, {N} windows)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
