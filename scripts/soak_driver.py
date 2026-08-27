#!/usr/bin/env python3
"""H3 timeline soak driver — continuous mega-inference generations.

Submits h3-timeline runs (3-window films, turbo 4-step + kitchen) forever,
varying scene and seed, and logs every generation to
build/output/soak/genlog.jsonl with wall times, queue wait, artifact size,
output duration and realtime factor. A human summary lives next to it
(summary.txt). Touch build/output/soak/STOP to stop cleanly after the
current run; 10 consecutive failures also aborts (dead-GPU guard).

Usage: python3 scripts/soak_driver.py [--port 18090] [--max N] [--pause S]
"""
import argparse
import json
import os
import random
import subprocess
import sys
import time
import urllib.error
import urllib.request

SCENES = [
    ("fight",
     "BEAT 1: two duelists circle in a rain-slick alley at night, neon reflections in puddles, thunder crack",
     "BEAT 2: the clash - sparks fly as blades lock, camera pushes in slow motion, rain drops suspended",
     "BEAT 3: the loser staggers, sword falls, victor turns into the fog, single bass hit and dripping water"),
    ("discovery",
     "BEAT 1: a diver descends past a coral wall toward a dark opening, sonar pings and regulator breath",
     "BEAT 2: inside the cave a sunken ship materializes, gold coins glint in the torch beam, choir swell",
     "BEAT 3: the diver lifts a jeweled mask, eyes widen behind the mask, harp arpeggio and heartbeat"),
    ("anime-dance",
     "BEAT 1: an idol in a hologram-lit studio strikes her opening pose, synthwave bass drops in",
     "BEAT 2: full choreography - spins and hair whips, strobing rim lights, crowd chants the hook",
     "BEAT 3: finale leap freeze-framed mid-air, confetti burst, last chord rings out"),
    ("model-shoot",
     "BEAT 1: studio fashion shoot, model in a crimson silk gown poses against seamless white, flashbulbs pop in rhythm",
     "BEAT 2: wind machine roars, fabric billows like liquid fire, camera orbits her slow turn",
     "BEAT 3: the money shot - close portrait, one eyebrow lift, shutter click echoes and jazz resolves"),
    ("western",
     "BEAT 1: a lone rider crests a mesa at golden hour, dust devils spin, lone harmonica note",
     "BEAT 2: showdown on the empty street, spurs jingle, a tumbleweed crosses between them",
     "BEAT 3: hands slap leather, muzzle flash, the loser folds into the dust, vulture cry"),
    ("space",
     "BEAT 1: a derelict station tumbles silently above a gas giant, low cabin hum and creaking metal",
     "BEAT 2: the airlock cycles, emergency lights strobe red, alarm klaxon builds",
     "BEAT 3: the reactor core ignites behind her as she dives for the pod, bass drop and static"),
]

TERMINAL = ("success", "done", "failed", "error", "cancelled", "canceled")


def http_json(url, payload=None, timeout=30):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, headers={"content-type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode() or "{}")


def duration_of(path):
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "csv=p=0", path],
            capture_output=True, text=True, timeout=30).stdout.strip()
        return float(out)
    except Exception:
        return 0.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=18090)
    ap.add_argument("--max", type=int, default=0, help="stop after N runs (0 = forever)")
    ap.add_argument("--pause", type=float, default=10.0, help="seconds between runs")
    args = ap.parse_args()
    base = f"http://127.0.0.1:{args.port}"
    soak = "build/output/soak"
    os.makedirs(soak, exist_ok=True)
    log_path = os.path.join(soak, "genlog.jsonl")
    stop_file = os.path.join(soak, "STOP")
    if os.path.exists(stop_file):
        os.remove(stop_file)

    idx = 0
    fail_streak = 0
    while True:
        if os.path.exists(stop_file):
            print(f"[soak] STOP file present - exiting after {idx} runs", flush=True)
            break
        if args.max and idx >= args.max:
            break
        name, b1, b2, b3 = SCENES[idx % len(SCENES)]
        seed = random.randint(1, 9999)
        submitted = time.time()
        rec = {"i": idx, "scene": name, "seed": seed, "submitted": submitted}
        try:
            r = http_json(f"{base}/v1/run", {
                "model": "h3-timeline", "prompt": b1,
                "prompt2": b2, "prompt3": b3, "seed": seed,
            })
            rid = r.get("run_id") or r.get("id") or ""
            rec["run_id"] = rid
            print(f"[soak] #{idx} {name} seed={seed} -> {rid}", flush=True)
        except Exception as e:
            fail_streak += 1
            rec["submit_error"] = str(e)
            print(f"[soak] #{idx} submit FAILED: {e}", flush=True)
            with open(log_path, "a") as f:
                f.write(json.dumps(rec) + "\n")
            if fail_streak >= 10:
                print("[soak] 10 consecutive failures - aborting", flush=True)
                sys.exit(1)
            time.sleep(15)
            idx += 1
            continue

        first_running = None
        status = ""
        while True:
            time.sleep(5)
            try:
                st = http_json(f"{base}/v1/pipelines/status/{rid}", timeout=15)
            except Exception as e:
                st = {"error": str(e)}
            blob = json.dumps(st).lower()
            status = next((w for w in TERMINAL if w in blob), "")
            if not first_running and ("running" in blob or "active" in blob):
                first_running = time.time()
            if status:
                break
            if time.time() - submitted > 2400:
                status = "timeout"
                break
        done = time.time()
        rec.update({
            "status": status,
            "wall_s": round(done - submitted, 1),
            "queue_wait_s": round((first_running or submitted) - submitted, 1),
        })
        art = None
        if isinstance(st, dict):
            arts = st.get("artifacts") or []
            vids = [a for a in arts if isinstance(a, dict) and a.get("type") == "video"]
            art = vids[0] if vids else (arts[0] if arts else None)
        if art and status == "success":
            p = art.get("path") or ""
            if p and os.path.exists(p):
                rec["artifact"] = p
                rec["bytes"] = os.path.getsize(p)
                rec["out_duration_s"] = duration_of(p)
                if rec["out_duration_s"] > 0:
                    rec["realtime_factor"] = round(rec["wall_s"] / rec["out_duration_s"], 2)
            fail_streak = 0
        else:
            fail_streak += 1
        rec["iterations"] = 12  # 3 windows x 4 turbo steps
        with open(log_path, "a") as f:
            f.write(json.dumps(rec) + "\n")
        print(f"[soak] #{idx} {name} {status} wall={rec['wall_s']}s q={rec['queue_wait_s']}s "
              f"out={rec.get('out_duration_s', 0)}s", flush=True)

        # human summary
        try:
            lines = [json.loads(l) for l in open(log_path) if l.strip()]
            ok = [l for l in lines if l.get("status") == "success" and "wall_s" in l]
            with open(os.path.join(soak, "summary.txt"), "w") as f:
                f.write(f"soak summary  {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"runs: {len(lines)}  ok: {len(ok)}  fail: {len(lines)-len(ok)}\n")
                if ok:
                    walls = sorted(l["wall_s"] for l in ok)
                    med = walls[len(walls)//2]
                    outs = [l.get("out_duration_s", 0) for l in ok]
                    f.write(f"wall median: {med}s  min: {walls[0]}s  max: {walls[-1]}s\n")
                    if sum(outs) > 0:
                        f.write(f"total output: {sum(outs):.1f}s over {len(ok)} films\n")
                    rtf = [l.get("realtime_factor") for l in ok if l.get("realtime_factor")]
                    if rtf:
                        f.write(f"realtime factor: mean {sum(rtf)/len(rtf):.1f}x  "
                                f"best {min(rtf)}x  worst {max(rtf)}x\n")
                f.write("\nlast 10:\n")
                for l in lines[-10:]:
                    f.write(f"  #{l.get('i')} {l.get('scene')} seed={l.get('seed')} "
                            f"{l.get('status')} wall={l.get('wall_s')}s out={l.get('out_duration_s','-')}s\n")
        except Exception as e:
            print(f"[soak] summary write failed: {e}", flush=True)

        if fail_streak >= 10:
            print("[soak] 10 consecutive failures - aborting", flush=True)
            sys.exit(1)
        idx += 1
        time.sleep(args.pause)


if __name__ == "__main__":
    main()